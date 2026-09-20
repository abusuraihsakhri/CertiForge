import { state } from './state.js';
import { templates, getTemplate } from './templates.js';
import { templateSVG, loadTemplate } from './template-loader.js';
import { variableKeys, columnToken, extractConferencePrefix, extractConferenceYear, formatId } from './variables.js';
import { safeFilename, escapeHTML, toast } from './utils.js';
import { renderCanvas } from './canvas.js';
import { renderCurrentEditor, addTextElement, addQRElement, addImageFile, loadCustomFont } from './editor.js';
import { parseSpreadsheet } from './spreadsheet.js';
import { validateRows } from './validator.js';
import { generateAll } from './generator.js';
import { makeZip } from './zip.js';
import { saveProject, loadProjectFile } from './project.js';
import { undo, redo } from './history.js';
import { mappedRows } from './mapping.js';
import { renderCertificateSVG } from './pdf.js';

export function updateGenerationProgress(done, total, startTime, totalRows) {
  const b = document.getElementById("progressBar"), t = document.getElementById("progressText");
  const pct = Math.round(done / total * 100);
  if (b) b.style.width = pct + "%";
  if (t && startTime) {
    const elapsed = (performance.now() - startTime) / 1000;
    const rate = done / elapsed;
    const remaining = rate > 0 ? Math.round((total - done) / rate) : 0;
    t.textContent = `Generated ${done} of ${total} (${pct}%)${remaining > 1 ? ` — ~${remaining}s remaining` : ''}`;
  }
}

export function go(step) {
  state.currentStep = step;
  document.querySelectorAll(".nav-item[data-step]").forEach(b => b.classList.toggle("active", b.dataset.step === step));
  renderStep();
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
    <div class="toolbar" style="margin-bottom:20px;gap:8px;flex-wrap:wrap">
      ${cats.map(c => `<button class="btn ${_templateFilter === c ? 'primary' : 'ghost'}" data-cat="${escapeHTML(c)}" style="border-radius:9999px;padding:6px 14px;font-size:12px;font-weight:600">${escapeHTML(c)}</button>`).join("")}
    </div>
    <div class="grid template-grid">${filtered.map(t => `<article class="card template-card ${state.templateId === t.id ? 'active-template' : ''}" data-template="${escapeHTML(t.id)}"><div class="template-thumb">${templateSVG(t.id)}</div><div class="template-info"><strong>${escapeHTML(t.name)}</strong><p>${escapeHTML(t.description)}</p><span class="tag">${escapeHTML(t.category)}</span></div></article>`).join("")}</div></div>`;
    
    app.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { _templateFilter = b.dataset.cat; draw(); });
    app.querySelectorAll("[data-template]").forEach(c => c.onclick = () => {
      loadTemplate(c.dataset.template);
      state.dirtySinceSave = true;
      go("editor");
    });
  };

  draw();
}

function renderEditor(app) {
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">02 / DESIGN</div><h1>Design your certificate.</h1><p class="lead">Drag editable elements directly on the certificate, or use exact position controls.</p></div><div class="toolbar"><button class="btn" id="switchTemplate">Templates</button><button class="btn primary" id="toData">Continue</button></div></div>
  <div class="editor-layout"><div class="editor-panel elements">
    <h3>Project</h3><div class="field"><label>Project name</label><input id="projectNameInput"></div>
    <h3 style="margin-top:18px">Elements</h3>
    <div class="toolbar compact"><button class="btn" id="addTextBtn">+ Text</button><button class="btn" id="addImageBtn">+ Logo / Signature</button><button class="btn" id="addQRBtn">+ QR Code</button></div>
    <input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
    <input id="fontFileInput" type="file" accept=".ttf,.otf,.woff,.woff2" hidden>
    <div id="elementList" class="element-list" style="margin-top:10px"></div>
    <div class="toolbar compact" style="margin-top:10px"><button class="btn ghost" id="undoBtn" title="Ctrl+Z">↩ Undo</button><button class="btn ghost" id="redoBtn" title="Ctrl+Shift+Z">↪ Redo</button></div>
    <div class="mini-help" style="margin:14px 4px">Tip: use variables such as <b>{{NAME}}</b>, <b>{{ROLE}}</b>, <b>{{EVENT}}</b>, and spreadsheet tokens such as <b>{{REGISTRATION_ID}}</b>.</div>
  </div>
  <div class="canvas-stage"><div id="editorCanvas"></div></div><div class="editor-panel properties"><h3>Properties</h3><div id="properties"></div></div></div></div>`;
  const project = document.getElementById("projectNameInput");
  project.value = state.projectName;
  project.onchange = () => {
    state.projectName = project.value.trim() || "Untitled Conference";
    state.dirtySinceSave = true;
  };
  document.getElementById("switchTemplate").onclick = () => go("templates");
  document.getElementById("toData").onclick = () => go("data");
  document.getElementById("addTextBtn").onclick = addTextElement;
  document.getElementById("addQRBtn").onclick = addQRElement;
  const imageInput = document.getElementById("imageFile");
  document.getElementById("addImageBtn").onclick = () => imageInput.click();
  imageInput.onchange = async () => { try { await addImageFile(imageInput.files[0]); } catch (e) { toast(e.message); } finally { imageInput.value = ""; } };
  document.getElementById("fontFileInput").onchange = async () => { try { await loadCustomFont(document.getElementById("fontFileInput").files[0]); } catch (e) { toast(e.message); } finally { document.getElementById("fontFileInput").value = ""; } };
  document.getElementById("undoBtn").onclick = () => { if (undo()) toast("Undo"); };
  document.getElementById("redoBtn").onclick = () => { if (redo()) toast("Redo"); };
  renderCurrentEditor();
}

