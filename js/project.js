import { state, defaultState } from './state.js';
import { getTemplate } from './templates.js';
import { resetHistory } from './history.js';
import { safeFilename } from './utils.js';

export function projectData() {
  return {
    version: 3,
    projectName: state.projectName,
    templateId: state.templateId,
    elements: state.elements,
    mappings: state.mappings,
    globalFields: state.globalFields,
    certificate: state.certificate,
    settings: state.settings,
    fonts: state.fonts?.map(f => ({ name: f.name, family: f.family, data: f.data }))
  };
}

export function saveProject() {
  const blob = new Blob([JSON.stringify(projectData(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = safeFilename(state.projectName || "CertiForge-project") + ".certiforge";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  state.dirtySinceSave = false;
}

export async function loadProjectFile(file) {
  if (file.size && file.size > 25 * 1024 * 1024) throw new Error("Project file is too large.");
  const data = JSON.parse(await file.text());
  if (!data.version || !Array.isArray(data.elements)) throw new Error("Not a valid CertiForge project.");
  const template = getTemplate(data.templateId || "modern");
  const safeElements = data.elements.filter(e => e && typeof e === "object" && ["text", "shape", "image", "qr"].includes(e.type)).map(e => {
    const n = structuredClone(e);
    n.id = String(n.id || ("element_" + Date.now()));
    if (n.type === "image" && n.src && !String(n.src).startsWith("data:image/")) n.src = "";
    return n;
  });
  const restoredFonts = (data.fonts || []).map(f => ({ name: f.name, family: f.family, data: f.data }));
  const importedSettings = Object.assign({}, data.settings || {});
  delete importedSettings.verifySecret;
  Object.assign(state, {
    projectName: String(data.projectName || "Imported Project"),
    templateId: template.id,
    elements: safeElements,
    mappings: data.mappings && typeof data.mappings === "object" ? data.mappings : {},
    globalFields: Object.assign({}, defaultState().globalFields, data.globalFields || {}),
    certificate: Object.assign({}, defaultState().certificate, data.certificate || {}),
    settings: Object.assign({}, defaultState().settings, importedSettings),
    fonts: restoredFonts,
    selectedElement: null, rows: [], columns: [], sampleIndex: 0, generated: []
  });
  if (restoredFonts.length) {
    for (const f of restoredFonts) {
      try {
        const ff = new FontFace(f.family, `url(${f.data})`);
        const loaded = await ff.load();
        document.fonts.add(loaded);
      } catch (e) { console.warn("Could not restore font:", f.name, e); }
    }
  }
  resetHistory();
}
