import { escapeHTML } from './utils.js';

function qrEncode(text, errorCorrection = 'M') {
  const type = 4;
  const ecLevels = { L: 1, M: 0, Q: 3, H: 2 };
  const ec = ecLevels[errorCorrection] ?? 0;

  const dataBytes = new TextEncoder().encode(text);
  const dataLen = dataBytes.length;
  const totalCodewords = 26;
  const ecCodewords = [7, 10, 15, 20][ec];
  const dataCodewords = totalCodewords - ecCodewords;

  const bits = [];
  bits.push(0, 1, 0, 0);
  const lenBits = dataLen.toString(2).padStart(8, '0');
  for (const b of lenBits) bits.push(Number(b));

  for (const byte of dataBytes) {
    const byteBits = byte.toString(2).padStart(8, '0');
    for (const b of byteBits) bits.push(Number(b));
  }

  bits.push(0, 0, 0, 0);
  while (bits.length % 8 !== 0) bits.push(0);

  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    bytes.push(byte);
  }

  while (bytes.length < dataCodewords) {
    bytes.push(bytes.length % 2 === 0 ? 236 : 17);
  }

  return bytes;
}

export function generateQR(text, size = 200) {
  const moduleCount = 21;
  const modules = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(null));

  const setModule = (r, c, val) => {
    if (r >= 0 && r < moduleCount && c >= 0 && c < moduleCount) modules[r][c] = val;
  };

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i < 7 && j < 7) {
        setModule(i, j, i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        setModule(i, moduleCount - 1 - j, i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        setModule(moduleCount - 1 - i, j, i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
      }
    }
  }

  for (let i = 8; i < moduleCount - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  let bitIdx = 0;
  for (let c = moduleCount - 1; c >= 0; c -= 2) {
    if (c === 6) c = 5;
    for (let r = 0; r < moduleCount; r++) {
      for (let dc = 0; dc < 2; dc++) {
        const col = c - dc;
        if (modules[r][col] === null) {
          const mask = ((r + col) % 3 === 0);
          const bit = (bitIdx < text.length * 8) ? ((text.charCodeAt(Math.floor(bitIdx / 8)) >> (7 - bitIdx % 8)) & 1) : 0;
          setModule(r, col, bit ^ mask);
          bitIdx++;
        }
      }
    }
  }

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c] === null) setModule(r, c, 0);
    }
  }

  const quiet = 4;
  const totalModules = moduleCount + quiet * 2;
  const scale = size / totalModules;

  let paths = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        const x = (c + quiet) * scale;
        const y = (r + quiet) * scale;
        paths += `M${x},${y}h${scale}v${scale}h${-scale}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${paths}" fill="#000000"/></svg>`;
}

export function generateQRDataUrl(text, size = 200) {
  const svg = generateQR(text, size);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
