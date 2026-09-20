import { state } from './state.js';
import { maxHistoryEntries } from './config.js';
import { clearSvgCache } from './pdf.js';

// Snapshots are shallow per-element copies: property writes (drag/resize/panel)
// replace values on the live object and never touch the snapshot, while large
// immutable strings (image srcs, text) stay shared instead of being deep-cloned.
function snapshotOf(elements) {
  return elements.map(e => {
    if (e._qrDataUrl || e._svg) {
      const { _qrDataUrl, _svg, ...rest } = e;
      return { ...rest };
    }
    return { ...e };
  });
}

export function pushHistory() {
  const snapshot = snapshotOf(state.elements);
  state.history.stack = state.history.stack.slice(0, state.history.index + 1);
  state.history.stack.push(snapshot);
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
  state.elements = state.history.stack[state.history.index].map(e => ({ ...e }));
  state.selectedElement = null;
  state.dirtySinceSave = true;
  clearSvgCache();
  return true;
}

export function redo() {
  if (state.history.index >= state.history.stack.length - 1) return false;
  state.history.index++;
  state.elements = state.history.stack[state.history.index].map(e => ({ ...e }));
  state.selectedElement = null;
  state.dirtySinceSave = true;
  clearSvgCache();
  return true;
}

export function resetHistory() {
  state.history = { stack: [snapshotOf(state.elements)], index: 0 };
  state.dirtySinceSave = false;
  clearSvgCache();
}
