import { ASSETS } from './template-assets.js';

const PAGE = Object.freeze({ width: 1123, height: 794, orientation: "landscape" });

const PAPER = Object.freeze({
  ivory: "#f6f0e1",
  parchment: "#eee2c4",
  oyster: "#e9e6dd",
  sage: "#e2e8d7",
  blush: "#f2e3d7",
  night: "#1d1914"
});

const INK = Object.freeze({
  noir: "#221d15",
  oxford: "#1f2c49",
  oxblood: "#5d2325",
  forest: "#24402e",
  sepia: "#4d3a20",
  brass: "#a97835",
  brassLight: "#c79e56",
  cream: "#eadfc9",
  muted: "#756b5c"
});

const rect = (id, x, y, w, h, fill = "none", stroke = "none", strokeWidth = 0, locked = true) => ({
  id, type: "shape", shape: "rect", x, y, w, h, fill, stroke, strokeWidth, locked
});

const polygon = (id, points, fill = "none", stroke = "none", strokeWidth = 0, locked = true) => ({
  id, type: "shape", shape: "polygon", points, fill, stroke, strokeWidth, locked
});

const text = (id, value, x, y, w, size, weight = "400", font = "Georgia", color = INK.noir, align = "center", lineHeight = 1.28) => ({
  id, type: "text", text: value, x, y, w, size, weight, align, font, color, lineHeight
});

const image = (id, src, x, y, w, h, name = "Artwork") => ({
  id, type: "image", name, src, x, y, w, h
});

const qr = (x = 1018, y = 704, size = 52) => ({
  id: "qr", type: "qr", text: "{{VERIFY_URL}}", x, y, w: size, h: size
});

function diamond(id, cx, cy, radius, color) {
  return polygon(
    id,
    [cx + "," + (cy - radius), (cx + radius) + "," + cy, cx + "," + (cy + radius), (cx - radius) + "," + cy].join(" "),
    color
  );
}

function frame(ink, accent, variant = "regal") {
  if (variant === "minimal") {
    return [
      rect("frame-outer", 48, 48, 1027, 698, "none", ink, 1.2),
      rect("frame-top", 210, 92, 703, 1, accent, "none", 0)
    ];
  }

  const elements = [
    rect("frame-outer", 34, 34, 1055, 726, "none", ink, variant === "column" ? 1.8 : 1.1),
    rect("frame-inner", 49, 49, 1025, 696, "none", accent, .9),
    rect("frame-top-left", 390, 103, 130, 1, ink),
    rect("frame-top-right", 603, 103, 130, 1, ink),
    diamond("frame-fleuron", 561, 103, 5, accent)
  ];

  if (variant === "column") {
    elements.push(
      rect("frame-col-left", 61, 68, 2, 658, ink),
      rect("frame-col-right", 1060, 68, 2, 658, ink)
    );
  } else if (variant === "ornate") {
    [[49,49],[1074,49],[49,745],[1074,745]].forEach((p, i) => {
      elements.push(diamond("frame-corner-" + i, p[0], p[1], 7, accent));
    });
  } else {
    [[49,49],[1074,49],[49,745],[1074,745]].forEach((p, i) => {
      elements.push(diamond("frame-corner-" + i, p[0], p[1], 4, accent));
    });
  }
  return elements;
}

