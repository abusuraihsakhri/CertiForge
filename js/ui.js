import { state, markDirty, randomVerifySecret } from './state.js';
import { templates, getTemplate } from './templates.js';
import { templateSVG, loadTemplate } from './template-loader.js';
import { variableKeys, columnToken, extractConferencePrefix, extractConferenceYear, formatId } from './variables.js';
import { safeFilename, escapeHTML, toast } from './utils.js';
import { renderCanvas } from './canvas.js';
import { renderCurrentEditor, addTextElement, addQRElement, addImageFile, loadCustomFont } from './editor.js';
import { parseSpreadsheet } from './spreadsheet.js';
import { validateRows, validateProject } from './validator.js';
import { generateAll, isGenerating, cancelGeneration, generationRows, buildPublicRegistry } from './generator.js';
import { makeZip } from './zip.js';
import { saveProject, loadProjectFile } from './project.js';
import { undo, redo } from './history.js';
import { renderCertificateSVG } from './pdf.js';
import { LEGACY_VERIFY_SALT } from './config.js';
import { hasWebCrypto, encryptWithPassphrase, decryptWithPassphrase, exportPublicKeyJWK, exportPrivateKeyJWK, generateKeyPair } from './crypto.js';
import { loadSigningKey, storeSigningKey } from './storage.js';

export { updateGenerationProgress } from './progress.js';

const WORKFLOW_STEPS = ["templates", "editor", "data", "mapping", "preview", "generate"];

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
  });
  const projectName = document.getElementById("topProjectName");
  if (projectName) projectName.textContent = state.projectName || "Untitled Conference";
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

export function renderStep() {
  const app = document.getElementById("app"), step = state.currentStep || "templates";
  if (step === "templates") return renderTemplates(app);
  if (step === "editor") return renderEditor(app);
  if (step === "data") return renderData(app);
  if (step === "mapping") return renderMapping(app);
  if (step === "preview") return renderPreview(app);
  if (step === "generate") return renderGenerate(app);
}

let _templateFilter = "All";

