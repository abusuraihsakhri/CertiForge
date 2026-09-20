/**
 * Shared trust boundary for anything that re-hydrates state from untrusted JSON:
 * project files (.certiforge), IndexedDB autosave records, and uploaded fonts.
 * loadProjectFile() and the autosave restore path both run through sanitizeProjectState()
 * so the two paths can never drift apart in strictness.
 */
import { templates } from './templates.js';
import { variableKeys } from './variables.js';
import { clampNum, safeFilename } from './utils.js';
import { maxTextInput, maxNameLength, maxProjectBytes } from './config.js';

export const SAFE_FONT_DATA_URL = /^data:(?:font\/(?:woff2?|truetype|opentype)|application\/(?:x-font-(?:ttf|otf|woff2?)|font-woff2?));base64,[A-Za-z0-9+/=]+$/;

const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|jpg|gif|webp|bmp|x-icon|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function detectFontFormat(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (b.length < 4) return null;
  const tag = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (tag === 'wOF2') return 'woff2';
  if (tag === 'wOFF') return 'woff';
  if (tag === 'OTTO' || tag === 'true') return 'opentype';
  if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return 'truetype';
  if (tag === 'ttcf') return 'truetype';
  return null;
}

// Rebuild a font data URL with a canonical, allow-listed MIME prefix so the
// SAFE_FONT_DATA_URL gate is meaningful regardless of the browser's guess at file.type.
export function normalizeFontDataUrl(base64Payload, format) {
  if (!format) throw new Error("This file is not a recognized TrueType, OpenType, WOFF or WOFF2 font.");
  const payload = String(base64Payload || '').replace(/^data:[^;]*;base64,/, '').replace(/\s+/g, '');
  const url = `data:font/${format};base64,${payload}`;
  if (!SAFE_FONT_DATA_URL.test(url)) throw new Error("Font data failed security validation.");
  return url;
}

function idFor(el) { return String(el.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64); }

