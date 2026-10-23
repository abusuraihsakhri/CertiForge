/**
 * Self-hosted ceremonial font families (SIL OFL) plus JetBrains Mono.
 *
 * Google-Fonts CDN families cannot survive the PDF pipeline (an SVG rasterized
 * through <img> cannot see document fonts) and the studio CSP forbids JS font
 * fetches to third-party origins, so these families ship as local woff2 assets.
 * They are registered via FontFace at boot for the interactive canvas, and are
 * embedded as data-URL @font-face defs into the rendered SVG skeleton.
 */

export const SELF_HOSTED_FONTS = [
  { family: "Playfair Display", weight: 600, file: "assets/fonts/PlayfairDisplay-600.woff2" },
  { family: "Playfair Display", weight: 700, file: "assets/fonts/PlayfairDisplay-700.woff2" },
  { family: "Cinzel", weight: 600, file: "assets/fonts/Cinzel-600.woff2" },
  { family: "Cinzel", weight: 700, file: "assets/fonts/Cinzel-700.woff2" },
  { family: "Cormorant Garamond", weight: 600, file: "assets/fonts/CormorantGaramond-600.woff2" },
  { family: "Cormorant Garamond", weight: 600, italic: true, file: "assets/fonts/CormorantGaramond-600-Italic.woff2" },
  { family: "JetBrains Mono", weight: 400, file: "assets/fonts/JetBrainsMono-400.woff2" },
  { family: "JetBrains Mono", weight: 500, file: "assets/fonts/JetBrainsMono-500.woff2" }
];

export const FONT_FAMILY_OPTIONS = ["Playfair Display", "Cinzel", "Cormorant Garamond", "JetBrains Mono"];

import { state } from './state.js';

let _registerPromise = null;

/** Register every family with the document once; resolve with loaded count. */
export function initWebfonts() {
  if (_registerPromise) return _registerPromise;
  _registerPromise = (async () => {
    if (typeof document === "undefined" || typeof window === "undefined") return 0;
    let loaded = 0;
    await Promise.allSettled(SELF_HOSTED_FONTS.map(async entry => {
      const face = new FontFace(entry.family, `url(${entry.file})`, {
        weight: String(entry.weight),
        style: entry.italic ? "italic" : "normal"
      });
      const loadedFace = await face.load();
      document.fonts.add(loadedFace);
      loaded++;
    }));
    return loaded;
  })();
  return _registerPromise;
}

let _dataUrlsPromise = null;

/**
 * Data URLs for @font-face embedding in the PDF-facing SVG skeleton.
 * Computed lazily (one fetch per file, self-origin only) and cached forever —
 * the payloads never change. Reads from base before preload rewriting / SW.
 */
function b64FromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Fetch and base64 each woff2 once (self-origin only); fills the sync cache. */
export async function preloadFontDataUrls() {
  if (_preload) return _preload;
  _preload = (async () => {
    const results = await Promise.allSettled(SELF_HOSTED_FONTS.map(async entry => {
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(res.statusText);
      return {
        family: entry.family,
        weight: entry.weight,
        italic: Boolean(entry.italic),
        dataUrl: `data:font/woff2;base64,${b64FromBuffer(await res.arrayBuffer())}`
      };
    }));
    _cache = results.map(r => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
    _listeners.forEach(fn => { try { fn(); } catch (_) {} });
    return _cache.length;
  })();
  return _preload;
}

let _preload = null;
let _cache = null;
const _listeners = new Set();

/** Synchronously readable data URLs once preload has finished; [] before that. */
export function cachedFontDataUrls() {
  return _cache || [];
}

/** Register a callback fired when embedding data first becomes available. */
export function onFontsEmbedReady(fn) {
  if (_cache) fn();
  else _listeners.add(fn);
}
/** Families actually referenced by the current design, intersected with ours. */
export function usedSelfHostedFamilies() {
  const families = new Set();
  const ours = new Set(SELF_HOSTED_FONTS.map(f => f.family));
  (state.elements || []).forEach(e => {
    if (e && e.type === "text" && ours.has(e.font)) families.add(e.font);
  });
  return families;
}
