/**
 * Progress reporting for batch generation. Lives outside ui.js so the
 * generation core does not import the view layer (layering fix).
 */
export function updateGenerationProgress(done, total, startTime) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeDone = Math.max(0, Number(done) || 0);
  const pct = Math.min(100, Math.round(safeDone / safeTotal * 100));
  const b = document.getElementById("progressBar");
  const t = document.getElementById("progressText");
  if (b) b.style.width = pct + "%";
  if (t && startTime) {
    const elapsed = (performance.now() - startTime) / 1000;
    const rate = safeDone / Math.max(elapsed, 0.001);
    const remaining = rate > 0 ? Math.round((safeTotal - safeDone) / rate) : 0;
    t.textContent = `Generated ${safeDone} of ${safeTotal} (${pct}%)${remaining > 1 ? ` — ~${remaining}s remaining` : ''}`;
  }
}
