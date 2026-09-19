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
    EVENT: "32nd Annual Conference of Delhi Society of Haematology",
    DATE: "8th October 2026",
    VENUE: "Maulana Azad Medical College, New Delhi",
    ORGANIZATION: "Delhi Society of Haematology",
    DEPARTMENT: "Department of Pathology",
    INSTITUTION: "Maulana Azad Medical College"
  },
  certificate: { prefix: "DSH", year: String(new Date().getFullYear()), start: 1, digits: 4, separator: "-" },
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
  globalFields: {
    EVENT: "32nd Annual Conference of Delhi Society of Haematology",
    DATE: "8th October 2026",
    VENUE: "Maulana Azad Medical College, New Delhi",
    ORGANIZATION: "Delhi Society of Haematology",
    DEPARTMENT: "Department of Pathology",
    INSTITUTION: "Maulana Azad Medical College"
  },
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