function waxSealData(wax = "#8e2f2a", imprint = "#51201d", letters = "CF") {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
      '<path d="M60 7 C72 10 78 5 87 13 C96 20 96 29 105 36 C112 45 106 55 112 64 C113 76 103 81 100 92 C93 102 82 100 74 109 C63 114 55 106 44 111 C33 108 30 99 20 96 C11 88 15 77 9 68 C7 57 15 49 12 38 C17 27 27 27 33 17 C43 10 51 13 60 7 Z" fill="' + wax + '"/>' +
      '<circle cx="60" cy="60" r="43" fill="none" stroke="' + imprint + '" stroke-width="5" opacity=".85"/>' +
      '<circle cx="60" cy="60" r="35" fill="none" stroke="' + imprint + '" stroke-width="1.4" opacity=".7"/>' +
      '<path d="M34 72 Q46 87 60 91 Q74 87 86 72 M36 48 Q48 34 60 30 Q72 34 84 48" fill="none" stroke="' + imprint + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<text x="60" y="67" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="700" fill="' + imprint + '">' + letters + '</text>' +
      '<path d="M28 36 Q36 22 52 17" fill="none" stroke="#fff4d8" stroke-width="3" opacity=".22" stroke-linecap="round"/>' +
    '</svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function seal(id = "seal", wax = "#8e2f2a", imprint = "#51201d", x = 561, y = 647, size = 84, letters = "CF") {
  return image(id, waxSealData(wax, imprint, letters), x, y, size, size, "Wax seal");
}

function verificationFooter(color, label = "Nº {{CERTIFICATE_ID}}  ·  SCAN TO VERIFY") {
  return [
    qr(),
    text("certificate-id", label, 561, 731, 650, 9.5, "600", "Arial", color)
  ];
}

function signatureLine(id, cx, label, color, y = 636) {
  return [
    rect(id + "-line", cx - 105, y, 210, 1, color),
    text(id + "-label", label, cx, y + 32, 220, 11, "600", "Georgia", color, "center", 1.22)
  ];
}

function signatureImage(id, src, cx, label, color, y = 608) {
  return [
    image(id + "-img", src, cx, y, 116, 44, label + " signature"),
    rect(id + "-line", cx - 92, y + 29, 184, 1, color),
    text(id + "-txt", label, cx, y + 58, 195, 10.5, "600", "Georgia", color, "center", 1.2)
  ];
}

function editorialTemplate({
  id,
  name,
  category,
  description,
  background = PAPER.ivory,
  ink = INK.noir,
  accent = INK.brass,
  frameStyle = "regal",
  title = "CERTIFICATE",
  subtitle = "OF ACHIEVEMENT",
  intro = "This certificate is presented to",
  body = "in recognition of meaningful contribution as {{ROLE}}\nto {{EVENT}}",
  detail = "{{DATE}}  ·  {{VENUE}}",
  organization = "{{ORGANIZATION}}",
  sealColor = "#8e2f2a",
  sealInk = "#51201d",
  useSeal = true
}) {
  const elements = [
    ...frame(ink, accent, frameStyle),
    text("organization", organization, 561, 142, 760, 14, "600", "Georgia", accent),
    text("title", title, 561, 218, 900, 48, "700", "Georgia", ink),
    text("subtitle", subtitle, 561, 260, 760, 16, "600", "Arial", accent),
    text("intro", intro, 561, 315, 760, 15, "400", "Georgia", INK.muted),
    text("name", "{{NAME}}", 561, 373, 900, 47, "600", "Palatino Linotype", ink),
    rect("name-rule", 286, 414, 550, 1, accent),
    text("body", body, 561, 474, 850, 17, "400", "Georgia", ink, "center", 1.42),
    text("details", detail, 561, 540, 760, 12.5, "600", "Arial", INK.muted),
    ...signatureLine("sig-left", 250, "Authorized Signatory", ink),
    ...signatureLine("sig-right", 873, "Program Director", ink),
    ...(useSeal ? [seal("seal", sealColor, sealInk)] : []),
    ...verificationFooter(INK.muted)
  ];
  return { id, name, category, description, page: { ...PAGE }, background, elements };
}

