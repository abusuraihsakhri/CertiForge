import { state, markDirty, randomVerifySecret } from './state.js';
import { curatedTemplates, getTemplate, PRESET_TEMPLATES, PRESET_CATEGORIES } from './templates.js';
import { templateSVG, loadTemplate } from './template-loader.js';
import { variableKeys, columnToken, extractConferencePrefix, extractConferenceYear, formatId } from './variables.js';
import { safeFilename, escapeHTML, toast, appConfirm, appPrompt } from './utils.js';
import { renderCanvas, applyAlign } from './canvas.js';
import { renderCurrentEditor, addTextElement, addQRElement, addImageFile, loadCustomFont, setInspectorStale } from './editor.js';
import { parseSpreadsheet } from './spreadsheet.js';
import { validateRows, validateProject } from './validator.js';
import { generateAll, isGenerating, cancelGeneration, generationRows, buildPublicRegistry, finalizeZip, buildMasterPdf } from './generator.js';
import { saveProject, loadProjectFile } from './project.js';
import { undo, redo } from './history.js';
import { renderCertificateSVG } from './pdf.js';
import { LEGACY_VERIFY_SALT } from './config.js';
import { hasWebCrypto, encryptWithPassphrase, decryptWithPassphrase, exportPublicKeyJWK, exportPrivateKeyJWK, generateKeyPair, keyIdFromJwk } from './crypto.js';
import { loadSigningKey, storeSigningKey } from './storage.js';
import { refreshRail, bindStudioChrome, updateScrubber, setScrubberRepaint } from './studio.js';

export { updateGenerationProgress } from './progress.js';

const WORKFLOW_STEPS = ["templates", "editor", "data", "mapping", "preview", "generate"];

export function canVisitStep(step) {
  if (step === "mapping") return Boolean(state.rows.length);
  if (step === "preview" || step === "generate") return Boolean(state.rows.length && state.mappings && state.mappings.NAME);
  return true;
}

function updateShell() {
  const current = state.currentStep || "templates";
  const currentIndex = WORKFLOW_STEPS.indexOf(current);
  document.querySelectorAll(".nav-item[data-step]").forEach(b => {
    const index = WORKFLOW_STEPS.indexOf(b.dataset.step);
    const active = b.dataset.step === current;
    const unlocked = canVisitStep(b.dataset.step);
    b.classList.toggle("active", active);
    b.classList.toggle("complete", index >= 0 && index < currentIndex);
    b.classList.toggle("locked", !unlocked);
    if (unlocked) b.removeAttribute("aria-disabled");
    else b.setAttribute("aria-disabled", "true");
    if (active) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
  const projectName = document.getElementById("topProjectName");
  if (projectName) {
    if (document.activeElement !== projectName && projectName.textContent !== (state.projectName || "Untitled Conference")) {
      projectName.textContent = state.projectName || "Untitled Conference";
    }
  }
}

export function go(step) {
  state.currentStep = step;
  updateShell();
  renderStep();
}

export function historyAction(fn, label) {
  if (fn()) {
    if (state.currentStep === "editor") renderCurrentEditor();
    toast(label);
  } else {
    toast(label === "Undo" ? "Nothing left to undo." : "Nothing left to redo.");
  }
}

/* ==========================================================================
   PERSISTENT STUDIO SHELL
   The 3-pane workspace (center canvas + right inspector) is mounted once and
   never rebuilt; every step renders into the step drawer / gallery / canvas
   so real-time changes are visible during the whole workflow.
   ========================================================================== */

let _chromeBound = false;

function ensureShell(app) {
  if (document.querySelector(".studio-layout")) return;
  app.innerHTML = `
  <div class="editor-layout studio-layout" id="studioLayout">
    <section class="studio-center">
      <div class="canvas-toolbar" id="canvasToolbar">
        <div class="canvas-toolbar-group"><button class="tool-btn" id="undoBtn" title="Undo (Ctrl+Z)">↶</button><button class="tool-btn" id="redoBtn" title="Redo (Ctrl+Shift+Z)">↷</button></div>
        <div class="canvas-toolbar-title">Canvas</div>
        <div class="canvas-toolbar-group align-group" title="Shift+click two or more elements, then align or distribute">
          <button class="tool-btn" type="button" data-align="left" aria-disabled="true" aria-label="Align left edges" title="Align left edges">L</button>
          <button class="tool-btn" type="button" data-align="hcenter" aria-disabled="true" aria-label="Align horizontal centers" title="Align horizontal centers">C</button>
          <button class="tool-btn" type="button" data-align="right" aria-disabled="true" aria-label="Align right edges" title="Align right edges">R</button>
          <button class="tool-btn" type="button" data-align="top" aria-disabled="true" aria-label="Align top edges" title="Align top edges">T</button>
          <button class="tool-btn" type="button" data-align="vcenter" aria-disabled="true" aria-label="Align vertical centers" title="Align vertical centers">M</button>
          <button class="tool-btn" type="button" data-align="bottom" aria-disabled="true" aria-label="Align bottom edges" title="Align bottom edges">B</button>
          <button class="tool-btn" type="button" data-align="dist-h" aria-disabled="true" aria-label="Distribute horizontally" title="Distribute horizontally">⇄</button>
          <button class="tool-btn" type="button" data-align="dist-v" aria-disabled="true" aria-label="Distribute vertically" title="Distribute vertically">⇅</button>
        </div>
        <div class="canvas-toolbar-group zoom-group"><button class="tool-btn" data-zoom="fit" aria-pressed="true">Fit</button><button class="tool-btn" data-zoom="75" aria-pressed="false">75%</button><button class="tool-btn" data-zoom="100" aria-pressed="false">100%</button></div>
      </div>
      <div class="canvas-viewport" id="canvasViewport" hidden>
        <!-- Floating stress-test record scrubber -->
        <div class="record-scrubber" id="recordScrubber" hidden>
          <button class="scrubber-btn" id="scrubPrev" title="Previous record">◀</button>
          <span class="scrubber-status"><span id="scrubIndex">Row 1 / 1</span>: <strong id="scrubName"></strong></span>
          <button class="scrubber-btn" id="scrubNext" title="Next record">▶</button>
          <span class="scrubber-divider" aria-hidden="true"></span>
          <button class="scrubber-stress-btn" id="scrubLongest" title="Jump to the row with the longest name">⚡ Longest</button>
          <button class="scrubber-stress-btn" id="scrubShortest" title="Jump to the shortest name">Shortest</button>
        </div>
        <div class="canvas-stage" id="editorCanvasStage"><div id="editorCanvas"></div></div>
        <div class="canvas-stage" id="previewStage" hidden><div id="previewSheet" class="preview-sheet"></div></div>
      </div>
      <div class="studio-page" id="studioPage" hidden></div>
      <div class="studio-drawer" id="stepPanel"></div>
    </section>
    <aside class="studio-right-inspector" id="inspectorPane" aria-label="Inspector">
      <div class="panel-heading-row"><h3>Inspector</h3><span>Selected element</span></div>
      <div id="properties"></div>
    </aside>
  </div>`;
  bindShellControls(app);
}

function bindShellControls() {
  document.getElementById("addTextBtn").onclick = addTextElement;
  document.getElementById("addQRBtn").onclick = addQRElement;
  const imageInput = document.getElementById("imageFile");
  document.getElementById("addImageBtn").onclick = () => imageInput.click();
  imageInput.onchange = async () => { try { await addImageFile(imageInput.files[0]); } catch (e) { toast(e.message); } finally { imageInput.value = ""; } };
  const fontInput = document.getElementById("fontFileInput");
  fontInput.onchange = async () => { try { await loadCustomFont(fontInput.files[0]); } catch (e) { toast(e.message); } finally { fontInput.value = ""; } };
  document.getElementById("undoBtn").onclick = () => historyAction(undo, "Undo");
  document.getElementById("redoBtn").onclick = () => historyAction(redo, "Redo");
  document.querySelectorAll("[data-zoom]").forEach(btn => btn.onclick = () => {
    _editorZoom = btn.dataset.zoom;
    applyEditorZoom();
  });
  document.querySelectorAll("[data-align]").forEach(btn => btn.onclick = () => {
    if (btn.getAttribute("aria-disabled") === "true") {
      toast("Shift+click two or more elements first, then align.");
      return;
    }
    if (applyAlign(btn.dataset.align)) toast("Aligned selection.");
  });

  // Click-to-rename project title in the studio top bar (blueprint: inline rename).
  const projectName = document.getElementById("topProjectName");
  if (projectName) {
    projectName.setAttribute("contenteditable", "true");
    projectName.setAttribute("spellcheck", "false");
    projectName.setAttribute("title", "Click to rename the project");
    projectName.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); projectName.blur(); } });
    projectName.addEventListener("blur", () => {
      const val = projectName.textContent.trim() || "Untitled Conference";
      if (val !== state.projectName) {
        state.projectName = val;
        markDirty();
        projectName.textContent = val;
      }
    });
  }

  if (!_chromeBound) {
    _chromeBound = true;
    bindStudioChrome(() => repaintCurrentRecord());
    setScrubberRepaint(() => repaintCurrentRecord());
  }
}

