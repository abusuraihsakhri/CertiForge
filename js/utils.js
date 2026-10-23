export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
}

export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) { console.warn(`[toast] ${msg}`); return; }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

export function safeFilename(s) {
  return String(s || "certificate")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ").trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 160);
}

// Collision-free, order-preserving filename allocation.
// `used` is a Set of lowercased names already taken; the returned name is added to it.
export function uniqueFilename(base, used) {
  let name = base || "certificate";
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base}_${n++}`;
  used.add(name.toLowerCase());
  return name;
}

export function uid(prefix = "el") {
  const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Accessible in-app dialogs replacing blocking native confirm()/prompt().
// Both resolve on user choice: confirm → boolean, prompt → string or null.
function openModal({ title, bodyHtml, confirmLabel, danger }) {
  const opener = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle">
      <button class="close-modal" aria-label="Close dialog">&times;</button>
      <h2 id="appDialogTitle"></h2>
      <div class="app-dialog-body"></div>
      <div class="app-dialog-actions page-actions">
        <button type="button" class="btn" id="appDialogCancel">Cancel</button>
        <button type="button" class="btn ${danger ? "danger" : "primary"}" id="appDialogOk"></button>
      </div>
    </div>`;
  overlay.querySelector("#appDialogTitle").textContent = title;
  overlay.querySelector(".app-dialog-body").innerHTML = bodyHtml;
  overlay.querySelector("#appDialogOk").textContent = confirmLabel;

  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); overlay._settle(null); return; }
    if (e.key === "Tab") {
      const focusables = overlay.querySelectorAll("button, [href], input, select, textarea");
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", onKey, true);
  overlay.querySelector(".close-modal").onclick = () => overlay._settle(null);
  overlay.onclick = (e) => { if (e.target === overlay) overlay._settle(null); };

  // Shared teardown: remove the dialog, restore focus to the opener.
  overlay._finish = (result) => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    if (opener && typeof opener.focus === "function") opener.focus();
    return result;
  };

  document.body.appendChild(overlay);
  overlay.querySelector(".close-modal").focus();
  return overlay;
}

export function appConfirm(message, { title = "Please confirm", confirmLabel = "Continue", danger = false } = {}) {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise(resolve => {
    const overlay = openModal({
      title,
      bodyHtml: `<p>${escapeHTML(message)}</p>`,
      confirmLabel,
      danger
    });
    let settled = false;
    overlay._settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(overlay._finish(value === "ok"));
    };
    overlay.querySelector("#appDialogOk").onclick = () => overlay._settle("ok");
  });
}

export function appPrompt(message, { title = "Input required", placeholder = "", password = false, confirmLabel = "OK" } = {}) {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const overlay = openModal({
      title,
      bodyHtml: `<p>${escapeHTML(message)}</p><div class="field"><input id="appDialogInput" type="${password ? "password" : "text"}" autocomplete="off" spellcheck="false" placeholder="${escapeHTML(placeholder)}" aria-label="${escapeHTML(title)}"></div>`,
      confirmLabel
    });
    const input = overlay.querySelector("#appDialogInput");
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(overlay._finish(value));
    };
    overlay._settle = (value) => settle(value === "ok" ? (String(input.value || "").trim() || null) : null);
    overlay.querySelector("#appDialogOk").onclick = () => overlay._settle("ok");
    input.addEventListener("keydown", (e) => { e.key === "Enter" && (e.preventDefault(), overlay._settle("ok")); });
    input.focus();
  });
}
