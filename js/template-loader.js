import { state } from './state.js';
import { getTemplate, templates } from './templates.js';
import { resolveText, sampleRecord, formatId, columnToken, variableKeys } from './variables.js';
import { resetHistory } from './history.js';

export function loadTemplate(id) {
  const t = getTemplate(id);
  state.templateId = t.id;
  state.elements = structuredClone(t.elements);
  state.selectedElement = null;
  resetHistory();
}

export function templateSVG(templateId) {
  const t = getTemplate(templateId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.page.width} ${t.page.height}">
    <rect width="100%" height="100%" fill="${t.background}"/>
    ${t.elements.map(e => {
    if (e.type === "shape") {
      if (e.shape === "polygon" && e.points) return `<polygon points="${e.points}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
      if (e.shape === "circle") return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
      return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
    }
    if (e.type === "image" && e.src) {
      const w = e.w || 180, h = e.h || 90;
      return `<image href="${String(e.src).replace(/"/g, '&quot;')}" x="${e.x - w / 2}" y="${e.y - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${e.opacity ?? 1}"/>`;
    }
    if (e.type === "qr") {
      const sz = e.w || 60;
      return `<rect x="${e.x - sz / 2}" y="${e.y - sz / 2}" width="${sz}" height="${sz}" fill="#f3f4f6" stroke="#4b5563" stroke-width="1.5" rx="3"/><text x="${e.x}" y="${e.y + 3}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#374151">QR</text>`;
    }
    if (e.type === "text") {
      if (e.id === "dots" || String(e.text).startsWith("......")) return "";
      const lines = String(e.text).replace(/&/g, "&amp;").replace(/</g, "&lt;").split("\n");
      const lh = (e.size || 16) * 1.25;
      const start = e.y - ((lines.length - 1) * lh / 2);
      return lines.map((line, i) => `<text x="${e.x}" y="${start + i * lh}" text-anchor="middle" dominant-baseline="middle" font-family="${e.font || "Arial"}" font-size="${e.size}" font-weight="${e.weight || 400}" fill="${e.color || "#17191d"}">${line}</text>`).join("");
    }
  }).join("")}
  </svg>`;
}