/* Record changes (scrubber, Clean Case) repaint the current view without a full
   step rebuild, so the canvas stays live everywhere. */
function repaintCurrentRecord() {
  const step = state.currentStep || "templates";
  if (step === "editor") {
    setInspectorStale();
    renderCurrentEditor();
  } else if (step === "preview") {
    showPreviewRecord();
  } else {
    const stage = document.getElementById("editorCanvas");
    if (stage && !stage.parentElement.hidden) renderCanvas(stage, null, false);
  }
  updateScrubber();
  refreshRail();
}

export function renderStep() {
  const app = document.getElementById("app"), step = state.currentStep || "templates";
  app.removeAttribute("aria-busy");
  ensureShell(app);
  const loader = app.querySelector(".workspace-loader");
  if (loader) loader.remove();

  const gallery = document.getElementById("studioPage");
  const viewport = document.getElementById("canvasViewport");
  const drawer = document.getElementById("stepPanel");
  const properties = document.getElementById("properties");

  const isTemplates = step === "templates";
  gallery.hidden = !isTemplates;
  // The canvas viewport is the opposite of the gallery: it stays visible on
  // every working step and is replaced by the gallery only on Templates.
  viewport.hidden = isTemplates;
  drawer.classList.toggle("slim", step === "editor");

  if (isTemplates) {
    document.getElementById("editorCanvasStage").hidden = false;
    document.getElementById("previewStage").hidden = true;
    renderTemplatesInto(gallery);
  } else if (step === "editor") {
    document.getElementById("editorCanvasStage").hidden = false;
    document.getElementById("previewStage").hidden = true;
    renderEditorDrawer(drawer);
    renderCurrentEditor();
    applyEditorZoom();
  } else if (step === "data") {
    document.getElementById("editorCanvasStage").hidden = false;
    document.getElementById("previewStage").hidden = true;
    renderDataDrawer(drawer);
    renderSampleCanvas();
  } else if (step === "mapping") {
    document.getElementById("editorCanvasStage").hidden = false;
    document.getElementById("previewStage").hidden = true;
    renderMappingDrawer(drawer);
    renderSampleCanvas();
  } else if (step === "preview") {
    document.getElementById("editorCanvasStage").hidden = true;
    document.getElementById("previewStage").hidden = false;
    renderPreviewDrawer(drawer);
  } else if (step === "generate") {
    document.getElementById("editorCanvasStage").hidden = false;
    document.getElementById("previewStage").hidden = true;
    renderGenerateDrawer(drawer);
    renderSampleCanvas();
  }

  if (step !== "editor" && properties) {
    properties.innerHTML = '<div class="empty">Inspector — select an element in the Design step.</div>';
  }
  updateScrubber();
  refreshRail();

  // innerHTML replacement orphans the previous focus — move it to the step
  // heading so keyboard and screen-reader users land in the new content.
  const heading = app.querySelector("#stepPanel h1, #studioPage h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

function renderSampleCanvas() {
  const stage = document.getElementById("editorCanvas");
  if (stage) renderCanvas(stage, null, false);
}

let _editorZoom = "fit";

function applyEditorZoom() {
  const canvas = document.getElementById("editorCanvas");
  if (!canvas) return;
  const pageWidth = getTemplate(state.templateId)?.page?.width || 1123;
  canvas.style.maxWidth = _editorZoom === "100" ? "none" : "";
  canvas.style.width = _editorZoom === "fit" ? "100%" : (_editorZoom === "75" ? "75%" : pageWidth + "px");
  document.querySelectorAll("[data-zoom]").forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.zoom === _editorZoom)));
  const sheet = document.getElementById("previewSheet");
  if (sheet) {
    sheet.style.maxWidth = _editorZoom === "100" ? "none" : "";
    sheet.style.width = _editorZoom === "fit" ? "min(100%, 1080px)" : (_editorZoom === "75" ? "75%" : "");
  }
}

