import { state } from './state.js';
import { mappedRows } from './mapping.js';
import { renderCertificateSVG, svgToPdf } from './pdf.js';
import { resolveText, formatId, computeVerificationSignature } from './variables.js';
import { safeFilename, toast } from './utils.js';
import { batchYieldEvery } from './config.js';
import { updateGenerationProgress } from './ui.js';

export async function generateAll() {
  const source = mappedRows();
  const rows = source.filter(r => String(r.NAME || "").trim());
  if (!rows.length) throw new Error("No valid participant names were found. Map the NAME field before generating certificates.");

  const results = [], registry = [], usedNames = new Map();
  const startTime = performance.now();

  for (let i = 0; i < rows.length; i++) {
    const svg = renderCertificateSVG(rows[i], i);
    const blob = await svgToPdf(svg);
    let filename = safeFilename(resolveText(state.settings.filename, rows[i], i).replace(/\.pdf$/i, "")) || `certificate-${i + 1}`;
    const key = filename.toLowerCase();
    const count = (usedNames.get(key) || 0) + 1;
    usedNames.set(key, count);
    if (count > 1) filename += `_${count}`;
    results.push({ name: filename + ".pdf", blob });

    const certId = formatId(Number(state.certificate.start) + i);
    const sig = computeVerificationSignature({
      id: certId,
      name: rows[i].NAME,
      event: rows[i].EVENT,
      date: rows[i].DATE,
      organization: rows[i].ORGANIZATION
    }, state.settings?.verifySecret);

    registry.push({
      id: certId,
      name: rows[i].NAME,
      role: rows[i].ROLE || "",
      event: rows[i].EVENT || "",
      date: rows[i].DATE || "",
      organization: rows[i].ORGANIZATION || "",
      sig: sig,
      filename: filename + ".pdf"
    });

    updateGenerationProgress(i + 1, rows.length, startTime, rows.length);

    if ((i + 1) % batchYieldEvery === 0) {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    }
  }
  state.generated = results;
  state.registry = registry;
  return { files: results, skipped: source.length - rows.length, registry };
}
