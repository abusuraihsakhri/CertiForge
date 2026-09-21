<div align="center">

# CertiForge

### [Open the Live Application →](https://abusuraihsakhri.github.io/CertiForge/)

Browser-based certificate design, spreadsheet-driven bulk generation, PDF export, and registry-backed verification.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/docs/Web/JavaScript)
![Local First](https://img.shields.io/badge/Privacy-Local--First-2563EB)
![No Backend](https://img.shields.io/badge/Core%20Workflow-No%20Backend-16A34A)
![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8)

**[Open CertiForge](https://abusuraihsakhri.github.io/CertiForge/) · [Verify a Certificate](https://abusuraihsakhri.github.io/CertiForge/verify.html)**

</div>

---

## ✨ What is CertiForge?

**CertiForge — Certificate Studio** is an open-source, browser-based platform for creating personalized certificates in bulk from spreadsheet data.

It is designed for **conferences, universities, workshops, CME/CPD programs, seminars, competitions, training programs, and institutional events**.

Create a certificate once, connect it to an Excel or CSV file, generate individualized PDFs for every participant, and optionally issue each certificate with a unique ID and QR-based verification.

> **Local-first by design:** participant spreadsheets are processed in the browser. The core certificate-generation workflow does not require a participant database or backend server.

---

## 🚀 Core Workflow

| Step | Action |
|---:|---|
| 1️⃣ | Choose a certificate template |
| 2️⃣ | Customize text, logos, signatures, fonts, and layout |
| 3️⃣ | Upload XLSX, XLS, or CSV participant data |
| 4️⃣ | Map spreadsheet columns to certificate variables |
| 5️⃣ | Preview participant certificates |
| 6️⃣ | Configure certificate IDs and QR verification |
| 7️⃣ | Generate personalized PDFs |
| 8️⃣ | Download the batch as a ZIP |
| 9️⃣ | Export the verification registry when required |

---

## 🧰 Features

### 🎨 Certificate Studio

- **13 built-in certificate templates** across medical, academic, conference, award, technology, corporate, and sports use cases
- Editable text elements with direct drag positioning
- Logo, signature, and image upload
- PNG, JPEG, WebP, and SVG support
- Custom TTF, OTF, WOFF, and WOFF2 fonts
- Font size, weight, color, positioning, and width controls
- Image dimensions and opacity controls
- QR-code elements
- Layer ordering
- Element duplication and deletion
- Undo and redo

### 📊 Spreadsheet Automation

- XLSX, XLS, and CSV import
- Automatic column mapping
- Manual mapping when required
- Participant preview before generation
- Event-wide fields for shared data such as date, venue, and organization
- Arbitrary spreadsheet columns available as certificate variables
- Missing-name rows skipped automatically
- Duplicate output filenames safely de-conflicted

### 📄 PDF & Batch Export

- Individual PDF generation
- Bulk certificate generation
- High-resolution SVG → Canvas → PNG → PDF rendering
- Multiple output-quality settings
- Live batch-generation progress
- ZIP export for all generated PDFs

### 💾 Project Management

- Save and reopen CertiForge project files
- Preserve design edits, mappings, images, fonts, and settings
- IndexedDB autosave and recovery
- Participant rows are intentionally not embedded in exported project files

### 📲 Offline Support

- Progressive Web App support
- Service-worker caching
- Runtime libraries bundled locally
- Core functionality can continue working after required assets are cached

---

## 🧩 Dynamic Variables

Certificate templates can use built-in variables such as:

```text
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
```

Spreadsheet columns can also become template variables automatically.

For example:

| Spreadsheet column | Template variable |
|---|---|
| Registration ID | `{{REGISTRATION_ID}}` |
| Paper Title | `{{PAPER_TITLE}}` |
| Award Category | `{{AWARD_CATEGORY}}` |
| Council Registration No | `{{COUNCIL_REGISTRATION_NO}}` |

This allows CertiForge to adapt to different certificate workflows without changing the application code.

---

## 🆔 Certificate Identity

CertiForge can generate structured certificate identifiers such as:

```text
WMS-2026-0001
WMS-2026-0002
WMS-2026-0003
```

Certificate numbering can be configured using:

- Prefix
- Year
- Starting number
- Number of digits
- Separator

CertiForge can also derive a prefix from the event name.

---

## 📱 QR Verification

Verification QR codes can be added directly to certificate designs using:

```text
{{VERIFY_URL}}
```

Generated verification records can include:

- Certificate ID
- Recipient name
- Event
- Role
- Date
- Issuing organization
- Verification digest

Scanning the QR code opens the CertiForge verification portal.

### 🔍 Verification Portal

The included verification portal supports:

- **QR verification** from a generated certificate
- **Certificate ID lookup**
- **Verification registry lookup**
- Loading an exported `verification-registry.json` locally
- Optional loading of a published registry from the same site

After certificate generation, CertiForge can export a verification registry alongside the certificate batch.

### 🔐 Integrity Check

CertiForge currently generates a SHA-256-derived verification digest from certificate data such as the certificate ID, recipient, event, date, and organization.

> **Security scope:** the current implementation provides tamper-evident verification within the CertiForge workflow. It should not be interpreted as PKI-backed digital signing or independent proof of issuer identity. Stronger asymmetric issuer authentication is a future security improvement.

---

## 🔒 Privacy

CertiForge is designed so that participant data can remain on the user’s device during certificate creation.

The following operations happen locally in the browser:

- Spreadsheet parsing
- Column mapping
- Certificate design
- Participant preview
- PDF generation
- ZIP generation
- Project autosave

### Verification privacy

Public verification is separate from local certificate generation. If a verification URL or registry is published, the selected certificate metadata contained in that URL or registry may become accessible to the hosting infrastructure or public users.

Organizations should therefore choose carefully which fields are included in public verification records.

---

## 🎯 Typical Uses

| Healthcare & Academia | Events & Institutions |
|---|---|
| 🩺 CME / CPD programs | 🎤 Conferences |
| 🧑‍⚕️ Medical meetings | 🏛️ Institutional programs |
| 🎓 Universities | 🧑‍🏫 Workshops & training |
| 📑 Paper presentations | 🖼️ Poster presentations |
| 🏆 Academic awards | 🏅 Competitions & sports |
| 👥 Faculty programs | 🤝 Volunteer certificates |

---

## 🛠️ Current Status

The complete primary workflow is functional:

- ✅ Template selection
- ✅ Certificate editing
- ✅ Spreadsheet import
- ✅ Automatic and manual mapping
- ✅ Participant preview
- ✅ Certificate numbering
- ✅ QR generation
- ✅ Verification portal
- ✅ Verification registry export
- ✅ High-resolution PDF generation
- ✅ ZIP export
- ✅ Project save/open
- ✅ Undo/redo
- ✅ Custom fonts
- ✅ IndexedDB autosave
- ✅ PWA/service-worker support

### Current development priorities

- Better alignment and precision tools
- Large-batch performance improvements
- Improved PDF/font fidelity
- Accessibility improvements
- Automated browser testing
- Stronger issuer authentication
- Asymmetric digital signatures
- Certificate revocation and lifecycle workflows

---

## 🤝 Contributing

Contributions are welcome, particularly for:

- Certificate templates
- UI and editor improvements
- Accessibility
- Browser compatibility
- Performance
- PDF rendering
- Font support
- Verification security
- Automated testing
- Documentation

Bug reports and feature suggestions can be submitted through GitHub Issues.

---

## 📄 License

CertiForge is released under the **MIT License**.

See [LICENSE](LICENSE) for details.

---

<div align="center">

### CertiForge

Browser-based certificate generation and verification for events, education, and institutions.

</div>
