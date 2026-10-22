import { state } from './state.js';
import { mappedRows } from './mapping.js';
import { renderCertificateSVG, renderStaticLayerSVG, renderDynamicLayerSVG, svgToCanvas, svgToPdf, newPdfForTemplate } from './pdf.js';
import { getTemplate } from './templates.js';
import { resolveText, verificationContext, applyVerificationSignature } from './variables.js';
import { safeFilename, uniqueFilename } from './utils.js';
import { batchYieldEvery, workerPoolMax, LEGACY_VERIFY_SALT } from './config.js';
import { updateGenerationProgress } from './progress.js';
import { qrVendorAvailable } from './qrcode.js';
import { SAFE_FONT_DATA_URL } from './security.js';
import { hasWebCrypto, importPrivateKeyJWK, exportPublicKeyJWK, exportPrivateKeyJWK, signPayload, keyIdFromJwk } from './crypto.js';
import { loadSigningKey, storeSigningKey, pauseAutosave, resumeAutosave } from './storage.js';
import { generateKeyPair } from './crypto.js';
import { makeZip } from './zip.js';

/**
 * Detect if Web Worker + OffscreenCanvas is supported in current environment.
 */
export function isWorkerSupported() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

export function generationRows() {
  return mappedRows().filter(r => String(r.NAME || "").trim());
}

let _running = false;
let _cancelRequested = false;

export function isGenerating() { return _running; }

export function cancelGeneration() {
  if (_running) _cancelRequested = true;
}

function cancelledError() {
  const e = new Error("Generation cancelled.");
  e.cancelled = true;
  return e;
}

function getWorkerUrl() {
  try {
    if (typeof URL === 'function' && typeof import.meta !== 'undefined' && import.meta.url) {
      return new URL('./pdf-worker.js', import.meta.url).href;
    }
  } catch (_) { /* fall through */ }
  return 'js/pdf-worker.js';
}

// Signing key cache, strictly bound to the project name it was loaded for. A
// stale key from a previously opened project must never leak into another
// project's registry (see buildPublicRegistry's projectName check).
let _keyCache = null; // { projectName, privateKey, publicKeyJWK }

async function loadOrCreateSigningKey() {
  const name = state.projectName;
  if (_keyCache && _keyCache.projectName === name) return _keyCache;
  let keyPair = await loadSigningKey(name);
  if (!keyPair) {
    const kp = await generateKeyPair();
    const pubJWK = await exportPublicKeyJWK(kp.publicKey);
    const privJWK = await exportPrivateKeyJWK(kp.privateKey);
    await storeSigningKey(name, pubJWK, privJWK);
    keyPair = { publicKey: pubJWK, privateKey: privJWK };
  }
  const privateKey = await importPrivateKeyJWK(keyPair.privateKey);
  _keyCache = { projectName: name, privateKey, publicKeyJWK: keyPair.publicKey };
  return _keyCache;
}

/**
 * Build one job per record: filename (collision-free), registry row and lazy
 * SVG thunks. The verification context (ID + digest + payload hash + QR URL)
 * is computed exactly once per record and shared by the printed artwork and
 * the registry, so they can never disagree. When a project signing key is
 * available the HMAC digest is replaced with a real ECDSA P-256 signature.
 * Signing is parallelized in chunks (WebCrypto.sign is async and off-thread);
 * filename dedupe stays sequential so output stays byte-for-byte deterministic.
 * Per-record failure skips that record instead of aborting the batch.
 */
