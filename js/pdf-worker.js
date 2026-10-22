/**
 * CertiForge v0.5 - Dedicated Web Worker for Certificate Rasterization
 *
 * Offloads CPU-intensive SVG rasterization to worker threads using OffscreenCanvas
 * and createImageBitmap. Posts {type:'ready'} after custom fonts are registered;
 * the pool only dispatches renders after that handshake.
 */

const ctx = typeof self !== 'undefined' ? self : globalThis;

let currentTemplate = null;
let currentFonts = [];
let currentScale = 2;
let staticBitmap = null;

ctx.onmessage = async function (e) {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    currentTemplate = msg.template || null;
    currentFonts = Array.isArray(msg.fonts) ? msg.fonts : [];
    currentScale = Number(msg.scale) || 2;

    // Decode the shared static artwork layer once per worker: per-record
    // renders then compose this bitmap under the dynamic text/QR layer
    // instead of re-decoding the full artwork for every certificate.
    staticBitmap = null;
    if (msg.staticPng) {
      try {
        staticBitmap = await createImageBitmap(new Blob([msg.staticPng], { type: 'image/png' }));
      } catch (_) {
        staticBitmap = null;
      }
    }

    // Load custom fonts into worker scope FontFaceSet if supported.
    // Payloads are blob URLs into the parent's font bytes — workers fetch the
    // SAME blob, so a batch never holds one base64 font copy per worker.
    const failedFonts = [];
    if (currentFonts.length && typeof ctx.FontFace !== 'undefined' && ctx.fonts) {
      for (const font of currentFonts) {
        if (!font || !font.family || !font.url) {
          if (font && font.family) failedFonts.push(String(font.family));
          continue;
        }
        try {
          const bytes = await (await fetch(font.url)).arrayBuffer();
          const fontFace = new ctx.FontFace(font.family, bytes);
          const loaded = await fontFace.load();
          ctx.fonts.add(loaded);
        } catch (_) {
          // Font loading failures in worker shouldn't block rendering, but the
          // organizer must hear that fallback fonts were used.
          failedFonts.push(String(font.family));
        }
      }
    }
    // Handshake: the pool only dispatches render tasks after this reply, so the
    // first certificates can never rasterize before custom fonts are registered.
    ctx.postMessage({ type: 'ready', failedFonts });
    return;
  }

  if (msg.type === 'render') {
    const { id, svgString, width, height } = msg;
    try {
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not supported in Worker scope.');
      }
      if (!staticBitmap) {
        throw new Error('Static artwork layer was not decoded in this worker.');
      }

      const s = currentScale || 2;
      const targetWidth = Math.round(width || (currentTemplate?.page?.width ? currentTemplate.page.width * s : 1684));
      const targetHeight = Math.round(height || (currentTemplate?.page?.height ? currentTemplate.page.height * s : 1190));

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const bitmap = await createImageBitmap(blob);

      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const canvasCtx = canvas.getContext('2d', { alpha: false });

      if (canvasCtx.imageSmoothingEnabled !== undefined) {
        canvasCtx.imageSmoothingEnabled = true;
        canvasCtx.imageSmoothingQuality = 'high';
      }

      const bg = currentTemplate?.background || '#ffffff';
      canvasCtx.fillStyle = bg;
      canvasCtx.fillRect(0, 0, targetWidth, targetHeight);
      canvasCtx.drawImage(staticBitmap, 0, 0, targetWidth, targetHeight);
      canvasCtx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }

      let buffer;
      if (typeof canvas.convertToBlob === 'function') {
        const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
        if (typeof pngBlob.arrayBuffer === 'function') {
          buffer = await pngBlob.arrayBuffer();
        } else if (typeof FileReaderSync !== 'undefined') {
          buffer = new FileReaderSync().readAsArrayBuffer(pngBlob);
        }
      }

      if (!buffer && typeof canvasCtx.getImageData === 'function') {
        const imgData = canvasCtx.getImageData(0, 0, targetWidth, targetHeight);
        buffer = imgData.data.buffer;
      }

      if (!buffer) {
        throw new Error('Canvas cannot export image data or PNG buffer.');
      }

      ctx.postMessage({ type: 'rendered', id, buffer }, [buffer]);
    } catch (err) {
      ctx.postMessage({ type: 'error', id, error: err?.message || String(err) });
    }
  }
};