export function sanitizeElement(e) {
  if (!e || typeof e !== "object") return null;
  if (!["text", "shape", "image", "qr"].includes(e.type)) return null;
  const n = {
    id: idFor(e) || `element_${Math.random().toString(36).slice(2, 10)}`,
    type: e.type,
    x: clampNum(e.x, -2000, 5000, 0),
    y: clampNum(e.y, -2000, 5000, 0),
    locked: Boolean(e.locked)
  };
  const w = clampNum(e.w, 0, 5000, 0);
  const h = clampNum(e.h, 0, 5000, 0);
  if (w) n.w = w;
  if (h) n.h = h;

  if (e.type === "text") {
    n.text = String(e.text ?? "").slice(0, maxTextInput);
    n.size = clampNum(e.size, 4, 400, 16);
    const weight = Number(e.weight) || (e.weight === "bold" ? 700 : e.weight === "normal" ? 400 : 400);
    n.weight = WEIGHTS.includes(weight) ? weight : 400;
    n.font = (String(e.font || "Arial").replace(/[^\w\s\-]/g, "").trim() || "Arial").slice(0, 64);
    n.color = String(e.color || "#17191d").replace(/[^#a-zA-Z0-9(),.%\s-]/g, "").slice(0, 48) || "#17191d";
    n.align = ["left", "center", "right"].includes(e.align) ? e.align : "center";
    n.lineHeight = clampNum(e.lineHeight, 0.8, 4, 1.25);
    if (e.variable) n.variable = String(e.variable).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
  } else if (e.type === "image") {
    n.name = safeFilename(e.name || "image").slice(0, 100);
    const src = String(e.src || "");
    n.src = src.startsWith("data:image/") && src.length <= 14 * 1024 * 1024 && SAFE_IMAGE_DATA_URL.test(src) ? src : "";
    n.opacity = clampNum(e.opacity, 0, 1, 1);
    n.fit = e.fit === "cover" ? "cover" : "contain";
  } else if (e.type === "shape") {
    n.shape = ["rect", "circle", "polygon"].includes(e.shape) ? e.shape : "rect";
    n.fill = String(e.fill || "none").replace(/[^#a-zA-Z0-9(),.\s%-]/g, "").slice(0, 64);
    n.stroke = String(e.stroke || "none").replace(/[^#a-zA-Z0-9(),.\s%-]/g, "").slice(0, 64);
    n.strokeWidth = clampNum(e.strokeWidth, 0, 50, 0);
    if (n.shape === "polygon") n.points = String(e.points || "").replace(/[^0-9,\s.]/g, "").slice(0, 4000);
    if (n.shape === "circle") {
      n.cx = clampNum(e.cx, -2000, 5000, 0);
      n.cy = clampNum(e.cy, -2000, 5000, 0);
      n.r = clampNum(e.r, 0, 5000, 0);
    }
  } else if (e.type === "qr") {
    n.text = String(e.text || "{{VERIFY_URL}}").slice(0, 2000);
    n.color = String(e.color || "#000000").replace(/[^#a-zA-Z0-9]/g, "").slice(0, 24) || "#000000";
  }
  return n;
}

export function sanitizeFonts(list) {
  return (Array.isArray(list) ? list : []).filter(f => f && typeof f === "object").map(f => ({
    name: safeFilename(f.name || "font").slice(0, 100),
    family: String(f.family || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64),
    data: String(f.data || '').trim()
  })).filter(f => f.family && f.data && SAFE_FONT_DATA_URL.test(f.data));
}

export function sanitizeMappings(mappings) {
  const out = {};
  if (mappings && typeof mappings === "object" && !Array.isArray(mappings)) {
    for (const [k, v] of Object.entries(mappings)) {
      if (variableKeys.includes(k) && typeof v === "string" && v.length <= 200) out[k] = v;
    }
  }
  return out;
}

export function sanitizeGlobalFields(fields) {
  const out = {};
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    for (const [k, v] of Object.entries(fields)) {
      if (variableKeys.includes(k) && typeof v === "string" && v.length <= 500) out[k] = v;
    }
  }
  return out;
}

export function sanitizeCertificate(cert) {
  const d = cert && typeof cert === "object" ? cert : {};
  return {
    prefix: /^[A-Za-z0-9]{0,12}$/.test(String(d.prefix ?? "")) ? String(d.prefix).toUpperCase() : "CONF",
    year: String(d.year ?? "").replace(/[^0-9]/g, "").slice(0, 8),
    start: Math.floor(clampNum(d.start, 0, 1e9, 1)),
    digits: Math.floor(clampNum(d.digits, 1, 8, 4)),
    separator: /^[-_.\s]{0,3}$/.test(String(d.separator ?? "")) ? String(d.separator) : "-"
  };
}

export function sanitizeSettings(settings, defaults) {
  const d = settings && typeof settings === "object" ? settings : {};
  return {
    filename: typeof d.filename === "string" && d.filename.trim() && d.filename.length <= 200
      ? d.filename
      : defaults.filename,
    rasterScale: Math.floor(clampNum(d.rasterScale, 1, 3, 2)),
    verifySecret: typeof d.verifySecret === "string" && d.verifySecret ? d.verifySecret.slice(0, 128) : defaults.verifySecret
  };
}

export function knownTemplateIds() {
  return new Set(templates.map(t => t.id));
}

/**
 * Sanitize an untrusted state blob (project file JSON or IndexedDB autosave record).
 * Throws on unusable input; returns a patch object safe for Object.assign(state, patch).
 */
export function sanitizeProjectState(data, defaults) {
  if (!data || typeof data !== "object" || !Array.isArray(data.elements)) {
    throw new Error("Not a valid CertiForge project record.");
  }
  const templateId = knownTemplateIds().has(data.templateId) ? data.templateId : defaults.templateId;
  return {
    projectName: String(data.projectName || defaults.projectName).replace(/[<>]/g, "").slice(0, maxNameLength),
    templateId,
    elements: data.elements.filter(Boolean).slice(0, 500).map(sanitizeElement).filter(Boolean),
    mappings: sanitizeMappings(data.mappings),
    globalFields: Object.assign({}, defaults.globalFields, sanitizeGlobalFields(data.globalFields)),
    certificate: Object.assign({}, defaults.certificate, sanitizeCertificate(data.certificate)),
    settings: sanitizeSettings(data.settings, defaults.settings),
    fonts: sanitizeFonts(data.fonts),
    selectedElement: null,
    rows: [],
    columns: [],
    sampleIndex: 0,
    generated: [],
    registry: []
  };
}

export { maxProjectBytes };
