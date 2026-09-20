import { state } from './state.js';
import { getTemplate } from './templates.js';
import { renderCanvas } from './canvas.js';
import { pushHistory } from './history.js';
import { escapeHTML, uid, clampNum } from './utils.js';
import { generateQRDataUrl } from './qrcode.js';
import { resolveText, sampleRecord, verificationContext } from './variables.js';
import { normalizeFontDataUrl, detectFontFormat, SAFE_FONT_DATA_URL } from './security.js';
import { maxImageBytes } from './config.js';

let _lastRenderedElId = null;

const WEIGHT_LABELS = { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extrabold", 900: "Black" };

function weightOptions(current) {
  const known = [300, 400, 500, 600, 700, 800, 900];
  const set = [...known];
  const w = Number(current);
  if (!known.includes(w)) set.push(Number.isFinite(w) ? w : 400);
  return set.sort((a, b) => a - b).map(v => `<option value="${v}" ${w === v ? 'selected' : ''}>${WEIGHT_LABELS[v] || v}</option>`).join("");
}

function pageBounds() {
  const t = getTemplate(state.templateId);
  return { maxX: t.page.width, maxY: t.page.height };
}

function readNum(id, fallback) {
  const n = document.getElementById(id);
  const v = n ? Number(n.value) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

function repaintCanvas() {
  const canvas = document.getElementById("editorCanvas");
  if (canvas) renderCanvas(canvas, null, true);
}

export function addTextElement() {
  const t = getTemplate(state.templateId);
  const e = { id: uid("text"), type: "text", text: "New text", x: Math.round(t.page.width / 2), y: Math.round(t.page.height / 2), w: 600, size: 22, weight: 400, align: "center", font: "Arial", color: "#17191d", lineHeight: 1.25 };
  state.elements.push(e);
  state.selectedElement = e.id;
  _lastRenderedElId = null;
  renderCurrentEditor();
  pushHistory();
}

export function addQRElement() {
  const t = getTemplate(state.templateId);
  const e = { id: uid("qr"), type: "qr", text: "{{VERIFY_URL}}", x: t.page.width - 120, y: t.page.height - 120, w: 80, h: 80, color: "#000000", bg: "#ffffff" };
  const sample = sampleRecord();
  e._qrDataUrl = generateQRDataUrl(resolveText(e.text, sample, verificationContext(sample, state.sampleIndex)), 200);
  e._svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><image href="${e._qrDataUrl}" width="200" height="200"/></svg>`;
  state.elements.push(e);
  state.selectedElement = e.id;
  _lastRenderedElId = null;
  renderCurrentEditor();
  pushHistory();
}

const SAFE_IMAGE_DATA = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i;

export async function addImageFile(file) {
  if (!file || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error("Please choose a PNG, JPG, WebP, or SVG image.");
  if (file.size > maxImageBytes) throw new Error("Image is too large. Use an image under 8 MB.");
  const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  if (!SAFE_IMAGE_DATA.test(String(src))) throw new Error("Image could not be read as a data URL. Try a different file.");
  const t = getTemplate(state.templateId);
  const e = { id: uid("image"), type: "image", name: file.name, src, x: Math.round(t.page.width / 2), y: 120, w: 180, h: 90, fit: "contain", opacity: 1 };
  state.elements.push(e);
  state.selectedElement = e.id;
  _lastRenderedElId = null;
  renderCurrentEditor();
  pushHistory();
}

export async function loadCustomFont(file) {
  if (!file || !/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("Please choose a font file (.ttf, .otf, .woff, .woff2).");
  const family = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
  if (!family) throw new Error("Font file name must contain letters or numbers.");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const format = detectFontFormat(buffer);
  if (!format) throw new Error("This file is not a recognized TrueType, OpenType, WOFF or WOFF2 font.");
  const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  const safeUrl = normalizeFontDataUrl(String(dataUrl), format);
  try {
    const fontFace = new FontFace(family, `url(${safeUrl})`);
    const loaded = await fontFace.load();
    document.fonts.add(loaded);
    state.fonts.push({ name: file.name, family, data: safeUrl });
    renderCurrentEditor();
    pushHistory();
  } catch (e) {
    throw new Error("Could not load font: " + (e?.message || e));
  }
}

export function moveLayer(id, direction) {
  const idx = state.elements.findIndex(e => e.id === id);
  if (idx === -1) return;
  const newIdx = direction === 'up' ? idx + 1 : idx - 1;
  if (newIdx < 0 || newIdx >= state.elements.length) return;
  [state.elements[idx], state.elements[newIdx]] = [state.elements[newIdx], state.elements[idx]];
  renderCurrentEditor();
  pushHistory();
}

export function renderCurrentEditor() {
  const app = document.getElementById("app");
  if (!app || !document.querySelector(".editor-layout")) return;
  const canvas = document.getElementById("editorCanvas");
  if (canvas) renderCanvas(canvas, null, true);
  const list = document.getElementById("elementList");
  if (list) {
    list.innerHTML = state.elements.map(e => {
      const label = e.type === "text" ? (e.variable || e.text.slice(0, 24)) : (e.type === "qr" ? "QR Code" : (e.name || e.shape || e.type));
      const idx = state.elements.indexOf(e);
      const canUp = idx < state.elements.length - 1;
      const canDown = idx > 0;
      const selected = e.id === state.selectedElement;
      return `<div class="element-row ${selected ? 'selected' : ''}">
        <button class="element-item" data-el="${escapeHTML(e.id)}" aria-pressed="${selected}"><span>${escapeHTML(label)}</span><span>${e.locked ? "LOCK" : e.type}</span></button>
        <div class="layer-controls">
          <button class="layer-btn" data-layer-up="${escapeHTML(e.id)}" ${canUp ? '' : 'disabled'} aria-label="Move ${escapeHTML(String(label))} forward" title="Move forward">&#9650;</button>
          <button class="layer-btn" data-layer-down="${escapeHTML(e.id)}" ${canDown ? '' : 'disabled'} aria-label="Move ${escapeHTML(String(label))} backward" title="Move backward">&#9660;</button>
        </div>
      </div>`;
    }).join("");

    list.querySelectorAll("[data-el]").forEach(b => b.onclick = () => { state.selectedElement = b.dataset.el; renderCurrentEditor(); });
    list.querySelectorAll("[data-layer-up]").forEach(b => b.onclick = () => moveLayer(b.dataset.layerUp, 'up'));
    list.querySelectorAll("[data-layer-down]").forEach(b => b.onclick = () => moveLayer(b.dataset.layerDown, 'down'));
  }
  renderProperties();
}

export function renderProperties() {
  const box = document.getElementById("properties"); if (!box) return;
  const e = state.elements.find(x => x.id === state.selectedElement);
  if (!e) {
    _lastRenderedElId = null;
    box.innerHTML = '<div class="empty">Select an editable element.</div>';
    return;
  }
  if (e.locked) {
    _lastRenderedElId = null;
    box.innerHTML = '<div class="notice">This element is locked by the template.</div>';
    return;
  }

  // Self-healing memo: only skip the rebuild when the panel actually still holds
  // this element's rendered controls (a step change replaces #app with fresh DOM).
  if (_lastRenderedElId === e.id && box.firstElementChild) {
    return;
  }
  _lastRenderedElId = e.id;

  const fontOptions = ["Arial", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS"];
  state.fonts?.forEach(f => { if (!fontOptions.includes(f.family)) fontOptions.push(f.family); });
  const fontSelect = fontOptions.map(f => `<option value="${escapeHTML(f)}" style="font-family: '${escapeHTML(f)}', sans-serif;" ${e.font === f ? 'selected' : ''}>${escapeHTML(f)}</option>`).join("");

  const bindApply = (ids, apply) => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => apply(false));
      el.addEventListener("change", () => apply(true));
    });
  };

  if (e.type === "text") {
    box.innerHTML = `<div class="element-properties">
      <div class="field"><label for="propText">Text</label><textarea id="propText" rows="4"></textarea></div>
      <div class="field"><label for="propFont">Font</label><select id="propFont">${fontSelect}<option value="__upload__">+ Upload custom font...</option></select></div>
      <div class="prop-row"><div class="field"><label for="propSize">Size</label><input id="propSize" type="number" min="6" max="200"></div><div class="field"><label for="propWeight">Weight</label><select id="propWeight">${weightOptions(e.weight)}</select></div></div>
      <div class="prop-row"><div class="field"><label for="propAlign">Align</label><select id="propAlign"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div><div class="field"><label for="propLineHeight">Line height</label><input id="propLineHeight" type="number" min="0.8" max="4" step="0.05"></div></div>
      <div class="field"><label for="propColor">Color</label><input id="propColor" class="color-input" type="color"></div>
      <div class="prop-row"><div class="field"><label for="propX">X</label><input id="propX" type="number"></div><div class="field"><label for="propY">Y</label><input id="propY" type="number"></div></div>
      <div class="field"><label for="propW">Width</label><input id="propW" type="number"></div>
      <p class="mini-help">Text wraps inside its width; X/Y mark the box center. What you see is what prints.</p>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;

    const ids = { text: "propText", font: "propFont", size: "propSize", weight: "propWeight", color: "propColor", x: "propX", y: "propY", w: "propW", align: "propAlign", lineHeight: "propLineHeight" };
    Object.entries(ids).forEach(([k, id]) => {
      const n = document.getElementById(id);
      if (n) n.value = e[k] ?? (k === "color" ? "#17191d" : k === "align" ? "center" : k === "lineHeight" ? 1.25 : "");
    });

    const { maxX, maxY } = pageBounds();
    const apply = (saveHistory = false) => {
      const f = document.getElementById("propFont");
      if (f && f.value === "__upload__") return;
      const t = document.getElementById("propText"); if (t) e.text = t.value;
      if (f) e.font = f.value;
      e.size = clampNum(document.getElementById("propSize")?.value, 6, 200, e.size ?? 16);
      e.weight = clampNum(document.getElementById("propWeight")?.value, 100, 900, e.weight ?? 400);
      const c = document.getElementById("propColor"); if (c && c.value) e.color = c.value;
      e.x = clampNum(document.getElementById("propX")?.value, -maxX, maxX * 2, e.x ?? 0);
      e.y = clampNum(document.getElementById("propY")?.value, -maxY, maxY * 2, e.y ?? 0);
      e.w = clampNum(document.getElementById("propW")?.value, 20, maxX, e.w ?? 100);
      const al = document.getElementById("propAlign"); if (al) e.align = al.value;
      e.lineHeight = clampNum(document.getElementById("propLineHeight")?.value, 0.8, 4, e.lineHeight ?? 1.25);

      repaintCanvas();

      const labelEl = document.querySelector(`.element-row.selected .element-item span:first-child`);
      if (labelEl) labelEl.textContent = e.variable || String(e.text || "").slice(0, 24);

      if (saveHistory) pushHistory();
    };

    bindApply(Object.values(ids), apply);

    document.getElementById("propFont")?.addEventListener("change", (ev) => {
      if (ev.target.value === "__upload__") {
        document.getElementById("fontFileInput")?.click();
        ev.target.value = e.font || "Arial";
      }
    });
  } else if (e.type === "image") {
    box.innerHTML = `<div class="element-properties">
      <div class="notice">${escapeHTML(e.name || "Image")}</div>
      <div class="prop-row"><div class="field"><label for="propX">X</label><input id="propX" type="number" value="${e.x}"></div><div class="field"><label for="propY">Y</label><input id="propY" type="number" value="${e.y}"></div></div>
      <div class="prop-row"><div class="field"><label for="propW">Width</label><input id="propW" type="number" value="${e.w}"></div><div class="field"><label for="propH">Height</label><input id="propH" type="number" value="${e.h}"></div></div>
      <div class="field"><label for="propOpacity">Opacity</label><input id="propOpacity" type="range" min="0.1" max="1" step="0.05" value="${e.opacity ?? 1}"></div>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;

    const { maxX, maxY } = pageBounds();
    const apply = (saveHistory = false) => {
      e.x = clampNum(document.getElementById("propX")?.value, -maxX, maxX * 2, e.x ?? 0);
      e.y = clampNum(document.getElementById("propY")?.value, -maxY, maxY * 2, e.y ?? 0);
      e.w = clampNum(document.getElementById("propW")?.value, 10, maxX, e.w ?? 180);
      e.h = clampNum(document.getElementById("propH")?.value, 10, maxY, e.h ?? 90);
      e.opacity = clampNum(document.getElementById("propOpacity")?.value, 0, 1, e.opacity ?? 1);
      repaintCanvas();
      if (saveHistory) pushHistory();
    };

    bindApply(["propX", "propY", "propW", "propH", "propOpacity"], apply);
  } else if (e.type === "qr") {
    box.innerHTML = `<div class="element-properties">
      <div class="field"><label for="propQrText">QR content / URL</label><textarea id="propQrText" rows="3"></textarea>
        <p class="mini-help" style="margin-top:3px">Use <code>{{VERIFY_URL}}</code> for the verification link, or a custom URL with <code>{{CERTIFICATE_ID}}</code>.</p>
      </div>
      <div class="prop-row"><div class="field"><label for="propX">X</label><input id="propX" type="number" value="${e.x}"></div><div class="field"><label for="propY">Y</label><input id="propY" type="number" value="${e.y}"></div></div>
      <div class="prop-row"><div class="field"><label for="propW">Size</label><input id="propW" type="number" min="30" max="300" value="${e.w || 80}"></div><div class="field"><label for="propColor">Color</label><input id="propColor" class="color-input" type="color" value="${e.color || '#000000'}"></div></div>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;
    const qrText = document.getElementById("propQrText");
    if (qrText) qrText.value = e.text;
    const { maxX, maxY } = pageBounds();
    const apply = (saveHistory = false) => {
      const qt = document.getElementById("propQrText");
      if (qt) e.text = qt.value;
      e.x = clampNum(document.getElementById("propX")?.value, -maxX, maxX * 2, e.x ?? 0);
      e.y = clampNum(document.getElementById("propY")?.value, -maxY, maxY * 2, e.y ?? 0);
      e.w = clampNum(document.getElementById("propW")?.value, 30, 300, e.w ?? 80);
      e.h = e.w;
      const c = document.getElementById("propColor"); if (c && c.value) e.color = c.value;
      const sample = sampleRecord();
      e._qrDataUrl = generateQRDataUrl(resolveText(e.text, sample, verificationContext(sample, state.sampleIndex)), 200);
      e._svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><image href="${e._qrDataUrl}" width="200" height="200"/></svg>`;
      repaintCanvas();
      if (saveHistory) pushHistory();
    };

    bindApply(["propQrText", "propX", "propY", "propW", "propColor"], apply);
  } else {
    _lastRenderedElId = null;
    box.innerHTML = '<div class="notice">This template shape is not editable.</div>';
    return;
  }

  const dup = document.getElementById("duplicateEl"), del = document.getElementById("deleteEl");
  if (dup) dup.onclick = () => {
    const n = { ...e };
    delete n._qrDataUrl; delete n._svg;
    n.id = uid(e.type);
    n.x = num2(n.x) + 20; n.y = num2(n.y) + 20;
    state.elements.push(n);
    state.selectedElement = n.id;
    _lastRenderedElId = null;
    renderCurrentEditor();
    pushHistory();
  };
  if (del) del.onclick = () => {
    state.elements = state.elements.filter(x => x.id !== e.id);
    state.selectedElement = null;
    _lastRenderedElId = null;
    renderCurrentEditor();
    pushHistory();
  };
}

function num2(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
