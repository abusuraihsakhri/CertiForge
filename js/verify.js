/**
 * CertiForge verification portal logic.
 *
 * Trust model:
 *  - The signing secret/private key NEVER exists on this page and is never accepted from a URL.
 *  - Schema-2 links carry a certificate ID plus keyed digest and are confirmed
 *    only when that pair matches the organizer-published registry.
 *  - Schema-3 links carry certificate ID, payload hash and ECDSA P-256 signature.
 *    The verifier requires the exact ID/hash/signature tuple published by the
 *    registry and then verifies the signature with the registry's public key.
 *  - Legacy links carrying full fields and legacy registries holding plaintext
 *    fields remain supported: presented fields are compared, and the digest
 *    still has the final say.
 *  - A manually typed ID without a digest only proves a record exists; the
 *    portal says so instead of claiming verification.
 *  - Without a registry the portal shows the record plus its digest but states
 *    honestly that the signature cannot be confirmed.
 */
import { escapeHTML } from './utils.js';
import { hasWebCrypto, importPublicKeyJWK, verifySignature } from './crypto.js';
import { initTheme } from './theme.js';

const esc = escapeHTML;
const SIG_PATTERN = /^[a-zA-Z0-9_\-]{8,200}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

export function parseRecord(search) {
  const p = new URLSearchParams(search);
  const get = (...keys) => {
    for (const k of keys) { const v = p.get(k); if (v != null && v !== "") return v; }
    return "";
  };
  // Legacy links carried ?secret=/key= — deliberately ignored (they were a forgery vector).
  const legacySecretPresent = Boolean(p.get('secret') || p.get('key'));
  return {
    id: get('id', 'cert_id', 'certificate_id'),
    name: get('name', 'n'),
    role: get('role', 'r'),
    event: get('event', 'e'),
    date: get('date', 'd'),
    organization: get('org', 'organization', 'o'),
    sig: get('sig', 's'),
    h: get('h'),
    legacySecretPresent
  };
}

function norm(v) { return String(v ?? "").trim(); }

export function normalizeRegistry(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.certificates)) return null;
  const schema = raw.schema === 3 ? 3 : raw.schema === 2 ? 2 : 1;
  return {
    schema,
    publicKey: schema === 3 && raw.publicKey && raw.publicKey.kty ? raw.publicKey : undefined,
    event: norm(raw.event || raw.project || ""),
    organization: norm(raw.organization || ""),
    generatedAt: norm(raw.generatedAt || ""),
    certificates: raw.certificates
      .filter(c => c && typeof c === "object" && norm(c.id))
      .slice(0, 250000)
      .map(c => ({
        id: norm(c.id),
        name: norm(c.name),
        role: norm(c.role),
        event: norm(c.event),
        date: norm(c.date),
        organization: norm(c.organization),
        sig: norm(c.sig),
        h: norm(c.h),
        filename: norm(c.filename)
      }))
  };
}

/**
 * Compare a scanned/supplied record against the active registry.
 * Only fields the record actually presents are compared (current links carry
 * none — the keyed digest alone binds every field), and only when the registry
 * entry holds them (schema-2 registries store no plaintext fields). The digest
 * comparison always has the final say.
 * Returns { status: 'verified' | 'mismatch' | 'not-found' | 'no-registry' | 'invalid', ... }
 */
export function evaluateRecord(record, registry) {
  if (!record || !norm(record.id)) return { status: 'invalid', reason: "No certificate ID was supplied." };
  if (!SIG_PATTERN.test(norm(record.sig))) return { status: 'invalid', reason: "The supplied signature is missing or malformed." };
  if (!registry) return { status: 'no-registry' };

  const wanted = norm(record.id).toUpperCase();
  const match = registry.certificates.find(c => norm(c.id).toUpperCase() === wanted);
  if (!match) return { status: 'not-found', id: record.id };

  const fields = [["Recipient", "name"], ["Role", "role"], ["Event", "event"], ["Issue date", "date"], ["Issuing authority", "organization"]];
  const diffs = fields
    .filter(([, key]) => norm(record[key]) !== "" && norm(match[key]) !== "")
    .filter(([, key]) => norm(record[key]).toLowerCase() !== norm(match[key]).toLowerCase())
    .map(([label]) => label);
  if (diffs.length) return { status: 'mismatch', match, diffs };

  if (!norm(match.sig) || norm(match.sig).toLowerCase() !== norm(record.sig).toLowerCase()) {
    return { status: 'mismatch', match, diffs: ["Signature digest"] };
  }
  return { status: 'verified', match };
}

