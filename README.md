# CertiForge

**CertiForge — Certificate Studio** is a privacy-first, client-side bulk certificate designer and generator.

It is designed for conferences, workshops, CME/CPD programs, universities, seminars, webinars, competitions and institutional events.

## Core workflow

1. Choose a template
2. Customize editable elements
3. Upload XLSX/XLS/CSV
4. Map spreadsheet columns to certificate variables
5. Preview a participant
6. Configure certificate numbering
7. Generate individual PDFs
8. Download all PDFs as one ZIP

## GitHub Pages

This is a static web application and can be hosted on GitHub Pages.

### Deploy

1. Create a GitHub repository, e.g. `certiforge`.
2. Upload this repository.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.
7. GitHub will publish the site.

## Privacy

The participant spreadsheet is parsed in the browser. CertiForge V0.2 does not require a backend or participant database.

## Dependencies

The prototype uses SheetJS and jsPDF from pinned CDN URLs. JSZip 3.10.1 is bundled locally in `vendor/`. CSV parsing works natively without SheetJS.

For a production release, bundle SheetJS and jsPDF locally as well if their licenses/distribution terms are acceptable for the chosen release model.

## Current scope

This is the first functional vertical slice. It intentionally prioritizes the full workflow over a fully polished Canva-like editor.

### Implemented

- Template selection
- Four starter templates
- Data-driven template definitions
- Dynamic variables
- Text editing plus direct drag positioning
- XLSX/XLS/CSV import
- Automatic column mapping
- Manual mapping
- Data preview
- Certificate numbering
- PDF generation
- Bulk generation
- ZIP export
- Local-first participant processing
- Project export/import with design edits retained
- Logo/signature/image upload
- Conference-wide event/date/venue/organization fields
- Arbitrary spreadsheet columns available as template tokens
- Missing-name rows skipped during generation
- Duplicate output filenames de-conflicted
- Safer spreadsheet HTML rendering
- High-resolution SVG → canvas → PNG → PDF rendering

### Next engineering milestones

- Resize handles
- SVG assets
- QR verification
- More templates
- Font management
- Undo/redo
- IndexedDB project storage
- PWA/offline support
- Better PDF font embedding
- Large-batch performance improvements
- Automated tests
- Accessibility audit

## License

Choose a license before public distribution. MIT is a reasonable default for an open-source version, subject to the licenses of bundled dependencies/assets.
