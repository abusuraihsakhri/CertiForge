/**
 * Multi-select alignment geometry. Pure math — no DOM, no state — so the
 * align/distribute behavior is unit-testable and the editor wiring stays thin.
 *
 * CertiForge anchors differ by element type: text/image/qr (and circles) are
 * CENTER-anchored (x/y mark the center), rect shapes are CORNER-anchored
 * (x/y mark the top-left). elementBounds normalizes both into page-space
 * boxes; the returned patches use each element's own anchor convention.
 */

export function elementBounds(e) {
  const x = Number(e.x) || 0, y = Number(e.y) || 0;
  if (e.type === "shape") {
    if (e.shape === "circle") {
      const r = Number(e.r) || 0;
      const cx = Number(e.cx) || 0, cy = Number(e.cy) || 0;
      return { left: cx - r, right: cx + r, top: cy - r, bottom: cy + r, width: r * 2, height: r * 2, centerAnchor: true };
    }
    const w = Number(e.w) || 0, h = Number(e.h) || 0;
    return { left: x, right: x + w, top: y, bottom: y + h, width: w, height: h, centerAnchor: false };
  }
  const w = Number(e.w) || 0, h = Number(e.h) || 0;
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2, width: w, height: h, centerAnchor: true };
}

function anchorX(box, left) {
  return box.centerAnchor ? left + box.width / 2 : left;
}
function anchorY(box, top) {
  return box.centerAnchor ? top + box.height / 2 : top;
}

/**
 * Compute alignment patches for a set of elements.
 * mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' |
 *       'dist-h' | 'dist-v'
 * Returns [{ id, x, y }] — anchor coordinates for each element. Only the
 * moved axis changes; the other axis passes through unchanged.
 */
export function computeAlign(els, mode) {
  if (!Array.isArray(els) || els.length < 2) return [];
  const items = els.map(e => ({ e, b: elementBounds(e) }));
  const lefts = items.map(o => o.b.left);
  const rights = items.map(o => o.b.right);
  const tops = items.map(o => o.b.top);
  const bottoms = items.map(o => o.b.bottom);
  const minLeft = Math.min(...lefts), maxRight = Math.max(...rights);
  const minTop = Math.min(...tops), maxBottom = Math.max(...bottoms);
  const midX = (minLeft + maxRight) / 2;
  const midY = (minTop + maxBottom) / 2;

  const patch = (o, x, y) => ({ id: o.e.id, x: Math.round(x), y: Math.round(y) });

  switch (mode) {
    case "left":
      return items.map(o => patch(o, anchorX(o.b, minLeft), o.e.y ?? o.e.cy));
    case "hcenter":
      return items.map(o => patch(o, o.b.centerAnchor ? midX : midX - o.b.width / 2, o.e.y ?? o.e.cy));
    case "right":
      return items.map(o => patch(o, anchorX(o.b, maxRight - o.b.width), o.e.y ?? o.e.cy));
    case "top":
      return items.map(o => patch(o, o.e.x ?? o.e.cx, anchorY(o.b, minTop)));
    case "vcenter":
      return items.map(o => patch(o, o.e.x ?? o.e.cx, o.b.centerAnchor ? midY : midY - o.b.height / 2));
    case "bottom":
      return items.map(o => patch(o, o.e.x ?? o.e.cx, anchorY(o.b, maxBottom - o.b.height)));
    case "dist-h": {
      // Sort by current left edge; outermost boxes stay put, inner boxes get
      // evenly spaced left edges between them.
      const sorted = [...items].sort((a, b) => a.b.left - b.b.left);
      const start = sorted[0].b.left;
      const span = sorted[sorted.length - 1].b.right - start;
      const widths = sorted.map(o => o.b.width);
      const totalW = widths.reduce((s, w) => s + w, 0);
      const gap = sorted.length > 1 ? (span - totalW) / (sorted.length - 1) : 0;
      return sorted.map((o, i) => {
        if (i === 0 || i === sorted.length - 1) return patch(o, o.e.x ?? o.e.cx, o.e.y ?? o.e.cy);
        let left = start;
        for (let j = 0; j < i; j++) left += widths[j] + gap;
        return patch(o, anchorX(o.b, left), o.e.y ?? o.e.cy);
      });
    }
    case "dist-v": {
      const sorted = [...items].sort((a, b) => a.b.top - b.b.top);
      const start = sorted[0].b.top;
      const span = sorted[sorted.length - 1].b.bottom - start;
      const heights = sorted.map(o => o.b.height);
      const totalH = heights.reduce((s, h) => s + h, 0);
      const gap = sorted.length > 1 ? (span - totalH) / (sorted.length - 1) : 0;
      return sorted.map((o, i) => {
        if (i === 0 || i === sorted.length - 1) return patch(o, o.e.x ?? o.e.cx, o.e.y ?? o.e.cy);
        let top = start;
        for (let j = 0; j < i; j++) top += heights[j] + gap;
        return patch(o, o.e.x ?? o.e.cx, anchorY(o.b, top));
      });
    }
    default:
      return [];
  }
}
