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

const SAFE_FONT_DATA_URL = /^data:(?:font\/(?:woff2?|truetype|opentype)|application\/(?:x-font-(?:ttf|otf|woff2?)|font-woff2?));base64,[A-Za-z0-9+/=]+$/;

ctx.onmessage = async function (e) {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'init') {
    currentTemplate = msg.template || null;
    currentFonts = Array.isArray(msg.fonts) ? msg.fonts : [];
    currentScale = Number(msg.scale) || 2;

    // Load any custom fonts into worker scope FontFaceSet if supported.
    // Only allow-listed data URLs are registered.
    if (currentFonts.length && typeof ctx.FontFace !== 'undefined' && ctx.fonts) {
      for (const font of currentFonts) {
        if (font && font.family && SAFE_FONT_DATA_URL.test(String(font.data || '').trim())) {
          try {
            const fontFace = new ctx.FontFace(font.family, `url(${String(font.data).trim()})`);
            const loaded = await fontFace.load();
            ctx.fonts.add(loaded);
          } catch (_) {
            // Font loading failures in worker shouldn't block rendering
          }
        }
      }
    }
    // Handshake: the pool only dispatches render tasks after this reply, so the
    // first certificates can never rasterize before custom fonts are registered.
    ctx.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'render') {
    const { id, svgString, width, height } = msg;
    try {
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not supported in Worker scope.');
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