function renderData(app) {
  const v = validateRows();
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">03 / PARTICIPANTS</div><h1>Bring in your participant list.</h1><p class="lead">CSV works without an external library. XLS/XLSX uses the Excel parser loaded by the page.</p></div><button class="btn primary" id="toMapping" ${state.rows.length ? "" : "disabled"}>Continue</button></div>
  <div class="card panel"><div id="dropzone" class="dropzone"><strong>Drop your Excel or CSV file here</strong><p>or choose a file from your device</p><button class="btn" id="chooseFile">Choose file</button><input id="dataFile" type="file" accept=".xlsx,.xls,.csv" hidden></div></div>
  ${state.rows.length ? `<div style="height:16px"></div><div class="metric-grid"><div class="metric"><strong>${v.total}</strong><span>PARTICIPANTS</span></div><div class="metric"><strong>${v.valid}</strong><span>VALID NAMES</span></div><div class="metric"><strong>${v.duplicateNames}</strong><span>DUPLICATE NAMES</span></div></div><div style="height:16px"></div><div class="card panel"><h2>Data preview</h2><div class="table-wrap">${tableHTML(state.rows.slice(0, 10))}</div></div>` : ""}</div>`;
  const dz = document.getElementById("dropzone"), input = document.getElementById("dataFile"), choose = document.getElementById("chooseFile"), next = document.getElementById("toMapping");
  choose.onclick = () => input.click();
  input.onchange = () => input.files[0] && handleDataFile(input.files[0]);
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("drag"); };
  dz.ondragleave = () => dz.classList.remove("drag");
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove("drag"); if (e.dataTransfer.files[0]) handleDataFile(e.dataTransfer.files[0]); };
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
  const customTokens = state.columns.map(c => `<code>{{${columnToken(c)}}}</code>`).join(" ");
  const gf = state.globalFields;
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">04 / MAPPING</div><h1>Map your spreadsheet.</h1><p class="lead">Participant-specific columns can override the conference-wide details below.</p></div><button class="btn primary" id="toPreview">Continue</button></div>
  <div class="card panel"><h2>Conference-wide details</h2><div class="form-grid"><div class="field"><label>Event</label><input data-global="EVENT" value="${escapeHTML(gf.EVENT || "")}"></div><div class="field"><label>Date</label><input data-global="DATE" value="${escapeHTML(gf.DATE || "")}"></div><div class="field"><label>Venue</label><input data-global="VENUE" value="${escapeHTML(gf.VENUE || "")}"></div><div class="field"><label>Organization</label><input data-global="ORGANIZATION" value="${escapeHTML(gf.ORGANIZATION || "")}"></div></div></div>
  <div style="height:16px"></div><div class="card panel"><h2>Column mapping</h2><div class="mapping-grid">${variableKeys.filter(v => !["CERTIFICATE_ID", "YEAR"].includes(v)).map(v => `<div class="map-card ${v === "NAME" ? "required-map" : ""}"><strong>{{${v}}}${v === "NAME" ? ' <span class="required">required</span>' : ""}</strong><div class="arrow">↓</div><select data-map="${v}"><option value="">${["EVENT", "DATE", "VENUE", "ORGANIZATION"].includes(v) ? "Use conference-wide value" : "Not mapped"}</option>${options}</select></div>`).join("")}</div><div class="notice" style="margin-top:14px"><b>Direct spreadsheet variables:</b> every column is also available as a token. ${customTokens}</div></div></div>`;
  app.querySelectorAll("[data-map]").forEach(s => {
    s.value = state.mappings[s.dataset.map] || "";
    s.onchange = () => {
      state.mappings[s.dataset.map] = s.value;
      state.dirtySinceSave = true;
    };
  });
  app.querySelectorAll("[data-global]").forEach(i => i.oninput = () => {
    state.globalFields[i.dataset.global] = i.value;
    state.dirtySinceSave = true;
    if (i.dataset.global === "EVENT" && i.value) {
      if (!state.certificate._customPrefix || state.certificate.prefix === "CONF") {
        state.certificate.prefix = extractConferencePrefix(i.value);
        state.certificate.year = extractConferenceYear(i.value);
      }
    }
  });
  document.getElementById("toPreview").onclick = () => { if (!state.mappings.NAME) { toast("Map a spreadsheet column to {{NAME}} first."); return; } go("preview"); };
}

