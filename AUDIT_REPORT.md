# CertiForge V0.2 — Code Audit Report

## Scope checked

The V0.1 codebase was reviewed across the complete intended workflow:

Template → Design → Participant import → Mapping → Preview → PDF generation → ZIP export → Project save/open

## Material problems found in V0.1

1. **PDF export used `jsPDF.addImage(..., "SVG")` directly.** This is not a reliable jsPDF image path in the supplied build and could fail at runtime.
2. **Saved project edits were discarded on import.** `loadProjectFile()` restored the elements, but `loadTemplate()` immediately replaced them with template defaults.
3. **Open Project had no visible UI action.** A hidden file input existed but users could not reach it from the interface.
4. **Spreadsheet values were inserted into `innerHTML` without escaping.** A crafted cell/column value could inject markup.
5. **Preview font scaling was dimensionally incorrect.** Font size was converted to an oversized percentage rather than scaled from the certificate coordinate system.
6. **Missing participant names could still enter generation.** This could create blank/invalid certificates.
7. **Duplicate filenames could overwrite each other inside ZIP output.**
8. **Conference-wide fields were awkward.** Event/date/venue had to be supplied through participant rows or mappings rather than once per project.
9. **Custom logos/signatures were not actually supported.**
10. **Editor positioning required numeric entry.** No direct dragging was available.

## V0.2 corrections

- Replaced PDF route with: **SVG → browser canvas at configurable scale → PNG → jsPDF PDF**.
- Project import now preserves saved element edits and local image data.
- Added **Open** to the top bar.
- Escaped spreadsheet data and column names before HTML rendering.
- Corrected editor font scaling using the live canvas width.
- Added drag positioning for editable text and images.
- Added local PNG/JPG/WebP/SVG upload for logos and signatures.
- Added conference-wide **Event, Date, Venue, Organization** values.
- Added arbitrary spreadsheet tokens, e.g. `Registration ID` → `{{REGISTRATION_ID}}`.
- Reserved variables only use spreadsheet values when explicitly mapped.
- Generation skips rows without `NAME`.
- Duplicate filenames receive `_2`, `_3`, etc.
- Added Standard / High / Very High PDF raster quality.
- CSV has a native parser, so CSV still works if SheetJS fails to load.
- JSZip 3.10.1 is bundled locally.
- Imported project images are restricted to local `data:image/...` sources to avoid external-image loading from a project file.

## Tests performed

### Passed

- JavaScript syntax check for every file with Node.js.
- Automatic field mapping (`Participant Name` → `NAME`, `Role` → `ROLE`).
- Conference-wide field fallback.
- Arbitrary spreadsheet-token resolution.
- CSV quoted-field parsing, including commas and escaped quotes.
- Missing-name validation.
- Project re-import preserving edited elements and settings.
- SVG string generation with participant/global variables.
- Generation logic skipping invalid rows.
- Duplicate filename de-confliction.
- Static server serving the application files correctly.

### Environment limitation

A full Chromium headless UI run could not be completed in this container because the installed Chromium process did not complete headless startup. Therefore the browser-interaction layer should still receive one manual smoke test in Chrome/Edge after deployment, specifically:

- drag an element
- upload an image
- import XLSX
- generate one PDF
- generate a small ZIP batch

The underlying JavaScript/data/generation paths above were tested independently.

## Remaining engineering work

V0.2 is a usable functional prototype, not yet a production SaaS. Priority next items are:

- resize handles and alignment guides
- undo/redo
- layer ordering
- embedded/local SheetJS and jsPDF dependencies
- font embedding / custom fonts
- QR verification architecture
- IndexedDB autosave
- large-batch memory optimization
- automated browser tests in CI
- accessibility pass
