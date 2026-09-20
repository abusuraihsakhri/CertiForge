export function randomVerifySecret() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (_) { /* fall through */ }
  return `certiforge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function baseDefaults() {
  return {
    projectName: "Untitled Conference",
    templateId: "modern",
    elements: [],
    selectedElement: null,
    rows: [],
    columns: [],
    mappings: {},
    sampleIndex: 0,
    globalFields: {
      EVENT: "Your Conference Name",
      DATE: "Event Date",
      VENUE: "Event Venue",
      ORGANIZATION: "Your Organization",
      DEPARTMENT: "Department",
      INSTITUTION: "Your Institution"
    },
    certificate: { prefix: "CONF", year: String(new Date().getFullYear()), start: 1, digits: 4, separator: "-" },
    settings: { filename: "{{CERTIFICATE_ID}}_{{NAME}}.pdf", rasterScale: 2, verifySecret: randomVerifySecret() },
    generated: [],
    registry: [],
    history: { stack: [], index: -1 },
    fonts: [],
    currentStep: "templates",
    dirtySinceSave: false
  };
}

export const state = baseDefaults();

export const defaultState = () => baseDefaults();

export function markDirty() {
  state.dirtySinceSave = true;
}
