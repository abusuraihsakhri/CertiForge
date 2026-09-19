CertiForge

Privacy-first bulk certificate design, generation and verification — entirely in the browser.

CertiForge — Certificate Studio is an open-source certificate creation platform for conferences, universities, workshops, CME/CPD programs, seminars, competitions, academic events and institutional programs.

Design a certificate, connect it to participant data from Excel or CSV, generate personalized PDF certificates in bulk, and optionally add unique certificate IDs and QR-based verification.

No backend is required for the core workflow.

---

What CertiForge Does

CertiForge turns a spreadsheet and a certificate design into a complete batch of personalized certificates.

The workflow is:

Choose a Template
        ↓
Customize the Design
        ↓
Upload XLSX / XLS / CSV
        ↓
Map Participant Data
        ↓
Preview Certificates
        ↓
Configure Certificate IDs
        ↓
Generate PDFs
        ↓
Download ZIP + Verification Registry

Everything from spreadsheet parsing to PDF generation happens in the browser.

---

Key Features

Certificate Designer

CertiForge includes a browser-based certificate editor with:

- 13 built-in certificate templates
- Multiple academic, conference, medical, award, technology, corporate and sports styles
- Specialized Indian academic and medical conference templates
- Editable text elements
- Direct drag positioning
- Custom text elements
- Logo and signature uploads
- PNG, JPEG, WebP and SVG image support
- Custom font upload
- Font size, weight and color controls
- Image dimensions and opacity controls
- Element duplication and deletion
- Layer ordering
- Undo and redo
- QR-code elements

The editor is intentionally focused on certificate workflows rather than attempting to reproduce a general-purpose design application.

---

Spreadsheet-Driven Certificates

Participant information can be imported from:

.xlsx
.xls
.csv

CertiForge supports automatic and manual column mapping.

For example:

Name| Institution| Role| Registration ID
Jane Doe| University A| Speaker| REG001
John Smith| Hospital B| Participant| REG002

can be mapped directly into certificate content.

---

Dynamic Variables

Templates support variables such as:

{{NAME}}
{{ROLE}}
{{EVENT}}
{{DATE}}
{{VENUE}}
{{ORGANIZATION}}
{{INSTITUTION}}
{{DEPARTMENT}}
{{CERTIFICATE_ID}}
{{YEAR}}
{{VERIFY_URL}}
{{VERIFY_SIG}}

Additional spreadsheet columns automatically become usable template variables.

A column named:

Registration ID

becomes:

{{REGISTRATION_ID}}

This allows custom certificate datasets without modifying CertiForge itself.

---

Event-Wide Information

Information shared by every participant can be entered once instead of repeated throughout the spreadsheet.

Examples include:

- Event name
- Date
- Venue
- Organization
- Institution
- Conference details

Participant-specific spreadsheet information is then merged with these event-level values during generation.

---

Certificate Identity

CertiForge can assign structured certificate identifiers automatically.

For example:

WMS-2026-0001
WMS-2026-0002
WMS-2026-0003

The numbering system supports configurable:

- Prefix
- Year
- Starting number
- Number of digits
- Separator

CertiForge can also derive a certificate prefix from the event name.

This gives each generated certificate a stable identifier that can be used for verification and record keeping.

---

QR Certificate Verification

CertiForge includes an integrated certificate verification workflow.

A QR code can be placed directly on the certificate using:

{{VERIFY_URL}}

Each generated certificate can contain:

- Certificate ID
- Recipient name
- Event
- Role
- Issue date
- Issuing organization
- Verification digest

Scanning the QR code opens the CertiForge verification portal.

---

Verification Portal

CertiForge includes a dedicated:

verify.html

verification portal.

Certificates can be checked through:

QR verification

A QR code embedded in the certificate opens its verification record directly.

Certificate ID lookup

Users can search for a certificate using its unique certificate ID.

Example:

ICML-2026-0042

Verification registry

After certificate generation, CertiForge can export a:

verification-registry.json

containing the generated certificate records.

The verification portal can load this registry and search it locally.

A registry can also be published alongside the verification portal when public certificate lookup is desired.

---

Integrity Verification

CertiForge generates a SHA-256-derived verification digest from certificate information including:

Certificate ID
Recipient
Event
Date
Organization

Changing those fields causes the verification digest to no longer match.

Security scope

The current verification system provides tamper-evident certificate verification within the CertiForge workflow.

It should not currently be interpreted as a PKI-backed digital signature or proof of issuer identity. A future security architecture can add asymmetric digital signatures so verification can be performed using an issuer's public key without exposing signing secrets in client-side code.