async function buildJobs(rows) {
  const used = new Set();

  // Load or create the ECDSA signing key when WebCrypto is available.
  let privateKey = null;
  let publicKeyJWK = null;
  if (hasWebCrypto()) {
    try {
      const cached = await loadOrCreateSigningKey();
      privateKey = cached.privateKey;
      publicKeyJWK = cached.publicKeyJWK;
    } catch (e) {
      console.warn('ECDSA key unavailable, falling back to HMAC:', e);
    }
  }

  async function buildContext(row, i) {
    const ctx = verificationContext(row, i);
    let sig = ctx.VERIFY_SIG;
    if (privateKey) {
      sig = await signPayload(privateKey, ctx.VERIFY_H);
    }
    return { ctx, finalCtx: applyVerificationSignature(ctx, sig) };
  }

  const jobs = [];
  let signFailures = 0;
  const CHUNK = 32;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const built = await Promise.all(chunk.map((row, j) =>
      buildContext(row, start + j).catch(e => {
        signFailures++;
        console.warn(`Record ${start + j + 1} could not be signed and was skipped:`, e);
        return null;
      })
    ));
    for (let j = 0; j < built.length; j++) {
      const item = built[j];
      if (!item) continue;
      const i = start + j;
      const row = rows[i];
      const base = safeFilename(resolveText(state.settings.filename, row, item.finalCtx).replace(/\.pdf$/i, ""))
        || item.ctx.CERTIFICATE_ID || `certificate-${i + 1}`;
      const fullName = uniqueFilename(base, used) + ".pdf";
      const registryItem = {
        id: item.ctx.CERTIFICATE_ID,
        sig: item.finalCtx.VERIFY_SIG,
        h: item.ctx.VERIFY_H,
        name: String(row.NAME || ""),
        role: String(row.ROLE || ""),
        event: String(row.EVENT || ""),
        date: String(row.DATE || ""),
        organization: String(row.ORGANIZATION || ""),
        filename: fullName
      };
      jobs.push({
        id: i,
        row,
        ctx: item.finalCtx,
        fullName,
        registryItem,
        svg: () => renderDynamicLayerSVG(row, i, item.finalCtx, { strict: true }),
        svgFull: () => renderCertificateSVG(row, i, item.finalCtx, { strict: true })
      });
    }
  }
  return { jobs, publicKeyJWK, signFailures };
}

function zipAvailable() {
  return typeof window !== 'undefined' && window.JSZip;
}

function rasterScale() {
  return Math.max(1, Math.min(3, Number(state.settings?.rasterScale) || 2));
}

function yieldToUI() {
  return new Promise(r => (typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(() => setTimeout(r, 0))
    : setTimeout(r, 0)));
}

/**
 * Rasterize the shared static artwork layer once per batch. Returns a PNG
 * buffer for the worker init handshake, or null when rasterization is
 * unavailable (callers then fall back to full single-document renders).
 */
