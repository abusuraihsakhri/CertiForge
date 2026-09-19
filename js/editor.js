import { state } from './state.js';
import { getTemplate } from './templates.js';
import { renderCanvas } from './canvas.js';
import { pushHistory, undo, redo } from './history.js';
import { escapeHTML } from './utils.js';
import { generateQRDataUrl } from './qrcode.js';
import { resolveText } from './variables.js';

let _lastRenderedElId = null;

export function addTextElement() {
  const t = getTemplate(state.templateId);
  const e = { id: "text_" + Date.now(), type: "text", text: "New text", x: Math.round(t.page.width / 2), y: Math.round(t.page.height / 2), w: 600, size: 22, weight: 400, align: "center", font: "Arial", color: "#17191d" };
  state.elements.push(e);
  state.selectedElement = e.id;
  renderCurrentEditor();
  pushHistory();
}

export function addQRElement() {
  const t = getTemplate(state.templateId);
  const e = { id: "qr_" + Date.now(), type: "qr", text: "{{VERIFY_URL}}", x: t.page.width - 120, y: t.page.height - 120, w: 80, h: 80, color: "#000000", bg: "#ffffff" };
  const sampleUrl = resolveText(e.text);
  e._qrDataUrl = generateQRDataUrl(sampleUrl, 200);
  e._svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><image href="${e._qrDataUrl}" width="200" height="200"/></svg>`;
  state.elements.push(e);
  state.selectedElement = e.id;
  renderCurrentEditor();
  pushHistory();
}

export async function addImageFile(file) {
  if (!file || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error("Please choose a PNG, JPG, WebP, or SVG image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large. Use an image under 8 MB.");
  const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  const t = getTemplate(state.templateId);
  const e = { id: "image_" + Date.now(), type: "image", name: file.name, src, x: Math.round(t.page.width / 2), y: 120, w: 180, h: 90, fit: "contain", opacity: 1 };
  state.elements.push(e);
  state.selectedElement = e.id;
  renderCurrentEditor();
  pushHistory();
}

export async function loadCustomFont(file) {
  if (!file || !/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("Please choose a font file (.ttf, .otf, .woff, .woff2).");
  const family = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
  const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  try {
    const fontFace = new FontFace(family, `url(${dataUrl})`);
    const loaded = await fontFace.load();
    document.fonts.add(loaded);
    state.fonts.push({ name: file.name, family, data: dataUrl });
    state.selectedFont = family;
    renderCurrentEditor();
    pushHistory();
  } catch (e) {
    throw new Error("Could not load font: " + e.message);
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
  renderCanvas(canvas, null, true);
  const list = document.getElementById("elementList");
  if (list) {
    list.innerHTML = state.elements.map(e => {
      const label = e.type === "text" ? (e.variable || e.text.slice(0, 24)) : (e.type === "qr" ? "QR Code" : (e.name || e.shape || e.type));
      const idx = state.elements.indexOf(e);
      const canUp = idx < state.elements.length - 1;
      const canDown = idx > 0;
      return `<div class="element-row ${e.id === state.selectedElement ? 'selected' : ''}">
        <button class="element-item" data-el="${escapeHTML(e.id)}"><span>${escapeHTML(label)}</span><span>${e.locked ? "LOCK" : e.type}</span></button>
        <div class="layer-controls">
          <button class="layer-btn" data-layer-up="${escapeHTML(e.id)}" ${canUp ? '' : 'disabled'} title="Move up">▲</button>
          <button class="layer-btn" data-layer-down="${escapeHTML(e.id)}" ${canDown ? '' : 'disabled'} title="Move down">▼</button>
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

  // If already rendered for this element, don't recreate DOM and destroy user typing focus
  if (_lastRenderedElId === e.id) {
    return;
  }
  _lastRenderedElId = e.id;

  const fontOptions = ["Arial", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS"];
  state.fonts?.forEach(f => { if (!fontOptions.includes(f.family)) fontOptions.push(f.family); });
  const fontSelect = fontOptions.map(f => `<option value="${f}" ${e.font === f ? 'selected' : ''}>${f}</option>`).join("");

  if (e.type === "text") {
    box.innerHTML = `<div class="element-properties">
      <div class="field"><label>Text</label><textarea id="propText" rows="4"></textarea></div>
      <div class="field"><label>Font</label><select id="propFont">${fontSelect}<option value="__upload__">+ Upload custom font...</option></select></div>
      <div class="prop-row"><div class="field"><label>Size</label><input id="propSize" type="number" min="6" max="120"></div><div class="field"><label>Weight</label><select id="propWeight"><option value="300">Light</option><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option></select></div></div>
      <div class="field"><label>Color</label><input id="propColor" class="color-input" type="color"></div>
      <div class="prop-row"><div class="field"><label>X</label><input id="propX" type="number"></div><div class="field"><label>Y</label><input id="propY" type="number"></div></div>
      <div class="field"><label>Width</label><input id="propW" type="number"></div>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;

    const ids = { text: "propText", font: "propFont", size: "propSize", weight: "propWeight", color: "propColor", x: "propX", y: "propY", w: "propW" };
    Object.entries(ids).forEach(([k, id]) => {
      const n = document.getElementById(id);
      if (n) n.value = e[k] ?? (k === "color" ? "#17191d" : "");
    });

    const apply = (saveHistory = false) => {
      if (e.font === "__upload__") return;
      const t = document.getElementById("propText"); if (t) e.text = t.value;
      const f = document.getElementById("propFont"); if (f) e.font = f.value;
      const s = document.getElementById("propSize"); if (s) e.size = Math.max(6, +s.value || 16);
      const w = document.getElementById("propWeight"); if (w) e.weight = +w.value || 400;
      const c = document.getElementById("propColor"); if (c) e.color = c.value;
      const x = document.getElementById("propX"); if (x) e.x = +x.value || 0;
      const y = document.getElementById("propY"); if (y) e.y = +y.value || 0;
      const wd = document.getElementById("propW"); if (wd) e.w = Math.max(20, +wd.value || 100);

      const canvas = document.getElementById("editorCanvas");
      if (canvas) renderCanvas(canvas, null, true);

      // Update list label without rebuilding list
      const labelEl = document.querySelector(`.element-row.selected .element-item span:first-child`);
      if (labelEl) labelEl.textContent = e.variable || e.text.slice(0, 24);

      if (saveHistory) pushHistory();
    };

    Object.values(ids).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => apply(false));
      el.addEventListener("change", () => apply(true));
    });

    document.getElementById("propFont")?.addEventListener("change", (ev) => {
      if (ev.target.value === "__upload__") {
        document.getElementById("fontFileInput")?.click();
        ev.target.value = e.font || "Arial";
      }
    });
  } else if (e.type === "image") {
    box.innerHTML = `<div class="element-properties">
      <div class="notice">${escapeHTML(e.name || "Image")}</div>
      <div class="prop-row"><div class="field"><label>X</label><input id="propX" type="number" value="${e.x}"></div><div class="field"><label>Y</label><input id="propY" type="number" value="${e.y}"></div></div>
      <div class="prop-row"><div class="field"><label>Width</label><input id="propW" type="number" value="${e.w}"></div><div class="field"><label>Height</label><input id="propH" type="number" value="${e.h}"></div></div>
      <div class="field"><label>Opacity</label><input id="propOpacity" type="range" min="0.1" max="1" step="0.05" value="${e.opacity ?? 1}"></div>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;

    const apply = (saveHistory = false) => {
      e.x = +document.getElementById("propX").value;
      e.y = +document.getElementById("propY").value;
      e.w = Math.max(1, +document.getElementById("propW").value);
      e.h = Math.max(1, +document.getElementById("propH").value);
      e.opacity = +document.getElementById("propOpacity").value;
      const canvas = document.getElementById("editorCanvas");
      if (canvas) renderCanvas(canvas, null, true);
      if (saveHistory) pushHistory();
    };

    ["propX", "propY", "propW", "propH", "propOpacity"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => apply(false));
      el.addEventListener("change", () => apply(true));
    });
  } else if (e.type === "qr") {
    box.innerHTML = `<div class="element-properties">
      <div class="field"><label>QR Content / URL</label><textarea id="propQrText" rows="3"></textarea>
        <p class="mini-help" style="margin-top:3px">Use <code>{{VERIFY_URL}}</code> for tamper-proof verification, or custom URL with <code>{{CERTIFICATE_ID}}</code>.</p>
      </div>
      <div class="prop-row"><div class="field"><label>X</label><input id="propX" type="number" value="${e.x}"></div><div class="field"><label>Y</label><input id="propY" type="number" value="${e.y}"></div></div>
      <div class="prop-row"><div class="field"><label>Size</label><input id="propW" type="number" min="30" max="300" value="${e.w || 80}"></div></div>
      <div class="field"><label>Color</label><input id="propColor" class="color-input" type="color" value="${e.color || '#000000'}"></div>
      <div class="toolbar"><button class="btn" id="duplicateEl">Duplicate</button><button class="btn danger" id="deleteEl">Delete</button></div>
    </div>`;
    document.getElementById("propQrText").value = e.text;
    const apply = (saveHistory = false) => {
      e.text = document.getElementById("propQrText").value;
      e.x = +document.getElementById("propX").value;
      e.y = +document.getElementById("propY").value;
      e.w = Math.max(30, +document.getElementById("propW").value);
      e.color = document.getElementById("propColor").value;
      e._qrDataUrl = generateQRDataUrl(resolveText(e.text), 200);
      e._svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><image href="${e._qrDataUrl}" width="200" height="200"/></svg>`;
      const canvas = document.getElementById("editorCanvas");
      if (canvas) renderCanvas(canvas, null, true);
      if (saveHistory) pushHistory();
    };

    ["propQrText", "propX", "propY", "propW", "propColor"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => apply(false));
      el.addEventListener("change", () => apply(true));
    });
  } else {
    _lastRenderedElId = null;
    box.innerHTML = '<div class="notice">This template shape is not editable in V0.3.</div>';
    return;
  }

  const dup = document.getElementById("duplicateEl"), del = document.getElementById("deleteEl");
  if (dup) dup.onclick = () => {
    const n = structuredClone(e);
    n.id = e.id + "Copy" + Date.now();
    n.x += 20; n.y += 20;
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
