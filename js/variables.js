import { state } from './state.js';

export const variableKeys = ["NAME", "ROLE", "EVENT", "DATE", "VENUE", "INSTITUTION", "DEPARTMENT", "EMAIL", "ORGANIZATION", "CERTIFICATE_ID", "YEAR"];

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
  data.CERTIFICATE_ID = formatId(Number(state.certificate.start) + index);
  data.YEAR = state.certificate.year;
  Object.keys(data).forEach(k => {
    out = out.replaceAll(`{{${k}}}`, data[k] == null ? "" : String(data[k]));
  });
  return out.replace(/{{[A-Z0-9_]+}}/g, "");
}
