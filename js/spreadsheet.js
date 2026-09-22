import { state } from './state.js';
import { autoMap } from './mapping.js';
import { maxSpreadsheetBytes } from './config.js';

function normalizeHeader(raw, index, used) {
  let base = String(raw ?? "").replace(/^\uFEFF/, "").trim() || `Column ${index + 1}`;
  let name = base, n = 2;
  while (used.has(name)) name = `${base} (${n++})`;
  used.add(name);
  return name;
}

// RFC 4180 parser: quoted fields, escaped quotes, CRLF, UTF-8 BOM,
// ragged rows (columns unified across the sheet), duplicate headers disambiguated.
export function parseCSV(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(cell); cell = ""; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); cell = "";
      if (row.some(v => String(v).trim() !== "")) rows.push(row);
      row = []; continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); if (row.some(v => String(v).trim() !== "")) rows.push(row); }
  if (!rows.length) return [];

  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const used = new Set();
  const headers = Array.from({ length: width }, (_, i) => normalizeHeader(rows[0][i], i, used));
  return rows.slice(1).map(values => {
    const o = {};
    headers.forEach((h, i) => {
      Object.defineProperty(o, h, { value: values[i] ?? "", enumerable: true, writable: true, configurable: true });
    });
    return o;
  });
}

function columnUnion(rows) {
  const seen = new Set();
  const cols = [];
  rows.forEach(r => Object.keys(r).forEach(k => { if (!seen.has(k)) { seen.add(k); cols.push(k); } }));
  return cols;
}

export async function parseSpreadsheet(file) {
  if (!file || !file.name) throw new Error("No file was provided.");
  if (file.size && file.size > maxSpreadsheetBytes) throw new Error("Spreadsheet is too large. Split it into smaller files (20 MB limit) or trim unused columns.");

  const ext = (file.name.split('.').pop() || "").toLowerCase();
  let rows = [];
  let sheetInfo = { totalSheets: 1, sheetName: "" };

  if (ext === 'csv' || ext === 'tsv') {
    let text = await file.text();
    if (ext === 'tsv') text = text.replace(/\t/g, ',');
    rows = parseCSV(text);
  } else {
    const xlsxLib = (typeof window !== 'undefined' && window.XLSX) || (typeof globalThis !== 'undefined' && globalThis.XLSX);
    if (!xlsxLib) throw new Error("Excel support could not load. Reload the page, or save the file as CSV and try again.");
    try {
      const buf = await file.arrayBuffer();
      const wb = xlsxLib.read(buf, { type: "array" });
      const first = wb.SheetNames[0];
      sheetInfo = { totalSheets: wb.SheetNames.length, sheetName: first || "" };
      const ws = wb.Sheets[first];
      rows = xlsxLib.utils.sheet_to_json(ws, { defval: "", raw: false });
    } catch (err) {
      throw new Error(`Failed to parse Excel file (${err?.message || err}). If the file is password-protected or corrupted, export it as a CSV and try again.`);
    }
  }

  rows = rows
    .map(r => {
      const clean = {};
      for (const [k, v] of Object.entries(r)) {
        if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
          clean[k] = v;
        }
      }
      return clean;
    })
    .filter(r => Object.values(r).some(v => String(v ?? "").trim() !== ""));
  if (!rows.length) throw new Error("The spreadsheet contains no participant rows.");

  state.rows = rows;
  state.columns = columnUnion(rows);
  state.sampleIndex = 0;
  state.importMeta = {
    fileName: file.name,
    size: Number(file.size || 0),
    totalSheets: sheetInfo.totalSheets || 1,
    sheetName: sheetInfo.sheetName || ""
  };
  autoMap();
  return sheetInfo;
}
