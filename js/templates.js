import { ASSETS } from './template-assets.js';

export const templates = [
  // =========================================================================
  // 1. INDIAN MEDICAL CONFERENCE (PARTICIPATION / DELEGATE) — Matches pp1.png
  // =========================================================================
  {
    id: "indian-medical-conf",
    name: "Indian Medical Conference",
    category: "Indian Medical",
    description: "Official Indian medical society conference certificate with dual crests and 4-column executive signatory board.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#fcfcfc",
    elements: [
      // Official multi-line crimson & navy conference border (exact match to pp1.png)
      { id: "b-red-out", type: "shape", shape: "rect", x: 18, y: 18, w: 1087, h: 758, fill: "none", stroke: "#a61919", strokeWidth: 2.5, locked: true },
      { id: "b-navy-mid", type: "shape", shape: "rect", x: 26, y: 26, w: 1071, h: 742, fill: "none", stroke: "#142f61", strokeWidth: 5, locked: true },
      { id: "b-red-inn", type: "shape", shape: "rect", x: 35, y: 35, w: 1053, h: 724, fill: "none", stroke: "#a61919", strokeWidth: 1.5, locked: true },

      // Dual Logos: Left Society Crest (Haematology), Right Institutional Crest (MAMC style)
      { id: "logo-soc", type: "image", name: "Society Emblem", src: ASSETS.medicalSocietyLogo, x: 130, y: 140, w: 105, h: 105 },
      { id: "logo-col", type: "image", name: "College Crest", src: ASSETS.medicalCollegeCrest, x: 993, y: 140, w: 105, h: 105 },

      // Conference Title & Header Block (Center)
      { id: "h-edition", type: "text", text: "{{EDITION}} Annual Conference of", x: 561, y: 112, w: 720, size: 28, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-org", type: "text", text: "{{ORGANIZATION}}", variable: "ORGANIZATION", x: 561, y: 152, w: 740, size: 33, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-date", type: "text", text: "{{DATE}}", variable: "DATE", x: 561, y: 192, w: 720, size: 20, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-venue", type: "text", text: "{{VENUE}}", variable: "VENUE", x: 561, y: 228, w: 740, size: 21, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Body: Preamble & Recipient Name
      { id: "preamble", type: "text", text: "This is to certify that", x: 561, y: 290, w: 600, size: 22, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 342, w: 900, size: 34, weight: "700", align: "center", font: "Georgia", color: "#991b1b" },
      { id: "dots", type: "text", text: "....................................................................................................", x: 561, y: 366, w: 900, size: 14, weight: "700", align: "center", font: "Arial", color: "#4b5563" },

      // Participation Details
      { id: "body", type: "text", text: "has participated as a Delegate/Faculty/ presented a paper/poster in\nthe Annual Conference organised by the {{DEPARTMENT}},\n{{VENUE}} on {{DATE}}", x: 561, y: 435, w: 920, size: 18, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Signatory 1: Patron
      { id: "sig1-img", type: "image", name: "Patron Signature", src: ASSETS.sigKhurana, x: 170, y: 575, w: 125, h: 48 },
      { id: "sig1-txt", type: "text", text: "Dr. Nita Khurana\nPatron,\nDSH Conference-2023", x: 170, y: 635, w: 210, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Signatory 2: President
      { id: "sig2-img", type: "image", name: "President Signature", src: ASSETS.sigKhunger, x: 430, y: 575, w: 125, h: 48 },
      { id: "sig2-txt", type: "text", text: "Dr. JM Khunger\nPresident,\nDSH", x: 430, y: 635, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Signatory 3: Secretary
      { id: "sig3-img", type: "image", name: "Secretary Signature", src: ASSETS.sigLanger, x: 690, y: 575, w: 125, h: 48 },
      { id: "sig3-txt", type: "text", text: "Dr. Sabina Langer\nSecretary,\nDSH", x: 690, y: 635, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Signatory 4: Organising Secretary
      { id: "sig4-img", type: "image", name: "Organising Sec Signature", src: ASSETS.sigSingh, x: 950, y: 575, w: 125, h: 48 },
      { id: "sig4-txt", type: "text", text: "Dr. Sarika Singh\nOrganising Secretary,\nDSH Conference-2023", x: 950, y: 635, w: 210, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Verification Footer & QR Code
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 725, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}  •  Scan QR to verify authentic credential", x: 510, y: 730, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#4b5563" }
    ]
  },

  // =========================================================================
  // 2. INDIAN CONFERENCE MERIT & PAPER AWARD — Matches pp2.png
  // =========================================================================
  {
    id: "indian-medical-award",
    name: "Indian Conference Merit & Award",
    category: "Indian Medical",
    description: "Official Indian conference certificate for prize winners, paper presentations, and case report awards.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#fcfcfc",
    elements: [
      // Triple-line border
      { id: "b-red-out", type: "shape", shape: "rect", x: 18, y: 18, w: 1087, h: 758, fill: "none", stroke: "#a61919", strokeWidth: 2.5, locked: true },
      { id: "b-navy-mid", type: "shape", shape: "rect", x: 26, y: 26, w: 1071, h: 742, fill: "none", stroke: "#142f61", strokeWidth: 5, locked: true },
      { id: "b-red-inn", type: "shape", shape: "rect", x: 35, y: 35, w: 1053, h: 724, fill: "none", stroke: "#a61919", strokeWidth: 1.5, locked: true },

      // Dual Logos
      { id: "logo-soc", type: "image", name: "Society Emblem", src: ASSETS.medicalSocietyLogo, x: 130, y: 140, w: 105, h: 105 },
      { id: "logo-col", type: "image", name: "College Crest", src: ASSETS.medicalCollegeCrest, x: 993, y: 140, w: 105, h: 105 },

      // Header Block
      { id: "h-edition", type: "text", text: "{{EDITION}} Annual Conference of", x: 561, y: 112, w: 720, size: 28, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-org", type: "text", text: "{{ORGANIZATION}}", variable: "ORGANIZATION", x: 561, y: 152, w: 740, size: 33, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-date", type: "text", text: "{{DATE}}", variable: "DATE", x: 561, y: 192, w: 720, size: 20, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "h-venue", type: "text", text: "{{VENUE}}", variable: "VENUE", x: 561, y: 228, w: 740, size: 21, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Recipient
      { id: "preamble", type: "text", text: "This is to certify that", x: 561, y: 285, w: 600, size: 22, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 335, w: 900, size: 34, weight: "700", align: "center", font: "Georgia", color: "#111827" },
      { id: "dots", type: "text", text: "....................................................................................................", x: 561, y: 358, w: 900, size: 14, weight: "700", align: "center", font: "Arial", color: "#4b5563" },

      // Award & Paper Title Block (Exact match to pp2.png)
      { id: "award-lead", type: "text", text: "has been awarded the {{AWARD_RANK}} prize for {{PAPER_TYPE}} titled", x: 561, y: 405, w: 920, size: 19, weight: "700", align: "center", font: "Arial", color: "#111827" },
      { id: "paper-title", type: "text", text: "\"{{PAPER_TITLE}}\"", x: 561, y: 445, w: 960, size: 18, weight: "600", align: "center", font: "Georgia", color: "#142f61" },
      { id: "body-event", type: "text", text: "presented at the Annual Conference organised by the {{DEPARTMENT}},\n{{VENUE}} on {{DATE}}", x: 561, y: 495, w: 920, size: 17, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // 4 Executive Signatories
      { id: "sig1-img", type: "image", name: "Patron Signature", src: ASSETS.sigKhurana, x: 170, y: 575, w: 125, h: 48 },
      { id: "sig1-txt", type: "text", text: "Dr. Nita Khurana\nPatron,\nDSH Conference-2023", x: 170, y: 635, w: 210, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      { id: "sig2-img", type: "image", name: "President Signature", src: ASSETS.sigKhunger, x: 430, y: 575, w: 125, h: 48 },
      { id: "sig2-txt", type: "text", text: "Dr. JM Khunger\nPresident,\nDSH", x: 430, y: 635, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      { id: "sig3-img", type: "image", name: "Secretary Signature", src: ASSETS.sigLanger, x: 690, y: 575, w: 125, h: 48 },
      { id: "sig3-txt", type: "text", text: "Dr. Sabina Langer\nSecretary,\nDSH", x: 690, y: 635, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      { id: "sig4-img", type: "image", name: "Organising Sec Signature", src: ASSETS.sigSingh, x: 950, y: 575, w: 125, h: 48 },
      { id: "sig4-txt", type: "text", text: "Dr. Sarika Singh\nOrganising Secretary,\nDSH Conference-2023", x: 950, y: 635, w: 210, size: 13, weight: "700", align: "center", font: "Arial", color: "#111827" },

      // Verification Footer & QR
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 725, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}  •  Scan QR to verify authentic credential", x: 510, y: 730, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#4b5563" }
    ]
  },

  // =========================================================================
  // 3. INDIAN NATIONAL UNIVERSITY & SEMINAR (IIT / NIT / Central Univ Style)
  // =========================================================================
  {
    id: "indian-university-seminar",
    name: "Indian National University & Seminar",
    category: "Academic",
    description: "Prestigious Indian university certificate with gold & navy dual border, university crest, and 3-column academic committee.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#fffdf7",
    elements: [
      { id: "b-outer", type: "shape", shape: "rect", x: 22, y: 22, w: 1079, h: 750, fill: "none", stroke: "#0f2042", strokeWidth: 4, locked: true },
      { id: "b-inner", type: "shape", shape: "rect", x: 34, y: 34, w: 1055, h: 726, fill: "none", stroke: "#b45309", strokeWidth: 1.5, locked: true },

      // Top Center University Seal
      { id: "u-seal", type: "image", name: "University Seal", src: ASSETS.universitySeal, x: 561, y: 95, w: 82, h: 82 },

      // University Name & Accreditation
      { id: "u-name", type: "text", text: "{{ORGANIZATION}}", variable: "ORGANIZATION", x: 561, y: 155, w: 850, size: 25, weight: "700", align: "center", font: "Georgia", color: "#0f2042" },
      { id: "u-dept", type: "text", text: "{{DEPARTMENT}}", variable: "DEPARTMENT", x: 561, y: 188, w: 800, size: 15, weight: "700", align: "center", font: "Arial", color: "#b45309" },
      { id: "u-naac", type: "text", text: "(Approved by AICTE, New Delhi & Affiliated to State University | NAAC Accredited 'A++')", x: 561, y: 212, w: 800, size: 11, weight: "500", align: "center", font: "Arial", color: "#475569" },

      // Certificate Title
      { id: "u-title", type: "text", text: "CERTIFICATE OF MERIT & PRESENTATION", x: 561, y: 255, w: 850, size: 27, weight: "800", align: "center", font: "Georgia", color: "#0f2042" },
      { id: "u-preamble", type: "text", text: "This is to certify that Mr. / Ms. / Dr.", x: 561, y: 298, w: 600, size: 16, weight: "500", align: "center", font: "Georgia", color: "#334155" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 345, w: 900, size: 38, weight: "700", align: "center", font: "Georgia", color: "#0f2042" },
      { id: "u-inst", type: "text", text: "of {{INSTITUTION}}", x: 561, y: 390, w: 800, size: 16, weight: "600", align: "center", font: "Arial", color: "#334155" },

      // Body Statement
      { id: "u-body", type: "text", text: "has actively presented a research paper titled \"{{PAPER_TITLE}}\"\nin the National Conference on \"{{EVENT}}\"\nheld on {{DATE}} at {{VENUE}}.", x: 561, y: 460, w: 880, size: 16, weight: "400", align: "center", font: "Georgia", color: "#1e293b" },

      // 3 Signatories: Convener, Head of Department, Principal
      { id: "sig1-img", type: "image", name: "Convener Signature", src: ASSETS.sigConvener, x: 230, y: 590, w: 130, h: 48 },
      { id: "sig1-txt", type: "text", text: "Dr. R. K. Sharma\nConvener", x: 230, y: 645, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#0f2042" },

      { id: "sig2-img", type: "image", name: "HOD Signature", src: ASSETS.sigKhunger, x: 561, y: 590, w: 130, h: 48 },
      { id: "sig2-txt", type: "text", text: "Prof. P. K. Verma\nHead of Department", x: 561, y: 645, w: 220, size: 13, weight: "700", align: "center", font: "Arial", color: "#0f2042" },

      { id: "sig3-img", type: "image", name: "Principal Signature", src: ASSETS.sigPrincipal, x: 890, y: 590, w: 130, h: 48 },
      { id: "sig3-txt", type: "text", text: "Dr. S. K. Mukherjee\nPrincipal / Director", x: 890, y: 645, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#0f2042" },

      // Verification Footer
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 725, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "Ref No: {{CERTIFICATE_ID}}  •  Accredited National Conference  •  Scan QR to verify", x: 510, y: 730, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#475569" }
    ]
  },

  // =========================================================================
  // 4. INDIAN CME (MEDICAL COUNCIL ACCREDITED)
  // =========================================================================
  {
    id: "indian-cme-council",
    name: "Indian CME (Medical Council)",
    category: "Medical",
    description: "Formal CME certificate for medical councils with credit hours accreditation badge and registration number tracking.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#fbfdfa",
    elements: [
      { id: "b-green-out", type: "shape", shape: "rect", x: 20, y: 20, w: 1083, h: 754, fill: "none", stroke: "#14532d", strokeWidth: 3.5, locked: true },
      { id: "b-gold-inn", type: "shape", shape: "rect", x: 32, y: 32, w: 1059, h: 730, fill: "none", stroke: "#ca8a04", strokeWidth: 1.5, locked: true },

      // Dual Logos: Left State Medical Council Crest, Right College Crest
      { id: "logo-cme", type: "image", name: "Council Emblem", src: ASSETS.cmeCouncilCrest, x: 130, y: 135, w: 100, h: 100 },
      { id: "logo-col", type: "image", name: "Hospital Crest", src: ASSETS.medicalCollegeCrest, x: 993, y: 135, w: 100, h: 100 },

      // Header Block & Accreditation Badge
      { id: "cme-council", type: "text", text: "STATE MEDICAL COUNCIL & {{ORGANIZATION}}", x: 561, y: 105, w: 750, size: 22, weight: "700", align: "center", font: "Arial", color: "#14532d" },
      { id: "cme-sub", type: "text", text: "CONTINUING MEDICAL EDUCATION (CME) PROGRAMME", x: 561, y: 138, w: 750, size: 15, weight: "700", align: "center", font: "Arial", color: "#ca8a04" },
      { id: "cme-badge", type: "text", text: "★ Accredited with {{CME_HOURS}} CME Credit Hours by the State Medical Council (Ref: {{CME_REF}}) ★", x: 561, y: 172, w: 780, size: 13, weight: "700", align: "center", font: "Arial", color: "#166534" },

      // Title & Recipient
      { id: "cme-title", type: "text", text: "CERTIFICATE OF CME PARTICIPATION", x: 561, y: 225, w: 850, size: 28, weight: "800", align: "center", font: "Georgia", color: "#14532d" },
      { id: "cme-pre", type: "text", text: "This certifies that", x: 561, y: 275, w: 500, size: 18, weight: "600", align: "center", font: "Arial", color: "#334155" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 325, w: 850, size: 36, weight: "700", align: "center", font: "Georgia", color: "#14532d" },
      { id: "cme-reg", type: "text", text: "(State Medical Council Reg. No: {{COUNCIL_REG_NO}})", x: 561, y: 368, w: 600, size: 14, weight: "600", align: "center", font: "Arial", color: "#475569" },

      // Body Statement
      { id: "cme-body", type: "text", text: "has attended and actively participated as a {{ROLE}} in the CME titled\n\"{{EVENT}}\"\norganized by the Department of {{DEPARTMENT}}, {{VENUE}} on {{DATE}}.", x: 561, y: 440, w: 900, size: 17, weight: "600", align: "center", font: "Arial", color: "#1e293b" },

      // Signatories: Council Observer, Organizing Chairman, Organizing Secretary
      { id: "sig1-img", type: "image", src: ASSETS.sigLanger, x: 230, y: 585, w: 125, h: 48 },
      { id: "sig1-txt", type: "text", text: "Dr. A. K. Gupta\nCouncil Observer", x: 230, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#14532d" },

      { id: "sig2-img", type: "image", src: ASSETS.sigKhunger, x: 561, y: 585, w: 125, h: 48 },
      { id: "sig2-txt", type: "text", text: "Prof. S. C. Sharma\nOrganising Chairman", x: 561, y: 640, w: 220, size: 13, weight: "700", align: "center", font: "Arial", color: "#14532d" },

      { id: "sig3-img", type: "image", src: ASSETS.sigSingh, x: 890, y: 585, w: 125, h: 48 },
      { id: "sig3-txt", type: "text", text: "Dr. R. P. Rao\nOrganising Secretary", x: 890, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#14532d" },

      // QR Code & ID
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 725, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "CME Certificate ID: {{CERTIFICATE_ID}}  •  Verified Council Attendance", x: 510, y: 730, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#166534" }
    ]
  },

  // =========================================================================
  // 5. INDIAN TECH SYMPOSIUM & HACKATHON (IEEE / CSI / College Fest)
  // =========================================================================
  {
    id: "indian-tech-symposium",
    name: "Indian Tech Symposium & Hackathon",
    category: "Technology",
    description: "High-energy tech symposium certificate with dual IEEE/college badges, saffron-blue accents, and position awards.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#f8fafc",
    elements: [
      // Tech Geometric Borders & Accent Bars
      { id: "t-bar-top", type: "shape", shape: "rect", x: 0, y: 0, w: 1123, h: 14, fill: "#1e3a8a", locked: true },
      { id: "t-bar-sub", type: "shape", shape: "rect", x: 0, y: 14, w: 1123, h: 4, fill: "#f59e0b", locked: true },
      { id: "t-frame", type: "shape", shape: "rect", x: 25, y: 35, w: 1073, h: 725, fill: "none", stroke: "#1e3a8a", strokeWidth: 2, locked: true },
      { id: "t-bar-bot", type: "shape", shape: "rect", x: 0, y: 780, w: 1123, h: 14, fill: "#1e3a8a", locked: true },

      // Dual Logos: IEEE / Tech Society Left, College Seal Right
      { id: "logo-tech", type: "image", name: "Tech Chapter Logo", src: ASSETS.techSymposiumLogo, x: 130, y: 130, w: 95, h: 95 },
      { id: "logo-col", type: "image", name: "Institute Seal", src: ASSETS.universitySeal, x: 993, y: 130, w: 95, h: 95 },

      // Header Block
      { id: "t-dept", type: "text", text: "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING", x: 561, y: 95, w: 750, size: 16, weight: "800", align: "center", font: "Arial", color: "#1e3a8a" },
      { id: "t-fest", type: "text", text: "NATIONAL LEVEL TECHNICAL SYMPOSIUM & HACKATHON", x: 561, y: 125, w: 750, size: 21, weight: "800", align: "center", font: "Arial", color: "#d97706" },

      // Title & Recipient
      { id: "t-title", type: "text", text: "CERTIFICATE OF EXCELLENCE", x: 561, y: 195, w: 850, size: 30, weight: "900", align: "center", font: "Arial", color: "#1e3a8a" },
      { id: "t-intro", type: "text", text: "This certificate is proudly awarded to", x: 561, y: 250, w: 600, size: 16, weight: "600", align: "center", font: "Arial", color: "#475569" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 310, w: 900, size: 40, weight: "800", align: "center", font: "Arial", color: "#0f172a" },
      { id: "t-inst", type: "text", text: "of {{INSTITUTION}}", x: 561, y: 365, w: 800, size: 17, weight: "600", align: "center", font: "Arial", color: "#334155" },

      // Body Statement
      { id: "t-body", type: "text", text: "for securing {{AWARD_RANK}} Position in the 24-Hour National Hackathon\n\"{{EVENT}}\"\nheld on {{DATE}} at {{VENUE}}.", x: 561, y: 440, w: 900, size: 17, weight: "600", align: "center", font: "Arial", color: "#1e293b" },

      // 3 Signatories
      { id: "sig1-img", type: "image", src: ASSETS.sigConvener, x: 230, y: 585, w: 125, h: 48 },
      { id: "sig1-txt", type: "text", text: "Prof. A. N. Murthy\nFaculty Advisor", x: 230, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#1e3a8a" },

      { id: "sig2-img", type: "image", src: ASSETS.sigSingh, x: 561, y: 585, w: 125, h: 48 },
      { id: "sig2-txt", type: "text", text: "Rohan Nair\nStudent Convener", x: 561, y: 640, w: 220, size: 13, weight: "700", align: "center", font: "Arial", color: "#1e3a8a" },

      { id: "sig3-img", type: "image", src: ASSETS.sigPrincipal, x: 890, y: 585, w: 125, h: 48 },
      { id: "sig3-txt", type: "text", text: "Dr. K. V. Raman\nHead of Department", x: 890, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#1e3a8a" },

      // QR Code & ID
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}  •  Verify at portal", x: 510, y: 725, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#64748b" }
    ]
  },

  // =========================================================================
  // 6. INDIAN WORKSHOP & FACULTY DEVELOPMENT PROGRAMME (FDP)
  // =========================================================================
  {
    id: "indian-workshop-fdp",
    name: "Indian Workshop & FDP",
    category: "Academic",
    description: "Standard Indian faculty development and national workshop certificate with formal dark maroon border and coordinator signatures.",
    page: { width: 1123, height: 794, orientation: "landscape" },
    background: "#ffffff",
    elements: [
      { id: "b-maroon", type: "shape", shape: "rect", x: 22, y: 22, w: 1079, h: 750, fill: "none", stroke: "#7f1d1d", strokeWidth: 3.5, locked: true },
      { id: "b-gold", type: "shape", shape: "rect", x: 34, y: 34, w: 1055, h: 726, fill: "none", stroke: "#b45309", strokeWidth: 1.5, locked: true },

      // Center Crest
      { id: "w-crest", type: "image", name: "Institution Seal", src: ASSETS.universitySeal, x: 561, y: 95, w: 80, h: 80 },

      // Header
      { id: "w-org", type: "text", text: "{{ORGANIZATION}}", variable: "ORGANIZATION", x: 561, y: 155, w: 850, size: 24, weight: "700", align: "center", font: "Georgia", color: "#7f1d1d" },
      { id: "w-prog", type: "text", text: "ONE-WEEK NATIONAL FACULTY DEVELOPMENT PROGRAMME (FDP)", x: 561, y: 188, w: 850, size: 15, weight: "700", align: "center", font: "Arial", color: "#b45309" },

      // Title & Recipient
      { id: "w-title", type: "text", text: "CERTIFICATE OF PARTICIPATION", x: 561, y: 245, w: 850, size: 28, weight: "800", align: "center", font: "Georgia", color: "#7f1d1d" },
      { id: "w-pre", type: "text", text: "This is to certify that", x: 561, y: 295, w: 600, size: 16, weight: "500", align: "center", font: "Arial", color: "#374151" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 345, w: 900, size: 38, weight: "700", align: "center", font: "Georgia", color: "#7f1d1d" },
      { id: "w-role-inst", type: "text", text: "{{ROLE}}, {{INSTITUTION}}", x: 561, y: 395, w: 850, size: 16, weight: "600", align: "center", font: "Arial", color: "#4b5563" },

      // Body Statement
      { id: "w-body", type: "text", text: "has successfully participated in and completed the National Hands-on Workshop / FDP on\n\"{{EVENT}}\"\nconducted by the Department of {{DEPARTMENT}} from {{DATE}} at {{VENUE}}.", x: 561, y: 465, w: 900, size: 16, weight: "400", align: "center", font: "Arial", color: "#1f2937" },

      // 3 Signatories
      { id: "sig1-img", type: "image", src: ASSETS.sigKhurana, x: 230, y: 585, w: 125, h: 48 },
      { id: "sig1-txt", type: "text", text: "Dr. P. Sundaram\nProgram Coordinator", x: 230, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#7f1d1d" },

      { id: "sig2-img", type: "image", src: ASSETS.sigLanger, x: 561, y: 585, w: 125, h: 48 },
      { id: "sig2-txt", type: "text", text: "Dr. M. S. Iyer\nOrganizing Secretary", x: 561, y: 640, w: 220, size: 13, weight: "700", align: "center", font: "Arial", color: "#7f1d1d" },

      { id: "sig3-img", type: "image", src: ASSETS.sigPrincipal, x: 890, y: 585, w: 125, h: 48 },
      { id: "sig3-txt", type: "text", text: "Prof. K. R. Nambiar\nDean (Academics)", x: 890, y: 640, w: 200, size: 13, weight: "700", align: "center", font: "Arial", color: "#7f1d1d" },

      // QR Code & ID
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "cert-id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}  •  Scan QR for Verification", x: 510, y: 725, w: 750, size: 11, weight: "600", align: "center", font: "Arial", color: "#6b7280" }
    ]
  },

  // =========================================================================
  // 7. MODERN CONFERENCE (GLOBAL)
  // =========================================================================
  {
    id: "modern", name: "Modern Conference", category: "Conference",
    description: "Clean contemporary certificate for conferences and events.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#fdfdfc",
    elements: [
      { id: "accent", type: "shape", shape: "rect", x: 4, y: 4, w: 1115, h: 786, fill: "none", stroke: "#222", strokeWidth: 2, locked: true },
      { id: "bar", type: "shape", shape: "rect", x: 0, y: 0, w: 1123, h: 18, fill: "#202126", locked: true },
      { id: "title", type: "text", text: "CERTIFICATE OF PARTICIPATION", x: 561, y: 190, w: 900, size: 32, weight: "700", align: "center", font: "Georgia" },
      { id: "intro", type: "text", text: "This certificate is proudly presented to", x: 561, y: 275, w: 850, size: 17, weight: "400", align: "center", font: "Arial" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 360, w: 950, size: 48, weight: "700", align: "center", font: "Georgia" },
      { id: "body", type: "text", text: "for participating as a {{ROLE}} at {{EVENT}}.", x: 561, y: 435, w: 850, size: 17, weight: "400", align: "center", font: "Arial" },
      { id: "date", type: "text", text: "{{DATE}}  •  {{VENUE}}", x: 561, y: 485, w: 850, size: 13, weight: "600", align: "center", font: "Arial" },
      { id: "sig1", type: "text", text: "____________________\nOrganizing Chair", x: 300, y: 625, w: 250, size: 13, weight: "600", align: "center", font: "Arial" },
      { id: "sig2", type: "text", text: "____________________\nScientific Chair", x: 823, y: 625, w: 250, size: 13, weight: "600", align: "center", font: "Arial" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}", x: 561, y: 735, w: 700, size: 10, weight: "500", align: "center", font: "Arial" }
    ]
  },

  // =========================================================================
  // 8. ACADEMIC CLASSIC (GLOBAL)
  // =========================================================================
  {
    id: "academic", name: "Academic Classic", category: "Academic",
    description: "Traditional academic layout with a formal border.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#fffdf8",
    elements: [
      { id: "border", type: "shape", shape: "rect", x: 22, y: 22, w: 1079, h: 750, fill: "none", stroke: "#8a7652", strokeWidth: 4, locked: true },
      { id: "inner", type: "shape", shape: "rect", x: 38, y: 38, w: 1047, h: 718, fill: "none", stroke: "#c9b895", strokeWidth: 1, locked: true },
      { id: "title", type: "text", text: "CERTIFICATE", x: 561, y: 175, w: 900, size: 42, weight: "700", align: "center", font: "Georgia" },
      { id: "subtitle", type: "text", text: "OF PARTICIPATION", x: 561, y: 225, w: 900, size: 19, weight: "600", align: "center", font: "Georgia" },
      { id: "intro", type: "text", text: "This is to certify that", x: 561, y: 300, w: 800, size: 16, align: "center", font: "Georgia" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 370, w: 900, size: 45, weight: "700", align: "center", font: "Georgia" },
      { id: "body", type: "text", text: "has participated in {{EVENT}} as a {{ROLE}}.", x: 561, y: 445, w: 850, size: 16, align: "center", font: "Georgia" },
      { id: "date", type: "text", text: "{{DATE}}  |  {{VENUE}}", x: 561, y: 495, w: 850, size: 13, weight: "600", align: "center", font: "Georgia" },
      { id: "sig1", type: "text", text: "____________________\nAuthorized Signatory", x: 300, y: 630, w: 250, size: 12, align: "center", font: "Georgia" },
      { id: "sig2", type: "text", text: "____________________\nConference Chair", x: 823, y: 630, w: 250, size: 12, align: "center", font: "Georgia" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 735, w: 500, size: 10, align: "center", font: "Georgia" }
    ]
  },

  // =========================================================================
  // 9. MINIMAL PROFESSIONAL (GLOBAL)
  // =========================================================================
  {
    id: "minimal", name: "Minimal Professional", category: "Corporate",
    description: "Minimalist design with strong typography and generous space.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#ffffff",
    elements: [
      { id: "line", type: "shape", shape: "rect", x: 75, y: 75, w: 973, h: 3, fill: "#17191d", locked: true },
      { id: "title", type: "text", text: "CERTIFICATE OF ACHIEVEMENT", x: 561, y: 205, w: 900, size: 29, weight: "700", align: "center", font: "Arial" },
      { id: "intro", type: "text", text: "Presented to", x: 561, y: 290, w: 800, size: 13, weight: "500", align: "center", font: "Arial" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 355, w: 950, size: 50, weight: "300", align: "center", font: "Arial" },
      { id: "body", type: "text", text: "In recognition of participation as {{ROLE}}\nat {{EVENT}}.", x: 561, y: 440, w: 800, size: 16, weight: "400", align: "center", font: "Arial" },
      { id: "date", type: "text", text: "{{DATE}}  •  {{VENUE}}", x: 561, y: 520, w: 800, size: 12, weight: "600", align: "center", font: "Arial" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 710, w: 600, size: 10, align: "center", font: "Arial" }
    ]
  },

  // =========================================================================
  // 10. MEDICAL SYMPOSIUM (GLOBAL)
  // =========================================================================
  {
    id: "medical", name: "Medical Symposium", category: "Medical",
    description: "Professional clinical-academic design suited to CME and medical meetings.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#f8fbfc",
    elements: [
      { id: "left", type: "shape", shape: "rect", x: 0, y: 0, w: 18, h: 794, fill: "#263238", locked: true },
      { id: "top", type: "shape", shape: "rect", x: 18, y: 0, w: 1105, h: 12, fill: "#78909c", locked: true },
      { id: "title", type: "text", text: "CERTIFICATE OF PARTICIPATION", x: 570, y: 185, w: 900, size: 31, weight: "700", align: "center", font: "Arial" },
      { id: "intro", type: "text", text: "This certifies that", x: 570, y: 265, w: 850, size: 16, align: "center", font: "Arial" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 570, y: 345, w: 930, size: 47, weight: "700", align: "center", font: "Arial" },
      { id: "body", type: "text", text: "participated as {{ROLE}} in {{EVENT}}.", x: 570, y: 420, w: 850, size: 17, align: "center", font: "Arial" },
      { id: "details", type: "text", text: "{{INSTITUTION}}\n{{DATE}}  •  {{VENUE}}", x: 570, y: 485, w: 850, size: 13, weight: "500", align: "center", font: "Arial" },
      { id: "sig", type: "text", text: "____________________\nCourse Director", x: 570, y: 640, w: 250, size: 12, weight: "600", align: "center", font: "Arial" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}", x: 570, y: 735, w: 700, size: 10, align: "center", font: "Arial" }
    ]
  },

  // =========================================================================
  // 11. ELEGANT GALA (AWARDS)
  // =========================================================================
  {
    id: "elegant", name: "Elegant Gala", category: "Awards",
    description: "Sophisticated dark design with gold accents for award ceremonies and galas.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#1a1a2e",
    elements: [
      { id: "frame", type: "shape", shape: "rect", x: 30, y: 30, w: 1063, h: 734, fill: "none", stroke: "#c9a961", strokeWidth: 2, locked: true },
      { id: "inner-frame", type: "shape", shape: "rect", x: 45, y: 45, w: 1033, h: 704, fill: "none", stroke: "#c9a961", strokeWidth: 1, locked: true },
      { id: "corner-tl", type: "shape", shape: "rect", x: 30, y: 30, w: 40, h: 40, fill: "none", stroke: "#c9a961", strokeWidth: 3, locked: true },
      { id: "corner-tr", type: "shape", shape: "rect", x: 1053, y: 30, w: 40, h: 40, fill: "none", stroke: "#c9a961", strokeWidth: 3, locked: true },
      { id: "corner-bl", type: "shape", shape: "rect", x: 30, y: 724, w: 40, h: 40, fill: "none", stroke: "#c9a961", strokeWidth: 3, locked: true },
      { id: "corner-br", type: "shape", shape: "rect", x: 1053, y: 724, w: 40, h: 40, fill: "none", stroke: "#c9a961", strokeWidth: 3, locked: true },
      { id: "title", type: "text", text: "Certificate of Excellence", x: 561, y: 180, w: 900, size: 34, weight: "700", align: "center", font: "Georgia", color: "#c9a961" },
      { id: "subtitle", type: "text", text: "is proudly awarded to", x: 561, y: 240, w: 800, size: 16, weight: "400", align: "center", font: "Georgia", color: "#e0d5c1" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 330, w: 950, size: 48, weight: "700", align: "center", font: "Georgia", color: "#ffffff" },
      { id: "body", type: "text", text: "in recognition of outstanding achievement\nat {{EVENT}}", x: 561, y: 420, w: 850, size: 15, weight: "400", align: "center", font: "Georgia", color: "#e0d5c1" },
      { id: "role", type: "text", text: "{{ROLE}}", x: 561, y: 480, w: 600, size: 14, weight: "600", align: "center", font: "Georgia", color: "#c9a961" },
      { id: "date", type: "text", text: "{{DATE}}  •  {{VENUE}}", x: 561, y: 540, w: 600, size: 12, weight: "400", align: "center", font: "Arial", color: "#b0a590" },
      { id: "sig1", type: "text", text: "____________________\nDirector", x: 300, y: 640, w: 220, size: 11, weight: "500", align: "center", font: "Georgia", color: "#e0d5c1" },
      { id: "sig2", type: "text", text: "____________________\nChairperson", x: 823, y: 640, w: 220, size: 11, weight: "500", align: "center", font: "Georgia", color: "#e0d5c1" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 730, w: 500, size: 9, weight: "400", align: "center", font: "Arial", color: "#8a7e6b" }
    ]
  },

  // =========================================================================
  // 12. TECH SUMMIT
  // =========================================================================
  {
    id: "tech", name: "Tech Summit", category: "Technology",
    description: "Modern geometric design with bold accents for tech events and hackathons.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#0f1923",
    elements: [
      { id: "geo-top", type: "shape", shape: "polygon", points: "0,0 1123,0 1123,120 0,60", fill: "#1a3a4a", locked: true },
      { id: "geo-bottom", type: "shape", shape: "polygon", points: "0,794 1123,794 1123,674 0,734", fill: "#1a3a4a", locked: true },
      { id: "accent-line", type: "shape", shape: "rect", x: 0, y: 397, w: 1123, h: 3, fill: "#00d4ff", locked: true },
      { id: "dot-left", type: "shape", shape: "circle", cx: 60, cy: 397, r: 8, fill: "#00d4ff", locked: true },
      { id: "dot-right", type: "shape", shape: "circle", cx: 1063, cy: 397, r: 8, fill: "#00d4ff", locked: true },
      { id: "title", type: "text", text: "CERTIFICATE OF PARTICIPATION", x: 561, y: 200, w: 950, size: 30, weight: "800", align: "center", font: "Arial", color: "#00d4ff" },
      { id: "subtitle", type: "text", text: "TECH SUMMIT {{YEAR}}", x: 561, y: 245, w: 600, size: 12, weight: "600", align: "center", font: "Arial", color: "#5a8a9a" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 561, y: 330, w: 950, size: 46, weight: "700", align: "center", font: "Arial", color: "#ffffff" },
      { id: "body", type: "text", text: "has successfully participated as a {{ROLE}} in {{EVENT}}", x: 561, y: 460, w: 900, size: 15, weight: "400", align: "center", font: "Arial", color: "#a0c4d4" },
      { id: "details", type: "text", text: "{{DATE}}  •  {{VENUE}}", x: 561, y: 510, w: 600, size: 12, weight: "500", align: "center", font: "Arial", color: "#5a8a9a" },
      { id: "sig1", type: "text", text: "____________________\nOrganizer", x: 300, y: 640, w: 220, size: 11, weight: "500", align: "center", font: "Arial", color: "#a0c4d4" },
      { id: "sig2", type: "text", text: "____________________\nTech Lead", x: 823, y: 640, w: 220, size: 11, weight: "500", align: "center", font: "Arial", color: "#a0c4d4" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "ID: {{CERTIFICATE_ID}}", x: 561, y: 725, w: 400, size: 10, weight: "500", align: "center", font: "Arial", color: "#5a8a9a" }
    ]
  },

  // =========================================================================
  // 13. SPORTS & FITNESS
  // =========================================================================
  {
    id: "sports", name: "Sports & Fitness", category: "Sports",
    description: "Dynamic design with bold diagonal elements for sports and fitness events.",
    page: { width: 1123, height: 794, orientation: "landscape" }, background: "#fefefe",
    elements: [
      { id: "diagonal", type: "shape", shape: "polygon", points: "0,200 0,794 900,794", fill: "#e63946", locked: true },
      { id: "stripe", type: "shape", shape: "polygon", points: "0,160 0,200 923,794 963,794", fill: "#1d3557", locked: true },
      { id: "border", type: "shape", shape: "rect", x: 50, y: 50, w: 1023, h: 694, fill: "none", stroke: "#1d3557", strokeWidth: 3, locked: true },
      { id: "title", type: "text", text: "CERTIFICATE", x: 650, y: 175, w: 500, size: 38, weight: "800", align: "center", font: "Arial", color: "#1d3557" },
      { id: "subtitle", type: "text", text: "OF ACHIEVEMENT", x: 650, y: 225, w: 500, size: 16, weight: "600", align: "center", font: "Arial", color: "#e63946" },
      { id: "name", type: "text", text: "{{NAME}}", variable: "NAME", x: 650, y: 310, w: 550, size: 46, weight: "700", align: "center", font: "Arial", color: "#1d3557" },
      { id: "body", type: "text", text: "has demonstrated outstanding performance\nas {{ROLE}} in {{EVENT}}", x: 650, y: 390, w: 550, size: 15, weight: "400", align: "center", font: "Arial", color: "#333" },
      { id: "details", type: "text", text: "{{DATE}}  •  {{VENUE}}", x: 650, y: 470, w: 400, size: 12, weight: "600", align: "center", font: "Arial", color: "#555" },
      { id: "sig1", type: "text", text: "____________________\nCoach", x: 550, y: 590, w: 200, size: 11, weight: "600", align: "center", font: "Arial", color: "#333" },
      { id: "sig2", type: "text", text: "____________________\nDirector", x: 820, y: 590, w: 200, size: 11, weight: "600", align: "center", font: "Arial", color: "#333" },
      { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 995, y: 720, w: 56, h: 56 },
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 650, y: 680, w: 400, size: 9, weight: "500", align: "center", font: "Arial", color: "#777" }
    ]
  }
];

export function getTemplate(id) {
  return templates.find(t => t.id === id) || templates[0];
}
