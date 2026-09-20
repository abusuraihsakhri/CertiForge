import { state } from './state.js';
import { getTemplate } from './templates.js';
import { resolveText, sampleRecord, verificationContext } from './variables.js';
import { pushHistory } from './history.js';
import { renderCurrentEditor, renderProperties } from './editor.js';
import { snapThreshold } from './config.js';
import { escapeHTML } from './utils.js';
import { generateQRDataUrl } from './qrcode.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sel(id) {
  const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  return `[data-id="${escaped}"]`;
}

function shapeNode(e, t) {
  // Locked template chrome: polygons use full-page SVG overlays (their points are
  // absolute page coordinates), circles get a bounding box. None take pointer events.
  const el = document.createElement("div");
  el.className = "canvas-element shape-element";
  el.dataset.id = e.id;
  el.style.pointerEvents = "none";
  if (e.shape === "polygon" && e.points) {
    Object.assign(el.style, { left: "0%", top: "0%", width: "100%", height: "100%", background: "transparent" });
    el.innerHTML = `<svg viewBox="0 0 ${t.page.width} ${t.page.height}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><polygon points="${escapeHTML(e.points)}" fill="${escapeHTML(e.fill || "none")}" stroke="${escapeHTML(e.stroke || "none")}" stroke-width="${num(e.strokeWidth)}"/></svg>`;
  } else if (e.shape === "circle") {
    const r = num(e.r, 5);
    el.style.left = (num(e.cx, t.page.width / 2) - r) / t.page.width * 100 + "%";
    el.style.top = (num(e.cy, t.page.height / 2) - r) / t.page.height * 100 + "%";
    el.style.width = (2 * r) / t.page.width * 100 + "%";
    el.style.height = (2 * r) / t.page.height * 100 + "%";
    el.style.background = e.fill || "transparent";
    el.style.border = `${num(e.strokeWidth)}px solid ${e.stroke || "transparent"}`;
    el.style.borderRadius = "50%";
  } else {
    el.style.left = (num(e.x) / t.page.width * 100) + "%";
    el.style.top = (num(e.y) / t.page.height * 100) + "%";
    el.style.width = (num(e.w) / t.page.width * 100) + "%";
    el.style.height = (num(e.h) / t.page.height * 100) + "%";
    el.style.background = e.fill || "transparent";
    el.style.border = `${num(e.strokeWidth)}px solid ${e.stroke || "transparent"}`;
  }
  return el;
}