async function renderStaticLayerPng(scale) {
  const canvas = await svgToCanvas(renderStaticLayerSVG(state.templateId), scale);
  if (typeof canvas.convertToBlob === 'function') {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blob.arrayBuffer();
  }
  const dataUrl = canvas.toDataURL('image/png');
  const b64 = String(dataUrl).split(',')[1] || '';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Decode a static-layer PNG buffer back to a canvas (main-thread retry path). */
async function staticCanvasFromPng(buffer, scale) {
  const t = getTemplate(state.templateId);
  const blob = new Blob([buffer], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('Static artwork layer could not be decoded.')); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(t.page.width * scale);
    canvas.height = Math.round(t.page.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

/**
 * Convert custom fonts to blob URLs once so the batch ships string references
 * to workers instead of cloning every base64 font into each of up to 8
 * workers. The base64 payload is decoded directly (a fetch() of a data: URL
 * would be blocked by the studio CSP's connect-src 'self'); the allowlist was
 * already enforced by sanitizeFonts/loading. Callers revoke the URLs when the
 * pool shuts down.
 */
async function fontPayload() {
  const fonts = (state.fonts || []).filter(f => f && f.family && SAFE_FONT_DATA_URL.test(String(f.data || '').trim()));
  return Promise.all(fonts.map(async f => {
    const b64 = String(f.data).split(',')[1] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { family: f.family, url: URL.createObjectURL(new Blob([bytes], { type: 'font/woff2' })) };
  }));
}

/**
 * Main-thread generator: used when Workers/OffscreenCanvas are unavailable, and as
 * the per-record retry path for records whose worker render failed. Composes the
 * shared static artwork canvas under each record's dynamic layer when available.
 */
async function renderJobsOnMainThread(jobs, acc, staticCanvas) {
  if (staticCanvas === undefined) {
    try {
      staticCanvas = await svgToCanvas(renderStaticLayerSVG(state.templateId), rasterScale());
    } catch (e) {
      console.warn('Static layer rasterization failed; falling back to full per-record renders.', e);
      staticCanvas = null;
    }
  }
  const layered = Boolean(staticCanvas);
  for (let i = 0; i < jobs.length; i++) {
    if (_cancelRequested) throw cancelledError();
    const job = jobs[i];
    const blob = await svgToPdf(layered ? job.svg() : job.svgFull(), layered ? { under: staticCanvas } : {});
    acc.collect(job, blob);
    updateGenerationProgress(acc.done(), jobs.length, acc.startTime);
    if ((i + 1) % batchYieldEvery === 0) await yieldToUI();
  }
}

function makeAccumulator(total) {
  const files = new Array(total);
  const registry = new Array(total);
  const zip = zipAvailable() ? new window.JSZip() : null;
  let processed = 0;
  return {
    files, registry, zip,
    startTime: performance.now(),
    collect(job, blob) {
      files[job.id] = { name: job.fullName, blob: zip ? null : blob };
      registry[job.id] = job.registryItem;
      if (zip) zip.file(job.fullName, blob);
      processed++;
    },
    done() { return processed; }
  };
}

/**
 * Parallel Web Worker generator with an init handshake (renders are only dispatched
 * to workers that reported their fonts loaded) and per-record error isolation
 * (failed records are retried on the main thread instead of aborting the batch).
 */
async function generateAllWorker(jobs) {
  if (typeof window === 'undefined' || !window.jspdf) {
    throw new Error("PDF support could not load. Reload the page and try again.");
  }

  const { jsPDF } = window.jspdf;
  const template = getTemplate(state.templateId);
  const scale = rasterScale();
  const targetWidth = Math.round(template.page.width * scale);
  const targetHeight = Math.round(template.page.height * scale);
  const acc = makeAccumulator(jobs.length);

  const hardwareConcurrency = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const poolSize = Math.max(1, Math.min(hardwareConcurrency, jobs.length, workerPoolMax));

  // Shared static artwork: rasterized ONCE, decoded once per worker. When it
  // cannot be prepared, jobs fall back to full single-document SVGs.
  let staticPng = null;
  try {
    staticPng = await renderStaticLayerPng(scale);
  } catch (e) {
    console.warn('Static layer rasterization failed; workers will render full documents.', e);
    staticPng = null;
  }
  const fontUrls = await fontPayload();

  const workerUrl = getWorkerUrl();
  const workers = [];
  try {
    for (let w = 0; w < poolSize; w++) workers.push({ handle: new Worker(workerUrl), ready: false, dead: false });
  } catch (spawnErr) {
    workers.forEach(w => { try { w.handle.terminate(); } catch (_) {} });
    fontUrls.forEach(f => URL.revokeObjectURL(f.url));
    throw spawnErr;
  }

  const queue = jobs.slice();
  const inflight = new Map();
  const retryJobs = [];
  const fontWarnings = new Set();

  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      let retryStarted = false;

      function finish(err) {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve();
      }

      function maybeDone() {
        if (settled || retryStarted) return;
        if (_cancelRequested && !inflight.size) { finish(cancelledError()); return; }
        if (queue.length || inflight.size) return;
        if (retryJobs.length) {
          retryStarted = true;
          const retryBatch = retryJobs.splice(0);
          const startRetry = (staticCanvas) => {
            renderJobsOnMainThread(retryBatch, acc, staticCanvas)
              .then(() => finish())
              .catch(err => finish(err));
          };
          if (staticPng) {
            staticCanvasFromPng(staticPng, scale).then(startRetry).catch(() => startRetry(null));
          } else {
            startRetry(null);
          }
          return;
        }
        finish();
      }

      function pump(entry) {
        if (settled || !entry.ready || entry.dead || _cancelRequested) { maybeDone(); return; }
        const job = queue.shift();
        if (!job) { maybeDone(); return; }
        inflight.set(entry, job);
        entry.handle.postMessage({
          type: 'render',
          id: job.id,
          svgString: staticPng ? job.svg() : job.svgFull(),
          width: targetWidth,
          height: targetHeight
        });
      }

      // Reused scratch canvas for the rare ImageData-only fallback — building a
      // fresh canvas + multi-MB base64 string per record was a memory spike.
      let scratchCanvas = null;
      function assembleFromBuffer(id, buffer) {
        const job = jobs[id];
        const pdf = newPdfForTemplate(template);
        const bytes = new Uint8Array(buffer);
        const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

        if (isPng) {
          pdf.addImage(bytes, "PNG", 0, 0, template.page.width, template.page.height, undefined, "FAST");
        } else if (typeof document !== 'undefined') {
          if (!scratchCanvas) {
            scratchCanvas = document.createElement("canvas");
            scratchCanvas.width = targetWidth;
            scratchCanvas.height = targetHeight;
          }
          const ctx = scratchCanvas.getContext("2d");
          const imgData = new ImageData(new Uint8ClampedArray(buffer), targetWidth, targetHeight);
          ctx.putImageData(imgData, 0, 0);
          pdf.addImage(scratchCanvas, "PNG", 0, 0, template.page.width, template.page.height, undefined, "FAST");
        } else {
          pdf.addImage(bytes, "PNG", 0, 0, template.page.width, template.page.height, undefined, "FAST");
        }
        return pdf.output("blob");
      }

      workers.forEach(entry => {
        entry.handle.onerror = () => {
          entry.dead = true;
          const job = inflight.get(entry);
          if (job) { inflight.delete(entry); retryJobs.push(job); }
          try { entry.handle.terminate(); } catch (_) {}
          maybeDone();
        };
        if ('onmessageerror' in entry.handle) {
          entry.handle.onmessageerror = () => {
            entry.dead = true;
            const job = inflight.get(entry);
            if (job) { inflight.delete(entry); retryJobs.push(job); }
            maybeDone();
          };
        }

        entry.handle.onmessage = (e) => {
          if (settled) return;
          const data = e.data;
          if (!data) return;

          if (data.type === 'ready') {
            entry.ready = true;
            (Array.isArray(data.failedFonts) ? data.failedFonts : []).forEach(f => fontWarnings.add(String(f)));
            pump(entry);
            return;
          }

          if (data.type === 'error') {
            const job = inflight.get(entry);
            inflight.delete(entry);
            if (job) retryJobs.push(job);
            if (typeof data.id === 'number' && jobs[data.id] && (!job || job.id !== data.id)) {
              retryJobs.push(jobs[data.id]);
            }
            pump(entry);
            maybeDone();
            return;
          }

          if (data.type === 'rendered') {
            const job = inflight.get(entry);
            inflight.delete(entry);
            if (!job || job.id !== data.id) {
              const stray = jobs[data.id];
              if (stray && !acc.files[stray.id]) retryJobs.push(stray);
              pump(entry);
              maybeDone();
              return;
            }
            try {
              acc.collect(job, assembleFromBuffer(job.id, data.buffer));
              updateGenerationProgress(acc.done(), jobs.length, acc.startTime);
            } catch (convErr) {
              console.warn(`Record ${job.id} could not be assembled from worker output; retrying on main thread.`, convErr);
              retryJobs.push(job);
            }
            pump(entry);
            maybeDone();
          }
        };

        entry.handle.postMessage({
          type: 'init',
          template: template,
          fonts: fontUrls,
          staticPng: staticPng,
          scale: scale
        });
      });
    });
  } finally {
    workers.forEach(w => { try { w.handle.terminate(); } catch (_) {} });
    fontUrls.forEach(f => { try { URL.revokeObjectURL(f.url); } catch (_) {} });
  }

  return { acc, template, fontWarnings: [...fontWarnings] };
}

