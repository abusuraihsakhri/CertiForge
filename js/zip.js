// PDFs deflate their own streams; re-compressing them at level 6 is wasted CPU.
export async function makeZip(files) {
  if (typeof window === 'undefined' || !window.JSZip) throw new Error("ZIP support could not load. Reload the page and try again.");
  const zip = new window.JSZip();
  (files || []).filter(f => f && f.blob).forEach(f => zip.file(f.name, f.blob));
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
