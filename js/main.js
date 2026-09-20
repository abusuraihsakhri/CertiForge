import { state, defaultState } from './state.js';
import { loadTemplate } from './template-loader.js';
import { saveProject, loadProjectFile, applySanitizedState } from './project.js';
import { go, historyAction } from './ui.js';
import { undo, redo } from './history.js';
import { toast } from './utils.js';
import { startAutosave, restoreAutosave, clearAutosave } from './storage.js';
import { sanitizeProjectState } from './security.js';

async function init() {
  const autosave = await restoreAutosave();
  if (autosave && confirm("A previously unsaved project was found. Restore it?")) {
    try {
      // Same sanitization boundary as file import — never trust stored JSON.
      await applySanitizedState(sanitizeProjectState(autosave, defaultState()));
      await clearAutosave();
      go("editor");
    } catch (err) {
      toast(`Could not restore autosave: ${err.message}`);
      await clearAutosave();
      loadTemplate("modern");
      go("templates");
    }
  } else {
    if (autosave) await clearAutosave();
    loadTemplate("modern");
  }

  document.querySelectorAll(".nav-item[data-step]").forEach(b => b.onclick = () => go(b.dataset.step));
  document.getElementById("saveProjectBtn").onclick = () => { saveProject(); toast("Project exported. Participant rows are intentionally not embedded."); };
  document.getElementById("openProjectBtn").onclick = () => document.getElementById("projectFileInput").click();
  document.getElementById("newProjectBtn").onclick = () => {
    if (state.dirtySinceSave && !confirm("Start a new project? Unsaved design changes will be lost.")) return;
    Object.assign(state, defaultState());
    clearAutosave();
    loadTemplate("modern");
    go("templates");
  };
  document.getElementById("generateTopBtn").onclick = () => { if (!state.rows.length) { toast("Upload participant data before generating."); go("data"); return; } go("generate"); };
  document.getElementById("helpBtn").onclick = openHelpDialog;
  document.getElementById("projectFileInput").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { await loadProjectFile(file); toast("Project imported. Re-upload the participant spreadsheet to continue."); go("editor"); }
    catch (err) { toast(err.message); }
    finally { e.target.value = ""; }
  };

  document.addEventListener("keydown", (e) => {
    const target = e.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (typing) return; // don't hijack native text undo while the user types
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); historyAction(undo, "Undo"); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); historyAction(redo, "Redo"); }
  });

  startAutosave();

  window.addEventListener("beforeunload", (e) => {
    if (state.dirtySinceSave) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  go("templates");
}

function openHelpDialog() {
  const opener = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
      <button class="close-modal" aria-label="Close help">&times;</button>
      <h2 id="helpTitle">CertiForge — Quick Start</h2>
      <ol>
        <li><strong>Choose a template</strong> from the gallery.</li>
        <li><strong>Design</strong> — edit text, drag elements, upload logos &amp; signatures.</li>
        <li><strong>Import participants</strong> — upload XLSX, XLS, or CSV.</li>
        <li><strong>Map fields</strong> — add event details and map participant columns.</li>
        <li><strong>Preview</strong> — check real participant data on the certificate.</li>
        <li><strong>Generate</strong> — create PDFs and download a ZIP archive.</li>
      </ol>
      <div class="privacy-note">🔒 <strong>Privacy-first:</strong> All participant data is processed locally in your browser. Nothing is uploaded to any server.</div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (opener && typeof opener.focus === 'function') opener.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key === "Tab") {
      // minimal focus trap: cycle between close button and dialog content
      const focusables = overlay.querySelectorAll("button, [href], input, select, textarea");
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  overlay.querySelector(".close-modal").onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.addEventListener("keydown", onKey);
  overlay.querySelector(".close-modal").focus();
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
