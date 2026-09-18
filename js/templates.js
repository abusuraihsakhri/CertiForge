export const templates = [
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
      { id: "id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}", x: 561, y: 735, w: 700, size: 10, weight: "500", align: "center", font: "Arial" }
    ]
  },
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
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 735, w: 500, size: 10, align: "center", font: "Georgia" }
    ]
  },
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
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 710, w: 600, size: 10, align: "center", font: "Arial" }
    ]
  },
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
      { id: "id", type: "text", text: "Certificate ID: {{CERTIFICATE_ID}}", x: 570, y: 735, w: 700, size: 10, align: "center", font: "Arial" }
    ]
  },
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
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 561, y: 730, w: 500, size: 9, weight: "400", align: "center", font: "Arial", color: "#8a7e6b" }
    ]
  },
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
      { id: "id", type: "text", text: "ID: {{CERTIFICATE_ID}}", x: 561, y: 725, w: 400, size: 10, weight: "500", align: "center", font: "Arial", color: "#5a8a9a" }
    ]
  },
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
      { id: "id", type: "text", text: "{{CERTIFICATE_ID}}", x: 650, y: 680, w: 400, size: 9, weight: "500", align: "center", font: "Arial", color: "#777" }
    ]
  }
];

export function getTemplate(id) {
  return templates.find(t => t.id === id) || templates[0];
}
