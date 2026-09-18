# CertiForge — Product & Technical Specification

Version: 1.1
Status: V0.2 implementation specification

## 1. Product

CertiForge is a browser-based certificate design and bulk-generation application for conferences, academic events, medical meetings, workshops, CME/CPD programs, webinars and institutional events.

Primary workflow:

Template → Design → Participants → Mapping → Preview → Generate → ZIP

## 2. Architecture

V0.2 is a static client-side web application suitable for GitHub Pages.

Browser:
- HTML
- CSS
- JavaScript
- Template JSON/data
- Spreadsheet parser
- SVG renderer
- PDF generator
- ZIP generator

No backend is required for the core workflow.

## 3. Privacy

Participant data should remain in the browser.

V0.2 must not require uploading participant data to a CertiForge server.

The application should avoid telemetry and external data transmission except required library/CDN requests.

For production, dependencies can be bundled locally to improve privacy and reliability.

## 4. Templates

Templates are data-driven.

Each template contains:
- ID
- Name
- Category
- Description
- Page dimensions
- Background
- Elements

Supported elements:
- Text
- Shape
- Image (logo/signature/artwork via local data URL)

Planned:
- Dedicated QR code element
- Dedicated signature semantics
- Background image element

## 5. Dynamic variables

Supported variables include:

{{NAME}}
{{ROLE}}
{{EVENT}}
{{DATE}}
{{VENUE}}
{{INSTITUTION}}
{{DEPARTMENT}}
{{EMAIL}}
{{ORGANIZATION}}
{{CERTIFICATE_ID}}
{{YEAR}}

Arbitrary spreadsheet columns are also exposed as normalized variables. Example: `Registration ID` becomes `{{REGISTRATION_ID}}`. Reserved variables such as `{{EVENT}}` only use spreadsheet data when explicitly mapped, otherwise they use conference-wide values.

## 6. Spreadsheet import

Supported:
- XLSX
- XLS
- CSV

The first worksheet is used for XLSX/XLS.

Rows are converted to JavaScript objects.

Blank cells should be represented as empty strings.

## 7. Mapping

Automatic mapping uses normalized column names and aliases.

Example:

Participant Name → {{NAME}}
Institution → {{INSTITUTION}}
Designation → {{ROLE}}

The user can override mappings manually.

## 8. Validation

Before generation, report:
- total records
- valid records
- missing names
- duplicate names

Future:
- missing mapped variables
- invalid email addresses
- duplicate certificate IDs
- unsupported characters
- blank rows

## 9. Certificate IDs

Default:

CONF-2026-0001

Configuration:
- prefix
- year
- starting number
- digit width
- separator

Certificate ID is exposed through:

{{CERTIFICATE_ID}}

## 10. PDF generation

Certificates are rendered from the same SVG representation used by the application.

Target:
- correct page dimensions
- landscape/portrait support
- accurate positioning
- print-quality output

Production milestone:
- embedded fonts
- deterministic rendering
- regression tests

## 11. Bulk generation

Generation must process records incrementally and expose progress.

Target:
- 100–500 certificates
- stretch: 1,000+

The application should yield to the browser between records where practical.

## 12. ZIP export

Each PDF is added to a ZIP archive.

Default filename:

CertiForge-certificates.zip

Individual filename default:

{{CERTIFICATE_ID}}_{{NAME}}.pdf

Filenames must be sanitized.

## 13. Project format

`.certiforge` is JSON-based.

Minimum data:
- format version
- project name
- template ID
- template elements
- mappings
- certificate numbering
- filename pattern

Future:
- assets
- custom templates
- editor state
- history
- metadata

## 14. Editor

V0.2:
- select editable text/images
- modify text
- font
- size
- weight
- color
- X / Y positioning
- width / image height
- drag elements directly on canvas
- upload logo/signature/image
- duplicate
- delete

Next:
- resize handles
- alignment guides
- snapping
- layer ordering
- multi-select
- undo/redo

## 15. Responsive design

Desktop is the primary design target because certificate editing benefits from a large canvas.

Tablet and mobile must support:
- template selection
- data import
- mapping
- preview
- generation

## 16. Security

Do not use:
- eval()
- Function() for imported content
- unsanitized HTML injection

Sanitize:
- spreadsheet text
- filenames
- imported project data

Uploaded data must not be treated as executable content.

## 17. Deployment

GitHub Pages:
- root `index.html`
- static assets
- no server-side execution

Recommended future deployment:
- GitHub Actions for validation/build
- pinned dependencies
- automated tests

## 18. Future backend boundary

Backend is not required for local certificate generation.

A backend becomes useful for:
- user accounts
- cloud projects
- public verification
- certificate revocation
- email delivery
- organization/team accounts
- analytics
- payment
- event management APIs

The frontend architecture should keep these concerns isolated so a backend can be added later.

## 19. V1 definition of done

A user can:
- open CertiForge from GitHub Pages
- choose a template
- edit certificate text
- upload a spreadsheet
- map columns
- preview real participant data
- configure IDs
- generate individual PDFs
- generate a ZIP
- download the ZIP
- export a project

## 20. Product direction

Long-term product:

Certificate Generator
→ Certificate Studio
→ Certificate Issuance Platform
→ Event Certification Infrastructure

The generator is the entry point; verification, automation and event integrations are the future platform layer.
