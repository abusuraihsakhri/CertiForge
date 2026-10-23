import { state, markDirty } from './state.js';
import { generationRows } from './generator.js';
import { toAcademicTitleCase, escapeHTML, toast } from './utils.js';
import { columnToken } from './variables.js';
import { processSignatureImage, loadImage, canvasToPngDataUrl } from './signature.js';
import { addCleanedSignature } from './editor.js';
import { initWebfonts } from './webfonts.js';

/**
 * Persistent studio chrome controller:
 *  - left rail sections (CSV variables + Clean Case, canvas layers shell, signature cleaner)
 *  - floating record scrubber (current record + longest/shortest stress jumps)
 * The repaint callback is injected by ui.js to avoid a circular import.
 */

let _repaint = null;
let _chromeReady = false;

export function setScrubberRepaint(fn) { _repaint = fn; }

function records() {
  return generationRows();
}

function scrubberHasRecords() {
  return Boolean(state.rows.length && state.mappings && state.mappings.NAME && records().length);
}

export function updateScrubber() {
  const bar = document.getElementById("recordScrubber");
  if (!bar) return;
  if (!scrubberHasRecords()) {
    bar.hidden = true;
    return;
  }
  const rows = records();
  const i = Math.max(0, Math.min(rows.length - 1, state.sampleIndex));
  state.sampleIndex = i;
  bar.hidden = false;
  const index = document.getElementById("scrubIndex");
  const name = document.getElementById("scrubName");
  if (index) index.textContent = `Row ${i + 1} / ${rows.length}`;
  const label = String(rows[i].NAME || "").trim();
  if (name) name.textContent = label.length > 34 ? label.slice(0, 34) + "…" : (label || `Certificate ${i + 1}`);
}

function goToRecord(i) {
  const rows = records();
  const target = Math.max(0, Math.min(rows.length - 1, i));
  if (target === state.sampleIndex) { updateScrubber(); return; }
  state.sampleIndex = target;
  updateScrubber();
  if (_repaint) _repaint();
}

export function jumpToLongestName() {
  // Scan the mapped NAME value itself (what generationRows filters on), not the
  // raw header key — mappedRows() re-keys columns into tokens.
  const rows = records();
  if (!rows.length) return;
  let idx = 0, maxLen = -1;
  rows.forEach((r, i) => {
    const len = String(r.NAME ?? "").length;
    if (len > maxLen) { maxLen = len; idx = i; }
  });
  goToRecord(idx);
}

export function jumpToShortestName() {
  const rows = records();
  if (!rows.length) return;
  let idx = 0, minLen = Infinity;
  rows.forEach((r, i) => {
    const len = String(r.NAME ?? "").length;
    if (len < minLen) { minLen = len; idx = i; }
  });
  goToRecord(idx);
}

/* ==========================================================================
   LEFT RAIL
   ========================================================================== */

const PILL_CLASSES = ["var-indigo", "var-emerald", "var-amber", "var-slate"];

export function refreshRail() {
  const sections = document.getElementById("railSections");
  if (!sections) return;
  const isTemplates = (state.currentStep || "templates") === "templates";

  const variables = document.getElementById("railVariables");
  const layers = document.getElementById("railLayers");
  const signature = document.getElementById("railSignature");
  if (variables) variables.hidden = isTemplates;
  if (layers) layers.hidden = isTemplates;
  if (signature) signature.hidden = isTemplates;
  if (isTemplates) return;

  if (variables) {
    const pills = document.getElementById("variablePills");
    if (state.columns.length) {
      const shown = state.columns.slice(0, 12);
      pills.innerHTML = shown.map((c, i) => `<button class="var-pill ${PILL_CLASSES[i % PILL_CLASSES.length]}" data-col="${escapeHTML(c)}" title="Copy {{${escapeHTML(columnToken(c))}}}">{{${escapeHTML(columnToken(c))}}}</button>`).join("")
        + (state.columns.length > shown.length ? `<button class="var-pill var-slate" disabled>+${state.columns.length - shown.length} more</button>` : "");
      pills.querySelectorAll("[data-col]").forEach(p => {
        p.onclick = async () => {
          try { await navigator.clipboard.writeText(`{{${columnToken(p.dataset.col)}}}`); toast(`Copied {{${columnToken(p.dataset.col)}}}.`); }
          catch (_) { toast(`Token: {{${columnToken(p.dataset.col)}}}`); }
        };
      });
    } else {
      pills.innerHTML = '<div class="mini-help">Import a participant spreadsheet to unlock column tokens.</div>';
    }
  }

  if (layers) {
    const count = document.getElementById("layerCount");
    if (count) count.textContent = state.elements.length + " elements";
  }
}

