# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS and vanilla JavaScript modules.

## Users
Conference organizers, event managers, academics, and administrators who need to securely generate certificates in bulk while keeping participant data private.

## Product Purpose
CertiForge is a privacy-first, browser-based certificate studio. It allows users to design certificates, import participant spreadsheets, map data, and generate high-quality PDFs along with a cryptographic verification registry, entirely locally in the browser. Success means users can rapidly issue tamper-evident certificates without trusting a third-party server with PII.

## Positioning
A completely local-first architecture ensuring zero data leakage, combined with cryptographic verification (registry-backed) that does not require exposing a private signing secret on the verification portal.

## Operating Context
Users typically have an Excel or CSV file of participants. They work on a desktop/laptop (for UI complexity) to design the layout, map columns, and download a ZIP file of PDFs. They then publish the `verification-registry.json` next to the `verify.html` page on their own event website.

## Capabilities and Constraints
- Must remain a client-side only application (no backend).
- Uses standard Web APIs (Canvas, DOM, Web Workers) and bundled libraries (jsPDF, JSZip, SheetJS).
- Strict Content-Security-Policy (CSP) must be maintained.
- Cryptographic verification via SHA-256 digests matching a generated JSON registry.
- Must preserve existing functionality: Templates, Editor, Data Import, Mapping, Preview, and Generation.

## Brand Commitments
- Name: CertiForge
- Personality: Professional, secure, trustworthy, efficient.

## Evidence on Hand
- Existing `index.html` (the studio) and `verify.html` (the verification portal).
- Existing template definitions and generation logic.
- Built-in vendor libraries for PDF and Excel parsing.

## Product Principles
1. **Privacy Absolute**: Participant data never leaves the browser.
2. **Trust but Verify**: Cryptographic certainty over visual appearance.
3. **Frictionless Workflow**: Clear, linear steps from data to PDFs.

## Accessibility & Inclusion
Must support standard web accessibility features, keyboard navigation, and screen readers (existing code has ARIA labels).
