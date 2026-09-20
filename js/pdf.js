import { state } from './state.js';
import { getTemplate } from './templates.js';
import { resolveText, verificationContext } from './variables.js';
import { generateQRDataUrl } from './qrcode.js';
import { escapeHTML } from './utils.js';
import { SAFE_FONT_DATA_URL } from './security.js';

const esc = escapeHTML;

// The cache is revision-based: any history mutation (pushHistory/undo/redo/
// resetHistory) calls clearSvgCache(), so edited shapes or swapped fonts can
// never serve a stale skeleton. Within one batch every certificate is identical
// except for text/QR layers, so static fragments are reused per element index.
let _rev = 0;
let _header = null;
let _headerKey = null;
let _fragCache = { rev: -1, entries: [] };

export function clearSvgCache() {
  _rev++;
  _header = null;
  _headerKey = null;
}

let _measureCtx = null;
function measureCtx() {
  if (_measureCtx === null) {
    _measureCtx = false;
    try {
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        const m = c.getContext && c.getContext('2d');
        if (m && typeof m.measureText === 'function') _measureCtx = m;
      }
    } catch (_) { /* estimation fallback */ }
  }
  return _measureCtx || null;
}

function estimateWidth(text, size) {
  return [...String(text)].length * size * 0.52;
}

export function textRunWidth(text, font, size, weight) {
  const m = measureCtx();
  if (m) {
    try {
      m.font = `${Number(weight) || 400} ${size}px "${font}", ${font}, sans-serif`;
      const w = m.measureText(text).width;
      if (Number.isFinite(w) && w >= 0) return w;
    } catch (_) { /* fall through */ }
  }
  return estimateWidth(text, size);
}

function hardBreak(token, font, size, weight, maxWidth) {
  const out = [];
  let chunk = '';
  for (const ch of token) {
    if (chunk && textRunWidth(chunk + ch, font, size, weight) > maxWidth) { out.push(chunk); chunk = ch; }
    else chunk += ch;
  }
  if (chunk) out.push(chunk);
  return out;
}

