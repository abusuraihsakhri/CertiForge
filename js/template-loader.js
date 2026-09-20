import { state } from './state.js';
import { getTemplate } from './templates.js';
import { resetHistory } from './history.js';
import { escapeHTML } from './utils.js';

const esc = escapeHTML;
const num = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };

export function loadTemplate(id) {
  const t = getTemplate(id);
  state.templateId = t.id;
  state.elements = t.elements.map(e => ({ ...e }));
  state.selectedElement = null;
  resetHistory();
}

// Static gallery thumbnail. Values are escaped the same way as the real output
// (js/pdf.js) so thumbnails can never execute markup even if element data ever
// becomes file-controlled.
export function templateSVG(templateId) {
  const t = getTemplate(templateId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(t.page.width)} ${num(t.page.height)}" role="img" aria-label="${esc(t.name)} template preview">
    <rect width="100%" height="100%" fill="${esc(t.background)}"/>
    ${t.elements.map(e => {
    if (e.type === "shape") {
      if (e.shape === "polygon" && e.points) return `<polygon points="${esc(e.points)}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${num(e.strokeWidth)}"/>`;
      if (e.shape === "circle") return `<circle cx="${num(e.cx)}" cy="${num(e.cy)}" r="${num(e.r)}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${num(e.strokeWidth)}"/>`;
      return `<rect x="${num(e.x)}" y="${num(e.y)}" width="${num(e.w)}" height="${num(e.h)}" fill="${esc(e.fill || "none")}" stroke="${esc(e.stroke || "none")}" stroke-width="${num(e.strokeWidth)}"/>`;
    }
    if (e.type === "image" && e.src) {
      const w = num(e.w, 180), h = num(e.h, 90);
      return `<image href="${esc(e.src)}" x="${num(e.x) - w / 2}" y="${num(e.y) - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${e.opacity ?? 1}"/>`;
    }
    if (e.type === "qr") {
      const sz = num(e.w, 60);
      return `<rect x="${num(e.x) - sz / 2}" y="${num(e.y) - sz / 2}" width="${sz}" height="${sz}" fill="#f3f4f6" stroke="#4b5563" stroke-width="1.5" rx="3"/><text x="${num(e.x)}" y="${num(e.y) + 3}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#374151">QR</text>`;
    }
    if (e.type === "text") {
      if (e.id === "dots" || String(e.text).startsWith("......")) return "";
      const lines = String(e.text).split("\n");
      const lh = num(e.size, 16) * num(e.lineHeight, 1.25);
      const start = num(e.y) - ((lines.length - 1) * lh / 2);
      return lines.map((line, i) => `<text x="${num(e.x)}" y="${start + i * lh}" text-anchor="middle" dominant-baseline="middle" font-family="${esc(e.font || "Arial")}" font-size="${num(e.size, 16)}" font-weight="${num(e.weight, 400)}" fill="${esc(e.color || "#17191d")}">${esc(line)}</text>`).join("");
    }
    return "";
  }).join("")}
  </svg>`;
}
