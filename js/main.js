import { state, defaultState } from './state.js';
import { loadTemplate } from './template-loader.js';
import { saveProject, loadProjectFile, applySanitizedState } from './project.js';
import { go, historyAction } from './ui.js';
import { undo, redo } from './history.js';
import { toast, appConfirm } from './utils.js';
import { startAutosave, restoreAutosave, clearAutosave } from './storage.js';
import { sanitizeProjectState } from './security.js';
import { initTheme, bindThemeToggle } from './theme.js';
import { initWebfonts } from './webfonts.js';

function setMobileMenu(open) {
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const trigger = document.getElementById("mobileMenuBtn");
  if (!sidebar || !backdrop || !trigger) return;
  const shouldOpen = Boolean(open);
  const mobile = window.matchMedia ? window.matchMedia("(max-width: 768px)").matches : window.innerWidth <= 768;
  sidebar.classList.toggle("mobile-open", shouldOpen && mobile);
  backdrop.classList.toggle("show", shouldOpen && mobile);
  document.body.classList.toggle("sidebar-open", shouldOpen && mobile);
  trigger.setAttribute("aria-expanded", String(shouldOpen && mobile));
  trigger.setAttribute("aria-label", shouldOpen && mobile ? "Close workflow menu" : "Open workflow menu");

  if (mobile) {
    sidebar.setAttribute("aria-hidden", String(!shouldOpen));
    if ("inert" in sidebar) sidebar.inert = !shouldOpen;
  } else {
    sidebar.removeAttribute("aria-hidden");
    if ("inert" in sidebar) sidebar.inert = false;
  }
}

function bindShellControls() {
  bindThemeToggle();

  const trigger = document.getElementById("mobileMenuBtn");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (trigger) trigger.onclick = () => setMobileMenu(trigger.getAttribute("aria-expanded") !== "true");
  if (backdrop) backdrop.onclick = () => setMobileMenu(false);
  setMobileMenu(false);

  document.querySelectorAll(".nav-item[data-step]").forEach(b => {
    b.addEventListener("click", () => setMobileMenu(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) setMobileMenu(false);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("sidebar-open")) setMobileMenu(false);
  });
}

async function init() {
  initTheme();
  // Register the self-hosted ceremonial fonts (SIL OFL) with the document so
  // the canvas, inspector previews and the PDF pipeline can use them.
  initWebfonts().catch(() => {});
  const autosave = await restoreAutosave();
  if (autosave && await appConfirm("A previously unsaved project was found. Restore it?", { title: "Restore autosave", confirmLabel: "Restore" })) {
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
  bindShellControls();
  document.getElementById("saveProjectBtn").onclick = () => { saveProject(); toast("Project exported. Participant rows are intentionally not embedded."); };
  document.getElementById("openProjectBtn").onclick = () => document.getElementById("projectFileInput").click();
  document.getElementById("newProjectBtn").onclick = async () => {
    if (state.dirtySinceSave && !(await appConfirm("Start a new project? Unsaved design changes will be lost.", { title: "New project", confirmLabel: "Start new", danger: true }))) return;
    Object.assign(state, defaultState());
    delete state._signingPublicKey;
    delete state._signingKeyProjectName;
    delete state._signingKeyId;
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
      <h2 id="helpTitle">Quick start</h2>
      <ol>
        <li><strong>Choose a template</strong> from the gallery.</li>
        <li><strong>Design</strong>: edit text, drag elements, upload logos and signatures.</li>
        <li><strong>Import participants</strong> from an XLSX, XLS or CSV file.</li>
        <li><strong>Map fields</strong>: add event details and connect spreadsheet columns.</li>
        <li><strong>Preview</strong> real participant data on the certificate.</li>
        <li><strong>Generate</strong> the PDFs and download them as a ZIP.</li>
      </ol>
      <div class="privacy-note"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg><span><strong>Private by design.</strong> Participant data is processed in your browser and never uploaded to a server.</span></div>
    </div>`;
  // Background chrome becomes inert while the dialog is open, so Tab cannot
  // escape the focus trap into the sidebar or workspace.
  const sidebar = document.getElementById("appSidebar");
  const workspace = document.getElementById("app");
  sidebar?.setAttribute("inert", "");
  workspace?.setAttribute("inert", "");
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    sidebar?.removeAttribute("inert");
    workspace?.removeAttribute("inert");
    if (opener && typeof opener.focus === 'function') opener.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key === "Tab") {
      // focus trap: cycle between close button and dialog content
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