/**
 * Verify a schema-3 ECDSA record against the exact registry entry for its ID.
 * A valid signature alone is not enough: the scanned hash and signature must
 * also be the pair that the issuer published for that certificate ID.
 */
export async function evaluateEcdsaRecord(record, registry) {
  if (!record || !norm(record.id)) return { status: 'invalid', reason: "No certificate ID was supplied." };
  if (!SIG_PATTERN.test(norm(record.sig))) return { status: 'invalid', reason: "The supplied signature is missing or malformed." };
  if (!HASH_PATTERN.test(norm(record.h))) return { status: 'invalid', reason: "The supplied payload hash is missing or malformed." };
  if (!registry) return { status: 'no-registry' };
  if (registry.schema !== 3 || !registry.publicKey) return { status: 'invalid', reason: "The active registry does not contain an ECDSA public key." };

  const wanted = norm(record.id).toUpperCase();
  const match = registry.certificates.find(c => norm(c.id).toUpperCase() === wanted);
  if (!match) return { status: 'not-found', id: record.id };

  if (!HASH_PATTERN.test(norm(match.h))) {
    return { status: 'invalid', match, reason: "The registry entry does not contain a valid payload hash." };
  }
  if (norm(match.h).toLowerCase() !== norm(record.h).toLowerCase()) {
    return { status: 'mismatch', match, diffs: ["Payload hash"] };
  }
  if (!norm(match.sig) || norm(match.sig) !== norm(record.sig)) {
    return { status: 'mismatch', match, diffs: ["ECDSA signature"] };
  }

  try {
    const publicKey = await importPublicKeyJWK(registry.publicKey);
    const valid = await verifySignature(publicKey, norm(record.h), norm(record.sig));
    return valid
      ? { status: 'verified', match }
      : { status: 'mismatch', match, diffs: ["ECDSA signature"] };
  } catch (_) {
    return { status: 'invalid', match, reason: "The registry public key or signature could not be processed." };
  }
}

function detailRows(pairs) {
  return pairs.filter(([, v]) => norm(v) !== "").map(([label, v]) =>
    `<div class="detail-item"><span class="detail-label">${esc(label)}</span><span class="detail-val ${label === "Certificate ID" || label.includes("Digest") ? "mono" : ""}">${esc(v)}</span></div>`
  ).join("");
}

function actionsHtml() {
  return `<div class="verify-actions">
    <button class="btn primary grow" id="printSlipBtn" type="button">Print Verification Slip</button>
    <a href="verify.html" class="btn">Verify Another</a>
  </div>`;
}

function bindActions() {
  const printBtn = document.getElementById('printSlipBtn');
  if (printBtn) printBtn.onclick = () => window.print();
}

