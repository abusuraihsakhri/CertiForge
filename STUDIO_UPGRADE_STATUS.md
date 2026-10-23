# CertiForge Studio 2.0 Upgrade — Status Handoff

Written 2026-10-23 before a PC restart. Source spec: `certiforge_studio_upgrade_blueprint_code.md`.
Approved plan: `C:\Users\abusu\.commandcode\plans\certiforge-studio-upgrade.md`.
Task ledger: tasks #22–#26 (all completed except final verification pass = #26, currently in_progress).

## CURRENT STATE: All features implemented. Both test suites pass.

Last verified:
- `npm test` → PASS (30 sections, incl. new section 26: auto-fit, title-case, folder tokens, schema)
- `node node_modules/@playwright/test/cli.js test tests/e2e/studio.spec.js` → 4/4 PASS
- Earlier full runs: boot.spec, shell.spec, editor.spec, flow.spec all PASS with ZERO spec changes.
- STILL TO DO AFTER RESTART: run the ENTIRE e2e suite in one go (`node node_modules/@playwright/test/cli.js test`) + portal.spec, then final report. Nothing else pending.

## What was built (by feature)

### 1. Persistent 3-pane Studio shell (blueprint Phase 1)
- `index.html`: added `css/studio.css` link; left rail (`#railSections`) gets 3 static sections: CSV VARIABLES (+ Clean Case button), CANVAS LAYERS (`#elementList`, insert buttons, file inputs), SIGNATURE CLEANER (upload, ink swatches, threshold slider). Theme-color meta → #f6f7fb.
- `js/ui.js` REWRITTEN: `#app` becomes persistent `.studio-layout` (center + right inspector). Center = floating canvas-toolbar (undo/redo/align/zoom, bound ONCE), `.canvas-viewport` (permanently mounted `#editorCanvas` + `#previewStage/#previewSheet`), floating record scrubber, `.studio-drawer` (step content). Steps render into drawer/gallery, never nuke the shell. Templates gallery fills center (canvas hidden). Project rename is now inline contenteditable on `#topProjectName`.
- `css/studio.css` NEW: dot-grid viewport, glass scrubber, rail sections, var pills, ink swatches, autofit telemetry (amber/red states), drawer slim mode, `#app:has(> .studio-layout)` full-bleed, ≤1100px stack.
- `js/studio.js` NEW: rail refresh, Clean Case handler, signature cleaner wiring, scrubber controller (`goToRecord`, `jumpToLongestName/ShortestName`), `bindStudioChrome`, `setScrubberRepaint` callback into ui.js `repaintCurrentRecord()` (works on every step).

### 2. Smart auto-fit engine (blueprint Phase 2)
- `js/measure.js` NEW (shared `textRunWidth` + estimate fallback; pdf.js re-exports it).
- `js/autofit.js` NEW: `fitFontSize()` binary search; returns `{fontSize, shrunk, overflowed, measuredWidth}`.
- Text elements gain `autoFit` + `fitMin` (schema: security.js allowlist updated; persisted in projects).
- Editor DOM: canvas.js computes fit per record, drives `#autofitTelemetry` (✓ fits / ✨ shrunk / ⚠ overflow).
- PDF: pdf.js `textFragment()` fits per record BEFORE wrap — batches can't clip long names.
- Inspector: toggle + Min size + telemetry + "Snap horizontal center" button. NOTE: `propAutoFit`/`propFitMin` wired separately from `ids` map (this was one of the bugs found).

### 3. Record scrubber (blueprint Phase 2)
- Floating glass pill: ◀ ▶ Row i/N + name, ⚡ Longest, Shortest. Visible on editor/preview/data steps when rows+NAME mapping exist. Drives `state.sampleIndex`.
- **Key learning**: `mappedRows()` re-keys columns to tokens — scan `r.NAME`, NOT `r[mappings.NAME]` (raw header key is undefined on generation rows).

