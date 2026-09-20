/**
 * CertiForge verification portal logic.
 *
 * Trust model (v0.5):
 *  - The signing secret NEVER exists on this page and is never accepted from a URL.
 *  - A credential is only confirmed green when it matches the organizer-published
 *    verification-registry.json (same folder) or a registry file the operator
 *    deliberately loads for offline checking.
 *  - Without a registry the portal shows the record plus its digest but states
 *    honestly that the signature cannot be confirmed.
 */
import { escapeHTML } from './utils.js';

const esc = escapeHTML;
const SIG_PATTERN = /^[a-f0-9]{8,16}$/i;

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
    legacySecretPresent
  };
}

function norm(v) { return String(v ?? "").trim(); }

export function normalizeRegistry(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.certificates)) return null;
  return {
    event: norm(raw.event || raw.project || ""),
    organization: norm(raw.organization || ""),
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
        filename: norm(c.filename)
      }))
  };
}

/**
 * Compare a scanned/supplied record against the active registry.
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
    .filter(([, key]) => norm(record[key]) !== "" && norm(match[key]) !== "" && norm(record[key]).toLowerCase() !== norm(match[key]).toLowerCase())
    .map(([label]) => label);
  if (diffs.length) return { status: 'mismatch', match, diffs };

  if (!norm(match.sig) || norm(match.sig).toLowerCase() !== norm(record.sig).toLowerCase()) {
    return { status: 'mismatch', match, diffs: ["Signature digest"] };
  }
  return { status: 'verified', match };
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
        <strong>How this was verified:</strong> the certificate ID, recipient details and the QR digest were
        matched field-by-field against the organizer's published verification registry. The signing secret was
        not exposed to this page or the link.
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

      <div id="registryStatus" class="mini-help" style="margin-bottom:16px;font-size:12px;color:var(--muted)">${registry ? `Loaded registry: <strong>${registry.certificates.length} certificates</strong>${registry.event ? ` for <em>${esc(registry.event)}</em>` : ''}.` : 'No registry loaded yet.'}</div>

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
      renderVerified(card, { id: match.id, name: match.name, role: match.role, event: match.event || registry.event, date: match.date, organization: match.organization || registry.organization, sig: match.sig }, match);
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
  const stamp = document.getElementById('timestamp');
  if (stamp) stamp.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const card = document.getElementById('verifyCard');
  if (!card) return;

  loadedRegistry = await loadStaticRegistry();
  const record = parseRecord(window.location.search);

  if (record.id && record.sig) {
    const outcome = evaluateRecord(record, loadedRegistry);
    if (outcome.status === 'verified') renderVerified(card, record, outcome.match);
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