export function renderVerified(card, record, match) {
  const shown = {
    Recipient: record.name || match.name,
    "Certificate ID": record.id,
    Role: record.role || match.role,
    "Event / Conference": record.event || match.event,
    "Issue Date": record.date || match.date,
    "Issuing Authority": record.organization || match.organization
  };
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge verified">
        <div class="status-icon" aria-hidden="true">✓</div>
        <span>Registry-Confirmed Credential</span>
      </div>
      <h1 class="verify-title">Credential Verified</h1>
      <p class="verify-sub">This certificate matches the official issuance registry published by the organizer.</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows(Object.entries(shown))}</div>
      <div class="security-notice">
        <strong>How this was verified:</strong> the certificate ID and the QR code's keyed digest exactly match
        an entry in the organizer's published verification registry. Any details shown come from that registry,
        not from the link you scanned. The signing secret was never exposed to this page or the link, and
        current registries store no participant names — only IDs and digests.
      </div>
      ${actionsHtml()}
    </div>`;
  bindActions();
}

export function renderMismatch(card, record, match, diffs) {
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge failed">
        <div class="status-icon" aria-hidden="true">✕</div>
        <span>Verification Failed</span>
      </div>
      <h1 class="verify-title">This Certificate Does Not Match the Registry</h1>
      <p class="verify-sub">A record with this ID exists, but ${diffs.length === 1 ? `the ${esc(diffs[0]).toLowerCase()} does not match` : `${diffs.length} fields do not match`} the officially issued data. The certificate may be altered or forged.</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows([
        ["Supplied ID", record.id],
        ["Supplied Name", record.name],
        ["Registry Name", match.name],
        ["Supplied Event", record.event],
        ["Registry Event", match.event]
      ])}</div>
      <div class="verify-actions"><a href="verify.html" class="btn primary grow" style="text-align:center">Try Another Certificate</a></div>
    </div>`;
}

export function renderEcdsaVerified(card, record, match, registry) {
  const shown = {
    "Certificate ID": record.id,
    "Recipient": record.name || match?.name || "",
    "Event / Conference": record.event || registry?.event || "",
    "Issuing Authority": record.organization || registry?.organization || "",
    "Issue Date": record.date || match?.date || "",
    "Payload hash": record.h || ""
  };
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge verified">
        <div class="status-icon" aria-hidden="true">✓</div>
        <span>ECDSA P-256 Signature Verified</span>
      </div>
      <h1 class="verify-title">Credential Cryptographically Verified</h1>
      <p class="verify-sub">The issuer's ECDSA P-256 signature over this certificate's payload hash is valid. No secret was exposed to this page.</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows(Object.entries(shown))}</div>
      <div class="security-notice">
        <strong>How this was verified:</strong> the QR code's certificate ID, payload hash and ECDSA
        signature exactly match the organizer's registry entry, and the signature verifies against the
        published P-256 public key. A hash-only registry does not disclose recipient details; organizations
        that need third-party identity comparison should publish an approved subset of certificate metadata
        through their verification service. The private signing key is never exposed to this page or link.
      </div>
      ${actionsHtml()}
    </div>`;
  bindActions();
}

export function renderEcdsaMismatch(card, record, registry) {
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge failed">
        <div class="status-icon" aria-hidden="true">✕</div>
        <span>Signature Verification Failed</span>
      </div>
      <h1 class="verify-title">Invalid ECDSA Signature</h1>
      <p class="verify-sub">The QR code's ECDSA P-256 signature does not verify against the organizer's public key. The certificate may be altered or forged.</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows([
        ["Supplied ID", record.id],
        ["Payload hash", record.h || ""]
      ])}</div>
      <div class="verify-actions"><a href="verify.html" class="btn primary grow" style="text-align:center">Try Another Certificate</a></div>
    </div>`;
}

export function renderExists(card, match, registry) {
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge search">
        <div class="status-icon" aria-hidden="true">i</div>
        <span>Record Located</span>
      </div>
      <h1 class="verify-title">This Certificate ID Exists in the Registry</h1>
      <p class="verify-sub">A typed ID alone does not prove authenticity — anyone can read IDs from the public registry. Scan the QR code printed on the certificate to confirm it cryptographically.</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows([
        ["Certificate ID", match.id],
        ["Recipient", match.name],
        ["Role", match.role],
        ["Event / Conference", match.event || registry.event],
        ["Issue Date", match.date],
        ["Issuing Authority", match.organization || registry.organization]
      ])}</div>
      <div class="verify-actions"><a href="verify.html" class="btn primary grow" style="text-align:center">Verify Another</a></div>
    </div>`;
}

export function renderNotFound(card, record, registry) {
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge failed">
        <div class="status-icon" aria-hidden="true">✕</div>
        <span>No Such Record</span>
      </div>
      <h1 class="verify-title">Certificate ID Not Found</h1>
      <p class="verify-sub">The official registry for <em>${esc(registry.event || registry.organization || 'this event')}</em> contains no certificate with ID <strong>${esc(record.id)}</strong>. Double-check the ID or contact the organizer.</p>
    </div>
    <div class="verify-body">
      <div class="verify-actions"><a href="verify.html" class="btn primary grow" style="text-align:center">Try Another Certificate</a></div>
    </div>`;
}

