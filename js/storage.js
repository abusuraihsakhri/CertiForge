import { state } from './state.js';
import { projectData } from './project.js';
import { toast } from './utils.js';
import { autosaveIntervalMs } from './config.js';

const DB_NAME = 'CertiForge';
const DB_VERSION = 1;
const STORE = 'projects';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Autosave requires IndexedDB, which this environment does not provide.'));
      return;
    }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (err) { reject(err); return; }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onblocked = () => reject(new Error('Autosave database is blocked by another open tab.'));
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); _dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Could not open the autosave database.'));
  });
  // Allow retry on next tick after a failed open (the caller's own catch still sees it).
  _dbPromise.catch(() => { _dbPromise = null; });
  return _dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Autosave transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('Autosave transaction was aborted (storage may be full).'));
  });
}

let _quotaWarned = false;

export async function autosaveProject() {
  if (!state.dirtySinceSave) return;
  try {
    const database = await openDB();
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(projectData(), 'current_project');
    await txDone(tx);
    _quotaWarned = false;
  } catch (e) {
    console.warn('Autosave failed:', e);
    if (!_quotaWarned) {
      _quotaWarned = true;
      toast('Autosave failed — browser storage may be full. Use Save to export a project file.');
    }
  }
}

export async function restoreAutosave() {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('current_project');
    const data = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
      tx.onabort = () => rej(tx.error || new Error('Autorestore aborted.'));
    });
    if (data && data.version && Array.isArray(data.elements)) return data;
  } catch (e) { console.warn('Autorestore failed:', e); }
  return null;
}

export async function clearAutosave() {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete('current_project');
    await txDone(tx);
  } catch (e) { /* ignore */ }
}

let _autosaveTimer = null;
export function startAutosave() {
  if (_autosaveTimer) clearInterval(_autosaveTimer);
  _autosaveTimer = setInterval(() => { autosaveProject(); }, autosaveIntervalMs);
}
export function stopAutosave() {
  if (_autosaveTimer) { clearInterval(_autosaveTimer); _autosaveTimer = null; }
}
