/**
 * Shared text measurement for the editor canvas DOM renderer, the SVG/PDF
 * renderer and the auto-fit engine. Uses a real Canvas2D context when the
 * embedded fonts are known to the document (custom uploads register through
 * document.fonts), and falls back to a fixed-width estimate otherwise.
 */
let _measureCtx = null;
export function measureCtx() {
  if (_measureCtx === null) {
    _measureCtx = false;
    try {
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        const m = c.getContext && c.getContext('2d');
        if (m && typeof m.measureText === 'function') _measureCtx = m;
      }
    } catch (_) { /* estimation fallback */ }
  }
  return _measureCtx || null;
}

export function estimateWidth(text, size) {
  return [...String(text)].length * size * 0.52;
}

export function textRunWidth(text, font, size, weight) {
  const m = measureCtx();
  if (m) {
    try {
      m.font = `${Number(weight) || 400} ${size}px "${font}", ${font}, sans-serif`;
      const w = m.measureText(text).width;
      if (Number.isFinite(w) && w >= 0) return w;
    } catch (_) { /* fall through */ }
  }
  return estimateWidth(text, size);
}