// Greedy word wrap honoring hard newlines; mirrors the editor canvas (pre-wrap).
export function wrapToLines(text, font, size, weight, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    if (!para.trim()) { lines.push(para); continue; }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textRunWidth(candidate, font, size, weight) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
      while (line && textRunWidth(line, font, size, weight) > maxWidth && !line.includes(' ')) {
        const [broken, ...rest] = hardBreak(line, font, size, weight, maxWidth);
        lines.push(broken);
        line = rest.join('');
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

export function buildSvgSkeleton(templateId) {
  if (_header && _headerKey === templateId + "|" + _rev) return _header;
  const t = getTemplate(templateId);
  const fontDefs = (state.fonts || [])
    .filter(f => f && f.family && SAFE_FONT_DATA_URL.test(String(f.data || '').trim()))
    .map(f => `@font-face { font-family: "${esc(f.family)}"; src: url("${esc(String(f.data).trim())}"); }`);
  _header = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${Number(t.page.width) || 0}" height="${Number(t.page.height) || 0}" viewBox="0 0 ${Number(t.page.width) || 0} ${Number(t.page.height) || 0}">`
    + (fontDefs.length ? `<defs><style>${fontDefs.join('\n')}</style></defs>` : '')
    + `<rect width="100%" height="100%" fill="${esc(t.background || "#ffffff")}"/>`;
  _headerKey = templateId + "|" + _rev;
  return _header;
}

function shapeFragment(e) {
  const idAttr = e.id ? ` data-el="${esc(e.id)}"` : '';
  if (e.shape === "polygon" && e.points) return `<polygon${idAttr} points="${esc(e.points)}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${Number(e.strokeWidth) || 0}"/>`;
  if (e.shape === "circle") return `<circle${idAttr} cx="${Number(e.cx) || 0}" cy="${Number(e.cy) || 0}" r="${Number(e.r) || 0}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${Number(e.strokeWidth) || 0}"/>`;
  return `<rect${idAttr} x="${Number(e.x) || 0}" y="${Number(e.y) || 0}" width="${Number(e.w) || 0}" height="${Number(e.h) || 0}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${Number(e.strokeWidth) || 0}"/>`;
}

function imageFragment(e) {
  const idAttr = e.id ? ` data-el="${esc(e.id)}"` : '';
  const w = Number(e.w) || 180, h = Number(e.h) || 90;
  return `<image${idAttr} href="${esc(e.src)}" xlink:href="${esc(e.src)}" x="${(Number(e.x) || 0) - w / 2}" y="${(Number(e.y) || 0) - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${e.opacity ?? 1}"/>`;
}

// Identity+revision memoization for static fragments (shapes, images).
function staticFragment(e, index) {
  if (_fragCache.rev !== _rev) _fragCache = { rev: _rev, entries: [] };
  const hit = _fragCache.entries[index];
  if (hit && hit.el === e) return hit.frag;
  const frag = e.type === "shape" ? shapeFragment(e) : imageFragment(e);
  _fragCache.entries[index] = { el: e, frag };
  return frag;
}

function textFragment(e, data, vc) {
  const idAttr = e.id ? ` data-el="${esc(e.id)}"` : '';
  const size = Number(e.size) || 16;
  const weight = Number(e.weight) || 400;
  const font = String(e.font || 'Arial');
  const lineHeight = Number(e.lineHeight) || 1.25;
  const lh = size * lineHeight;
  const boxW = Number(e.w) || 0;
  const raw = resolveText(e.text, data, vc);
  const lines = boxW > 0 ? wrapToLines(raw, font, size, weight, boxW) : String(raw).split('\n');
  const align = boxW > 0 && ["left", "center", "right"].includes(e.align) ? e.align : "center";
  const anchorX = align === "left" ? (Number(e.x) || 0) - boxW / 2 : align === "right" ? (Number(e.x) || 0) + boxW / 2 : (Number(e.x) || 0);
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const start = (Number(e.y) || 0) - ((lines.length - 1) * lh / 2);
  return lines.map((line, i) =>
    `<text${idAttr} x="${anchorX}" y="${start + i * lh}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${esc(e.color || "#17191d")}">${esc(line)}</text>`
  ).join('');
}

function qrFragment(e, data, vc) {
  const idAttr = e.id ? ` data-el="${esc(e.id)}"` : '';
  const sz = Number(e.w) || 80;
  const resolved = resolveText(e.text || "{{VERIFY_URL}}", data, vc);
  const qrDataUrl = generateQRDataUrl(resolved, 200);
  return `<image${idAttr} href="${esc(qrDataUrl)}" xlink:href="${esc(qrDataUrl)}" x="${(Number(e.x) || 0) - sz / 2}" y="${(Number(e.y) || 0) - sz / 2}" width="${sz}" height="${Number(e.h) || sz}" preserveAspectRatio="xMidYMid meet"/>`;
}

/**
 * Renders one certificate. Elements are emitted in document order so the PDF
 * z-order matches the editor exactly. Pass a precomputed verificationContext
 * (from verificationContext(row, index)) to avoid re-hashing per element.
 */
export function renderCertificateSVG(row, index, ctx) {
  const data = row || {};
  const vc = (ctx && typeof ctx === "object") ? ctx : verificationContext(row, index);
  const parts = [buildSvgSkeleton(state.templateId)];
  state.elements.forEach((e, i) => {
    if (e.type === "shape" || (e.type === "image" && e.src)) parts.push(staticFragment(e, i));
    else if (e.type === "text") parts.push(textFragment(e, data, vc));
    else if (e.type === "qr") parts.push(qrFragment(e, data, vc));
  });
  parts.push('</svg>');
  return parts.join('');
}

export async function svgToCanvas(svg, scale = 2) {
  const t = getTemplate(state.templateId);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("Certificate artwork could not be rendered.")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(t.page.width * scale);
    canvas.height = Math.round(t.page.height * scale);
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = t.background || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

export async function svgToPdf(svg) {
  if (!window.jspdf) throw new Error("PDF support could not load. Reload the page and try again.");
  const t = getTemplate(state.templateId), { jsPDF } = window.jspdf;
  const scale = Math.max(1, Math.min(3, Number(state.settings.rasterScale) || 2));
  const canvas = await svgToCanvas(svg, scale);
  const pdf = new jsPDF({ orientation: t.page.orientation === "landscape" ? "landscape" : "portrait", unit: "pt", format: [t.page.width, t.page.height], compress: true });
  // jsPDF accepts a canvas element directly — avoids a multi-MB base64 string per page.
  pdf.addImage(canvas, "PNG", 0, 0, t.page.width, t.page.height, undefined, "FAST");
  return pdf.output("blob");
}
