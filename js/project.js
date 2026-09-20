import { state, defaultState } from './state.js';
import { getTemplate } from './templates.js';
import { resetHistory } from './history.js';
import { safeFilename } from './utils.js';
import { sanitizeProjectState } from './security.js';
import { clearAutosave } from './storage.js';
import { maxProjectBytes } from './config.js';

export { SAFE_FONT_DATA_URL } from './security.js';

export function projectData() {
  return {
    version: 3,
    projectName: state.projectName,
    templateId: state.templateId,
    elements: state.elements,
    mappings: state.mappings,
    globalFields: state.globalFields,
    certificate: {
      prefix: state.certificate.prefix,
      year: state.certificate.year,
      start: state.certificate.start,
      digits: state.certificate.digits,
      separator: state.certificate.separator
    },
    // NOTE: the project file contains the signing secret. Treat .certiforge files
    // like a credential — do not publish them publicly.
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
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  state.dirtySinceSave = false;
  clearAutosave();
}

export async function applySanitizedState(patch) {
  Object.assign(state, patch);
  for (const f of state.fonts) {
    try {
      const ff = new FontFace(f.family, `url(${f.data})`);
      const loaded = await ff.load();
      document.fonts.add(loaded);
    } catch (e) { console.warn("Could not restore font:", f.name, e); }
  }
  resetHistory();
}

export async function loadProjectFile(file) {
  if (file.size && file.size > maxProjectBytes) throw new Error("Project file is too large (limit 25 MB).");
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (_) {
    throw new Error("Project file is not valid JSON.");
  }
  if (!data || typeof data !== "object") throw new Error("Not a valid CertiForge project.");
  if (data.version !== 3) {
    throw new Error(`Project file version ${data.version ?? "?"} is not supported by this build (expected v3). Re-export it from the version that created it.`);
  }
  const patch = sanitizeProjectState(data, defaultState());
  if (data.templateId && patch.templateId !== data.templateId) {
    console.warn(`Unknown template "${data.templateId}" in project file; falling back to ${patch.templateId}.`);
  }
  await applySanitizedState(patch);
}
