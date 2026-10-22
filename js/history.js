import { state } from './state.js';
import { maxHistoryEntries } from './config.js';
import { clearSvgCache } from './pdf.js';

// Snapshots cover everything the undo stack promises to restore: elements,
// column mappings, event-wide fields and certificate numbering — so undoing a
// mapping or prefix change actually reverts it. Element snapshots are shallow
// per-element copies: property writes (drag/resize/panel) replace values on
// the live object and never touch the snapshot, while large immutable strings
// (image srcs, text) stay shared instead of being deep-cloned.
function snapshotOf() {
  return {
    elements: state.elements.map(e => {
      if (e._qrDataUrl || e._svg) {
        const { _qrDataUrl, _svg, ...rest } = e;
        return { ...rest };
      }
      return { ...e };
    }),
    mappings: { ...state.mappings },
    globalFields: { ...state.globalFields },
    certificate: { ...state.certificate },
    selectedElement: state.selectedElement
  };
}

function restore(entry) {
  state.elements = entry.elements.map(e => ({ ...e }));
  state.mappings = { ...entry.mappings };
  state.globalFields = { ...entry.globalFields };
  state.certificate = { ...entry.certificate };
  // Keep the selection only when the element still exists after the restore.
  state.selectedElement = entry.elements.some(e => e.id === entry.selectedElement)
    ? entry.selectedElement
    : null;
  state.dirtySinceSave = true;
  clearSvgCache();
}

export function pushHistory() {
  state.history.stack = state.history.stack.slice(0, state.history.index + 1);
  state.history.stack.push(snapshotOf());
  if (state.history.stack.length > maxHistoryEntries) {
    state.history.stack.shift();
  }
  state.history.index = state.history.stack.length - 1;
  state.dirtySinceSave = true;
  clearSvgCache();
}

export function undo() {
  if (state.history.index <= 0) return false;
  state.history.index--;
  restore(state.history.stack[state.history.index]);
  return true;
}

export function redo() {
  if (state.history.index >= state.history.stack.length - 1) return false;
  state.history.index++;
  restore(state.history.stack[state.history.index]);
  return true;
}

export function resetHistory() {
  state.history = { stack: [snapshotOf()], index: 0 };
  state.dirtySinceSave = false;
  clearSvgCache();
}
