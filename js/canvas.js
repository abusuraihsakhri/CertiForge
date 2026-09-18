import { state } from './state.js';
import { getTemplate } from './templates.js';
import { resolveText, sampleRecord } from './variables.js';
import { pushHistory } from './history.js';
import { renderCurrentEditor } from './editor.js';
import { snapThreshold } from './config.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function renderCanvas(container, row = null, interactive = false) {
  const t = getTemplate(state.templateId);
  const data = row || sampleRecord();
  container.innerHTML = "";
  container.className = "certificate-canvas";
  container.style.background = t.background;
  const sx = 100 / t.page.width, sy = 100 / t.page.height;

  const applyScale = () => {
    const scale = container.clientWidth / t.page.width;
    container.style.setProperty("--cf-scale", String(scale));
  };

  state.elements.forEach(e => {
    let el = document.createElement("div");
    el.className = "canvas-element";
    el.dataset.id = e.id;
    el.style.left = (e.x * sx) + "%";
    el.style.top = (e.y * sy) + "%";
    el.style.width = ((e.w || 0) * sx) + "%";
    if (e.h) el.style.height = (e.h * sy) + "%";

    if (e.type === "shape") {
      if (e.shape === "polygon" && e.points) {
        el.style.background = "transparent";
        el.innerHTML = `<svg viewBox="0 0 ${t.page.width} ${t.page.height}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><polygon points="${e.points}" fill="${e.fill || "none"}" stroke="${e.stroke || "none"}" stroke-width="${e.strokeWidth || 0}"/></svg>`;
      } else if (e.shape === "circle") {
        el.style.background = e.fill || "transparent";
        el.style.border = `${e.strokeWidth || 0}px solid ${e.stroke || "transparent"}`;
        el.style.borderRadius = "50%";
      } else {
        el.style.background = e.fill || "transparent";
        el.style.border = `${e.strokeWidth || 0}px solid ${e.stroke || "transparent"}`;
      }
    } else if (e.type === "text") {
      el.textContent = resolveText(e.text, data, state.sampleIndex);
      el.style.transform = "translate(-50%,-50%)";
      el.style.fontFamily = e.font || "Arial";
      el.style.fontSize = `calc(${e.size || 16}px * var(--cf-scale, 1))`;
      el.style.fontWeight = e.weight || 400;
      el.style.color = e.color || "#17191d";
      el.style.textAlign = e.align || "center";
      el.style.lineHeight = e.lineHeight || 1.25;
      el.style.whiteSpace = "pre-wrap";
    } else if (e.type === "image") {
      el = document.createElement("img");
      el.className = "canvas-element image-element";
      el.dataset.id = e.id;
      el.src = e.src || "";
      el.alt = e.name || "Uploaded image";
      el.draggable = false;
      el.style.left = (e.x * sx) + "%";
      el.style.top = (e.y * sy) + "%";
      el.style.width = ((e.w || 180) * sx) + "%";
      el.style.height = ((e.h || 90) * sy) + "%";
      el.style.transform = "translate(-50%,-50%)";
      el.style.objectFit = e.fit || "contain";
      el.style.opacity = e.opacity == null ? 1 : e.opacity;
    } else if (e.type === "qr") {
      el.innerHTML = e._svg || "";
      el.style.background = "transparent";
    }

    if (e.id === state.selectedElement) {
      el.classList.add("selected");
      if (interactive && !e.locked && (e.type === "text" || e.type === "image" || e.type === "qr")) {
        appendResizeHandles(el, e, sx, sy);
      }
    }
    if (interactive && !e.locked) {
      el.addEventListener("pointerdown", ev => beginDragElement(ev, e, container, t));
      el.addEventListener("click", ev => { ev.stopPropagation(); state.selectedElement = e.id; renderCurrentEditor(); });
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

function appendResizeHandles(el, e, sx, sy) {
  HANDLES.forEach(h => {
    const handle = document.createElement("div");
    handle.className = `resize-handle handle-${h}`;
    handle.dataset.handle = h;
    handle.addEventListener("pointerdown", ev => {
      ev.preventDefault(); ev.stopPropagation();
      beginResize(ev, h, e, el, sx, sy);
    });
    el.appendChild(handle);
  });
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
        { val: o.x, type: "v" }, { val: o.x + (o.w || 0) / 2, type: "v" }, { val: o.x + (o.w || 0), type: "v" },
        { val: o.y, type: "h" }, { val: o.y + (o.h || 0) / 2, type: "h" }, { val: o.y + (o.h || 0), type: "h" }
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
      [o.x, o.x + (o.w || 0) / 2, o.x + (o.w || 0)].forEach(v => { if (Math.abs(nx - v) < snapThreshold / rect.width * t.page.width) nx = v; });
      [o.y, o.y + (o.h || 0) / 2, o.y + (o.h || 0)].forEach(v => { if (Math.abs(ny - v) < snapThreshold / rect.height * t.page.height) ny = v; });
    });
    e.x = Math.max(0, Math.min(t.page.width - (e.w || 0), nx));
    e.y = Math.max(0, Math.min(t.page.height - (e.h || 0), ny));
    const node = container.querySelector(`[data-id="${e.id}"]`);
    if (node) { node.style.left = (e.x / t.page.width * 100) + "%"; node.style.top = (e.y / t.page.height * 100) + "%"; }
    showGuides(e.x, e.y);
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    guides.forEach(g => g.remove());
    guides = [];
    renderCurrentEditor();
    pushHistory();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

function beginResize(ev, handle, el, node, sx, sy) {
  const t = getTemplate(state.templateId);
  const startX = ev.clientX, startY = ev.clientY;
  const orig = { x: el.x, y: el.y, w: el.w, h: el.h, size: el.size };
  const container = node.parentElement;
  const rect = container.getBoundingClientRect();

  const move = mv => {
    const dx = (mv.clientX - startX) / rect.width * t.page.width;
    const dy = (mv.clientY - startY) / rect.height * t.page.height;
    let nw = orig.w, nh = orig.h, nx = orig.x, ny = orig.y;

    if (handle.includes("e")) nw = Math.max(20, orig.w + dx);
    if (handle.includes("w")) { nw = Math.max(20, orig.w - dx); nx = orig.x + orig.w - nw; }
    if (handle.includes("s")) nh = Math.max(10, orig.h + dy);
    if (handle.includes("n")) { nh = Math.max(10, orig.h - dy); ny = orig.y + orig.h - nh; }

    el.w = nw; el.h = nh; el.x = nx; el.y = ny;
    if (el.type === "text" && (handle === "e" || handle === "w")) {
      el.size = Math.max(6, Math.round(orig.size * (nw / orig.w)));
    }
    node.style.left = (el.x / t.page.width * 100) + "%";
    node.style.top = (el.y / t.page.height * 100) + "%";
    node.style.width = (el.w / t.page.width * 100) + "%";
    if (el.h) node.style.height = (el.h / t.page.height * 100) + "%";
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    renderCurrentEditor();
    pushHistory();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}
