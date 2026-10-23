import { state, markDirty, randomVerifySecret } from './state.js';
import { templates, getTemplate } from './templates.js';
import { templateSVG, loadTemplate } from './template-loader.js';
import { variableKeys, columnToken, extractConferencePrefix, extractConferenceYear, formatId } from './variables.js';
import { safeFilename, escapeHTML, toast, appConfirm, appPrompt } from './utils.js';
import { renderCanvas, applyAlign } from './canvas.js';
import { renderCurrentEditor, addTextElement, addQRElement, addImageFile, loadCustomFont } from './editor.js';
import { parseSpreadsheet } from './spreadsheet.js';
import { validateRows, validateProject } from './validator.js';
import { generateAll, isGenerating, cancelGeneration, generationRows, buildPublicRegistry, finalizeZip, buildMasterPdf } from './generator.js';
import { saveProject, loadProjectFile } from './project.js';
import { undo, redo } from './history.js';
import { renderCertificateSVG } from './pdf.js';
import { LEGACY_VERIFY_SALT } from './config.js';
import { hasWebCrypto, encryptWithPassphrase, decryptWithPassphrase, exportPublicKeyJWK, exportPrivateKeyJWK, generateKeyPair, keyIdFromJwk } from './crypto.js';
import { loadSigningKey, storeSigningKey } from './storage.js';

export { updateGenerationProgress } from './progress.js';

const WORKFLOW_STEPS = ["templates", "editor", "data", "mapping", "preview", "generate"];

// One-line status shown under each workflow step in the sidebar, so the
// sidebar doubles as a running summary of the issuance. Return "" to hide it.
function stepStatus(step) {
  // TODO: decide what an organizer should see at a glance for each step.
  return "";
}

function updateShell() {
  const current = state.currentStep || "templates";
  const currentIndex = WORKFLOW_STEPS.indexOf(current);
  document.querySelectorAll(".nav-item[data-step]").forEach(b => {
    const index = WORKFLOW_STEPS.indexOf(b.dataset.step);
    const active = b.dataset.step === current;
    b.classList.toggle("active", active);
    b.classList.toggle("complete", index >= 0 && index < currentIndex);
    if (active) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
    const status = b.querySelector(".step-status");
    if (status) status.textContent = stepStatus(b.dataset.step);
  });
  const projectName = document.getElementById("topProjectName");
  if (projectName) projectName.textContent = state.projectName || "Untitled Conference";
}

