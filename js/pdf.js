import { state } from './state.js';
import { getTemplate } from './templates.js';
import { resolveText, formatId } from './variables.js';

const _svgCache = new Map();

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildSvgSkeleton(templateId) {
  if (_svgCache.has(templateId)) return _svgCache.get(templateId);
  const t = getTemplate(templateId);
  let staticParts = '';
  t.elements.forEach(e => {
    if (e.type === "shape") {
      if (e.shape === "polygon" && e.points) staticParts += `<polygon data-el="${e.id}" points="${e.points}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
      else if (e.shape === "circle") staticParts += `<circle data-el="${e.id}" cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
      else staticParts += `<rect data-el="${e.id}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/>`;
    }
  });
  const skeleton = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${t.page.width}" height="${t.page.height}" viewBox="0 0 ${t.page.width} ${t.page.height}"><rect width="100%" height="100%" fill="${t.background}"/>${staticParts}`;
  _svgCache.set(templateId, skeleton);
  return skeleton;
}

export function renderCertificateSVG(row, index) {
  const t = getTemplate(state.templateId), data = row || {};
  const skeleton = buildSvgSkeleton(state.templateId);
  let dynamicParts = '';

  state.elements.forEach(e => {
    if (e.type === "image" && e.src) {
      dynamicParts += `<image data-el="${e.id}" href="${esc(e.src)}" x="${e.x - (e.w || 180) / 2}" y="${e.y - (e.h || 90) / 2}" width="${e.w || 180}" height="${e.h || 90}" preserveAspectRatio="xMidYMid meet" opacity="${e.opacity ?? 1}"/>`;
    } else if (e.type === "text") {
      const lines = resolveText(e.text, data, index).split("\n");
      const lh = (e.size || 16) * 1.25;
      const start = e.y - ((lines.length - 1) * lh / 2);
      lines.forEach((line, i) => {
        dynamicParts += `<text data-el="${e.id}" x="${e.x}" y="${start + i * lh}" text-anchor="middle" dominant-baseline="middle" font-family="${esc(e.font || "Arial")}" font-size="${e.size}" font-weight="${e.weight || 400}" fill="${e.color || "#17191d"}">${esc(line)}</text>`;
      });
    } else if (e.type === "qr" && e._qrDataUrl) {
      const sz = e.w || 80;
      dynamicParts += `<image data-el="${e.id}" href="${e._qrDataUrl}" x="${e.x - sz / 2}" y="${e.y - sz / 2}" width="${sz}" height="${sz}" preserveAspectRatio="xMidYMid meet"/>`;
    }
  });
  return skeleton + dynamicParts + '</svg>';
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
  if (!window.jspdf) throw new Error("PDF support could not load. Check your internet connection and reload CertiForge.");
  const t = getTemplate(state.templateId), { jsPDF } = window.jspdf;
  const scale = Math.max(1, Math.min(3, Number(state.settings.rasterScale) || 2));
  const canvas = await svgToCanvas(svg, scale);
  const png = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: t.page.orientation === "landscape" ? "landscape" : "portrait", unit: "pt", format: [t.page.width, t.page.height], compress: true });
  pdf.addImage(png, "PNG", 0, 0, t.page.width, t.page.height, undefined, "FAST");
  return pdf.output("blob");
}

export function clearSvgCache() { _svgCache.clear(); }