export function renderUnconfirmed(card, record, reason) {
  const supplied = {
    Recipient: record.name,
    "Certificate ID": record.id,
    Role: record.role,
    "Event / Conference": record.event,
    "Issue Date": record.date,
    "Issuing Authority": record.organization,
    "QR Digest (unconfirmed)": record.sig
  };
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge pending">
        <div class="status-icon" aria-hidden="true">…</div>
        <span>Signature Not Confirmable</span>
      </div>
      <h1 class="verify-title">Cannot Verify Without a Registry</h1>
      <p class="verify-sub">${esc(reason || "No verification registry is published at this site, so this page cannot confirm the certificate's authenticity.")}</p>
    </div>
    <div class="verify-body">
      <div class="detail-grid">${detailRows(Object.entries(supplied))}</div>
      <div class="security-notice">
        <strong>Why no green tick?</strong> Confirming a credential requires the organizer's published
        <code>verification-registry.json</code> (or their private signing secret, which is intentionally never
        placed on a public page). A digest shown here is only evidence of <em>self-consistency</em>, not authenticity.
        Organizers: export the registry from CertiForge's Generate step and publish it alongside this page.
      </div>
      <div class="verify-actions"><a href="verify.html" class="btn primary grow" style="text-align:center">Manual Search / Upload Registry</a></div>
    </div>`;
}

export function renderPortalSearch(card, registry, onRegistryLoaded) {
  card.innerHTML = `
    <div class="verify-head">
      <div class="status-badge search">
        <div class="status-icon" aria-hidden="true">?</div>
        <span>Credential Registry</span>
      </div>
      <h1 class="verify-title">Verify Certificate</h1>
      <p class="verify-sub">Search by Certificate ID, or load the organizer's registry file to verify offline.</p>
    </div>
    <div class="verify-body">
      <div class="verify-search-box">
        <div class="field">
          <label for="searchIdInput">Certificate ID</label>
          <div style="display:flex;gap:8px">
            <input id="searchIdInput" placeholder="e.g. ICML-2026-0001" autocomplete="off">
            <button class="btn primary" id="searchIdBtn" type="button">Verify</button>
          </div>
        </div>
      </div>

      <div id="registryStatus" class="mini-help" style="margin-bottom:16px;font-size:12px;color:var(--muted)">${registry ? `Loaded registry: <strong>${registry.certificates.length} certificates</strong>${registry.event ? ` for <em>${esc(registry.event)}</em>` : ''}${registry.schema === 2 ? ' — privacy-safe digest registry (stores no participant names)' : ''}.` : 'No registry loaded yet.'}</div>

      <div class="card panel dropzone-soft">
        <strong style="font-size:13px;display:block">Upload Registry JSON</strong>
        <p style="font-size:12px;color:var(--muted);margin:4px 0 12px">Load a <code>verification-registry.json</code> file to verify certificates offline.</p>
        <button class="btn" id="chooseRegistryBtn" type="button">Choose File</button>
        <input id="registryFileInput" type="file" accept=".json,application/json" aria-label="Choose registry JSON file" hidden>
      </div>

      <div id="searchResult" style="margin-top:16px" aria-live="polite"></div>
    </div>`;

  const input = document.getElementById('searchIdInput');
  const btn = document.getElementById('searchIdBtn');
  const fileInput = document.getElementById('registryFileInput');
  const chooseBtn = document.getElementById('chooseRegistryBtn');

  const doSearch = () => {
    const q = input.value.trim();
    if (!q) return;
    const resEl = document.getElementById('searchResult');
    if (!registry) {
      resEl.innerHTML = `<div class="notice">To look up by ID, load the organizer's <code>verification-registry.json</code> above, or scan the QR code printed on the certificate.</div>`;
      return;
    }
    const match = registry.certificates.find(c => norm(c.id).toUpperCase() === q.toUpperCase());
    if (match) {
      renderExists(card, match, registry);
    } else {
      resEl.innerHTML = `<div class="notice notice-danger">No record found for Certificate ID “<strong>${esc(q)}</strong>” in the active registry.</div>`;
    }
  };

  btn.onclick = doSearch;
  input.onkeydown = e => { if (e.key === 'Enter') doSearch(); };

  chooseBtn.onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size && file.size > 50 * 1024 * 1024) {
      document.getElementById('searchResult').innerHTML = `<div class="notice notice-danger">Registry file is too large (50 MB limit).</div>`;
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const loaded = normalizeRegistry(parsed);
      if (!loaded) throw new Error("Uploaded file is not a valid certificate registry JSON.");
      onRegistryLoaded(loaded);
    } catch (err) {
      document.getElementById('searchResult').innerHTML = `<div class="notice notice-danger">Invalid registry file: ${esc(err.message)}</div>`;
    }
  };
}