export function renderCanvas(container, row = null, interactive = false) {
  const t = getTemplate(state.templateId);
  const data = row || sampleRecord();
  const vc = verificationContext(data, state.sampleIndex);
  container.innerHTML = "";
  container.className = "certificate-canvas";
  container.style.background = t.background;
  container.style.aspectRatio = `${t.page.width} / ${t.page.height}`;
  const sx = 100 / t.page.width, sy = 100 / t.page.height;

  const applyScale = () => {
    const scale = container.clientWidth / t.page.width;
    container.style.setProperty("--cf-scale", String(scale));
  };

  state.elements.forEach(e => {
    if (e.type === "shape") {
      container.appendChild(shapeNode(e, t));
      return;
    }
    let el = document.createElement("div");
    el.className = "canvas-element";
    el.dataset.id = e.id;
    el.style.left = (num(e.x) * sx) + "%";
    el.style.top = (num(e.y) * sy) + "%";
    el.style.width = (num(e.w) * sx) + "%";
    if (e.h) el.style.height = (num(e.h) * sy) + "%";

    if (e.type === "text") {
      el.textContent = resolveText(e.text, data, vc);
      el.style.transform = "translate(-50%,-50%)";
      el.style.fontFamily = e.font || "Arial";
      el.style.fontSize = `calc(${num(e.size, 16)}px * var(--cf-scale, 1))`;
      el.style.fontWeight = num(e.weight, 400);
      el.style.color = e.color || "#17191d";
      el.style.textAlign = ["left", "center", "right"].includes(e.align) ? e.align : "center";
      el.style.lineHeight = num(e.lineHeight, 1.25);
      el.style.whiteSpace = "pre-wrap";
    } else if (e.type === "image") {
      el = document.createElement("img");
      el.className = "canvas-element image-element";
      el.dataset.id = e.id;
      el.src = e.src || "";
      el.alt = e.name || "Uploaded image";
      el.draggable = false;
      el.style.left = (num(e.x) * sx) + "%";
      el.style.top = (num(e.y) * sy) + "%";
      el.style.width = (num(e.w, 180) * sx) + "%";
      el.style.height = (num(e.h, 90) * sy) + "%";
      el.style.transform = "translate(-50%,-50%)";
      el.style.objectFit = e.fit || "contain";
      el.style.opacity = e.opacity == null ? 1 : e.opacity;
    } else if (e.type === "qr") {
      el.style.background = "transparent";
      el.style.transform = "translate(-50%,-50%)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      const qrImg = document.createElement("img");
      qrImg.src = e._qrDataUrl || generateQRDataUrl(resolveText(e.text || "{{VERIFY_URL}}", data, vc), 200);
      qrImg.alt = "QR code linking to certificate verification";
      qrImg.draggable = false;
      qrImg.style.width = "100%";
      qrImg.style.height = "100%";
      qrImg.style.objectFit = "contain";
      el.appendChild(qrImg);
    }

    if (e.id === state.selectedElement) {
      el.classList.add("selected");
      if (interactive && !e.locked && (e.type === "text" || e.type === "image" || e.type === "qr")) {
        appendResizeHandles(el, e, sx, sy);
      }
    }

    if (interactive && !e.locked) {
      el.tabIndex = 0;
      el.dataset.nudge = "1";
      el.addEventListener("pointerdown", ev => beginDragElement(ev, e, container, t));
      el.addEventListener("click", ev => { ev.stopPropagation(); state.selectedElement = e.id; renderCurrentEditor(); });
      el.addEventListener("focus", () => {
        if (state.selectedElement === e.id) return;
        state.selectedElement = e.id;
        container.querySelectorAll(".canvas-element.selected").forEach(n => n.classList.remove("selected"));
        el.classList.add("selected");
        renderProperties();
      });
      el.addEventListener("keydown", ev => nudgeElement(ev, e, t, container));
      el.addEventListener("keyup", ev => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)) pushHistory();
      });
    }
    container.appendChild(el);
  });

  container.onclick = () => { if (interactive) { state.selectedElement = null; renderCurrentEditor(); } };
  applyScale();
  if (window.ResizeObserver) {
    if (container._cfObserver) container._cfObserver.disconnect();
    container._cfObserver = new ResizeObserver(applyScale);
    container._cfObserver.observe(container);
  }
}

function nudgeElement(ev, e, t, container) {
  const step = ev.shiftKey ? 1 : 8;
  const map = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
  const d = map[ev.key];
  if (!d || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  ev.preventDefault();
  e.x = Math.max(0, Math.min(t.page.width, num(e.x) + d[0]));
  e.y = Math.max(0, Math.min(t.page.height, num(e.y) + d[1]));
  const node = container.querySelector(sel(e.id));
  if (node) {
    node.style.left = (e.x / t.page.width * 100) + "%";
    node.style.top = (e.y / t.page.height * 100) + "%";
  }
  const propX = document.getElementById("propX");
  const propY = document.getElementById("propY");
  if (propX) propX.value = e.x;
  if (propY) propY.value = e.y;
}

function appendResizeHandles(el, e, sx, sy) {
  HANDLES.forEach(h => {
    const handle = document.createElement("div");
    handle.className = `resize-handle handle-${h}`;
    handle.dataset.handle = h;
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", ev => {
      ev.preventDefault(); ev.stopPropagation();
      beginResize(ev, h, e, el, sx, sy);
    });
    el.appendChild(handle);
  });
}

