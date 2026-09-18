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
    if (e.type === "text") return `<text x="${e.x}" y="${e.y}" text-anchor="middle" font-family="${e.font || "Arial"}" font-size="${e.size}" font-weight="${e.weight || 400}" fill="${e.color || "#17191d"}">${String(e.text).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
    return "";
  }).join("")}
  </svg>`;
}