export function go(step) {
  state.currentStep = step;
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

export function renderStep() {
  const app = document.getElementById("app"), step = state.currentStep || "templates";
  updateShell();
  if (step === "templates") renderTemplates(app);
  else if (step === "editor") renderEditor(app);
  else if (step === "data") renderData(app);
  else if (step === "mapping") renderMapping(app);
  else if (step === "preview") renderPreview(app);
  else if (step === "generate") renderGenerate(app);
  // innerHTML replacement orphans the previous focus — move it to the step
  // heading so keyboard and screen-reader users land in the new content.
  const heading = app.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

let _templateFilter = "All";

function renderTemplates(app) {
  const cats = ["All", "Indian Medical", "Academic", "Conference", "Medical", "Technology", "Awards", "Corporate", "Sports"];
  
  const draw = () => {
    const filtered = _templateFilter === "All" ? templates : templates.filter(t => t.category === _templateFilter);
    const countFor = c => c === "All" ? templates.length : templates.filter(t => t.category === c).length;
    app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">Step 01 · Template</div><h1>Choose a certificate plate</h1><p class="lead">Start from an Indian conference layout or a global academic design. Choosing a template replaces any design edits you have made.</p></div></div>
    <div class="filter-bar" role="group" aria-label="Filter templates by category">
      ${cats.filter(c => countFor(c)).map(c => `<button class="btn ${_templateFilter === c ? 'primary' : 'ghost'}" data-cat="${escapeHTML(c)}" aria-pressed="${_templateFilter === c}">${escapeHTML(c)} <span class="count" aria-hidden="true">${countFor(c)}</span></button>`).join("")}
    </div>
    <div class="grid template-grid">${filtered.map(t => {
      const selected = state.templateId === t.id;
      const orientation = t.page?.orientation === "portrait" ? "Portrait" : "Landscape";
      return `<button type="button" class="card template-card ${selected ? 'active-template' : ''}" data-template="${escapeHTML(t.id)}" aria-pressed="${selected}" aria-label="Use template ${escapeHTML(t.name)}">
        <div class="template-thumb">${templateSVG(t.id)}${selected ? '<span class="template-selected" aria-hidden="true">In use</span>' : ''}</div>
        <div class="template-info">
          <strong>${escapeHTML(t.name)}</strong>
          <div class="template-meta"><span>${escapeHTML(t.category)}</span><span>${orientation}</span></div>
        </div>
      </button>`;
    }).join("")}</div></div>`;

    app.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { _templateFilter = b.dataset.cat; draw(); });
    const selectTemplate = async (id) => {
      if (state.dirtySinceSave && !(await appConfirm("Selecting a different template discards your current design edits. Continue?", { title: "Switch template", confirmLabel: "Switch", danger: true }))) return;
      loadTemplate(id);
      state.dirtySinceSave = true;
      go("editor");
    };
    app.querySelectorAll("[data-template]").forEach(c => {
      c.onclick = () => selectTemplate(c.dataset.template);
    });
  };

  draw();
}

let _editorZoom = "fit";

// 16px stroke icons for the canvas toolbar; currentColor follows the theme.
const icon = d => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  undo: icon('<path d="M5.5 3.5 2.5 6.5l3 3"/><path d="M2.5 6.5h7a4 4 0 0 1 0 8H7"/>'),
  redo: icon('<path d="m10.5 3.5 3 3-3 3"/><path d="M13.5 6.5h-7a4 4 0 0 0 0 8H9"/>'),
  left: icon('<path d="M2.5 1.5v13"/><rect x="5" y="3.5" width="8.5" height="3" rx=".5"/><rect x="5" y="9.5" width="5" height="3" rx=".5"/>'),
  hcenter: icon('<path d="M8 1.5v13"/><rect x="3" y="3.5" width="10" height="3" rx=".5"/><rect x="5" y="9.5" width="6" height="3" rx=".5"/>'),
  right: icon('<path d="M13.5 1.5v13"/><rect x="2.5" y="3.5" width="8.5" height="3" rx=".5"/><rect x="6" y="9.5" width="5" height="3" rx=".5"/>'),
  top: icon('<path d="M1.5 2.5h13"/><rect x="3.5" y="5" width="3" height="8.5" rx=".5"/><rect x="9.5" y="5" width="3" height="5" rx=".5"/>'),
  vcenter: icon('<path d="M1.5 8h13"/><rect x="3.5" y="3" width="3" height="10" rx=".5"/><rect x="9.5" y="5" width="3" height="6" rx=".5"/>'),
  bottom: icon('<path d="M1.5 13.5h13"/><rect x="3.5" y="2.5" width="3" height="8.5" rx=".5"/><rect x="9.5" y="6" width="3" height="5" rx=".5"/>'),
  "dist-h": icon('<path d="M1.5 1.5v13M14.5 1.5v13"/><rect x="6" y="4.5" width="4" height="7" rx=".5"/>'),
  "dist-v": icon('<path d="M1.5 1.5h13M1.5 14.5h13"/><rect x="4.5" y="6" width="7" height="4" rx=".5"/>'),
  plus: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 2v8M2 6h8"/></svg>'
};
const ALIGN_TOOLS = [
  ["left", "Align left edges"], ["hcenter", "Align horizontal centers"], ["right", "Align right edges"],
  ["top", "Align top edges"], ["vcenter", "Align vertical centers"], ["bottom", "Align bottom edges"],
  ["dist-h", "Distribute horizontally"], ["dist-v", "Distribute vertically"]
];

function applyEditorZoom() {
  const canvas = document.getElementById("editorCanvas");
  if (!canvas) return;
  const page = getTemplate(state.templateId)?.page || { width: 1123, height: 794 };
  // Fit: the largest plate that fits the stage on both axes (container query units).
  const fit = `min(100cqw, calc(100cqh * ${page.width / page.height}))`;
  canvas.style.width = _editorZoom === "fit" ? fit : (_editorZoom === "75" ? `${Math.round(page.width * 0.75)}px` : page.width + "px");
  document.querySelectorAll("[data-zoom]").forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.zoom === _editorZoom)));
}

function renderEditor(app) {
  app.innerHTML = `<div class="page editor-page"><div class="page-head"><div><div class="eyebrow">Step 02 · Design</div><h1>Engrave the layout</h1><p class="lead">Select an element to edit it. Drag on the canvas or use precise values in the inspector.</p></div><div class="toolbar"><button class="btn" id="switchTemplate">Change template</button><button class="btn primary" id="toData">Continue to participants</button></div></div>
  <div class="editor-layout"><div class="editor-panel elements">
    <div class="panel-section"><div class="field"><label for="projectNameInput">Project name</label><input id="projectNameInput"></div></div>
    <div class="panel-section">
      <div class="panel-heading-row"><h3>Layers</h3><span id="layerCount"></span></div>
      <div class="editor-insert-grid"><button class="btn" id="addTextBtn">${ICONS.plus}Text</button><button class="btn" id="addImageBtn">${ICONS.plus}Image</button><button class="btn" id="addQRBtn">${ICONS.plus}QR</button></div>
    </div>
    <input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="Upload logo or signature image" hidden>
    <input id="fontFileInput" type="file" accept=".ttf,.otf,.woff,.woff2" aria-label="Upload custom font file" hidden>
    <div class="panel-section"><div id="elementList" class="element-list" aria-label="Element layers"></div></div>
    <div class="mini-help editor-tip">Arrow keys nudge the selection. Shift-click layers to align several at once.</div>
  </div>
  <div class="canvas-column">
    <div class="canvas-toolbar">
      <div class="canvas-toolbar-group"><button class="tool-btn" id="undoBtn" aria-label="Undo" title="Undo (Ctrl+Z)">${ICONS.undo}</button><button class="tool-btn" id="redoBtn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)">${ICONS.redo}</button></div>
      <div class="canvas-toolbar-title">Canvas</div>
      <div class="canvas-toolbar-group align-group" title="Shift+click two or more elements, then align or distribute">
        ${ALIGN_TOOLS.map(([key, label]) => `<button class="tool-btn" type="button" data-align="${key}" aria-disabled="true" aria-label="${label}" title="${label}">${ICONS[key]}</button>`).join("")}
      </div>
      <div class="canvas-toolbar-group zoom-group"><button class="tool-btn" data-zoom="fit" aria-pressed="true">Fit</button><button class="tool-btn" data-zoom="75" aria-pressed="false">75%</button><button class="tool-btn" data-zoom="100" aria-pressed="false">100%</button></div>
    </div>
    <div class="canvas-stage"><div id="editorCanvas"></div></div>
  </div>
  <div class="editor-panel properties"><div class="panel-heading-row"><h3>Inspector</h3></div><div id="properties"></div></div></div></div>`;
  const project = document.getElementById("projectNameInput");
  project.value = state.projectName;
  project.onchange = () => {
    state.projectName = project.value.trim() || "Untitled Conference";
    markDirty();
    updateShell();
  };
  document.getElementById("switchTemplate").onclick = () => go("templates");
  document.getElementById("toData").onclick = () => go("data");
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
  app.querySelectorAll("[data-align]").forEach(btn => btn.onclick = () => {
    if (btn.getAttribute("aria-disabled") === "true") {
      toast("Shift+click two or more elements first, then align.");
      return;
    }
    if (applyAlign(btn.dataset.align)) toast("Aligned selection.");
  });
  const layerCount = document.getElementById("layerCount");
  if (layerCount) layerCount.textContent = state.elements.length + " total";
  renderCurrentEditor();
  applyEditorZoom();
}

function renderData(app) {
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
  </div>` : `<div class="card panel"><div id="dropzone" class="dropzone"><strong>Drop a spreadsheet here</strong><p>XLSX, XLS, CSV or TSV, with one participant per row.</p><button class="btn primary" id="chooseFile">Choose file</button><input id="dataFile" type="file" accept=".xlsx,.xls,.csv,.tsv" aria-label="Choose participant spreadsheet" hidden></div></div>`;

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">Step 03 · Participants</div><h1>Import the participant list</h1><p class="lead">A spreadsheet supplies names, roles, institutions and any custom fields. It is read in this browser and never uploaded.</p></div><button class="btn primary" id="toMapping" ${state.rows.length ? "" : "disabled"}>Continue to mapping</button></div>
  ${imported}
  ${state.rows.length ? `<div class="section-gap"></div><div class="metric-grid"><div class="metric"><strong>${v.total}</strong><span>Participants</span></div><div class="metric"><strong>${v.valid}</strong><span>Valid names</span></div><div class="metric"><strong>${v.duplicateNames}</strong><span>Duplicate names</span></div></div><div class="section-gap"></div><div class="card panel"><div class="panel-title-row"><h2>Data preview</h2><span>First ${Math.min(10, state.rows.length)} rows</span></div><div class="table-wrap">${tableHTML(state.rows.slice(0, 10))}</div></div>` : ""}</div>`;

  const dz = document.getElementById("dropzone");
  const input = document.getElementById("dataFile");
  const choose = document.getElementById("chooseFile");
  const next = document.getElementById("toMapping");
  choose.onclick = () => input.click();
  input.onchange = () => input.files[0] && handleDataFile(input.files[0]);
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

function renderMapping(app) {
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
  const sourceState = (variable) => state.mappings[variable] ? "sheet" : (fallbackVars.has(variable) ? "event" : "none");

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">Step 04 · Mapping</div><h1>Map columns to fields</h1><p class="lead">Connect certificate fields to spreadsheet columns. Event settings fill in wherever a column is left unmapped.</p></div><button class="btn primary" id="toPreview">Continue to preview</button></div>
  <div class="card panel"><h2>Event settings</h2><div class="form-grid"><div class="field"><label for="global-EVENT">Event</label><input id="global-EVENT" data-global="EVENT" value="${escapeHTML(gf.EVENT || "")}"></div><div class="field"><label for="global-DATE">Date</label><input id="global-DATE" data-global="DATE" value="${escapeHTML(gf.DATE || "")}"></div><div class="field"><label for="global-VENUE">Venue</label><input id="global-VENUE" data-global="VENUE" value="${escapeHTML(gf.VENUE || "")}"></div><div class="field"><label for="global-ORGANIZATION">Organization</label><input id="global-ORGANIZATION" data-global="ORGANIZATION" value="${escapeHTML(gf.ORGANIZATION || "")}"></div></div></div>
  <div class="section-gap"></div>
  <div class="card mapping-panel">
    <div class="mapping-head"><div><h2>Column mapping</h2><p>Only Name is required. Leave optional fields unmapped unless a template uses them.</p></div><span>${state.columns.length} spreadsheet columns detected</span></div>
    <div class="mapping-table-wrap"><table class="mapping-table"><thead><tr><th>Certificate field</th><th>Spreadsheet column</th><th>Source</th></tr></thead><tbody>
      ${mappedVars.map(v => `<tr class="${v === "NAME" ? "mapping-required" : ""}">
        <td><label for="${idSafe(v)}"><strong>{{${v}}}</strong>${v === "NAME" ? '<span class="required">Required</span>' : ""}</label></td>
        <td><select id="${idSafe(v)}" data-map="${v}" ${v === "NAME" ? "aria-required='true'" : ""}><option value="">${fallbackVars.has(v) ? "Use event setting" : "Not mapped"}</option>${options}</select></td>
        <td><span class="source-badge" data-source="${v}" data-state="${sourceState(v)}">${sourceLabel(v)}</span></td>
      </tr>`).join("")}
    </tbody></table></div>
    <div class="notice mapping-token-note"><b>Direct spreadsheet variables:</b> every imported column is also available as a token. ${customTokens}</div>
  </div></div>`;

  app.querySelectorAll("[data-map]").forEach(s => {
    s.value = state.mappings[s.dataset.map] || "";
    s.onchange = () => {
      state.mappings[s.dataset.map] = s.value;
      const badge = app.querySelector(`[data-source="${s.dataset.map}"]`);
      if (badge) { badge.textContent = sourceLabel(s.dataset.map); badge.dataset.state = sourceState(s.dataset.map); }
      markDirty();
    };
  });
  app.querySelectorAll("[data-global]").forEach(i => i.oninput = () => {
    state.globalFields[i.dataset.global] = i.value;
    markDirty();
    if (i.dataset.global === "EVENT" && i.value) {
      if (!state.certificate._customPrefix || state.certificate.prefix === "CONF") {
        state.certificate.prefix = extractConferencePrefix(i.value);
        state.certificate.year = extractConferenceYear(i.value);
      }
    }
  });
  document.getElementById("toPreview").onclick = () => {
    if (!state.mappings.NAME) { toast("Map a spreadsheet column to {{NAME}} first."); return; }
    go("preview");
  };
}

function renderPreview(app) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }

  const rows = generationRows();
  if (!rows.length) { toast("No valid participant names are available for preview."); go("mapping"); return; }
  state.sampleIndex = Math.max(0, Math.min(rows.length - 1, state.sampleIndex));

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">Step 05 · Preview</div><h1>Proof each certificate</h1><p class="lead">This proof uses the same artwork, variables and numbering as the generated PDF batch.</p></div><button class="btn primary" id="toGenerate">Continue to generate</button></div>
  <div class="preview-toolbar card">
    <div class="preview-picker"><label for="previewSelect">Recipient</label><select id="previewSelect">${rows.map((row, i) => `<option value="${i}">${escapeHTML(String(row.NAME || `Certificate ${i + 1}`))}</option>`).join("")}</select></div>
    <div class="preview-nav"><button class="btn" id="prev">Previous</button><span id="previewCounter" aria-live="polite"></span><button class="btn" id="next">Next</button></div>
  </div>
  <div class="section-gap"></div><div class="card preview-card"><div class="preview-stage"><div id="previewSheet" class="preview-sheet"></div></div></div></div>`;

  const sheet = document.getElementById("previewSheet");
  const counter = document.getElementById("previewCounter");
  const select = document.getElementById("previewSelect");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const show = () => {
    const i = state.sampleIndex;
    sheet.innerHTML = renderCertificateSVG(rows[i], i);
    counter.textContent = `${i + 1} / ${rows.length}`;
    select.value = String(i);
    prevBtn.disabled = i <= 0;
    nextBtn.disabled = i >= rows.length - 1;
  };
  select.onchange = () => { state.sampleIndex = Math.max(0, Math.min(rows.length - 1, Number(select.value) || 0)); show(); };
  prevBtn.onclick = () => { state.sampleIndex = Math.max(0, state.sampleIndex - 1); show(); };
  nextBtn.onclick = () => { state.sampleIndex = Math.min(rows.length - 1, state.sampleIndex + 1); show(); };
  document.getElementById("toGenerate").onclick = () => go("generate");
  show();
}

function renderGenerate(app) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }
  const val = validateRows();
  const batchCount = generationRows().length;
  if (state.settings.verifySecret === LEGACY_VERIFY_SALT) toast("Certificates cannot be generated with the publicly known legacy default secret — click Randomize first.");
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">Step 06 · Generate</div><h1>Issue the batch</h1><p class="lead">Check numbering, output and signing, then create the PDFs and the verification registry.</p></div></div>
  <div class="generate-grid">
    <div class="card panel">
      <div class="panel-title-row"><h2>Numbering and output</h2><span>PDF & filenames</span></div>
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
      <div class="panel-title-row"><h2>Batch</h2><span>Ready to issue</span></div>
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
          <div id="ecdsaStatus" class="mini-help key-status">Checking…</div>
          <div class="page-actions signing-actions">
            <button type="button" class="btn" id="exportKeyBtn" hidden>Export key backup</button>
            <button type="button" class="btn" id="rotateKeyBtn" hidden>Rotate signing key</button>
            <button type="button" class="btn" id="importKeyBtn">Import key</button>
          </div>
          <input type="file" id="keyFileInput" accept=".json,application/json" hidden>
          <p class="mini-help">When active, the portal verifies signatures with the published public key only. Rotation keeps the old key in the registry's keys map so prior certificates still verify.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="section-gap"></div><div id="resultCard"></div></div>`;

  const refs = { prefix: document.getElementById("prefix"), year: document.getElementById("year"), start: document.getElementById("start"), digits: document.getElementById("digits"), filename: document.getElementById("filename"), rasterScale: document.getElementById("rasterScale"), verifySecret: document.getElementById("verifySecret"), mergedPdf: document.getElementById("mergedPdf") };
  refs.prefix.value = state.certificate.prefix; refs.year.value = state.certificate.year; refs.start.value = state.certificate.start; refs.digits.value = state.certificate.digits; refs.filename.value = state.settings.filename; refs.rasterScale.value = String(state.settings.rasterScale || 2); refs.verifySecret.value = state.settings.verifySecret || "";

  const updatePreview = () => {
    const el = document.getElementById("sampleIdText");
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

  const randomSecretBtn = document.getElementById("randomSecretBtn");
  if (randomSecretBtn) {
    randomSecretBtn.onclick = () => {
      refs.verifySecret.value = randomVerifySecret();
      sync(false);
      toast("Generated unique signing secret. Re-export the registry after any new batch.");
    };
  }

  const deriveBtn = document.getElementById("derivePrefixBtn");
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
  const ecdsaStatus = document.getElementById("ecdsaStatus");
  const exportKeyBtn = document.getElementById("exportKeyBtn");
  const importKeyBtn = document.getElementById("importKeyBtn");
  const keyFileInput = document.getElementById("keyFileInput");

  if (hasWebCrypto() && ecdsaStatus) {
    loadSigningKey(state.projectName).then(async existing => {
      if (existing) {
        try {
          const fingerprint = await keyIdFromJwk(existing.publicKey);
          ecdsaStatus.innerHTML = `✓ ECDSA P-256 signing key active — key fingerprint <code class="mono">${escapeHTML(fingerprint)}</code>.`;
        } catch (_) {
          ecdsaStatus.innerHTML = '✓ ECDSA P-256 signing key active — certificates are cryptographically signed.';
        }
        ecdsaStatus.classList.add('is-active');
        if (exportKeyBtn) exportKeyBtn.hidden = false;
        const rotateBtn = document.getElementById('rotateKeyBtn');
        if (rotateBtn) rotateBtn.hidden = false;
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

  const rotateBtn = document.getElementById("rotateKeyBtn");
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
          ecdsaStatus.classList.add('is-active');
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
          ecdsaStatus.classList.add('is-active');
        }
        if (exportKeyBtn) exportKeyBtn.hidden = false;
      } catch (e) { toast("Key import failed: " + e.message); }
      keyFileInput.value = '';
    };
  }

  const generate = document.getElementById("generateBtn");
  generate.onclick = async () => {
    sync(false);
    const pre = validateProject();
    if (!pre.valid) { toast(pre.errors[0]); return; }
    pre.warnings.forEach(w => console.warn("[preflight]", w));
    if (isGenerating()) { toast("A batch is already being generated."); return; }
    generate.disabled = true; document.getElementById("resultCard").innerHTML = "";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn ghost";
    cancelBtn.textContent = "Cancel batch";
    cancelBtn.onclick = () => { cancelGeneration(); cancelBtn.disabled = true; cancelBtn.textContent = "Cancelling…"; };
    const progressText = document.getElementById("progressText");
    if (progressText) progressText.insertAdjacentElement("afterend", cancelBtn);

    try {
      const result = await generateAll();
      if (cancelBtn.parentElement) cancelBtn.remove();
      if (result.fontWarnings?.length) toast(`Some custom fonts failed to embed (${result.fontWarnings.join(", ")}). Those certificates use fallback fonts.`);
      if (result.signFailures) toast(`${result.signFailures} record(s) skipped: signing failed. Check the console for details.`);
      document.getElementById("resultCard").innerHTML = `<div class="card panel result-card">
        <h2>Generation complete</h2>
        <p class="lead">${result.files.length} PDFs are ready${result.skipped ? `; ${result.skipped} invalid row(s) were skipped` : ""}${result.signFailures ? `; ${result.signFailures} record(s) skipped (signing failed)` : ""}.</p>
        <div class="section-gap"></div>
        <div class="page-actions">
          <button class="btn primary" id="downloadZip">Download ZIP (${result.files.length} PDFs)</button>
          <button class="btn" id="downloadRegistry">Download verification registry (JSON)</button>
          <a href="verify.html" target="_blank" rel="noopener" class="btn ghost">Open verification portal ↗</a>
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
        <p class="mini-help">Publish the registry as <code>verification-registry.json</code> next to verify.html so QR scans confirm automatically. The registry is privacy-safe: it contains only certificate IDs and signatures — no participant names. ${state._signingPublicKey ? 'Certificates are signed with ECDSA P-256 — the registry includes your public key (schema 4) so the portal verifies cryptographically.' : 'Keep the signing secret private.'}</p>
      </div>`;

      if (state.settings.mergedPdf) {
        const masterBtn = document.createElement("button");
        masterBtn.className = "btn";
        masterBtn.id = "downloadMaster";
        masterBtn.textContent = "Build print-shop master PDF";
        masterBtn.onclick = async () => {
          try {
            masterBtn.disabled = true;
            masterBtn.textContent = "Rendering master PDF… 0%";
            const blob = await buildMasterPdf({ onProgress: (done, total) => { masterBtn.textContent = `Rendering master PDF… ${Math.round(done / total * 100)}%`; } });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${safeFilename(state.certificate.prefix || "CertiForge")}-master-${result.files.length}-pages.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1500);
            masterBtn.textContent = "Build print-shop master PDF";
          } catch (e) { toast(e.message); }
          finally { masterBtn.disabled = false; }
        };
        document.getElementById("resultCard").querySelector(".page-actions").appendChild(masterBtn);
      }

      const revokeList = document.getElementById("revokeList");
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

      document.getElementById("downloadZip").onclick = async () => {
        try {
          toast("Preparing ZIP download...");
          const blob = await finalizeZip(result);
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${safeFilename(state.certificate.prefix || "CertiForge")}-certificates.zip`; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        }
        catch (e) { toast(e.message); }
      };

      const regBtn = document.getElementById("downloadRegistry");
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
      generate.disabled = false;
      if (e && e.cancelled) {
        const pt = document.getElementById("progressText");
        if (pt) pt.textContent = "Batch cancelled.";
        toast("Batch cancelled.");
      } else { toast(e.message); }
    }
  };
}

