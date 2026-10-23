const hexToRgb = (hex) => {
  const num = parseInt(String(hex || "#0f172a").replace("#", ""), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

/**
 * Client-side wet-signature background remover.
 *
 * Takes an image element containing a photo/scan of an ink signature on paper
 * and returns a transparent PNG canvas: pixels at or above the luminance
 * threshold become fully transparent paper; ink strokes are re-tinted to the
 * chosen ink color with an anti-aliased alpha feather so strokes keep their
 * softness. The returned canvas can be embedded as a normal image layer
 * (callers serialize to a PNG data URL and validate it against the shared
 * image allowlist before adding it to the project).
 */
export function processSignatureImage(imgElement, threshold = 165, inkHex = "#0f172a") {
  const offCanvas = document.createElement("canvas");
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;
  if (!w || !h) throw new Error("The signature image could not be read.");

  // Very tall phone photos are scaled down so the cleaned layer stays small.
  const scale = Math.min(1, 1600 / Math.max(w, h));
  offCanvas.width = Math.max(1, Math.round(w * scale));
  offCanvas.height = Math.max(1, Math.round(h * scale));

  const offCtx = offCanvas.getContext("2d");
  offCtx.drawImage(imgElement, 0, 0, offCanvas.width, offCanvas.height);

  const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
  const data = imgData.data;
  const ink = hexToRgb(inkHex);
  const lim = Math.max(40, Math.min(230, Number(threshold) || 165));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] === 0) continue;

    // Perceived luminance (ITU-R BT.601).
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= lim) {
      // Paper background → fully transparent.
      data[i + 3] = 0;
    } else {
      // Ink stroke → re-tint with smooth anti-aliased alpha.
      const normalizedDarkness = (lim - lum) / lim;
      const smoothAlpha = Math.min(255, Math.round(Math.pow(normalizedDarkness, 0.7) * 255));
      data[i] = ink.r;
      data[i + 1] = ink.g;
      data[i + 2] = ink.b;
      data[i + 3] = smoothAlpha;
    }
  }

  offCtx.putImageData(imgData, 0, 0);
  return offCanvas;
}

export function canvasToPngDataUrl(canvas) {
  return canvas.toDataURL("image/png");
}

/** Load a data-URL/blob/file-path image into an <img> element (promise based). */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Signature image could not be decoded."));
    img.src = src;
  });
}
