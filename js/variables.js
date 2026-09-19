import { state } from './state.js';

export const variableKeys = [
  "NAME", "ROLE", "EVENT", "DATE", "VENUE",
  "INSTITUTION", "DEPARTMENT", "EMAIL", "ORGANIZATION",
  "CERTIFICATE_ID", "YEAR", "VERIFY_URL", "VERIFY_SIG"
];

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

export function getVerificationBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const path = window.location.pathname.replace(/\/[^\/]*$/, '');
    return `${window.location.origin}${path}/verify.html`;
  }
  return 'https://abusuraihsakhri.github.io/CertiForge/verify.html';
}

export function computeVerificationSignature(data, secret = 'CertiForge-Secure-Salt') {
  const canonical = [
    String(data.CERTIFICATE_ID || data.id || '').trim(),
    String(data.NAME || data.name || '').trim(),
    String(data.EVENT || data.event || '').trim(),
    String(data.DATE || data.date || '').trim(),
    String(data.ORGANIZATION || data.organization || data.org || '').trim()
  ].join('|');
  return sha256(`${canonical}|${secret}`).slice(0, 16);
}

export function getVerificationUrl(data, secret = 'CertiForge-Secure-Salt') {
  const baseUrl = getVerificationBaseUrl();
  const certId = String(data.CERTIFICATE_ID || data.id || '');
  const sig = computeVerificationSignature(data, secret);
  const p = new URLSearchParams();
  if (certId) p.set('id', certId);
  if (data.NAME || data.name) p.set('name', String(data.NAME || data.name));
  if (data.ROLE || data.role) p.set('role', String(data.ROLE || data.role));
  if (data.EVENT || data.event) p.set('event', String(data.EVENT || data.event));
  if (data.DATE || data.date) p.set('date', String(data.DATE || data.date));
  if (data.ORGANIZATION || data.organization || data.org) p.set('org', String(data.ORGANIZATION || data.organization || data.org));
  p.set('sig', sig);
  return `${baseUrl}?${p.toString()}`;
}

export function formatId(n) {
  const c = state.certificate, num = String(n).padStart(Number(c.digits) || 4, "0");
  return [c.prefix, c.year, num].filter(Boolean).join(c.separator || "-");
}

export function columnToken(name) {
  return String(name || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function sampleRecord() {
  const raw = state.rows[state.sampleIndex] || {};
  const custom = {};
  Object.entries(raw).forEach(([k, v]) => { const token = columnToken(k); if (token && !variableKeys.includes(token)) custom[token] = v; });
  return Object.assign({
    NAME: "John Smith", ROLE: "Delegate", INSTITUTION: "Example University",
    DEPARTMENT: "Department of Medicine", EMAIL: "john@example.com",
    YEAR: state.certificate.year
  }, state.globalFields || {}, custom, raw);
}

export function resolveText(text, row, index = 0) {
  let out = String(text ?? "");
  const data = Object.assign({}, sampleRecord(), state.globalFields || {}, row || {});
  const certId = formatId(Number(state.certificate.start) + index);
  data.CERTIFICATE_ID = certId;
  data.YEAR = state.certificate.year;
  data.VERIFY_SIG = computeVerificationSignature(data, state.settings?.verifySecret);
  data.VERIFY_URL = getVerificationUrl(data, state.settings?.verifySecret);

  Object.keys(data).forEach(k => {
    out = out.replaceAll(`{{${k}}}`, data[k] == null ? "" : String(data[k]));
  });
  return out.replace(/{{[A-Z0-9_]+}}/g, "");
}