### 4. Academic title-case sanitizer
- `utils.js` `toAcademicTitleCase()` — PRESERVED_ACRONYMS now a Map with display forms: PHD→PhD, MCH→MCh, etc. (blueprint's uppercase "PHD" output was wrong). Case-insensitive replace.
- Left rail "Clean Case ✨" mutates `state.rows`' mapped NAME column, markDirty, live repaint. Unit-tested.

### 5. Signature background remover (blueprint Phase 3)
- `js/signature.js` NEW: `processSignatureImage()` (luminance threshold + pow-0.7 alpha feather + ink re-tint), `loadImage`, `canvasToPngDataUrl`. 1600px cap.
- `editor.js` `addCleanedSignature(dataUrl, name)` → image layer, aspect-ratio probe, SAFE_IMAGE_DATA validated.
- Rail wiring: threshold slider + ink swatches re-tint the bound layer live.

### 6. Self-hosted ceremonial fonts (design decision)
- Google-Fonts families can't survive the PDF path (SVG-as-img + CSP connect-src 'self'), so: `assets/fonts/*.woff2` (8 files, SIL OFL, downloaded: Playfair Display 600/700, Cinzel 600/700, Cormorant Garamond 600 + 600italic, JetBrains Mono 400/500).
- `js/webfonts.js` NEW: `SELF_HOSTED_FONTS`, `initWebfonts()` (FontFace at boot), `preloadFontDataUrls()`/`cachedFontDataUrls()` (sync cache for SVG defs), `onFontsEmbedReady` → pdf.js clears skeleton cache when binaries land.
- pdf.js `buildSvgSkeleton` embeds @font-face defs for USED families only. Editor font dropdown gets all 4 families.

### 7. Roadmap extras (blueprint Section 5)
- **Folder-token filenames**: generator.js splits filename pattern on `/`, sanitizes each segment via safeFilename (kills `..`, backslashes). `{{ROLE}}/{{CERTIFICATE_ID}}_{{NAME}}.pdf` works; JSZip nests. Unit-tested via real generateAll.
- **Print-shop master PDF**: generator.js `buildMasterPdf({onProgress})` — one multi-page jsPDF, shared static layer, aborts on failed record. UI: "merged PDF" checkbox in Generate settings (`settings.mergedPdf`, sanitized), "BUILD PRINT-SHOP MASTER PDF" button in result card with % progress.

### 8. Misc
- `theme.js` + index meta: theme-color now matches tokens (#0f172a/#f6f7fb).
- `sw.js`: CACHE → `certiforge-v1.0.1`, package.json version → 1.0.1 (repo convention: cache tied to package version; logic test #19 enforces match), ASSETS += studio.css, measure/autofit/studio/signature/webfonts js, 8 woff2.
- `js/ui.js` also wires preview scrubber (`_previewRows`, `showPreviewRecord`), generate drawer = full original generate markup + new controls, all legacy IDs preserved.

## Files created
`js/measure.js`, `js/autofit.js`, `js/signature.js`, `js/webfonts.js`, `js/studio.js`, `css/studio.css`, `assets/fonts/` (8 woff2), `tests/e2e/studio.spec.js`.

## Files modified
`index.html`, `js/ui.js` (rewrite), `js/editor.js`, `js/canvas.js`, `js/pdf.js`, `js/generator.js`, `js/state.js`, `js/security.js`, `js/utils.js`, `js/theme.js`, `sw.js`, `package.json`, `tests/logic.test.js` (section 26).

## Bugs found & fixed during verification
1. gallery/viewport hidden flags inverted in renderStep (gallery must show ONLY on templates).
2. Scrubber jump scanned `r[mappings.NAME]` → empty strings (mappedRows re-keys to tokens). Fixed to `r.NAME`.
3. `propAutoFit`/`propFitMin` had no event listeners (outside `ids` map) — wired separately.
4. Blueprint's title-case output "PHD" → proper "PhD" via display-form Map + case-insensitive replace.
5. Two spec-assert bugs in studio.spec (34-char scrubber truncation; unquoted comma in test CSV).

## Remaining after restart
1. Full e2e: `node node_modules/@playwright/test/cli.js test` (all specs incl. portal.spec) — expect green; studio.spec already 4/4.
2. `npm test` re-run (already passed post-fix).
3. Optional cleanup: delete scratchpad debug script reference (lives outside repo, no action needed); consider README/docs blurb about new features (NOT in approved plan — ask user).
4. Final summary + goal-complete with evidence.

## Verification commands
```
npm test
node node_modules/@playwright/test/cli.js test
```
Dev server for manual check: `node tests/e2e/server.mjs` → http://localhost:4173

---

## Phase 6 — 100 procedural preset templates (2026-10-23)

Source spec: `100_certificate_templates_library_engine.md`. The spec's canvas draw code was adapted to the app's native element schema (rect/polygon/circle/text/qr) so presets work in the DOM editor, SVG/PDF pipeline, project files, and 3-pane studio without new raster assets.

### Added
- `js/preset-templates.js` — `PRESET_CATEGORIES` (10), `PRESET_TEMPLATES` (tpl-001…tpl-100), `buildPresetTemplate()`, `buildPresetTemplates()`. Ten archetype element generators (classic double, academic pillars, Swiss spine, tech circuit, filigree, executive ribbon, minimal Nordic, guilloché, modern diagonal, medallion) plus vector seals (starburst + ribbons). Every preset has an auto-fit `{{NAME}}` layer, `{{VERIFY_URL}}` QR, certificate-id layer, header/subtext, role/details, signature line. Zero image elements; fonts restricted to the self-hosted families + Arial.
- `js/templates.js` — presets append to the template catalog (113 total), while `curatedTemplates` keeps the gallery at exactly 13. `knownTemplateIds()`, `getTemplate()`, project save/load and PDF export therefore treat presets as first-class templates.
- `js/ui.js` — new preset library section in the Templates step: category chips (`data-preset-cat`), `.preset-card` grid, live count pill, confirm-on-dirty, apply → editor. Curated cards/selectors unchanged (`.template-card` = 13).
- `css/studio.css` — preset library/card styles + dark theme + 2-column mobile grid.
- `tests/e2e/preset.spec.js` — 2 specs (library counts/filters; apply → editable design, auto-fit inspector, gallery still 13).
- `tests/logic.test.js` section 27 — catalog invariants, element schema, SVG/PDF render of tpl-001/020/081 (shapes, auto-fit shrink), project round-trip.

### Bugs found & fixed during this phase (pre-existing studio shell regressions)
1. `renderStep()` had the canvas viewport hidden on every step except Templates (`viewport.hidden = !isTemplates`), so the live design canvas was invisible. Now `viewport.hidden = isTemplates`.
2. `.canvas-viewport > .canvas-stage` was a zero-width flex item, collapsing the canvas to 0×0 even when visible. Gave stages `width:100%; flex:1 1 auto`.
3. `hidden` attributes on `.canvas-stage` / `.canvas-viewport` were overridden by their `display:flex` class rules, painting both editor and preview stages side by side. Added explicit `[hidden]{display:none}` rules.
4. Left-rail sections overlapped at shorter viewports (Signatures painted over Layers, intercepting clicks). Fixed sections are now non-shrinking; layers pane has `min-height:180px` with internal scrolling; rail scrolls as a whole.

### Version / cache
- `package.json` 1.0.2; `sw.js` cache `certiforge-v1.0.2`; `./js/preset-templates.js` precached. README feature list updated.

### Verified (2026-10-23)
- `npm test` → PASS (31 sections)
- `node node_modules/@playwright/test/cli.js test` → 22/22 PASS (all specs incl. new preset.spec)
- Manual screenshots of tpl-001/009/020/043/053/081/100 at 1440×900: frames, typography, seals, guilloché and dark palettes render correctly; rail no longer overlaps.