/* ==========================================================================
   STEP: TEMPLATE GALLERY (fills the whole center pane)
   ========================================================================== */

let _templateFilter = "All";

/* Preset library: one category (10 cards) by default so the gallery's first
   paint stays fast; the "All" chip renders the full 100 on demand. */
let _presetFilter = "Academic";

function presetCategoriesWithCounts() {
  const counts = new Map(PRESET_CATEGORIES.map(c => [c, 0]));
  PRESET_TEMPLATES.forEach(t => { if (counts.has(t.category)) counts.set(t.category, counts.get(t.category) + 1); });
  return PRESET_CATEGORIES.map(c => ({ category: c, count: counts.get(c) }));
}

function filteredPresets() {
  return _presetFilter === "All" ? PRESET_TEMPLATES : PRESET_TEMPLATES.filter(t => t.category === _presetFilter);
}

/* Redraws only the preset chips + grid, in place. The curated 13-card gallery
   above is left untouched so its scroll position and state survive filtering. */
function drawPresetLibrary(gallery) {
  const filters = gallery.querySelector("#presetFilters");
  const grid = gallery.querySelector("#presetGrid");
  const countPill = gallery.querySelector("#presetCount");
  if (!filters || !grid) return;

  const presets = filteredPresets();

  filters.innerHTML = [
    `<button class="btn ${_presetFilter === "All" ? "primary" : "ghost"}" data-preset-cat="All">All (${PRESET_TEMPLATES.length})</button>`,
    ...presetCategoriesWithCounts().map(({ category, count }) =>
      `<button class="btn ${_presetFilter === category ? "primary" : "ghost"}" data-preset-cat="${escapeHTML(category)}">${escapeHTML(category)} (${count})</button>`
    )
  ].join("");

  grid.innerHTML = presets.map(t => `<button type="button" class="card preset-card" data-preset="${escapeHTML(t.id)}" aria-label="Apply preset ${escapeHTML(t.name)}">
      <div class="preset-thumb">${templateSVG(t.id)}</div>
      <div class="preset-info"><strong>${escapeHTML(t.name)}</strong><span>${escapeHTML(String(t.id).toUpperCase())} · ${escapeHTML(t.category)}</span></div>
    </button>`).join("");

  if (countPill) countPill.textContent = `${presets.length} of ${PRESET_TEMPLATES.length} presets`;

  filters.querySelectorAll("[data-preset-cat]").forEach(b => {
    b.onclick = () => {
      if (_presetFilter === b.dataset.presetCat) return;
      _presetFilter = b.dataset.presetCat;
      drawPresetLibrary(gallery);
    };
  });

  const applyPreset = async (id) => {
    const def = PRESET_TEMPLATES.find(t => t.id === id);
    if (!def) return;
    if (state.dirtySinceSave && !(await appConfirm("Applying a preset discards your current design edits. Continue?", { title: "Apply preset", confirmLabel: "Apply", danger: true }))) return;
    loadTemplate(def.id);
    state.dirtySinceSave = true;
    toast(`Applied ${def.name}.`);
    go("editor");
  };

  grid.querySelectorAll("[data-preset]").forEach(card => {
    card.onclick = () => applyPreset(card.dataset.preset);
  });
}

