import { state } from './state.js';
import { autoMap } from './mapping.js';
import { escapeHTML } from './utils.js';

export function parseCSV(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
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
  const headers = rows[0].map((h, i) => String(h).trim() || `Column ${i + 1}`);
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

export async function parseSpreadsheet(file) {
  const ext = (file.name.split('.').pop() || "").toLowerCase();
  let rows = [];
  if (ext === 'csv') {
    rows = parseCSV(await file.text());
  } else {
    if (!window.XLSX) throw new Error("Excel support could not load. Check your internet connection, or save the file as CSV and try again.");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
  }
  rows = rows.filter(r => Object.values(r).some(v => String(v ?? "").trim() !== ""));
  if (!rows.length) throw new Error("The spreadsheet contains no participant rows.");
  state.rows = rows;
  state.columns = Object.keys(rows[0]);
  state.sampleIndex = 0;
  autoMap();
}