// Attach pointer listeners where they cannot leak: prefer pointer capture on the
// dragged node, fall back to window, and always clean up on up/cancel.
function bindPointerCleanup(target, ev, move, up) {
  let bound = window;
  try { target.setPointerCapture(ev.pointerId); bound = target; } catch (_) { /* window fallback */ }
  const remove = () => {
    bound.removeEventListener("pointermove", move);
    bound.removeEventListener("pointerup", up);
    bound.removeEventListener("pointercancel", up);
  };
  bound.addEventListener("pointermove", move);
  bound.addEventListener("pointerup", up);
  bound.addEventListener("pointercancel", up);
  return remove;
}

export function beginDragElement(ev, e, container, t) {
  ev.preventDefault(); ev.stopPropagation();
  state.selectedElement = e.id;
  const startX = ev.clientX, startY = ev.clientY, origX = e.x, origY = e.y;
  const rect = container.getBoundingClientRect();
  let guides = [];

  const showGuides = (x, y) => {
    guides.forEach(g => g.remove());
    guides = [];
    const others = state.elements.filter(o => o.id !== e.id);
    others.forEach(o => {
      const candidates = [
        { val: o.x, type: "v" }, { val: num(o.x) + num(o.w) / 2, type: "v" }, { val: num(o.x) + num(o.w), type: "v" },
        { val: o.y, type: "h" }, { val: num(o.y) + num(o.h) / 2, type: "h" }, { val: num(o.y) + num(o.h), type: "h" }
      ];
      candidates.forEach(c => {
        if (c.type === "v" && Math.abs((x - c.val) / t.page.width * rect.width) < snapThreshold) {
          const g = document.createElement("div");
          g.className = "align-guide vertical";
          g.style.left = (c.val / t.page.width * 100) + "%";
          container.appendChild(g); guides.push(g);
        }
        if (c.type === "h" && Math.abs((y - c.val) / t.page.height * rect.height) < snapThreshold) {
          const g = document.createElement("div");
          g.className = "align-guide horizontal";
          g.style.top = (c.val / t.page.height * 100) + "%";
          container.appendChild(g); guides.push(g);
        }
      });
    });
  };

  const move = mv => {
    let dx = (mv.clientX - startX) / rect.width * t.page.width;
    let dy = (mv.clientY - startY) / rect.height * t.page.height;
    let nx = origX + dx, ny = origY + dy;
    const others = state.elements.filter(o => o.id !== e.id);
    others.forEach(o => {
      [o.x, num(o.x) + num(o.w) / 2, num(o.x) + num(o.w)].forEach(v => { if (Math.abs(nx - v) < snapThreshold / rect.width * t.page.width) nx = v; });
      [o.y, num(o.y) + num(o.h) / 2, num(o.y) + num(o.h)].forEach(v => { if (Math.abs(ny - v) < snapThreshold / rect.height * t.page.height) ny = v; });
    });

    const isCentered = (e.type === "text" || e.type === "image" || e.type === "qr");
    if (isCentered) {
      e.x = Math.round(Math.max(10, Math.min(t.page.width - 10, nx)));
      e.y = Math.round(Math.max(10, Math.min(t.page.height - 10, ny)));
    } else {
      e.x = Math.round(Math.max(0, Math.min(t.page.width - num(e.w), nx)));
      e.y = Math.round(Math.max(0, Math.min(t.page.height - num(e.h), ny)));
    }

    const node = container.querySelector(sel(e.id));
    if (node) {
      node.style.left = (e.x / t.page.width * 100) + "%";
      node.style.top = (e.y / t.page.height * 100) + "%";
    }

    const propX = document.getElementById("propX");
    const propY = document.getElementById("propY");
    if (propX) propX.value = e.x;
    if (propY) propY.value = e.y;

    showGuides(e.x, e.y);
  };

  const up = () => {
    remove();
    guides.forEach(g => g.remove());
    guides = [];
    const moved = e.x !== origX || e.y !== origY;
    if (moved) { renderCurrentEditor(); pushHistory(); }
  };
  const remove = bindPointerCleanup(ev.currentTarget || ev.target, ev, move, up);
}