function renderTemplatesInto(gallery) {
  const cats = ["All", "Indian Medical", "Academic", "Conference", "Medical", "Technology", "Awards", "Corporate", "Sports"];
  const draw = () => {
    const filtered = _templateFilter === "All" ? curatedTemplates : curatedTemplates.filter(t => t.category === _templateFilter);
    gallery.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">01 / TEMPLATE</div><h1>Choose your certificate.</h1><p class="lead">Start with one of the curated editorial templates below, or apply a zero-asset procedural preset from the library. Either choice replaces the current design elements.</p></div></div>
    <div class="filter-bar">
      ${cats.map(c => `<button class="btn ${_templateFilter === c ? 'primary' : 'ghost'}" data-cat="${escapeHTML(c)}" >${escapeHTML(c)}</button>`).join("")}
    </div>
    <div class="grid template-grid">${filtered.map(t => {
      const selected = state.templateId === t.id;
      const orientation = t.page?.orientation === "portrait" ? "Portrait" : "Landscape";
      return `<button type="button" class="card template-card ${selected ? 'active-template' : ''}" data-template="${escapeHTML(t.id)}" aria-pressed="${selected}" aria-label="Use template ${escapeHTML(t.name)}">
        <div class="template-thumb">${templateSVG(t.id)}${selected ? '<span class="template-selected" aria-hidden="true">✓</span>' : ''}</div>
        <div class="template-info">
          <strong>${escapeHTML(t.name)}</strong>
          <div class="template-meta"><span>${escapeHTML(t.category)}</span><span>•</span><span>${orientation}</span></div>
          <div class="template-use">Use template <span aria-hidden="true">→</span></div>
        </div>
      </button>`;
    }).join("")}</div>
    <div class="section-gap"></div>
    <section class="preset-library" aria-labelledby="presetLibraryHeading">
      <div class="preset-library-head">
        <div><div class="eyebrow">STUDIO PRESET LIBRARY</div><h2 id="presetLibraryHeading">100 procedural layouts.</h2>
        <p class="lead">Zero-asset vector presets: 10 architectural archetypes × 10 curated palettes. Applying one replaces the current design elements.</p></div>
        <span class="preset-count" id="presetCount"></span>
      </div>
      <div class="filter-bar" id="presetFilters"></div>
      <div class="grid preset-grid" id="presetGrid"></div>
    </section></div>`;

    gallery.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { _templateFilter = b.dataset.cat; draw(); });
    const selectTemplate = async (id) => {
      if (state.dirtySinceSave && !(await appConfirm("Selecting a different template discards your current design edits. Continue?", { title: "Switch template", confirmLabel: "Switch", danger: true }))) return;
      loadTemplate(id);
      state.dirtySinceSave = true;
      go("editor");
    };
    gallery.querySelectorAll("[data-template]").forEach(c => {
      c.onclick = () => selectTemplate(c.dataset.template);
    });

    // Preset library lives in the same page, drawn after the curated grid.
    drawPresetLibrary(gallery);
  };
  draw();
}

/* ==========================================================================
   STEP: DESIGN (canvas center + slim drawer)
   ========================================================================== */

function renderEditorDrawer(drawer) {
  drawer.innerHTML = `<div class="page editor-page"><div class="page-head"><div><div class="eyebrow">02 / DESIGN</div><h1>Design your certificate.</h1><p class="lead">Select an element to edit it. Drag on the canvas or use precise values in the inspector.</p></div><div class="toolbar"><button class="btn" id="switchTemplate">Templates</button><button class="btn primary" id="toData">Continue</button></div></div>
  <div class="mini-help editor-tip">Drag elements on the canvas. Use arrow keys to nudge and Shift + arrow for fine movement. Scrub participant records above the canvas to stress-test long names.</div></div>`;
  const project = document.getElementById("topProjectName");
  if (project) project.textContent = state.projectName;
  document.getElementById("switchTemplate").onclick = () => go("templates");
  document.getElementById("toData").onclick = () => go("data");
}

/* ==========================================================================
   STEP: PARTICIPANTS (drawer under the live canvas)
   ========================================================================== */

function renderDataDrawer(drawer) {
  const v = validateRows();
  const meta = state.importMeta || {};
  const fileSize = meta.size ? (meta.size < 1024 * 1024 ? Math.max(1, Math.round(meta.size / 1024)) + " KB" : (meta.size / (1024 * 1024)).toFixed(1) + " MB") : "";
  const imported = state.rows.length ? `<div class="card import-summary">
    <div class="import-icon" aria-hidden="true">✓</div>
    <div class="import-summary-copy">
      <strong>${escapeHTML(meta.fileName || "Participant data loaded")}</strong>
      <span>${v.total} rows · ${state.columns.length} columns${meta.sheetName ? ` · Sheet: ${escapeHTML(meta.sheetName)}` : ""}${fileSize ? ` · ${fileSize}` : ""}</span>
    </div>
    <button class="btn" id="chooseFile">Replace file</button>
    <input id="dataFile" type="file" accept=".xlsx,.xls,.csv,.tsv" aria-label="Choose participant spreadsheet" hidden>
  </div>` : `<div class="card panel"><div id="dropzone" class="dropzone"><strong>Drop your Excel or CSV file here</strong><p>XLSX, XLS, CSV, or TSV. Processing stays in this browser.</p><button class="btn" id="chooseFile">Choose file</button><input id="dataFile" type="file" accept=".xlsx,.xls,.csv,.tsv" aria-label="Choose participant spreadsheet" hidden></div></div>`;

  drawer.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">03 / PARTICIPANTS</div><h1>Import participant data.</h1><p class="lead">Use a spreadsheet as the source for names, roles, institutions, and any custom certificate fields.</p></div><button class="btn primary" id="toMapping" ${state.rows.length ? "" : "disabled"}>Continue</button></div>
  ${imported}
  ${state.rows.length ? `<div class="section-gap"></div><div class="metric-grid"><div class="metric"><strong>${v.total}</strong><span>Participants</span></div><div class="metric"><strong>${v.valid}</strong><span>Valid names</span></div><div class="metric"><strong>${v.duplicateNames}</strong><span>Duplicate names</span></div></div><div class="section-gap"></div><div class="card panel"><div class="panel-title-row"><h2>Data preview</h2><span>First ${Math.min(10, state.rows.length)} rows</span></div><div class="table-wrap">${tableHTML(state.rows.slice(0, 10))}</div></div>` : ""}</div>`;

  const dz = drawer.querySelector("#dropzone");
  const input = drawer.querySelector("#dataFile");
  const choose = drawer.querySelector("#chooseFile");
  const next = drawer.querySelector("#toMapping");
  if (choose) choose.onclick = () => input.click();
  if (input) input.onchange = () => input.files[0] && handleDataFile(input.files[0]);
  if (dz) {
    dz.ondragover = e => { e.preventDefault(); dz.classList.add("drag"); };
    dz.ondragleave = () => dz.classList.remove("drag");
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove("drag"); if (e.dataTransfer.files[0]) handleDataFile(e.dataTransfer.files[0]); };
  }
  if (next) next.onclick = () => go("mapping");
}

async function handleDataFile(file) {
  try { await parseSpreadsheet(file); toast(`Loaded ${state.rows.length} participant records.`); state.sampleIndex = 0; renderStep(); }
  catch (e) { toast(e.message); }
}

