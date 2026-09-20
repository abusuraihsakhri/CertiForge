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
