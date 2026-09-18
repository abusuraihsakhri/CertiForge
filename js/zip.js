import { safeFilename } from './utils.js';

export async function makeZip(files) {
  if (!window.JSZip) throw new Error("ZIP support could not load.");
  const zip = new JSZip();
  files.forEach(f => zip.file(f.name, f.blob));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