---

Bulk PDF Generation

CertiForge generates an individual PDF for every valid participant record.

Rows without a valid participant name are automatically skipped.

Duplicate filenames are safely de-conflicted.

For example:

John_Smith.pdf
John_Smith_2.pdf
John_Smith_3.pdf

Generation progress is displayed during large batches.

---

High-Resolution Rendering

Certificates are rendered using an SVG-based pipeline:

Certificate Design
       ↓
SVG
       ↓
High-Resolution Canvas
       ↓
PNG
       ↓
PDF

This produces output suitable for both electronic distribution and printing.

Multiple output-quality settings are supported.

---

ZIP Export

Generated certificates can be downloaded together as a single ZIP archive.

certificates.zip
│
├── WMS-2026-0001_Jane_Doe.pdf
├── WMS-2026-0002_John_Smith.pdf
├── WMS-2026-0003_Alex_Kumar.pdf
└── ...

The verification registry can be exported separately for certificate lookup and record keeping.

---

Save and Reopen Projects

CertiForge projects can be exported and reopened later.

Project files preserve information including:

- Template
- Design elements
- Text changes
- Element positions
- Uploaded images
- Custom fonts
- Column mappings
- Event information
- Certificate numbering configuration
- Generation settings

Participant spreadsheet rows are intentionally not embedded into exported project files.

---

Autosave

CertiForge uses browser storage to periodically save the current project state.

If an unsaved session is detected later, the application can offer to restore it.

This provides additional protection against accidental browser closure or interrupted editing.

---

Privacy by Design

The certificate-generation workflow is local-first.

Participant spreadsheets are parsed inside the browser.

CertiForge does not require a backend server or participant database for:

- spreadsheet import
- data mapping
- certificate design
- PDF generation
- ZIP generation
- project storage

Participant data therefore does not need to be uploaded to a CertiForge server simply to generate certificates.

Verification privacy

Verification is a separate consideration.

When QR verification URLs are used, selected certificate metadata may be encoded in the verification URL. Opening an online verification URL can therefore expose those URL parameters to the hosting infrastructure and browser history.

Similarly, publishing a verification registry makes the information contained in that registry publicly accessible.

Organizations should choose which certificate information they want to expose when enabling public verification.

---

Offline Support

CertiForge includes Progressive Web App support and a service worker.

Core application assets and runtime libraries can be cached locally, allowing much of CertiForge to continue operating without a continuous internet connection after the application has been loaded.

Runtime libraries including spreadsheet parsing, PDF generation, ZIP creation and QR generation are bundled with the project.

---

Typical Uses

CertiForge can generate certificates for:

- Scientific conferences
- Medical conferences
- CME/CPD programs
- Faculty development programs
- Workshops
- University seminars
- Academic presentations
- Paper and poster presentations
- Speakers and faculty
- Training programs
- Competitions
- Awards
- Sports events
- Institutional programs

The same generation engine can support different certificate types simply by changing the template and spreadsheet variables.

---

Example

A conference organizer may have:

Name
Institution
Role
Paper Title
Registration ID

for 500 participants.

With CertiForge they can:

Design one certificate
        ↓
Import the spreadsheet
        ↓
Map the fields
        ↓
Generate unique certificate IDs
        ↓
Add QR verification
        ↓
Generate 500 PDFs
        ↓
Download one ZIP
        ↓
Export the verification registry

without manually editing 500 certificate files.

---

Built for Local-First Workflows

CertiForge is designed around several principles:

Privacy — participant data should remain local whenever possible.

Reproducibility — the same project configuration should generate consistent certificates.

Automation — repetitive certificate production should be handled by software rather than manual editing.

Flexibility — spreadsheet columns should be usable without requiring code changes.

Verification — certificates should have stable identities that can be checked after issuance.

Portability — the core system should work without depending on a proprietary backend.

---

Current Development

CertiForge is actively evolving.

Current development areas include improving:

- editor precision and alignment tools
- large-batch performance
- PDF/font fidelity
- accessibility
- automated browser testing
- verification security
- issuer-authenticated digital signatures
- certificate lifecycle and revocation workflows

The core certificate design → data import → generation → ZIP → verification workflow is already functional.

---

Open Source

CertiForge is released under the MIT License.

Contributions, testing, templates, bug reports and feature suggestions are welcome.

---

CertiForge

Design once. Generate at scale. Verify with confidence.

Privacy-first certificate infrastructure for events, education and institutions.
