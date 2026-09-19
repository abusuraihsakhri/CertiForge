import { state, defaultState } from './state.js';
import { loadTemplate } from './template-loader.js';
import { saveProject, loadProjectFile } from './project.js';
import { go, renderStep } from './ui.js';
import { undo, redo } from './history.js';
import { toast } from './utils.js';
import { startAutosave, restoreAutosave } from './storage.js';

async function init() {
  const autosave = await restoreAutosave();
  if (autosave && confirm("A previously unsaved project was found. Restore it?")) {
    const { loadProjectFile } = await import('./project.js');
    const { defaultState: def } = await import('./state.js');
    Object.assign(state, {
      projectName: autosave.projectName || def().projectName,
      templateId: autosave.templateId || def().templateId,
      elements: autosave.elements || [],
      mappings: autosave.mappings || {},
      globalFields: Object.assign({}, def().globalFields, autosave.globalFields || {}),
      certificate: Object.assign({}, def().certificate, autosave.certificate || {}),
      settings: Object.assign({}, def().settings, autosave.settings || {}),
      fonts: autosave.fonts || [],
      selectedElement: null, rows: [], columns: [], sampleIndex: 0, generated: []
    });
    if (state.fonts.length) {
      for (const f of state.fonts) {
        try { const ff = new FontFace(f.family, `url(${f.data})`); const loaded = await ff.load(); document.fonts.add(loaded); } catch (e) { /* skip */ }
      }
    }
    const { resetHistory } = await import('./history.js');
    resetHistory();
    go("editor");
  } else {
    loadTemplate("modern");
  }

  document.querySelectorAll(".nav-item[data-step]").forEach(b => b.onclick = () => go(b.dataset.step));
  document.getElementById("saveProjectBtn").onclick = () => { saveProject(); toast("Project exported. Participant rows are intentionally not embedded."); };
  document.getElementById("openProjectBtn").onclick = () => document.getElementById("projectFileInput").click();
  document.getElementById("newProjectBtn").onclick = () => { if (confirm("Start a new project? Unsaved design changes will be lost.")) { Object.assign(state, defaultState()); loadTemplate("modern"); go("templates"); } };
  document.getElementById("generateTopBtn").onclick = () => { if (!state.rows.length) { toast("Upload participant data before generating."); go("data"); return; } go("generate"); };
  document.getElementById("helpBtn").onclick = () => alert("CertiForge V0.3\n\n1. Choose a template.\n2. Edit text, drag elements, and upload logos/signatures.\n3. Upload XLSX/XLS/CSV.\n4. Add event details and map participant fields.\n5. Preview.\n6. Generate PDFs and download a ZIP.\n\nParticipant data remains in this browser during the workflow.");
  document.getElementById("projectFileInput").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { await loadProjectFile(file); toast("Project imported. Re-upload the participant spreadsheet to continue."); go("editor"); }
    catch (err) { toast(err.message); }
    finally { e.target.value = ""; }
  };

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (undo()) toast("Undo"); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (redo()) toast("Redo"); }
  });

  startAutosave();
  go("templates");
}

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(() => {});
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