/* ==========================================================================
   CLEAN CASE — academic title-case sanitizer for the mapped NAME column
   ========================================================================== */

function cleanCase() {
  const col = state.mappings.NAME;
  if (!col || !state.rows.length) {
    toast("Import participants and map a NAME column first.");
    return;
  }
  let changed = 0;
  state.rows.forEach(r => {
    const value = String(r[col] ?? "");
    if (!value.trim()) return;
    const cleaned = toAcademicTitleCase(value);
    if (cleaned !== value) { r[col] = cleaned; changed++; }
  });
  if (!changed) {
    toast("Names already look clean — no changes made.");
    return;
  }
  markDirty();
  toast(`Title-cased ${changed} name${changed === 1 ? "" : "s"} (post-nominals preserved).`);
  if (_repaint) _repaint();
}

/* ==========================================================================
   SIGNATURE CLEANER
   ========================================================================== */

let _uploadedSignature = null; // Image element
let _signatureElementId = null; // project layer currently bound to the cleaner
let _inkHex = "#0f172a";

function retintSignature() {
  if (!_uploadedSignature) return null;
  const threshold = parseInt(document.getElementById("sigThreshold")?.value ?? "165", 10);
  const canvas = processSignatureImage(_uploadedSignature, threshold, _inkHex);
  return canvasToPngDataUrl(canvas);
}

async function onSignatureUpload(file) {
  if (!file || !/^image\/(png|jpeg|webp|gif|bmp|svg\+xml)$/.test(file.type)) {
    toast("Please choose a PNG, JPG, WebP or GIF photo of the signature.");
    return;
  }
  try {
    const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    const img = await loadImage(dataUrl);
    if (!img.naturalWidth) throw new Error("The image is empty.");
    _uploadedSignature = img;
    const cleaned = retintSignature();
    if (!cleaned) throw new Error("Cleaning failed.");
    const el = addCleanedSignature(cleaned, file.name.replace(/\.[^.]+$/, "") || "Signature");
    _signatureElementId = el ? el.id : null;
    const status = document.getElementById("sigStatus");
    if (status) status.textContent = "Paper stripped. Move while adjusting the threshold slider / ink color — the layer updates live.";
    toast("Signature cleaned and added as a layer.");
    if (_repaint) _repaint();
  } catch (e) {
    toast(e.message || "Signature cleaning failed.");
    const status = document.getElementById("sigStatus");
    if (status) status.textContent = "Could not process that image — try another photo.";
  }
}

function reprocessBoundSignature() {
  if (!_uploadedSignature) return;
  const cleaned = retintSignature();
  if (!cleaned) return;
  const el = _signatureElementId ? (state.elements || []).find(e => e.id === _signatureElementId && e.type === "image") : null;
  if (!el) return;
  el.src = cleaned;
  markDirty();
  if (_repaint) _repaint();
}

/* ==========================================================================
   BOOT
   ========================================================================== */

export function bindStudioChrome(repaint) {
  _repaint = repaint;
  if (_chromeReady) return;
  _chromeReady = true;

  document.getElementById("scrubPrev")?.addEventListener("click", () => goToRecord(state.sampleIndex - 1));
  document.getElementById("scrubNext")?.addEventListener("click", () => goToRecord(state.sampleIndex + 1));
  document.getElementById("scrubLongest")?.addEventListener("click", jumpToLongestName);
  document.getElementById("scrubShortest")?.addEventListener("click", jumpToShortestName);

  document.getElementById("cleanCaseBtn")?.addEventListener("click", cleanCase);

  const sigInput = document.getElementById("sigUploadInput");
  sigInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) onSignatureUpload(file);
  });

  document.getElementById("sigThreshold")?.addEventListener("input", reprocessBoundSignature);

  document.querySelectorAll(".ink-swatch").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ink-swatch").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _inkHex = btn.dataset.ink || "#0f172a";
      reprocessBoundSignature();
    });
  });

  // Register self-hosted ceremonial fonts with the document once the renderer
  // needs them (fonts.ready gate is not required — FontFace resolves async).
  initWebfonts().catch(() => {});
}

export { goToRecord as goToScrubberRecord };
