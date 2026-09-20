export function getQRInstance(text, errorCorrection = 'M') {
  const qrFn = (typeof window !== 'undefined' && window.qrcode) || (typeof global !== 'undefined' && global.qrcode);
  if (!qrFn) return null;
  try {
    const qr = qrFn(0, errorCorrection);
    qr.addData(String(text ?? ''));
    qr.make();
    return qr;
  } catch (e) {
    console.warn("QR code generation error:", e);
    return null;
  }
}

export function generateQR(text, size = 200) {
  const qr = getQRInstance(text, 'M');
  if (qr) {
    const moduleCount = qr.getModuleCount();
    const margin = 2;
    const cellSize = Math.max(2, Math.floor(size / (moduleCount + margin * 2)));
    return qr.createSvgTag(cellSize, margin);
  }

  // Fallback if vendor library is unavailable
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><rect x="8" y="8" width="${size - 16}" height="${size - 16}" fill="none" stroke="#ccc" stroke-dasharray="4"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="12" fill="#888">QR Code</text></svg>`;
}

export function generateQRDataUrl(text, size = 200) {
  const qr = getQRInstance(text, 'M');
  if (qr) {
    const moduleCount = qr.getModuleCount();
    const margin = 2;
    const cellSize = Math.max(4, Math.floor(size / (moduleCount + margin * 2)));
    return qr.createDataURL(cellSize, margin);
  }

  const svg = generateQR(text, size);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
