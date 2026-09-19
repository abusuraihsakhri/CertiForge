export const state = {
  projectName: "Untitled Conference",
  templateId: "modern",
  elements: [],
  selectedElement: null,
  rows: [],
  columns: [],
  mappings: {},
  sampleIndex: 0,
  globalFields: {
    EVENT: "International Conference 2026",
    DATE: "12 September 2026",
    VENUE: "Grand Conference Centre",
    ORGANIZATION: "Example Organization"
  },
  certificate: { prefix: "CONF", year: String(new Date().getFullYear()), start: 1, digits: 4, separator: "-" },
  settings: { filename: "{{CERTIFICATE_ID}}_{{NAME}}.pdf", rasterScale: 2, verifySecret: "CertiForge-Secure-Salt" },
  generated: [],
  registry: [],
  history: { stack: [], index: -1 },
  fonts: [],
  currentStep: "templates",
  dirtySinceSave: false
};

export const defaultState = () => ({
  projectName: "Untitled Conference",
  templateId: "modern",
  elements: [],
  selectedElement: null,
  rows: [],
  columns: [],
  mappings: {},
  sampleIndex: 0,
  globalFields: { EVENT: "International Conference 2026", DATE: "12 September 2026", VENUE: "Grand Conference Centre", ORGANIZATION: "Example Organization" },
  certificate: { prefix: "CONF", year: String(new Date().getFullYear()), start: 1, digits: 4, separator: "-" },
  settings: { filename: "{{CERTIFICATE_ID}}_{{NAME}}.pdf", rasterScale: 2, verifySecret: "CertiForge-Secure-Salt" },
  generated: [],
  registry: [],
  history: { stack: [], index: -1 },
  fonts: [],
  currentStep: "templates",
  dirtySinceSave: false
});

export const setState = patch => Object.assign(state, patch);
