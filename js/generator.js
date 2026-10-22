import { state } from './state.js';
import { mappedRows } from './mapping.js';
import { renderCertificateSVG, svgToPdf } from './pdf.js';
import { getTemplate } from './templates.js';
import { resolveText, verificationContext, applyVerificationSignature } from './variables.js';
import { safeFilename, uniqueFilename } from './utils.js';
import { batchYieldEvery, workerPoolMax, LEGACY_VERIFY_SALT } from './config.js';
import { updateGenerationProgress } from './progress.js';
import { qrVendorAvailable } from './qrcode.js';
import { hasWebCrypto, importPrivateKeyJWK, exportPublicKeyJWK, exportPrivateKeyJWK, signPayload } from './crypto.js';
import { loadSigningKey, storeSigningKey } from './storage.js';
import { generateKeyPair } from './crypto.js';

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
 * Build one job per record: filename (collision-free), registry row and a lazy SVG
 * thunk. The verification context (ID + digest + payload hash + QR URL) is
 * computed exactly once per record and shared by the printed artwork and the
 * registry, so they can never disagree. When a project signing key is available
 * the HMAC digest is replaced with a real ECDSA P-256 signature; the portal can
 * then verify the certificate cryptographically using only the published public
 * key — no secret required.
 * Per-record failure (signing or context build) skips that record instead of
 * aborting the batch; the count is surfaced to the organizer.
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

  const results = [];
  let signFailures = 0;
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const ctx = verificationContext(row, i);
      let sig = ctx.VERIFY_SIG;
      let h = ctx.VERIFY_H;

      if (privateKey) {
        sig = await signPayload(privateKey, h);
      }

      const finalCtx = applyVerificationSignature(ctx, sig);

      const base = safeFilename(resolveText(state.settings.filename, row, finalCtx).replace(/\.pdf$/i, ""))
        || ctx.CERTIFICATE_ID || `certificate-${i + 1}`;
      const fullName = uniqueFilename(base, used) + ".pdf";
      const registryItem = {
        id: ctx.CERTIFICATE_ID,
        sig,
        h,
        name: String(row.NAME || ""),
        role: String(row.ROLE || ""),
        event: String(row.EVENT || ""),
        date: String(row.DATE || ""),
        organization: String(row.ORGANIZATION || ""),
        filename: fullName
      };
      results.push({ id: i, row, ctx: finalCtx, fullName, registryItem, svg: () => renderCertificateSVG(row, i, finalCtx, { strict: true }) });
    } catch (e) {
      signFailures++;
      console.warn(`Record ${i + 1} could not be signed or prepared and was skipped:`, e);
    }
  }
  return { jobs: results, publicKeyJWK, signFailures };
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
 * Main-thread generator: used when Workers/OffscreenCanvas are unavailable, and as
 * the per-record retry path for records whose worker render failed.
 */
async function renderJobsOnMainThread(jobs, acc) {
  for (let i = 0; i < jobs.length; i++) {
    if (_cancelRequested) throw cancelledError();
    const job = jobs[i];
    const blob = await svgToPdf(job.svg());
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

  const workerUrl = getWorkerUrl();
  const workers = [];
  try {
    for (let w = 0; w < poolSize; w++) workers.push({ handle: new Worker(workerUrl), ready: false, dead: false });
  } catch (spawnErr) {
    workers.forEach(w => { try { w.handle.terminate(); } catch (_) {} });
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
          renderJobsOnMainThread(retryJobs.splice(0), acc)
            .then(() => finish())
            .catch(err => finish(err));
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
          svgString: job.svg(),
          width: targetWidth,
          height: targetHeight
        });
      }

      function assembleFromBuffer(id, buffer) {
        const job = jobs[id];
        const pdf = new jsPDF({
          orientation: template.page.orientation === "landscape" ? "landscape" : "portrait",
          unit: "pt",
          format: [template.page.width, template.page.height],
          compress: true
        });
        const bytes = new Uint8Array(buffer);
        const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

        if (isPng) {
          pdf.addImage(bytes, "PNG", 0, 0, template.page.width, template.page.height, undefined, "FAST");
        } else if (typeof document !== 'undefined') {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          const imgData = new ImageData(new Uint8ClampedArray(buffer), targetWidth, targetHeight);
          ctx.putImageData(imgData, 0, 0);
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, template.page.width, template.page.height, undefined, "FAST");
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
          fonts: (state.fonts || []).map(f => ({ family: f.family, data: f.data })),
          scale: scale
        });
      });
    });
  } finally {
    workers.forEach(w => { try { w.handle.terminate(); } catch (_) {} });
  }

  return { acc, template, fontWarnings: [...fontWarnings] };
}

/**
 * Public verification registry, privacy-safe by construction: each entry is
 * only a certificate ID and its signature/digest. Names, roles, dates and
 * filenames never leave this machine. Schema 3 (with the ECDSA public key) is
 * emitted only when the cached signing key actually belongs to the CURRENT
 * project — a key loaded for an earlier project must never anchor this
 * registry's trust.
 */
export function buildPublicRegistry() {
  const keyIsCurrent = Boolean(state._signingPublicKey) && state._signingKeyProjectName === state.projectName;
  return {
    schema: keyIsCurrent ? 3 : 2,
    publicKey: keyIsCurrent ? state._signingPublicKey : undefined,
    event: String(state.globalFields?.EVENT || ""),
    organization: String(state.globalFields?.ORGANIZATION || ""),
    project: state.projectName,
    generatedAt: new Date().toISOString(),
    signature: keyIsCurrent
      ? { algorithm: "ecdsa-p256", hash: "sha256-canonical-payload", fields: ["id", "name", "role", "event", "date", "organization"] }
      : { algorithm: "sha256-v2", encoding: "first 16 hex chars", fields: ["id", "name", "role", "event", "date", "organization"] },
    totalCertificates: (state.registry || []).length,
    certificates: (state.registry || []).map(c => ({ id: c.id, sig: c.sig, ...(c.h ? { h: c.h } : {}) }))
  };
}

export async function generateAll() {
  if (_running) throw new Error("A batch is already being generated. Cancel it or wait for it to finish.");
  _running = true;
  _cancelRequested = false;

  // Preflight: refuse conditions that would silently produce broken credentials.
  if (String(state.settings.verifySecret || "") === LEGACY_VERIFY_SALT) {
    _running = false;
    throw new Error("Generation blocked: the signing secret is the publicly known legacy default. Click Randomize on the Generate step to get a private secret.");
  }
  if (state.elements.some(e => e.type === "qr") && !qrVendorAvailable()) {
    _running = false;
    throw new Error("Generation blocked: the QR code library could not be loaded, so verification codes cannot be printed. Reload the page and try again.");
  }

  const source = mappedRows();
  const rows = source.filter(r => String(r.NAME || "").trim());
  if (!rows.length) {
    _running = false;
    throw new Error("No valid participant names were found. Map the NAME field before generating certificates.");
  }
  const skipped = source.length - rows.length;
  const jobsResult = await buildJobs(rows);
  const jobs = jobsResult.jobs;
  if (!jobs.length) {
    _running = false;
    throw new Error(`All ${rows.length} record(s) failed during signing or preparation. Check the signing secret and console for details.`);
  }
  if (jobsResult.publicKeyJWK) {
    state._signingPublicKey = jobsResult.publicKeyJWK;
    state._signingKeyProjectName = state.projectName;
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
  }
}
