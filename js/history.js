import { state } from './state.js';

const MAX_HISTORY = 50;

export function pushHistory() {
  const snapshot = structuredClone(state.elements);
  state.history.stack = state.history.stack.slice(0, state.history.index + 1);
  state.history.stack.push(snapshot);
  if (state.history.stack.length > MAX_HISTORY) {
    state.history.stack.shift();
  }
  state.history.index = state.history.stack.length - 1;
  state.dirtySinceSave = true;
}

export function undo() {
  if (state.history.index <= 0) return false;
  state.history.index--;
  state.elements = structuredClone(state.history.stack[state.history.index]);
  state.selectedElement = null;
  return true;
}

export function redo() {
  if (state.history.index >= state.history.stack.length - 1) return false;
  state.history.index++;
  state.elements = structuredClone(state.history.stack[state.history.index]);
  state.selectedElement = null;
  return true;
}

export function resetHistory() {
  state.history = { stack: [structuredClone(state.elements)], index: 0 };
  state.dirtySinceSave = false;
}
