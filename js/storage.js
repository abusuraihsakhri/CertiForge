import { state } from './state.js';
import { projectData } from './project.js';
import { autosaveIntervalMs } from './config.js';

const DB_NAME = 'CertiForge';
const DB_VERSION = 1;
const STORE = 'projects';

let db = null;

function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function autosaveProject() {
  try {
    if (!state.dirtySinceSave) return;
    const database = await openDB();
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(projectData(), 'current_project');
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) { console.warn('Autosave failed:', e); }
}

export async function restoreAutosave() {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('current_project');
    const data = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
    if (data && data.version && Array.isArray(data.elements)) {
      return data;
    }
  } catch (e) { console.warn('Autorestore failed:', e); }
  return null;
}

export async function clearAutosave() {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete('current_project');
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) { /* ignore */ }
}

let _autosaveTimer = null;
export function startAutosave() {
  if (_autosaveTimer) clearInterval(_autosaveTimer);
  _autosaveTimer = setInterval(autosaveProject, autosaveIntervalMs);
}
export function stopAutosave() {
  if (_autosaveTimer) { clearInterval(_autosaveTimer); _autosaveTimer = null; }
}