let loadedRegistry = null;

async function loadStaticRegistry() {
  try {
    const res = await fetch('verification-registry.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return normalizeRegistry(await res.json());
  } catch (_) {
    return null; // registry not published statically — normal for local use
  }
}

async function init() {
  initTheme();
  const stamp = document.getElementById('timestamp');
  if (stamp) stamp.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const card = document.getElementById('verifyCard');
  if (!card) return;

  loadedRegistry = await loadStaticRegistry();
  const record = parseRecord(window.location.search);

  if (record.id && record.sig) {
    // ECDSA path: when the registry carries a public key and the QR carries a
    // payload hash, verify the signature cryptographically. This is the
    // strongest path — it proves the issuer's private key signed exactly these
    // fields, without exposing the secret or requiring the registry to store
    // participant names.
    if (hasWebCrypto() && loadedRegistry?.schema === 3 && loadedRegistry?.publicKey && record.h) {
      const outcome = await evaluateEcdsaRecord(record, loadedRegistry);
      if (outcome.status === 'verified') {
        renderEcdsaVerified(card, record, outcome.match, loadedRegistry);
        return;
      }
      if (outcome.status === 'not-found') {
        renderNotFound(card, record, loadedRegistry);
        return;
      }
      if (outcome.status === 'mismatch' || outcome.status === 'invalid') {
        renderEcdsaMismatch(card, record, loadedRegistry);
        return;
      }
    }

    // Fallback: HMAC pair-match (schema 2 and legacy registries).
    const outcome = evaluateRecord(record, loadedRegistry);
    if (outcome.status === 'verified') renderVerified(card, {
      ...record,
      event: record.event || loadedRegistry.event,
      organization: record.organization || loadedRegistry.organization
    }, outcome.match);
    else if (outcome.status === 'mismatch') renderMismatch(card, record, outcome.match, outcome.diffs);
    else if (outcome.status === 'not-found') renderNotFound(card, record, loadedRegistry);
    else renderUnconfirmed(card, record, outcome.status === 'invalid' ? outcome.reason : (record.legacySecretPresent
      ? "Links containing a signing secret are no longer supported — secret-bearing links could be forged. Scanning is verified only against the published registry."
      : null));
    return;
  }

  const onRegistryLoaded = (reg) => {
    loadedRegistry = reg;
    drawSearch();
    const resEl = document.getElementById('searchResult');
    if (resEl) resEl.innerHTML = `<div class="notice notice-ok">Loaded registry with <strong>${reg.certificates.length} certificates</strong>. You can now search by ID.</div>`;
    const input = document.getElementById('searchIdInput');
    if (input && input.value.trim()) {
      const btn = document.getElementById('searchIdBtn');
      if (btn) btn.click();
    }
  };
  const drawSearch = () => renderPortalSearch(card, loadedRegistry, onRegistryLoaded);
  drawSearch();
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else if (typeof document !== 'undefined') {
  init();
}