export const templates = [
  {
    id: "indian-medical-conf",
    name: "Indian Medical Conference",
    category: "Indian Medical",
    description: "Editorial medical conference certificate with dual institutional crests and four signatories.",
    page: { ...PAGE },
    background: PAPER.parchment,
    elements: [
      ...frame(INK.oxblood, INK.brass, "ornate"),
      image("logo-soc", ASSETS.medicalSocietyLogo, 130, 140, 82, 82, "Society emblem"),
      image("logo-col", ASSETS.medicalCollegeCrest, 993, 140, 82, 82, "College crest"),
      text("organization", "{{ORGANIZATION}}", 561, 132, 650, 20, "700", "Georgia", INK.oxblood),
      text("conference-line", "{{EDITION}} Annual Conference", 561, 168, 650, 12, "600", "Arial", INK.sepia),
      text("title", "CERTIFICATE", 561, 235, 840, 45, "700", "Georgia", INK.sepia),
      text("subtitle", "OF PARTICIPATION", 561, 273, 700, 15, "600", "Arial", INK.brass),
      text("intro", "This certificate is presented to", 561, 322, 700, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 374, 830, 42, "600", "Palatino Linotype", INK.oxblood),
      rect("name-rule", 310, 410, 502, 1, INK.brass),
      text("body", "for participation as {{ROLE}} in {{EVENT}}\norganized by {{DEPARTMENT}}", 561, 463, 850, 16, "400", "Georgia", INK.sepia, "center", 1.42),
      text("details", "{{DATE}}  ·  {{VENUE}}", 561, 523, 760, 12, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigKhurana, 160, "Patron", INK.sepia, 602),
      ...signatureImage("sig2", ASSETS.sigKhunger, 425, "President", INK.sepia, 602),
      ...signatureImage("sig3", ASSETS.sigLanger, 698, "Secretary", INK.sepia, 602),
      ...signatureImage("sig4", ASSETS.sigSingh, 963, "Organising Secretary", INK.sepia, 602),
      seal("seal", "#8e2f2a", "#53211e", 561, 687, 70, "MC"),
      ...verificationFooter(INK.muted, "Nº {{CERTIFICATE_ID}}  ·  VERIFIED RECORD")
    ]
  },

  {
    id: "indian-medical-award",
    name: "Indian Conference Merit & Award",
    category: "Indian Medical",
    description: "Formal merit and presentation award with restrained navy, brass, and ivory detailing.",
    page: { ...PAGE },
    background: PAPER.ivory,
    elements: [
      ...frame(INK.oxford, INK.brass, "ornate"),
      image("logo-soc", ASSETS.medicalSocietyLogo, 130, 138, 80, 80, "Society emblem"),
      image("logo-col", ASSETS.medicalCollegeCrest, 993, 138, 80, 80, "College crest"),
      text("organization", "{{ORGANIZATION}}", 561, 130, 650, 19, "700", "Georgia", INK.oxford),
      text("title", "CERTIFICATE", 561, 220, 820, 43, "700", "Georgia", INK.oxford),
      text("subtitle", "OF MERIT & PRESENTATION", 561, 258, 760, 15, "600", "Arial", INK.brass),
      text("intro", "Presented with distinction to", 561, 306, 700, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 357, 840, 41, "600", "Palatino Linotype", INK.oxford),
      rect("name-rule", 310, 393, 502, 1, INK.brass),
      text("award", "{{AWARD_RANK}} · {{PAPER_TYPE}}", 561, 431, 760, 14, "700", "Georgia", INK.oxblood),
      text("paper-title", "“{{PAPER_TITLE}}”", 561, 472, 860, 17, "400", "Georgia", INK.oxford),
      text("details", "{{EVENT}}  ·  {{DATE}}  ·  {{VENUE}}", 561, 522, 850, 11.5, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigKhurana, 160, "Patron", INK.oxford, 600),
      ...signatureImage("sig2", ASSETS.sigKhunger, 425, "President", INK.oxford, 600),
      ...signatureImage("sig3", ASSETS.sigLanger, 698, "Secretary", INK.oxford, 600),
      ...signatureImage("sig4", ASSETS.sigSingh, 963, "Organising Secretary", INK.oxford, 600),
      seal("seal", "#a87e2c", "#654817", 561, 685, 70, "AW"),
      ...verificationFooter(INK.muted)
    ]
  },

  {
    id: "indian-university-seminar",
    name: "Indian National University & Seminar",
    category: "Academic",
    description: "University certificate with an academic crest, classical serif hierarchy, and three signatories.",
    page: { ...PAGE },
    background: PAPER.oyster,
    elements: [
      ...frame(INK.oxford, INK.brass, "column"),
      image("university-seal", ASSETS.universitySeal, 561, 122, 70, 70, "University seal"),
      text("organization", "{{ORGANIZATION}}", 561, 174, 800, 19, "700", "Georgia", INK.oxford),
      text("department", "{{DEPARTMENT}}", 561, 202, 760, 11.5, "600", "Arial", INK.brass),
      text("title", "CERTIFICATE OF MERIT", 561, 272, 840, 38, "700", "Georgia", INK.oxford),
      text("intro", "This certifies the academic contribution of", 561, 319, 760, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 369, 850, 40, "600", "Palatino Linotype", INK.oxford),
      rect("name-rule", 318, 404, 486, 1, INK.brass),
      text("institution", "{{INSTITUTION}}", 561, 437, 760, 13, "600", "Georgia", INK.sepia),
      text("body", "for presenting “{{PAPER_TITLE}}” at {{EVENT}}", 561, 480, 850, 16, "400", "Georgia", INK.oxford),
      text("details", "{{DATE}}  ·  {{VENUE}}", 561, 528, 720, 12, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigConvener, 240, "Convener", INK.oxford, 609),
      ...signatureImage("sig2", ASSETS.sigKhunger, 561, "Head of Department", INK.oxford, 609),
      ...signatureImage("sig3", ASSETS.sigPrincipal, 882, "Director", INK.oxford, 609),
      ...verificationFooter(INK.muted)
    ]
  },

  {
    id: "indian-cme-council",
    name: "Indian CME (Medical Council)",
    category: "Medical",
    description: "CME certificate in muted sage and forest ink with council accreditation details.",
    page: { ...PAGE },
    background: PAPER.sage,
    elements: [
      ...frame(INK.forest, INK.brass, "regal"),
      image("council-seal", ASSETS.cmeCouncilCrest, 145, 145, 82, 82, "Medical council crest"),
      image("college-seal", ASSETS.medicalCollegeCrest, 978, 145, 82, 82, "Institution crest"),
      text("organization", "{{ORGANIZATION}}", 561, 134, 650, 19, "700", "Georgia", INK.forest),
      text("cme-line", "CONTINUING MEDICAL EDUCATION", 561, 171, 650, 12, "700", "Arial", INK.brass),
      text("title", "CERTIFICATE", 561, 241, 820, 42, "700", "Georgia", INK.forest),
      text("subtitle", "OF CME PARTICIPATION", 561, 278, 700, 14, "600", "Arial", INK.brass),
      text("intro", "Awarded to", 561, 322, 620, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 369, 820, 40, "600", "Palatino Linotype", INK.forest),
      text("registration", "Medical Council Reg. No. {{COUNCIL_REG_NO}}", 561, 410, 600, 10.5, "600", "Arial", INK.muted),
      text("body", "for participation as {{ROLE}} in “{{EVENT}}”\n{{CME_HOURS}} accredited CME credit hours", 561, 470, 850, 16, "400", "Georgia", INK.forest, "center", 1.42),
      text("details", "{{DATE}}  ·  {{VENUE}}", 561, 532, 720, 12, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigLanger, 240, "Council Observer", INK.forest, 608),
      ...signatureImage("sig2", ASSETS.sigKhunger, 561, "Organising Chair", INK.forest, 608),
      ...signatureImage("sig3", ASSETS.sigSingh, 882, "Organising Secretary", INK.forest, 608),
      ...verificationFooter(INK.muted)
    ]
  },

  {
    id: "indian-tech-symposium",
    name: "Indian Tech Symposium & Hackathon",
    category: "Technology",
    description: "Restrained technology award using oxford ink, brass geometry, and institutional marks.",
    page: { ...PAGE },
    background: PAPER.oyster,
    elements: [
      ...frame(INK.oxford, INK.brass, "column"),
      image("tech-logo", ASSETS.techSymposiumLogo, 145, 145, 78, 78, "Technology chapter mark"),
      image("institute-seal", ASSETS.universitySeal, 978, 145, 78, 78, "Institute seal"),
      text("organization", "{{ORGANIZATION}}", 561, 134, 650, 18, "700", "Georgia", INK.oxford),
      text("department", "{{DEPARTMENT}}", 561, 168, 650, 11, "600", "Arial", INK.brass),
      text("title", "CERTIFICATE", 561, 238, 820, 42, "700", "Georgia", INK.oxford),
      text("subtitle", "OF TECHNICAL DISTINCTION", 561, 275, 740, 14, "600", "Arial", INK.brass),
      text("intro", "Presented to", 561, 320, 650, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 368, 830, 40, "600", "Palatino Linotype", INK.oxford),
      rect("name-rule", 318, 403, 486, 1, INK.brass),
      text("body", "for {{ACHIEVEMENT}} as {{ROLE}} in {{EVENT}}", 561, 454, 850, 16, "400", "Georgia", INK.oxford),
      text("details", "{{DATE}}  ·  {{VENUE}}", 561, 509, 720, 12, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigConvener, 240, "Event Convenor", INK.oxford, 605),
      ...signatureImage("sig2", ASSETS.sigKhunger, 561, "Faculty Coordinator", INK.oxford, 605),
      ...signatureImage("sig3", ASSETS.sigPrincipal, 882, "Head of Department", INK.oxford, 605),
      seal("seal", "#2f3b68", "#18203e", 561, 688, 68, "TS"),
      ...verificationFooter(INK.muted)
    ]
  },

  {
    id: "indian-workshop-fdp",
    name: "Indian Workshop & FDP",
    category: "Academic",
    description: "Warm parchment workshop certificate with formal maroon ink and academic signatures.",
    page: { ...PAGE },
    background: PAPER.blush,
    elements: [
      ...frame(INK.oxblood, INK.brass, "regal"),
      image("institution-seal", ASSETS.universitySeal, 561, 120, 68, 68, "Institution seal"),
      text("organization", "{{ORGANIZATION}}", 561, 172, 790, 18, "700", "Georgia", INK.oxblood),
      text("program", "FACULTY DEVELOPMENT PROGRAMME · WORKSHOP", 561, 205, 800, 11.5, "700", "Arial", INK.brass),
      text("title", "CERTIFICATE OF PARTICIPATION", 561, 273, 850, 34, "700", "Georgia", INK.oxblood),
      text("intro", "This certificate is presented to", 561, 320, 700, 14, "400", "Georgia", INK.muted),
      text("name", "{{NAME}}", 561, 369, 860, 40, "600", "Palatino Linotype", INK.oxblood),
      text("role", "{{ROLE}} · {{INSTITUTION}}", 561, 413, 800, 12.5, "600", "Georgia", INK.sepia),
      text("body", "for successful participation in “{{EVENT}}”\nconducted by {{DEPARTMENT}}", 561, 468, 860, 16, "400", "Georgia", INK.sepia, "center", 1.42),
      text("details", "{{DATE}}  ·  {{VENUE}}", 561, 529, 720, 12, "600", "Arial", INK.muted),
      ...signatureImage("sig1", ASSETS.sigKhurana, 240, "Program Coordinator", INK.oxblood, 608),
      ...signatureImage("sig2", ASSETS.sigLanger, 561, "Organising Secretary", INK.oxblood, 608),
      ...signatureImage("sig3", ASSETS.sigPrincipal, 882, "Dean / Director", INK.oxblood, 608),
      ...verificationFooter(INK.muted)
    ]
  },

  editorialTemplate({
    id: "modern",
    name: "Modern Conference",
    category: "Conference",
    description: "Flagship editorial certificate with ivory paper, near-black ink, brass rules, and a wax seal.",
    background: PAPER.ivory,
    ink: INK.noir,
    accent: INK.brass,
    frameStyle: "regal",
    title: "CERTIFICATE",
    subtitle: "OF ACHIEVEMENT",
    intro: "This certificate is presented to",
    body: "in recognition of meaningful contribution as {{ROLE}}\nto {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#8e2f2a",
    sealInk: "#51201d"
  }),

  editorialTemplate({
    id: "academic",
    name: "Academic Classic",
    category: "Academic",
    description: "Classical academic certificate with parchment paper and oxford-blue typography.",
    background: PAPER.parchment,
    ink: INK.oxford,
    accent: INK.brass,
    frameStyle: "ornate",
    title: "CERTIFICATE",
    subtitle: "OF ACADEMIC DISTINCTION",
    intro: "Conferred upon",
    body: "for scholarly participation as {{ROLE}}\nin {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#a87e2c",
    sealInk: "#604415"
  }),

  editorialTemplate({
    id: "minimal",
    name: "Minimal Professional",
    category: "Corporate",
    description: "Quiet professional layout with oyster paper, generous space, and a single brass rule.",
    background: PAPER.oyster,
    ink: INK.noir,
    accent: INK.brass,
    frameStyle: "minimal",
    title: "CERTIFICATE",
    subtitle: "OF RECOGNITION",
    intro: "Presented to",
    body: "for contribution as {{ROLE}}\nto {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    useSeal: false
  }),

  editorialTemplate({
    id: "medical",
    name: "Medical Symposium",
    category: "Medical",
    description: "Clinical-academic certificate using muted sage paper and forest ink.",
    background: PAPER.sage,
    ink: INK.forest,
    accent: INK.brass,
    frameStyle: "column",
    title: "CERTIFICATE",
    subtitle: "OF CLINICAL PARTICIPATION",
    intro: "This certifies that",
    body: "{{NAME}} participated as {{ROLE}}\nin {{EVENT}}",
    detail: "{{INSTITUTION}}  ·  {{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#2e5040",
    sealInk: "#173126",
    useSeal: true
  }),

  editorialTemplate({
    id: "elegant",
    name: "Elegant Gala",
    category: "Awards",
    description: "Dark ceremonial certificate with warm brass detailing and cream typography.",
    background: PAPER.night,
    ink: INK.cream,
    accent: INK.brassLight,
    frameStyle: "ornate",
    title: "CERTIFICATE",
    subtitle: "OF EXCELLENCE",
    intro: "Presented with distinction to",
    body: "in recognition of outstanding achievement as {{ROLE}}\nat {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#a87e2c",
    sealInk: "#5f4315",
    useSeal: true
  }),

  editorialTemplate({
    id: "tech",
    name: "Tech Summit",
    category: "Technology",
    description: "Editorial technology certificate with oxford ink and restrained brass geometry.",
    background: PAPER.oyster,
    ink: INK.oxford,
    accent: INK.brass,
    frameStyle: "column",
    title: "CERTIFICATE",
    subtitle: "OF TECHNICAL CONTRIBUTION",
    intro: "Presented to",
    body: "for participation as {{ROLE}}\nin {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#2f3b68",
    sealInk: "#18203e",
    useSeal: true
  }),

  editorialTemplate({
    id: "sports",
    name: "Sports & Fitness",
    category: "Sports",
    description: "Warm achievement certificate using blush paper, oxblood ink, and restrained brass framing.",
    background: PAPER.blush,
    ink: INK.oxblood,
    accent: INK.brass,
    frameStyle: "regal",
    title: "CERTIFICATE",
    subtitle: "OF ACHIEVEMENT",
    intro: "Awarded to",
    body: "for outstanding performance as {{ROLE}}\nin {{EVENT}}",
    detail: "{{DATE}}  ·  {{VENUE}}",
    organization: "{{ORGANIZATION}}",
    sealColor: "#8e2f2a",
    sealInk: "#51201d",
    useSeal: true
  })
];

export function getTemplate(id) {
  return templates.find(t => t.id === id) || templates[0];
}