function renderPreview(app) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }

  const rows = mappedRows().filter(r => String(r.NAME || "").trim());
  if (!rows.length) { toast("No valid participant names are available for preview."); go("mapping"); return; }
  state.sampleIndex = Math.max(0, Math.min(rows.length - 1, state.sampleIndex));
  const row = rows[state.sampleIndex];

  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">05 / PREVIEW</div><h1>Check the result.</h1><p class="lead">Preview actual records before committing to the batch.</p></div><div class="toolbar"><button class="btn" id="prev">Previous</button><button class="btn" id="next">Next</button><button class="btn primary" id="toGenerate">Generate</button></div></div>
  <div class="card panel"><div class="preview-stage"><div id="previewSheet" class="preview-sheet"></div></div><div style="margin-top:15px;font-size:12px;color:var(--muted)">Participant ${state.sampleIndex + 1} of ${rows.length}</div></div></div>`;

  document.getElementById("previewSheet").innerHTML = renderCertificateSVG(row, state.sampleIndex);
  document.getElementById("prev").onclick = () => { state.sampleIndex = Math.max(0, state.sampleIndex - 1); renderStep(); };
  document.getElementById("next").onclick = () => { state.sampleIndex = Math.min(rows.length - 1, state.sampleIndex + 1); renderStep(); };
  document.getElementById("toGenerate").onclick = () => go("generate");
}

function renderGenerate(app) {
  if (!state.rows.length) { go("data"); return; }
  if (!state.mappings.NAME) { go("mapping"); return; }
  const val = validateRows();
  app.innerHTML = `<div class="page"><div class="page-head"><div><div class="eyebrow">06 / GENERATE</div><h1>Generate your certificate batch.</h1><p class="lead">Rows without a participant name are skipped. Duplicate filenames are automatically suffixed.</p></div></div>
  <div class="generate-grid"><div class="card panel"><h2>Certificate numbering</h2>
    <div class="form-grid">
      <div class="field">
        <div style="display:flex;justify-content:space-between;align-items:center"><label>Prefix</label><button type="button" id="derivePrefixBtn" style="font-size:11px;font-weight:700;background:none;border:none;color:var(--accent2);cursor:pointer;padding:0">⚡ From Event</button></div>
        <input id="prefix">
      </div>
      <div class="field"><label>Year</label><input id="year"></div>
      <div class="field"><label>Starting number</label><input id="start" type="number"></div>
      <div class="field"><label>Digits</label><input id="digits" type="number" min="1" max="8"></div>
    </div>
    <p class="mini-help" style="margin-top:9px">Sample ID: <strong id="sampleIdText" style="color:var(--ink)"></strong></p>
    <div class="field" style="margin-top:14px"><label>Filename pattern</label><input id="filename"></div>
    <div class="field" style="margin-top:14px"><label>PDF quality</label><select id="rasterScale"><option value="1">Standard</option><option value="2">High (recommended)</option><option value="3">Very high</option></select></div>
    <p class="mini-help" style="margin-top:9px">Example: {{CERTIFICATE_ID}}_{{NAME}}.pdf</p>
  </div>
  <div class="card panel"><h2>Batch summary</h2><div class="metric-grid"><div class="metric"><strong>${val.valid}</strong><span>PDF FILES</span></div><div class="metric"><strong>${val.missingName}</strong><span>ROWS SKIPPED</span></div><div class="metric"><strong>${val.duplicateNames}</strong><span>DUPLICATE NAMES</span></div></div><div style="height:20px"></div><button class="btn primary" id="generateBtn" style="width:100%;padding:13px">GENERATE ALL CERTIFICATES</button><div style="height:15px"></div><div class="progress"><div id="progressBar"></div></div><div id="progressText" class="mini-help" style="margin-top:8px">Ready.</div></div></div>
  <div style="height:16px"></div><div id="resultCard"></div></div>`;

  const refs = { prefix: document.getElementById("prefix"), year: document.getElementById("year"), start: document.getElementById("start"), digits: document.getElementById("digits"), filename: document.getElementById("filename"), rasterScale: document.getElementById("rasterScale") };
  refs.prefix.value = state.certificate.prefix; refs.year.value = state.certificate.year; refs.start.value = state.certificate.start; refs.digits.value = state.certificate.digits; refs.filename.value = state.settings.filename; refs.rasterScale.value = String(state.settings.rasterScale || 2);

  const updatePreview = () => {
    const el = document.getElementById("sampleIdText");
    if (el) el.textContent = formatId(state.certificate.start || 1);
  };

  const sync = (isManualPrefix = false) => {
    state.certificate.prefix = refs.prefix.value.trim() || "CONF";
    if (isManualPrefix) state.certificate._customPrefix = true;
    state.certificate.year = refs.year.value.trim() || String(new Date().getFullYear());
    state.certificate.start = Math.max(0, +refs.start.value || 1);
    state.certificate.digits = Math.min(8, Math.max(1, +refs.digits.value || 4));
    state.settings.filename = refs.filename.value || "{{CERTIFICATE_ID}}_{{NAME}}.pdf";
    state.settings.rasterScale = +refs.rasterScale.value || 2;
    state.dirtySinceSave = true;
    updatePreview();
  };

  refs.prefix.oninput = () => sync(true);
  ["year", "start", "digits", "filename", "rasterScale"].forEach(k => refs[k].oninput = () => sync(false));
  updatePreview();

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

  const generate = document.getElementById("generateBtn");
  generate.onclick = async () => {
    sync(false); generate.disabled = true; document.getElementById("resultCard").innerHTML = "";
    try {
      const result = await generateAll();
      document.getElementById("resultCard").innerHTML = `<div class="card panel">
        <h2>Generation complete</h2>
        <p class="lead">${result.files.length} PDFs are ready${result.skipped ? `; ${result.skipped} invalid row(s) were skipped` : ""}.</p>
        <div style="height:15px"></div>
        <div class="toolbar">
          <button class="btn primary" id="downloadZip">DOWNLOAD ZIP (${result.files.length} PDFs)</button>
          <button class="btn" id="downloadRegistry">DOWNLOAD VERIFICATION REGISTRY (JSON)</button>
          <a href="verify.html" target="_blank" class="btn ghost">OPEN VERIFICATION PORTAL ↗</a>
        </div>
      </div>`;

      document.getElementById("downloadZip").onclick = async () => {
        try { const blob = await makeZip(result.files); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${safeFilename(state.certificate.prefix || "CertiForge")}-certificates.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }
        catch (e) { toast(e.message); }
      };

      const regBtn = document.getElementById("downloadRegistry");
      if (regBtn) {
        regBtn.onclick = () => {
          try {
            const data = JSON.stringify({
              project: state.projectName,
              event: state.globalFields.EVENT,
              organization: state.globalFields.ORGANIZATION,
              year: state.certificate.year,
              generatedAt: new Date().toISOString(),
              totalCertificates: (state.registry || []).length,
              certificates: state.registry || []
            }, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${safeFilename(state.certificate.prefix || "conference")}-verification-registry.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1500);
          } catch (e) { toast(e.message); }
        };
      }
    } catch (e) { toast(e.message); generate.disabled = false; }
  };
}