/**
 * Public verification registry, privacy-safe by construction: each entry is
 * only a certificate ID and its signature/digest. Names, roles, dates and
 * filenames never leave this machine.
 * Schema 4 carries a `keys` map keyed by public-key fingerprint (keyId) so
 * entries can survive key rotation, plus per-entry revocation markers. The
 * ECDSA public key is ALSO emitted as `publicKey` (schema-3 field) so older
 * portals keep working. Schema 3/2 output is only produced when the cached
 * signing key does not belong to the CURRENT project.
 */
export function buildPublicRegistry() {
  const keyIsCurrent = Boolean(state._signingPublicKey) && state._signingKeyProjectName === state.projectName;
  const keyId = keyIsCurrent ? (state._signingKeyId || undefined) : undefined;
  const publicKey = keyIsCurrent ? state._signingPublicKey : undefined;
  // Keys retired via "Rotate signing key" stay in the map so certificates
  // issued under them keep verifying from the same published registry.
  const rotated = (Array.isArray(state._rotatedKeys) ? state._rotatedKeys : []).slice(0, 4);
  const schema = !keyIsCurrent ? 2 : (keyId ? 4 : 3);
  return {
    schema,
    ...(publicKey ? {
      publicKey,
      keys: keyId ? { [keyId]: publicKey, ...Object.fromEntries(rotated.filter(k => k.keyId && k.jwk).map(k => [k.keyId, k.jwk])) } : undefined
    } : {}),
    event: String(state.globalFields?.EVENT || ""),
    organization: String(state.globalFields?.ORGANIZATION || ""),
    project: state.projectName,
    generatedAt: new Date().toISOString(),
    signature: keyIsCurrent
      ? { algorithm: "ecdsa-p256", hash: "sha256-canonical-payload", fields: ["id", "name", "role", "event", "date", "organization"], ...(keyId ? { keyId } : {}) }
      : { algorithm: "sha256-v2", encoding: "first 16 hex chars", fields: ["id", "name", "role", "event", "date", "organization"] },
    totalCertificates: (state.registry || []).length,
    certificates: (state.registry || []).map(c => ({
      id: c.id,
      sig: c.sig,
      ...(c.h ? { h: c.h } : {}),
      ...(c.revoked ? { revoked: true, ...(c.revokedAt ? { revokedAt: c.revokedAt } : {}) } : {})
    }))
  };
}

