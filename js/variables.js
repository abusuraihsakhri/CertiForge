import { state } from './state.js';
import { verifyBaseUrl } from './config.js';

export const variableKeys = [
  "NAME", "ROLE", "EVENT", "DATE", "VENUE",
  "INSTITUTION", "DEPARTMENT", "EMAIL", "ORGANIZATION",
  "CERTIFICATE_ID", "YEAR", "VERIFY_URL", "VERIFY_SIG",
  "EDITION", "AWARD_RANK", "PAPER_TITLE", "PAPER_TYPE",
  "CME_HOURS", "CME_REF", "COUNCIL_REG_NO"
];

// Fields covered by the tamper-evident digest, in canonical order.
export const SIGNATURE_FIELDS = ["id", "name", "role", "event", "date", "organization"];

function rightRotate(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256(str) {
  const ascii = unescape(encodeURIComponent(str));
  const asciiLength = ascii.length;
  const wordsLength = (asciiLength + 8 >> 6) + 1 << 4;
  const words = new Array(wordsLength).fill(0);
  for (let i = 0; i < asciiLength; i++) words[i >> 2] |= (ascii.charCodeAt(i) & 255) << ((3 - i % 4) * 8);
  words[asciiLength >> 2] |= 128 << ((3 - asciiLength % 4) * 8);
  words[wordsLength - 1] = asciiLength * 8;

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const w = new Array(64);
  for (let i = 0; i < wordsLength; i += 16) {
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      if (j < 16) w[j] = words[i + j];
      else {
        const g0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const g1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + g0 + w[j - 7] + g1) | 0;
      }
      const ch = (e & f) ^ (~e & g), maj = (a & b) ^ (a & c) ^ (b & c);
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const t1 = (h + s1 + ch + k[j] + w[j]) | 0, t2 = (s0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

export function extractConferencePrefix(name) {
  if (!name || typeof name !== 'string') return 'CONF';
  const clean = name.replace(/['"’]/g, '').trim();
  const words = clean.split(/[\s\-_\/]+/).filter(Boolean);
  if (!words.length) return 'CONF';

  const grammaticalStops = new Set([
    'A', 'AN', 'AND', 'OR', 'THE', 'OF', 'FOR', 'IN', 'ON', 'AT', 'TO', 'WITH',
    'BY', 'FROM', 'ABOUT', 'AS', 'INTO', 'LIKE', 'THROUGH', 'AFTER', 'OVER'
  ]);
  const nonYearWords = words.filter(w => !/^\d{4}$/.test(w) && !/^\d+(st|nd|rd|th)$/i.test(w));
  const meaningfulWords = nonYearWords.filter(w => !grammaticalStops.has(w.toUpperCase()));
  const sourceWords = meaningfulWords.length > 0 ? meaningfulWords : (nonYearWords.length ? nonYearWords : words);

  if (sourceWords.length === 1) {
    return sourceWords[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CONF';
  }

  return sourceWords.map(w => {
    const m = w.match(/[a-zA-Z0-9]/);
    return m ? m[0].toUpperCase() : '';
  }).join('').slice(0, 8) || 'CONF';
}

export function extractConferenceYear(name) {
  if (!name || typeof name !== 'string') return String(new Date().getFullYear());
  const m = name.match(/\b(20\d\d)\b/);
  return m ? m[1] : String(new Date().getFullYear());
}

export function getVerificationBaseUrl(loc = (typeof window !== 'undefined' ? window.location : null)) {
  const origin = loc && loc.origin;
  if (loc && origin && origin !== 'null' && /^https?:/i.test(origin)) {
    const path = String(loc.pathname || '');
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    return `${origin}${dir}verify.html`;
  }
  return verifyBaseUrl;
}

export function canonicalSignatureFields(data = {}) {
  return {
    id: String(data.CERTIFICATE_ID ?? data.id ?? '').trim(),
    name: String(data.NAME ?? data.name ?? '').trim(),
    role: String(data.ROLE ?? data.role ?? '').trim(),
    event: String(data.EVENT ?? data.event ?? '').trim(),
    date: String(data.DATE ?? data.date ?? '').trim(),
    organization: String(data.ORGANIZATION ?? data.organization ?? data.org ?? '').trim()
  };
}

// Length-prefixed canonicalization prevents "A|B"+"" colliding with "A"+"|B".
export function canonicalPayload(fields) {
  const f = canonicalSignatureFields(fields);
  return "v2|" + SIGNATURE_FIELDS.map(key => {
    const value = f[key];
    return `${value.length}:${value}`;
  }).join("|");
}

export function computeVerificationSignature(data, secret) {
  const key = typeof secret === "string" ? secret : "";
  if (!key) throw new Error("A signing secret is required. Set one in the Generate step.");
  return sha256(`${canonicalPayload(data)}|${key}`).slice(0, 16);
}

export function buildVerificationUrl(fields, sig) {
  const f = canonicalSignatureFields(fields);
  const p = new URLSearchParams();
  if (f.id) p.set('id', f.id);
  if (f.name) p.set('name', f.name);
  if (f.role) p.set('role', f.role);
  if (f.event) p.set('event', f.event);
  if (f.date) p.set('date', f.date);
  if (f.organization) p.set('org', f.organization);
  if (sig) p.set('sig', sig);
  return `${getVerificationBaseUrl()}?${p.toString()}`;
}

export function getVerificationUrl(data, secret) {
  const sig = computeVerificationSignature(data, secret);
  return buildVerificationUrl(data, sig);
}

/**
 * Per-record verification context: computes the ID, digest and QR URL exactly once.
 * Registry rows, PDF output and the preview all consume this same object, so what
 * is previewed is byte-identical to what is printed and registered.
 */
export function verificationContext(row, index = 0) {
  const data = Object.assign({}, state.globalFields || {}, row || {});
  const certId = formatId(Number(state.certificate.start) + (Number(index) || 0));
  const fields = canonicalSignatureFields({
    id: certId,
    name: data.NAME,
    role: data.ROLE,
    event: data.EVENT,
    date: data.DATE,
    organization: data.ORGANIZATION
  });
  const sig = computeVerificationSignature(fields, state.settings?.verifySecret);
  return {
    CERTIFICATE_ID: certId,
    YEAR: String(state.certificate.year ?? ""),
    VERIFY_SIG: sig,
    VERIFY_URL: buildVerificationUrl(fields, sig)
  };
}

export function formatId(n) {
  const c = state.certificate;
  const digits = Math.max(1, Math.min(8, Number(c.digits) || 4));
  const num = String(Math.max(0, Math.floor(Number(n) || 0))).padStart(digits, "0");
  return [c.prefix, c.year, num].filter(Boolean).join(c.separator ?? "-");
}

export function columnToken(name) {
  return String(name || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// Generic stand-in record used ONLY by the design canvas / template previews.
// It is never merged into generated output (see resolveText).
export function sampleRecord() {
  const raw = state.rows[state.sampleIndex] || {};
  const custom = {};
  Object.entries(raw).forEach(([k, v]) => { const token = columnToken(k); if (token && !variableKeys.includes(token)) custom[token] = v; });
  return Object.assign({
    NAME: "Participant Name",
    ROLE: "Delegate",
    EVENT: "Conference or Event Name",
    DATE: "Event Date",
    VENUE: "Event Venue",
    ORGANIZATION: "Issuing Organization",
    INSTITUTION: "Institution",
    DEPARTMENT: "Department",
    EMAIL: "participant@example.com",
    EDITION: "1st",
    AWARD_RANK: "First",
    PAPER_TYPE: "Paper type",
    PAPER_TITLE: "Paper or project title",
    CME_HOURS: "0",
    CME_REF: "CME/REF/000",
    COUNCIL_REG_NO: "REG-00000"
  }, state.globalFields || {}, custom, raw);
}

/**
 * Single-pass {{TOKEN}} substitution. Values are never re-scanned, so a field
 * containing "{{NAME}}" cannot inject itself into other tokens. Real output only
 * ever uses real mapped data + conference-wide globals — no sample values leak.
 */
export function resolveText(text, row, ctxOrIndex = 0) {
  const ctx = (ctxOrIndex && typeof ctxOrIndex === "object")
    ? ctxOrIndex
    : verificationContext(row, Number(ctxOrIndex) || 0);
  const data = Object.assign({}, state.globalFields || {}, row || {}, ctx);
  return String(text ?? "").replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v == null ? "" : String(v);
  });
}