function tableHTML(rows) {
  if (!rows.length) return '<div class="empty">No data.</div>';
  const cols = Object.keys(rows[0]);
  return `<table class="data-table"><thead><tr>${cols.map(c => `<th>${escapeHTML(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${escapeHTML(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/* ==========================================================================
   STEP: MAPPING (drawer under the live canvas)
   ========================================================================== */

function renderMappingDrawer(drawer) {
  if (!state.rows.length) { go("data"); return; }
  const options = state.columns.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  const customTokens = state.columns.map(c => `<code>{{${escapeHTML(columnToken(c))}}}</code>`).join(" ");
  const gf = state.globalFields;
  const idSafe = v => `map-${v.replace(/[^A-Z0-9_]/g, "")}`;
  const fallbackVars = new Set(["EVENT", "DATE", "VENUE", "ORGANIZATION"]);
  const mappedVars = variableKeys.filter(v => !["CERTIFICATE_ID", "YEAR", "VERIFY_URL", "VERIFY_SIG"].includes(v));

  const sourceLabel = (variable) => {
    if (state.mappings[variable]) return "Spreadsheet";
    return fallbackVars.has(variable) ? "Event settings" : "Not mapped";
  };

  drawer.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">04 / MAPPING</div><h1>Map your spreadsheet.</h1><p class="lead">Connect certificate fields to participant columns. Event-level values remain the fallback where applicable.</p></div><button class="btn primary" id="toPreview">Continue</button></div>
  <div class="card panel"><h2>Event settings</h2><div class="form-grid"><div class="field"><label for="global-EVENT">Event</label><input id="global-EVENT" data-global="EVENT" value="${escapeHTML(gf.EVENT || "")}"></div><div class="field"><label for="global-DATE">Date</label><input id="global-DATE" data-global="DATE" value="${escapeHTML(gf.DATE || "")}"></div><div class="field"><label for="global-VENUE">Venue</label><input id="global-VENUE" data-global="VENUE" value="${escapeHTML(gf.VENUE || "")}"></div><div class="field"><label for="global-ORGANIZATION">Organization</label><input id="global-ORGANIZATION" data-global="ORGANIZATION" value="${escapeHTML(gf.ORGANIZATION || "")}"></div></div></div>
  <div class="section-gap"></div>
  <div class="card mapping-panel">
    <div class="mapping-head"><div><h2>Column mapping</h2><p>Only Name is required. Leave optional fields unmapped unless a template uses them.</p></div><span>${state.columns.length} spreadsheet columns detected</span></div>
    <div class="mapping-table-wrap"><table class="mapping-table"><thead><tr><th>Certificate field</th><th>Spreadsheet column</th><th>Source</th></tr></thead><tbody>
      ${mappedVars.map(v => `<tr class="${v === "NAME" ? "mapping-required" : ""}">
        <td><label for="${idSafe(v)}"><strong>{{${v}}}</strong>${v === "NAME" ? '<span class="required">Required</span>' : ""}</label></td>
        <td><select id="${idSafe(v)}" data-map="${v}" ${v === "NAME" ? "aria-required='true'" : ""}><option value="">${fallbackVars.has(v) ? "Use event setting" : "Not mapped"}</option>${options}</select></td>
        <td><span class="source-badge" data-source="${v}">${sourceLabel(v)}</span></td>
      </tr>`).join("")}
    </tbody></table></div>
    <div class="notice mapping-token-note"><b>Direct spreadsheet variables:</b> every imported column is also available as a token. ${customTokens}</div>
  </div></div>`;

  drawer.querySelectorAll("[data-map]").forEach(s => {
    s.value = state.mappings[s.dataset.map] || "";
    s.onchange = () => {
      state.mappings[s.dataset.map] = s.value;
      const badge = drawer.querySelector(`[data-source="${s.dataset.map}"]`);
      if (badge) badge.textContent = s.value ? "Spreadsheet" : (fallbackVars.has(s.dataset.map) ? "Event settings" : "Not mapped");
      markDirty();
      setInspectorStale();
      renderSampleCanvas(); // NAME mapping change re-resolves sample text
    };
  });
  drawer.querySelectorAll("[data-global]").forEach(i => i.oninput = () => {
    state.globalFields[i.dataset.global] = i.value;
    markDirty();
    if (i.dataset.global === "EVENT" && i.value) {
      if (!state.certificate._customPrefix || state.certificate.prefix === "CONF") {
        state.certificate.prefix = extractConferencePrefix(i.value);
        state.certificate.year = extractConferenceYear(i.value);
      }
    }
    if (["EVENT", "DATE", "VENUE", "ORGANIZATION"].includes(i.dataset.global)) renderSampleCanvas();
  });
  drawer.querySelector("#toPreview").onclick = () => {
    if (!state.mappings.NAME) { toast("Map a spreadsheet column to {{NAME}} first."); return; }
    go("preview");
  };
}

/* ==========================================================================
   STEP: PREVIEW (SVG renderer in the center, scrubber active)
   ========================================================================== */

let _previewRows = [];
let _previewRefs = null;

function renderPreviewDrawer(drawer) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }

  _previewRows = generationRows();
  if (!_previewRows.length) { toast("No valid participant names are available for preview."); go("mapping"); return; }
  state.sampleIndex = Math.max(0, Math.min(_previewRows.length - 1, state.sampleIndex));

  drawer.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">05 / PREVIEW</div><h1>Preview the final certificates.</h1><p class="lead">This uses the same artwork, variables, and numbering as the generated PDF batch.</p></div><button class="btn primary" id="toGenerate">Generate</button></div>
  <div class="preview-toolbar card">
    <div class="preview-picker"><label for="previewSelect">Recipient</label><select id="previewSelect">${_previewRows.map((row, i) => `<option value="${i}">${escapeHTML(String(row.NAME || `Certificate ${i + 1}`))}</option>`).join("")}</select></div>
    <div class="preview-nav"><button class="btn" id="prev">Previous</button><span id="previewCounter" aria-live="polite"></span><button class="btn" id="next">Next</button></div>
  </div></div>`;

  const sheet = document.getElementById("previewSheet");
  const counter = drawer.querySelector("#previewCounter");
  const select = drawer.querySelector("#previewSelect");
  const prevBtn = drawer.querySelector("#prev");
  const nextBtn = drawer.querySelector("#next");
  _previewRefs = { sheet, counter, select, prevBtn, nextBtn };
  select.onchange = () => { state.sampleIndex = Math.max(0, Math.min(_previewRows.length - 1, Number(select.value) || 0)); showPreviewRecord(); };
  prevBtn.onclick = () => { state.sampleIndex = Math.max(0, state.sampleIndex - 1); showPreviewRecord(); };
  nextBtn.onclick = () => { state.sampleIndex = Math.min(_previewRows.length - 1, state.sampleIndex + 1); showPreviewRecord(); };
  drawer.querySelector("#toGenerate").onclick = () => go("generate");
  showPreviewRecord();
}

function showPreviewRecord() {
  const refs = _previewRefs;
  if (!refs /* drawer gone */) { renderStep(); return; }
  const sheet = document.getElementById("previewSheet");
  if (!sheet) return;
  refs.counter.textContent = `${state.sampleIndex + 1} / ${_previewRows.length}`;
  sheet.innerHTML = renderCertificateSVG(_previewRows[state.sampleIndex], state.sampleIndex);
  refs.select.value = String(state.sampleIndex);
  refs.prevBtn.disabled = state.sampleIndex <= 0;
  refs.nextBtn.disabled = state.sampleIndex >= _previewRows.length - 1;
}

/* ==========================================================================
   STEP: GENERATE (drawer under the live canvas)
   ========================================================================== */

function renderGenerateDrawer(drawer) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }
  const val = validateRows();
  const batchCount = generationRows().length;
  if (state.settings.verifySecret === LEGACY_VERIFY_SALT) toast("Certificates cannot be generated with the publicly known legacy default secret — click Randomize first.");
  drawer.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">06 / GENERATE</div><h1>Generate your certificate batch.</h1><p class="lead">Review output settings, signing, and the final batch count before creating PDFs.</p></div></div>
  <div class="generate-grid">
    <div class="card panel">
      <div class="panel-title-row"><h2>Output settings</h2><span>PDF & filenames</span></div>
      <div class="form-grid">
        <div class="field">
          <div class="field-label-row"><label for="prefix">Prefix</label><button type="button" class="inline-action" id="derivePrefixBtn">From event</button></div>
          <input id="prefix" maxlength="12">
        </div>
        <div class="field"><label for="year">Year</label><input id="year" maxlength="8" inputmode="numeric"></div>
        <div class="field"><label for="start">Starting number</label><input id="start" type="number" min="0" step="1"></div>
        <div class="field"><label for="digits">Digits</label><input id="digits" type="number" min="1" max="8"></div>
      </div>
      <div class="id-preview"><span>Sample certificate ID</span><strong id="sampleIdText"></strong></div>
      <div class="field"><label for="filename">Filename pattern</label><input id="filename" maxlength="200"><p class="mini-help">Example: <code>{{CERTIFICATE_ID}}_{{NAME}}.pdf</code>. Folder sub-paths work too — <code>{{ROLE}}/{{CERTIFICATE_ID}}_{{NAME}}.pdf</code> groups PDFs into <code>Keynote Speaker/</code>, <code>Delegate/</code>, … inside the ZIP.</p></div>
      <div class="field"><label for="rasterScale">PDF quality</label><select id="rasterScale"><option value="1">Standard</option><option value="2">High (recommended)</option><option value="3">Very high</option></select></div>
      <label class="field merged-pdf-toggle" for="mergedPdf"><input type="checkbox" id="mergedPdf" ${state.settings.mergedPdf ? "checked" : ""}> Also offer a print-shop master PDF (one merged multi-page file)</label>
    </div>

    <div class="card panel batch-summary-card">
      <div class="panel-title-row"><h2>Batch summary</h2><span>Ready to export</span></div>
      <div class="metric-grid"><div class="metric"><strong>${batchCount}</strong><span>PDF files</span></div><div class="metric"><strong>${val.missingName}</strong><span>Rows skipped</span></div><div class="metric"><strong>${val.duplicateNames}</strong><span>Duplicate names</span></div></div>
      <div class="generate-cta">
        <button class="btn primary" id="generateBtn">Generate ${batchCount} certificates</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="progressBar"></div></div>
        <div id="progressText" class="mini-help" aria-live="polite">Ready to generate ${batchCount} certificates.</div>
      </div>
    </div>
  </div>

  <div class="section-gap"></div>
  <div class="card panel signing-card">
    <div class="panel-title-row"><div><h2>Verification & signing</h2><p class="mini-help">Security settings are separate from PDF output. Keep signing material private.</p></div><span>Advanced</span></div>
    <div class="signing-grid">
      <div class="signing-block">
        <div class="field">
          <div class="field-label-row"><label for="verifySecret">Verification signing secret</label><button type="button" class="inline-action" id="randomSecretBtn">Randomize</button></div>
          <input id="verifySecret" type="password" autocomplete="off" spellcheck="false" placeholder="Private secret key for SHA-256 signatures">
          <p class="mini-help">Stored in local autosave and exported project files. Treat project backups containing this secret as credentials.</p>
        </div>
      </div>
      <div class="signing-block">
        <div class="field">
          <label>ECDSA P-256 signing key</label>
          <div id="ecdsaStatus" class="mini-help">Checking…</div>
          <div class="page-actions signing-actions">
            <button type="button" class="btn" id="exportKeyBtn" style="display:none">Export key backup</button>
            <button type="button" class="btn" id="rotateKeyBtn" style="display:none">Rotate signing key</button>
            <button type="button" class="btn" id="importKeyBtn">Import key</button>
          </div>
          <input type="file" id="keyFileInput" accept=".json,application/json" hidden>
          <p class="mini-help">When active, the portal verifies signatures with the published public key only. Rotation keeps the old key in the registry's keys map so prior certificates still verify.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="section-gap"></div><div id="resultCard"></div></div>`;

  bindGenerateButton(drawer);

  const refs = { prefix: drawer.querySelector("#prefix"), year: drawer.querySelector("#year"), start: drawer.querySelector("#start"), digits: drawer.querySelector("#digits"), filename: drawer.querySelector("#filename"), rasterScale: drawer.querySelector("#rasterScale"), verifySecret: drawer.querySelector("#verifySecret"), mergedPdf: drawer.querySelector("#mergedPdf") };
  refs.prefix.value = state.certificate.prefix; refs.year.value = state.certificate.year; refs.start.value = state.certificate.start; refs.digits.value = state.certificate.digits; refs.filename.value = state.settings.filename; refs.rasterScale.value = String(state.settings.rasterScale || 2); refs.verifySecret.value = state.settings.verifySecret || "";

  const updatePreview = () => {
    const el = drawer.querySelector("#sampleIdText");
    if (el) el.textContent = formatId(state.certificate.start || 1);
  };

  const sync = (isManualPrefix = false) => {
    state.certificate.prefix = refs.prefix.value.trim() || "CONF";
    if (isManualPrefix) state.certificate._customPrefix = true;
    state.certificate.year = refs.year.value.trim() || String(new Date().getFullYear());
    state.certificate.start = Math.max(0, Math.floor(+refs.start.value || 0));
    state.certificate.digits = Math.min(8, Math.max(1, Math.floor(+refs.digits.value || 4)));
    state.settings.filename = refs.filename.value.trim() || "{{CERTIFICATE_ID}}_{{NAME}}.pdf";
    state.settings.rasterScale = +refs.rasterScale.value || 2;
    state.settings.mergedPdf = Boolean(refs.mergedPdf && refs.mergedPdf.checked);
    const secret = refs.verifySecret.value.trim();
    if (secret) state.settings.verifySecret = secret;
    else refs.verifySecret.value = state.settings.verifySecret; // never downgrade silently
    markDirty();
    updatePreview();
  };

  refs.prefix.oninput = () => sync(true);
  ["year", "start", "digits", "filename", "rasterScale", "verifySecret", "mergedPdf"].forEach(k => refs[k].oninput = () => sync(false));
  updatePreview();

  const randomSecretBtn = drawer.querySelector("#randomSecretBtn");
  if (randomSecretBtn) {
    randomSecretBtn.onclick = () => {
      refs.verifySecret.value = randomVerifySecret();
      sync(false);
      toast("Generated unique signing secret. Re-export the registry after any new batch.");
    };
  }

  const deriveBtn = drawer.querySelector("#derivePrefixBtn");
  if (deriveBtn) {
    deriveBtn.onclick = () => {
      const derived = extractConferencePrefix(state.globalFields.EVENT || state.projectName);
      const year = extractConferenceYear(state.globalFields.EVENT || state.projectName);
      refs.prefix.value = derived;
      refs.year.value = year;
      sync(true);
      toast(`Prefix set to "${derived}" from event name.`);
    };
  }

  // ECDSA signing key management
  const ecdsaStatus = drawer.querySelector("#ecdsaStatus");
  const exportKeyBtn = drawer.querySelector("#exportKeyBtn");
  const importKeyBtn = drawer.querySelector("#importKeyBtn");
  const keyFileInput = drawer.querySelector("#keyFileInput");

  if (hasWebCrypto() && ecdsaStatus) {
    loadSigningKey(state.projectName).then(async existing => {
      if (existing) {
        try {
          const fingerprint = await keyIdFromJwk(existing.publicKey);
          ecdsaStatus.innerHTML = `✓ ECDSA P-256 signing key active — key fingerprint <code class="mono">${escapeHTML(fingerprint)}</code>.`;
        } catch (_) {
          ecdsaStatus.innerHTML = '✓ ECDSA P-256 signing key active — certificates are cryptographically signed.';
        }
        ecdsaStatus.style.color = 'var(--color-secure-green)';
        if (exportKeyBtn) exportKeyBtn.style.display = '';
        const rotateBtn = drawer.querySelector('#rotateKeyBtn');
        if (rotateBtn) rotateBtn.style.display = '';
      } else {
        ecdsaStatus.textContent = 'A signing key will be auto-created on first Generate.';
      }
    });
  } else if (ecdsaStatus) {
    ecdsaStatus.textContent = 'WebCrypto unavailable — HMAC signing only (non-secure context or unsupported browser).';
  }

  if (exportKeyBtn) {
    exportKeyBtn.onclick = async () => {
      try {
        const keyPair = await loadSigningKey(state.projectName);
        if (!keyPair) { toast("No signing key to export."); return; }
        const passphrase = await appPrompt("Enter a passphrase to encrypt your key backup:", { title: "Export key backup", password: true, placeholder: "Passphrase", confirmLabel: "Export" });
        if (!passphrase) return;
        const encrypted = await encryptWithPassphrase(keyPair, passphrase);
        const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${safeFilename(state.projectName || "CertiForge")}-signing-key-backup.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        toast("Key backup downloaded. Store it safely — it's encrypted with your passphrase.");
      } catch (e) { toast(e.message); }
    };
  }

  const rotateBtn = drawer.querySelector('#rotateKeyBtn');
  if (rotateBtn) {
    rotateBtn.onclick = async () => {
      try {
        if (!(await appConfirm("Rotate the signing key? Certificates generated from now on use the new key. Publish a fresh registry afterwards so the portal trusts both keys.", { title: "Rotate signing key", confirmLabel: "Rotate", danger: true }))) return;
        // Preserve the retired key so previously issued certificates keep verifying.
        const previous = await loadSigningKey(state.projectName);
        if (previous) {
          const prevKeyId = await keyIdFromJwk(previous.publicKey);
          state._rotatedKeys = (Array.isArray(state._rotatedKeys) ? state._rotatedKeys : []).filter(k => k.keyId !== prevKeyId);
          state._rotatedKeys.unshift({ keyId: prevKeyId, jwk: previous.publicKey });
        }
        const kp = await generateKeyPair();
        const pubJWK = await exportPublicKeyJWK(kp.publicKey);
        const privJWK = await exportPrivateKeyJWK(kp.privateKey);
        await storeSigningKey(state.projectName, pubJWK, privJWK);
        state._signingPublicKey = pubJWK;
        state._signingKeyProjectName = state.projectName;
        const newKeyId = await keyIdFromJwk(pubJWK);
        state._signingKeyId = newKeyId;
        if (ecdsaStatus) {
          ecdsaStatus.innerHTML = `✓ New ECDSA P-256 key active — fingerprint <code class="mono">${escapeHTML(newKeyId)}</code>.`;
          ecdsaStatus.style.color = 'var(--color-secure-green)';
        }
        toast(`Signing key rotated — new fingerprint ${newKeyId}. Re-generate the batch and re-publish the registry.`);
      } catch (e) { toast("Key rotation failed: " + e.message); }
    };
  }

  if (importKeyBtn && keyFileInput) {
    importKeyBtn.onclick = () => keyFileInput.click();
    keyFileInput.onchange = async () => {
      const file = keyFileInput.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.ct || !data.salt || !data.iv) throw new Error("Not a valid CertiForge key backup file.");
        const passphrase = await appPrompt("Enter the passphrase for this key backup:", { title: "Import key backup", password: true, placeholder: "Passphrase", confirmLabel: "Import" });
        if (!passphrase) return;
        const keyPair = await decryptWithPassphrase(data, passphrase);
        if (!keyPair.publicKey || !keyPair.privateKey) throw new Error("Backup did not contain a valid key pair.");
        await storeSigningKey(state.projectName, keyPair.publicKey, keyPair.privateKey);
        try {
          const fingerprint = await keyIdFromJwk(keyPair.publicKey);
          toast(`Signing key restored — fingerprint ${fingerprint}. Check it matches the key that issued your certificates.`);
        } catch (_) {
          toast("Signing key restored. Existing certificates remain valid.");
        }
        // Refresh status
        if (ecdsaStatus) {
          ecdsaStatus.innerHTML = '✓ ECDSA P-256 signing key active — certificates are cryptographically signed.';
          ecdsaStatus.style.color = 'var(--color-secure-green)';
        }
        if (exportKeyBtn) exportKeyBtn.style.display = '';
      } catch (e) { toast("Key import failed: " + e.message); }
      keyFileInput.value = '';
    };
  }
}

async function runGenerate(drawer) {
  const generate = drawer.querySelector("#generateBtn");
  syncGenerate(drawer);
  const pre = validateProject();
  if (!pre.valid) { toast(pre.errors[0]); return; }
  pre.warnings.forEach(w => console.warn("[preflight]", w));
  if (isGenerating()) { toast("A batch is already being generated."); return; }
  generate.disabled = true; drawer.querySelector("#resultCard").innerHTML = "";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn ghost";
  cancelBtn.style.marginTop = "8px";
  cancelBtn.textContent = "Cancel batch";
  cancelBtn.onclick = () => { cancelGeneration(); cancelBtn.disabled = true; cancelBtn.textContent = "Cancelling…"; };
  const progressText = drawer.querySelector("#progressText");
  if (progressText) progressText.insertAdjacentElement("afterend", cancelBtn);

  const resultCard = drawer.querySelector("#resultCard");
  try {
    const result = await generateAll();
    if (cancelBtn.parentElement) cancelBtn.remove();
    if (result.fontWarnings?.length) toast(`Some custom fonts failed to embed (${result.fontWarnings.join(", ")}). Those certificates use fallback fonts.`);
    if (result.signFailures) toast(`${result.signFailures} record(s) skipped: signing failed. Check the console for details.`);
    resultCard.innerHTML = `<div class="card panel result-card">
        <h2>Generation complete</h2>
        <p class="lead">${result.files.length} PDFs are ready${result.skipped ? `; ${result.skipped} invalid row(s) were skipped` : ""}${result.signFailures ? `; ${result.signFailures} record(s) skipped (signing failed)` : ""}.</p>
        <div class="section-gap"></div>
        <div class="page-actions">
          <button class="btn primary" id="downloadZip">DOWNLOAD ZIP (${result.files.length} PDFs)</button>
          <button class="btn" id="downloadRegistry">DOWNLOAD VERIFICATION REGISTRY (JSON)</button>
          <a href="verify.html" target="_blank" rel="noopener" class="btn ghost">OPEN VERIFICATION PORTAL ↗</a>
        </div>
        ${result.registry.length ? `<div class="section-gap"></div>
        <details class="inspector-section">
          <summary>Revocation list (${result.registry.length} certificates)</summary>
          <div class="inspector-section-body">
            <p class="mini-help">Mark certificates to revoke, then re-download this registry and publish it. Revoked IDs show <strong>REVOKED</strong> on the verification portal regardless of their signature.</p>
            <div id="revokeList" class="revoke-list">${result.registry.map(c => `
              <label class="revoke-row"><input type="checkbox" data-revoke-id="${escapeHTML(c.id)}"> <span class="mono">${escapeHTML(c.id)}</span> <span class="revoke-name">${escapeHTML(c.name || "")}</span></label>`).join("")}
            </div>
          </div>
        </details>` : ""}
        <p class="mini-help" style="margin-top:12px">Publish the registry as <code>verification-registry.json</code> next to verify.html so QR scans confirm automatically. The registry is privacy-safe: it contains only certificate IDs and signatures — no participant names. ${state._signingPublicKey ? 'Certificates are signed with ECDSA P-256 — the registry includes your public key (schema 4) so the portal verifies cryptographically.' : 'Keep the signing secret private.'}</p>
      </div>`;

    if (state.settings.mergedPdf) {
      const masterBtn = document.createElement("button");
      masterBtn.className = "btn";
      masterBtn.id = "downloadMaster";
      masterBtn.textContent = "BUILD PRINT-SHOP MASTER PDF";
      masterBtn.onclick = async () => {
        try {
          masterBtn.disabled = true;
          masterBtn.textContent = "RENDERING MASTER PDF… 0%";
          const blob = await buildMasterPdf({ onProgress: (done, total) => { masterBtn.textContent = `RENDERING MASTER PDF… ${Math.round(done / total * 100)}%`; } });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${safeFilename(state.certificate.prefix || "CertiForge")}-master-${result.files.length}-pages.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1500);
          masterBtn.textContent = "BUILD PRINT-SHOP MASTER PDF";
        } catch (e) { toast(e.message); }
        finally { masterBtn.disabled = false; }
      };
      resultCard.querySelector(".page-actions").appendChild(masterBtn);
    }

    const revokeList = resultCard.querySelector("#revokeList");
    if (revokeList) {
      state.registry.forEach(c => { delete c.revoked; delete c.revokedAt; });
      revokeList.querySelectorAll("[data-revoke-id]").forEach(box => {
        box.onchange = () => {
          const entry = state.registry.find(c => c.id === box.dataset.revokeId);
          if (!entry) return;
          if (box.checked) {
            entry.revoked = true;
            entry.revokedAt = new Date().toISOString();
          } else {
            delete entry.revoked;
            delete entry.revokedAt;
          }
          markDirty();
        };
      });
    }

    resultCard.querySelector("#downloadZip").onclick = async () => {
      try {
        toast("Preparing ZIP download...");
        const blob = await finalizeZip(result);
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${safeFilename(state.certificate.prefix || "CertiForge")}-certificates.zip`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      }
      catch (e) { toast(e.message); }
    };

    const regBtn = resultCard.querySelector("#downloadRegistry");
    if (regBtn) {
      regBtn.onclick = () => {
        try {
          const data = JSON.stringify(buildPublicRegistry(), null, 2);
          const blob = new Blob([data], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${safeFilename(state.certificate.prefix || "conference")}-verification-registry.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        } catch (e) { toast(e.message); }
      };
    }
  } catch (e) {
    if (cancelBtn.parentElement) cancelBtn.remove();
    const gen = drawer.querySelector("#generateBtn");
    if (gen) gen.disabled = false;
    if (e && e.cancelled) {
      const pt = drawer.querySelector("#progressText");
      if (pt) pt.textContent = "Batch cancelled.";
      toast("Batch cancelled.");
    } else { toast(e.message); }
  }
}

function syncGenerate(drawer) {
  const refs = {
    prefix: drawer.querySelector("#prefix"), year: drawer.querySelector("#year"), start: drawer.querySelector("#start"), digits: drawer.querySelector("#digits"), filename: drawer.querySelector("#filename"), rasterScale: drawer.querySelector("#rasterScale"), verifySecret: drawer.querySelector("#verifySecret"), mergedPdf: drawer.querySelector("#mergedPdf")
  };
  state.certificate.prefix = refs.prefix.value.trim() || "CONF";
  state.certificate.year = refs.year.value.trim() || String(new Date().getFullYear());
  state.certificate.start = Math.max(0, Math.floor(+refs.start.value || 0));
  state.certificate.digits = Math.min(8, Math.max(1, Math.floor(+refs.digits.value || 4)));
  state.settings.filename = refs.filename.value.trim() || "{{CERTIFICATE_ID}}_{{NAME}}.pdf";
  state.settings.rasterScale = +refs.rasterScale.value || 2;
  state.settings.mergedPdf = Boolean(refs.mergedPdf && refs.mergedPdf.checked);
  const secret = refs.verifySecret.value.trim();
  if (secret) state.settings.verifySecret = secret;
  else refs.verifySecret.value = state.settings.verifySecret;
  markDirty();
}

function bindGenerateButton(drawer) {
  const generate = drawer.querySelector("#generateBtn");
  if (generate) generate.onclick = () => runGenerate(drawer);
}