/** Single ZIP path: incremental accumulator when JSZip is present, fallback otherwise. */
export async function finalizeZip(result) {
  return result.zip
    ? result.zip.generateAsync({ type: "blob", compression: "STORE" })
    : makeZip(result.files);
}

export async function generateAll() {
  if (_running) throw new Error("A batch is already being generated. Cancel it or wait for it to finish.");
  _running = true;
  _cancelRequested = false;
  pauseAutosave();

  // Preflight: refuse conditions that would silently produce broken credentials.
  if (String(state.settings.verifySecret || "") === LEGACY_VERIFY_SALT) {
    _running = false;
    resumeAutosave();
    throw new Error("Generation blocked: the signing secret is the publicly known legacy default. Click Randomize on the Generate step to get a private secret.");
  }
  if (state.elements.some(e => e.type === "qr") && !qrVendorAvailable()) {
    _running = false;
    resumeAutosave();
    throw new Error("Generation blocked: the QR code library could not be loaded, so verification codes cannot be printed. Reload the page and try again.");
  }

  const source = mappedRows();
  const rows = generationRows();
  if (!rows.length) {
    _running = false;
    resumeAutosave();
    throw new Error("No valid participant names were found. Map the NAME field before generating certificates.");
  }
  const skipped = source.length - rows.length;
  const jobsResult = await buildJobs(rows);
  const jobs = jobsResult.jobs;
  if (!jobs.length) {
    _running = false;
    resumeAutosave();
    throw new Error(`All ${rows.length} record(s) failed during signing or preparation. Check the signing secret and console for details.`);
  }
  if (jobsResult.publicKeyJWK) {
    state._signingPublicKey = jobsResult.publicKeyJWK;
    state._signingKeyProjectName = state.projectName;
    state._signingKeyId = await keyIdFromJwk(jobsResult.publicKeyJWK);
  }

  try {
    let acc;
    let fontWarnings = [];
    if (isWorkerSupported()) {
      try {
        ({ acc, fontWarnings } = await generateAllWorker(jobs));
      } catch (err) {
        if (err.cancelled) throw err;
        console.warn("Web Worker offloading failed, falling back to main-thread generator:", err);
        acc = makeAccumulator(jobs.length);
        await renderJobsOnMainThread(jobs, acc);
      }
    } else {
      acc = makeAccumulator(jobs.length);
      await renderJobsOnMainThread(jobs, acc);
    }

    state.generated = acc.files.filter(Boolean);
    state.registry = acc.registry.filter(Boolean);
    return { files: acc.files.filter(Boolean), skipped, registry: acc.registry.filter(Boolean), zip: acc.zip, fontWarnings, signFailures: jobsResult.signFailures };
  } finally {
    _running = false;
    _cancelRequested = false;
    resumeAutosave();
  }
}
