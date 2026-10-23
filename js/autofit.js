import { textRunWidth } from './measure.js';

/**
 * Binary-search smart auto-fit: finds the largest font size in
 * [fitMin, size] (size = target/max size, fitMin = floor) whose rendered
 * width fits inside maxWidth. Returns per-render telemetry consumed by the
 * editor inspector:
 *   - shrunk:     the sample needed less than the preferred size
 *   - overflowed: even the floor size overflows (text will wrap instead)
 */
export function fitFontSize({ text, font, weight = 400, size, fitMin = 14, maxWidth }) {
  const raw = String(text ?? "");
  const maxSize = Math.max(4, Math.min(400, Number(size) || 16));
  const minSize = Math.max(4, Math.min(maxSize, Number(fitMin) || 14));
  const boxW = Math.max(0, Number(maxWidth) || 0);

  if (!raw || !boxW) {
    return { fontSize: maxSize, shrunk: false, overflowed: false, measuredWidth: Math.round(textRunWidth(raw, font, maxSize, weight)) };
  }

  // Fast path: the preferred size already fits.
  if (textRunWidth(raw, font, maxSize, weight) <= boxW) {
    return {
      fontSize: maxSize,
      shrunk: false,
      overflowed: false,
      measuredWidth: Math.round(textRunWidth(raw, font, maxSize, weight))
    };
  }

  let low = minSize;
  let high = maxSize;
  let bestFit = minSize;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (textRunWidth(raw, font, mid, weight) <= boxW) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const finalWidth = textRunWidth(raw, font, bestFit, weight);
  return {
    fontSize: bestFit,
    shrunk: bestFit < maxSize,
    overflowed: finalWidth > boxW,
    measuredWidth: Math.round(finalWidth)
  };
}