function beginResize(ev, handle, el, node, sx, sy) {
  const t = getTemplate(state.templateId);
  const startX = ev.clientX, startY = ev.clientY;
  const orig = {
    x: num(el.x), y: num(el.y),
    w: num(el.w, 40) || 40, h: num(el.h, 0),
    size: num(el.size, 16) || 16
  };
  const container = node.parentElement;
  const rect = container.getBoundingClientRect();
  const isCentered = (el.type === "text" || el.type === "image" || el.type === "qr");
  const isText = el.type === "text";

  const move = mv => {
    const dx = (mv.clientX - startX) / rect.width * t.page.width;
    const dy = (mv.clientY - startY) / rect.height * t.page.height;
    let nw = orig.w, nh = orig.h, nx = orig.x, ny = orig.y;

    if (isCentered) {
      if (handle.includes("e")) { nw = Math.min(t.page.width, Math.max(20, orig.w + dx)); nx = orig.x + dx / 2; }
      if (handle.includes("w")) { nw = Math.min(t.page.width, Math.max(20, orig.w - dx)); nx = orig.x + dx / 2; }
      if (!isText) {
        if (handle.includes("s")) { nh = Math.min(t.page.height, Math.max(10, orig.h + dy)); ny = orig.y + dy / 2; }
        if (handle.includes("n")) { nh = Math.min(t.page.height, Math.max(10, orig.h - dy)); ny = orig.y + dy / 2; }
      }
    } else {
      if (handle.includes("e")) nw = Math.max(20, orig.w + dx);
      if (handle.includes("w")) { nw = Math.max(20, orig.w - dx); nx = orig.x + orig.w - nw; }
      if (handle.includes("s")) nh = Math.max(10, orig.h + dy);
      if (handle.includes("n")) { nh = Math.max(10, orig.h - dy); ny = orig.y + orig.h - nh; }
    }

    const rw = v => Number.isFinite(v) ? Math.round(v) : null;
    const cx = rw(nx), cy = rw(ny), cw = rw(nw);
    if (cx != null) el.x = cx;
    if (cy != null) el.y = cy;
    if (cw != null) el.w = cw;
    if (!isText) { const chh = rw(nh); if (chh != null && chh > 0) el.h = chh; }

    if (isText) {
      // Text has no height model: horizontal drag scales the font (as before),
      // vertical drag steps the font size in line-height increments.
      if (handle.includes("e") || handle.includes("w")) {
        el.size = Math.max(6, Math.min(200, Math.round(orig.size * (el.w / orig.w))));
      } else {
        const step = Math.round(dy / (orig.size * 1.25));
        el.size = Math.max(6, Math.min(200, orig.size + (handle.includes("n") ? -step : step)));
      }
      const propSize = document.getElementById("propSize");
      if (propSize) propSize.value = el.size;
    }

    node.style.left = (el.x / t.page.width * 100) + "%";
    node.style.top = (el.y / t.page.height * 100) + "%";
    node.style.width = (el.w / t.page.width * 100) + "%";
    if (el.h) node.style.height = (el.h / t.page.height * 100) + "%";

    const propW = document.getElementById("propW");
    const propH = document.getElementById("propH");
    const propX = document.getElementById("propX");
    const propY = document.getElementById("propY");
    if (propW) propW.value = el.w;
    if (propH && el.h) propH.value = el.h;
    if (propX) propX.value = el.x;
    if (propY) propY.value = el.y;
  };

  const up = () => {
    remove();
    renderCurrentEditor();
    pushHistory();
  };
  const remove = bindPointerCleanup(ev.currentTarget || ev.target, ev, move, up);
}