function renderTemplates(app) {
  const cats = ["All", "Indian Medical", "Academic", "Conference", "Medical", "Technology", "Awards", "Corporate", "Sports"];
  
  const draw = () => {
    const filtered = _templateFilter === "All" ? templates : templates.filter(t => t.category === _templateFilter);
    app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">01 / TEMPLATE</div><h1>Choose your certificate.</h1><p class="lead">Select an authentic Indian conference layout or global academic template. Selecting a template resets current template edits.</p></div></div>
    <div class="filter-bar">
      ${cats.map(c => `<button class="btn ${_templateFilter === c ? 'primary' : 'ghost'}" data-cat="${escapeHTML(c)}" >${escapeHTML(c)}</button>`).join("")}
    </div>
    <div class="grid template-grid">${filtered.map(t => {
      const selected = state.templateId === t.id;
      const orientation = t.page?.orientation === "portrait" ? "Portrait" : "Landscape";
      return `<article class="card template-card ${selected ? 'active-template' : ''}" data-template="${escapeHTML(t.id)}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="Use template ${escapeHTML(t.name)}">
        <div class="template-thumb">${templateSVG(t.id)}${selected ? '<span class="template-selected" aria-hidden="true">✓</span>' : ''}</div>
        <div class="template-info">
          <strong>${escapeHTML(t.name)}</strong>
          <div class="template-meta"><span>${escapeHTML(t.category)}</span><span>•</span><span>${orientation}</span></div>
          <div class="template-use">Use template <span aria-hidden="true">→</span></div>
        </div>
      </article>`;
    }).join("")}</div></div>`;
    
    app.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { _templateFilter = b.dataset.cat; draw(); });
    const selectTemplate = (id) => {
      if (state.dirtySinceSave && !confirm("Selecting a different template discards your current design edits. Continue?")) return;
      loadTemplate(id);
      state.dirtySinceSave = true;
      go("editor");
    };
    app.querySelectorAll("[data-template]").forEach(c => {
      c.onclick = () => selectTemplate(c.dataset.template);
      c.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectTemplate(c.dataset.template); }
      });
    });
  };

  draw();
}

let _editorZoom = "fit";

function applyEditorZoom() {
  const canvas = document.getElementById("editorCanvas");
  if (!canvas) return;
  const pageWidth = getTemplate(state.templateId)?.page?.width || 1123;
  canvas.style.maxWidth = _editorZoom === "100" ? "none" : "";
  canvas.style.width = _editorZoom === "fit" ? "100%" : (_editorZoom === "75" ? "75%" : pageWidth + "px");
  document.querySelectorAll("[data-zoom]").forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.zoom === _editorZoom)));
}

function renderEditor(app) {
  app.innerHTML = `<div class="page editor-page"><div class="page-head"><div><div class="eyebrow">02 / DESIGN</div><h1>Design your certificate.</h1><p class="lead">Select an element to edit it. Drag on the canvas or use precise values in the inspector.</p></div><div class="toolbar"><button class="btn" id="switchTemplate">Templates</button><button class="btn primary" id="toData">Continue</button></div></div>
  <div class="editor-layout"><div class="editor-panel elements">
    <h3>Project</h3><div class="field"><label for="projectNameInput">Project name</label><input id="projectNameInput"></div>
    <div class="panel-heading-row"><h3>Layers</h3><span id="layerCount"></span></div>
    <div class="editor-insert-grid"><button class="btn" id="addTextBtn">+ Text</button><button class="btn" id="addImageBtn">+ Image</button><button class="btn" id="addQRBtn">+ QR</button></div>
    <input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="Upload logo or signature image" hidden>
    <input id="fontFileInput" type="file" accept=".ttf,.otf,.woff,.woff2" aria-label="Upload custom font file" hidden>
    <div id="elementList" class="element-list" aria-label="Element layers"></div>
    <div class="mini-help editor-tip">Drag elements on the canvas. Use arrow keys to nudge and Shift + arrow for fine movement.</div>
  </div>
  <div class="canvas-column">
    <div class="canvas-toolbar">
      <div class="canvas-toolbar-group"><button class="tool-btn" id="undoBtn" title="Undo (Ctrl+Z)">↶</button><button class="tool-btn" id="redoBtn" title="Redo (Ctrl+Shift+Z)">↷</button></div>
      <div class="canvas-toolbar-title">Canvas</div>
      <div class="canvas-toolbar-group zoom-group"><button class="tool-btn" data-zoom="fit" aria-pressed="true">Fit</button><button class="tool-btn" data-zoom="75" aria-pressed="false">75%</button><button class="tool-btn" data-zoom="100" aria-pressed="false">100%</button></div>
    </div>
    <div class="canvas-stage"><div id="editorCanvas"></div></div>
  </div>
  <div class="editor-panel properties"><div class="panel-heading-row"><h3>Inspector</h3><span>Selected element</span></div><div id="properties"></div></div></div></div>`;
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
  const layerCount = document.getElementById("layerCount");
  if (layerCount) layerCount.textContent = state.elements.length + " elements";
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
  </div>` : `<div class="card panel"><div id="dropzone" class="dropzone"><strong>Drop your Excel or CSV file here</strong><p>XLSX, XLS, CSV, or TSV. Processing stays in this browser.</p><button class="btn" id="chooseFile">Choose file</button><input id="dataFile" type="file" accept=".xlsx,.xls,.csv,.tsv" aria-label="Choose participant spreadsheet" hidden></div></div>`;

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">03 / PARTICIPANTS</div><h1>Import participant data.</h1><p class="lead">Use a spreadsheet as the source for names, roles, institutions, and any custom certificate fields.</p></div><button class="btn primary" id="toMapping" ${state.rows.length ? "" : "disabled"}>Continue</button></div>
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
  try { await parseSpreadsheet(file); toast(`Loaded ${state.rows.length} participant records.`); renderStep(); }
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

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">04 / MAPPING</div><h1>Map your spreadsheet.</h1><p class="lead">Connect certificate fields to participant columns. Event-level values remain the fallback where applicable.</p></div><button class="btn primary" id="toPreview">Continue</button></div>
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

  app.querySelectorAll("[data-map]").forEach(s => {
    s.value = state.mappings[s.dataset.map] || "";
    s.onchange = () => {
      state.mappings[s.dataset.map] = s.value;
      const badge = app.querySelector(`[data-source="${s.dataset.map}"]`);
      if (badge) badge.textContent = s.value ? "Spreadsheet" : (fallbackVars.has(s.dataset.map) ? "Event settings" : "Not mapped");
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

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">05 / PREVIEW</div><h1>Preview the final certificates.</h1><p class="lead">This uses the same artwork, variables, and numbering as the generated PDF batch.</p></div><button class="btn primary" id="toGenerate">Generate</button></div>
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
  if (state.settings.verifySecret === LEGACY_VERIFY_SALT) toast("Signing secret is the publicly known legacy default — click Randomize to make signatures private again.");
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">06 / GENERATE</div><h1>Generate your certificate batch.</h1><p class="lead">Review output settings, signing, and the final batch count before creating PDFs.</p></div></div>
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
      <div class="field"><label for="filename">Filename pattern</label><input id="filename" maxlength="200"><p class="mini-help">Example: {{CERTIFICATE_ID}}_{{NAME}}.pdf</p></div>
      <div class="field"><label for="rasterScale">PDF quality</label><select id="rasterScale"><option value="1">Standard</option><option value="2">High (recommended)</option><option value="3">Very high</option></select></div>
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
            <button type="button" class="btn" id="importKeyBtn">Import key</button>
          </div>
          <input type="file" id="keyFileInput" accept=".json,application/json" hidden>
          <p class="mini-help">When active, the portal verifies signatures with the published public key only.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="section-gap"></div><div id="resultCard"></div></div>`;

  const refs = { prefix: document.getElementById("prefix"), year: document.getElementById("year"), start: document.getElementById("start"), digits: document.getElementById("digits"), filename: document.getElementById("filename"), rasterScale: document.getElementById("rasterScale"), verifySecret: document.getElementById("verifySecret") };
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
    const secret = refs.verifySecret.value.trim();
    if (secret) state.settings.verifySecret = secret;
    else refs.verifySecret.value = state.settings.verifySecret; // never downgrade silently
    markDirty();
    updatePreview();
  };

  refs.prefix.oninput = () => sync(true);
  ["year", "start", "digits", "filename", "rasterScale", "verifySecret"].forEach(k => refs[k].oninput = () => sync(false));
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
    loadSigningKey(state.projectName).then(existing => {
      if (existing) {
        ecdsaStatus.innerHTML = '✓ ECDSA P-256 signing key active — certificates are cryptographically signed.';
        ecdsaStatus.style.color = 'var(--color-secure-green)';
        if (exportKeyBtn) exportKeyBtn.style.display = '';
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
        const passphrase = prompt("Enter a passphrase to encrypt your key backup:");
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

  if (importKeyBtn && keyFileInput) {
    importKeyBtn.onclick = () => keyFileInput.click();
    keyFileInput.onchange = async () => {
      const file = keyFileInput.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.ct || !data.salt || !data.iv) throw new Error("Not a valid CertiForge key backup file.");
        const passphrase = prompt("Enter the passphrase for this key backup:");
        if (!passphrase) return;
        const keyPair = await decryptWithPassphrase(data, passphrase);
        if (!keyPair.publicKey || !keyPair.privateKey) throw new Error("Backup did not contain a valid key pair.");
        await storeSigningKey(state.projectName, keyPair.publicKey, keyPair.privateKey);
        toast("Signing key restored. Existing certificates remain valid.");
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
    cancelBtn.style.marginTop = "8px";
    cancelBtn.textContent = "Cancel batch";
    cancelBtn.onclick = () => { cancelGeneration(); cancelBtn.disabled = true; cancelBtn.textContent = "Cancelling…"; };
    const progressText = document.getElementById("progressText");
    if (progressText) progressText.insertAdjacentElement("afterend", cancelBtn);

    try {
      const result = await generateAll();
      if (cancelBtn.parentElement) cancelBtn.remove();
      document.getElementById("resultCard").innerHTML = `<div class="card panel result-card">
        <h2>Generation complete</h2>
        <p class="lead">${result.files.length} PDFs are ready${result.skipped ? `; ${result.skipped} invalid row(s) were skipped` : ""}.</p>
        <div class="section-gap"></div>
        <div class="page-actions">
          <button class="btn primary" id="downloadZip">DOWNLOAD ZIP (${result.files.length} PDFs)</button>
          <button class="btn" id="downloadRegistry">DOWNLOAD VERIFICATION REGISTRY (JSON)</button>
          <a href="verify.html" target="_blank" rel="noopener" class="btn ghost">OPEN VERIFICATION PORTAL ↗</a>
        </div>
        <p class="mini-help" style="margin-top:12px">Publish the registry as <code>verification-registry.json</code> next to verify.html so QR scans confirm automatically. The registry is privacy-safe: it contains only certificate IDs and keyed digests — no participant names. ${state._signingPublicKey ? 'Certificates are signed with ECDSA P-256 — the registry includes your public key so the portal verifies cryptographically.' : 'Keep the signing secret private.'}</p>
      </div>`;

      document.getElementById("downloadZip").onclick = async () => {
        try {
          toast("Preparing ZIP download...");
          const blob = result.zip
            ? await result.zip.generateAsync({ type: "blob", compression: "STORE" })
            : await makeZip(result.files);
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

