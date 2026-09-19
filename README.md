<div align="center">🎓 CertiForge

Certificate Studio for Bulk Generation & Verification

Design once · Import participants · Generate at scale · Verify credentials

<br>""License: MIT" (https://img.shields.io/badge/License-MIT-green.svg)" (LICENSE)
"Privacy First" (https://img.shields.io/badge/Privacy-Local--First-2563eb)
"Client Side" (https://img.shields.io/badge/Processing-Client--Side-7c3aed)
"PWA" (https://img.shields.io/badge/PWA-Enabled-f97316)
"JavaScript" (https://img.shields.io/badge/JavaScript-ES6+-f7df1e?logo=javascript&logoColor=000)
"No Backend" (https://img.shields.io/badge/Backend-Not%20Required-16a34a)

<br>CertiForge is an open-source, privacy-first certificate designer and bulk generator for conferences, universities, CME/CPD programs, workshops, seminars, competitions and institutional events.

Create the certificate once, connect it to Excel or CSV data, and generate personalized, verifiable PDF certificates in bulk — directly in your browser.

<br>"🚀 Open CertiForge" (https://abusuraihsakhri.github.io/CertiForge/) · "🔍 Verification Portal" (https://abusuraihsakhri.github.io/CertiForge/verify.html)

</div>---

✨ What CertiForge Does

Choose Template
      ↓
Design Certificate
      ↓
Import XLSX / XLS / CSV
      ↓
Map Participant Data
      ↓
Preview
      ↓
Configure Certificate IDs
      ↓
Generate PDFs
      ↓
Download ZIP + Verification Registry

No participant database.
No server-side PDF generation.
No mandatory account.

The core certificate workflow runs locally in the browser.

---

🚀 Features

| Feature| Description
🎨| Certificate Designer| Edit text, images, signatures, logos, fonts, QR codes and element positioning
📊| Spreadsheet Import| Import ".xlsx", ".xls" and ".csv" participant data
🔗| Smart Mapping| Automatically or manually map spreadsheet columns to certificate fields
🧩| Dynamic Variables| Use built-in variables and arbitrary spreadsheet columns inside templates
🆔| Certificate IDs| Generate structured and sequential certificate identifiers
📱| QR Verification| Embed verification QR codes directly into certificates
🔍| Verification Portal| Verify credentials using QR links or certificate IDs
🔐| Integrity Digests| Generate SHA-256-derived verification signatures
📄| Bulk PDF Generation| Generate personalized PDFs for all valid participants
📦| ZIP Export| Download the entire certificate batch as a single archive
💾| Project Save/Open| Save certificate projects and reopen them later
↩️| Undo / Redo| Restore recent design changes
🗂️| Layer Controls| Change element stacking order
🔤| Custom Fonts| Load local TTF, OTF, WOFF and WOFF2 fonts
🖼️| Custom Assets| Add PNG, JPG, WebP and SVG logos or signatures
💽| Autosave| Recover locally saved projects using IndexedDB
📲| PWA Support| Installable application with offline asset caching
🔒| Local-First Processing| Participant spreadsheets remain in the browser during generation

---

🎨 Certificate Studio

CertiForge includes 13 built-in templates covering several certificate styles and use cases.

Template categories

- 🩺 Medical & CME
- 🎓 Academic
- 🏛️ University
- 🎤 Conferences
- 🏆 Awards
- 💻 Technology
- 🏢 Corporate
- 🏅 Sports
- 🇮🇳 Indian academic and medical conference layouts

The editor supports:

Text           Images
Fonts          Logos
Signatures     QR Codes
Positioning    Layer Order
Opacity        Duplication
Undo / Redo    Custom Variables

---

📊 Spreadsheet → Certificate

Upload participant information directly from:

.xlsx
.xls
.csv

Example:

Name| Institution| Role| Registration ID
Jane Doe| University A| Speaker| REG001
John Smith| Hospital B| Participant| REG002
Alex Kumar| Institute C| Faculty| REG003

CertiForge maps spreadsheet information into your certificate automatically or through manual field mapping.

---

🧩 Dynamic Variables

Templates can contain reusable variables such as:

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

Custom spreadsheet fields

CertiForge is not limited to predefined variables.

A spreadsheet column such as:

Presentation Title

automatically becomes:

{{PRESENTATION_TITLE}}

So a spreadsheet containing:

Department
Country
Abstract Title
Award Category
Registration Number

can expose:

{{DEPARTMENT}}
{{COUNTRY}}
{{ABSTRACT_TITLE}}
{{AWARD_CATEGORY}}
{{REGISTRATION_NUMBER}}

without changing the application code.

---

🏛️ Event-Wide Fields

Information common to all participants can be entered once.

Examples:

- Event name
- Organization
- Date
- Venue
- Institution
- Conference year

These values are combined with participant-specific spreadsheet data when certificates are generated.

---

🆔 Certificate Identity

CertiForge generates structured certificate identifiers such as:

WMS-2026-0001
WMS-2026-0002
WMS-2026-0003

You can configure:

Setting| Example
Prefix| "WMS"
Year| "2026"
Starting number| "1"
Digits| "4"
Separator| "-"

CertiForge can also derive a prefix automatically from the event name.

---

📱 QR Verification

QR verification can be added directly to certificate designs.

Use:

{{VERIFY_URL}}

as the QR content.

A generated verification URL can contain information such as:

Certificate ID
Recipient
Event
Role
Date
Issuing Organization
Verification Digest

Scanning the QR code opens the CertiForge verification portal.

---

🔍 Verification Portal

CertiForge includes a dedicated credential verification interface.

Verification methods

📱 Scan QR code

Open the verification record directly from the certificate.

🆔 Search certificate ID

Search for an identifier such as:

ICML-2026-0042

📂 Load a verification registry

The portal can load a locally exported:

verification-registry.json

and verify certificates by ID.

---

📜 Verification Registry

Bulk generation can produce a machine-readable registry alongside the PDFs.

Conference Certificates
│
├── certificates.zip
│   ├── WMS-2026-0001_Jane_Doe.pdf
│   ├── WMS-2026-0002_John_Smith.pdf
│   └── WMS-2026-0003_Alex_Kumar.pdf
│
└── WMS-verification-registry.json

The registry stores certificate records required by the verification workflow.

---

🔐 Certificate Integrity

CertiForge generates a SHA-256-derived verification digest from certificate information including:

Certificate ID
Recipient
Event
Date
Organization

Changing signed certificate fields causes the generated verification digest to differ.

«Security scope

The current verification architecture provides tamper-evident verification within the CertiForge workflow.

It is not yet equivalent to a PKI-backed digital signature or asymmetric issuer authentication. Future versions can introduce public/private-key signing so issuer authenticity can be independently verified without exposing signing material to client-side code.»

---

📄 High-Resolution PDF Generation

CertiForge renders certificates through a high-resolution graphics pipeline:

flowchart LR
    A[Certificate Template] --> B[Resolved SVG]
    B --> C[High-Resolution Canvas]
    C --> D[PNG Rendering]
    D --> E[PDF]

This provides output suitable for:

- ✉️ Email distribution
- 🖨️ Printing
- 📚 Academic records
- 🏛️ Institutional archives

Multiple rendering quality levels are available.

---

📦 Bulk Generation

CertiForge processes every valid participant row and generates an individual PDF.

Rows without valid participant names are skipped automatically.

Duplicate filenames are safely handled:

John_Smith.pdf
John_Smith_2.pdf
John_Smith_3.pdf

Generation progress is displayed while the batch is processed.

---

💾 Projects & Autosave

CertiForge projects can be exported and reopened later.

Saved projects preserve:

- Template selection
- Design elements
- Text content
- Element positions
- Images and signatures
- Custom fonts
- Column mappings
- Event information
- Certificate numbering
- Generation settings

Participant spreadsheet rows are intentionally not embedded in exported project files.

CertiForge also uses IndexedDB autosave to help recover unsaved projects.

---

🔒 Privacy First

<div align="center">Your participant spreadsheet does not need to leave your device.

</div>Core operations happen locally in the browser:

flowchart LR
    A[XLSX / CSV] --> B[Browser]
    B --> C[Mapping]
    C --> D[Certificate Rendering]
    D --> E[PDF]
    E --> F[ZIP]

CertiForge does not require a backend for:

- spreadsheet parsing
- certificate design
- data mapping
- PDF generation
- ZIP creation
- project storage

Verification privacy

Public verification is different from certificate generation.

When verification URLs or registries are published, selected certificate information may become available through URLs or registry files.

Organizations should therefore decide which certificate metadata is appropriate to expose publicly.

---

📲 Offline & PWA Support

CertiForge includes:

- "manifest.json"
- Service Worker
- Local runtime dependencies
- Offline asset caching
- Installable PWA support

After required assets have been cached, substantial parts of the application can continue operating without a continuous internet connection.

---

🧪 Example Workflow

Imagine a scientific conference with 1,000 participants.

The spreadsheet contains:

Name
Institution
Role
Paper Title
Registration ID

With CertiForge:

flowchart TD
    A[Design one certificate] --> B[Import participant spreadsheet]
    B --> C[Map spreadsheet columns]
    C --> D[Generate certificate IDs]
    D --> E[Add verification QR]
    E --> F[Preview]
    F --> G[Generate 1,000 PDFs]
    G --> H[Download ZIP]
    H --> I[Export verification registry]

No manual editing of 1,000 certificates is required.

---

🎯 Designed For

🩺 Healthcare| 🎓 Education| 🎤 Events
CME programs| Universities| Conferences
Medical conferences| Workshops| Seminars
Faculty programs| Training courses| Webinars
CPD activities| Academic presentations| Competitions

Also suitable for:

🏆 Awards · 🧑‍🏫 Faculty certificates · 📑 Paper presentations · 🖼️ Posters · 🤝 Volunteers · 🏅 Sports events · 🏢 Institutional programs

---

🧭 Project Principles

🔒 Privacy by default

Participant information should remain local whenever practical.

⚡ Automation

Repetitive certificate production should be handled by software.

🧩 Flexible data

Certificate templates should work with arbitrary spreadsheet columns.

🆔 Stable identity

Issued certificates should have unique, reproducible identifiers.

🔍 Verification

Credentials should remain independently checkable after issuance.

📦 Portability

Core functionality should not depend on a proprietary backend.

🎨 Focused design

CertiForge is a certificate studio — not a general-purpose graphics editor.

---

🛠️ Current Development

The complete core workflow is functional:

Design
   ✓
Import
   ✓
Map
   ✓
Preview
   ✓
Certificate IDs
   ✓
QR Verification
   ✓
PDF Generation
   ✓
ZIP Export
   ✓
Verification Registry
   ✓
Verification Portal
   ✓

Current development is focused on:

- 📐 Better alignment and precision tools
- ⚡ Large-batch optimization
- 🔤 Improved PDF font fidelity
- ♿ Accessibility
- 🧪 Automated browser testing
- 🔐 Stronger issuer authentication
- 🔑 Asymmetric digital signatures
- 🚫 Certificate revocation and lifecycle management

---

🤝 Contributing

Contributions are welcome.

Useful areas include:

- 🎨 Certificate templates
- 🐛 Bug fixes
- 🧪 Testing
- ♿ Accessibility
- ⚡ Performance
- 🔐 Verification security
- 🌐 Browser compatibility
- 📄 PDF rendering
- 🔤 Font support
- 📚 Documentation

Issues and pull requests are welcome.

---

📄 License

CertiForge is released under the MIT License.

See ""LICENSE"" (LICENSE) for details.

---

<div align="center">🎓 CertiForge

Design once. Generate at scale. Verify with confidence.

Privacy-first certificate infrastructure for events, education and institutions.

<br>⭐ If CertiForge is useful to you, consider starring the repository.

</div>
