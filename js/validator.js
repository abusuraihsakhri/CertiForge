import { state } from './state.js';
import { mappedRows } from './mapping.js';
import { LEGACY_VERIFY_SALT } from './config.js';

export function validateRows() {
  const mapped = mappedRows();
  const missing = mapped.filter(r => !String(r.NAME || "").trim());
  const duplicates = {};
  mapped.forEach(r => { const n = String(r.NAME || "").trim().toLowerCase(); if (n) duplicates[n] = (duplicates[n] || 0) + 1; });
  const dup = Object.values(duplicates).filter(n => n > 1).length;
  return { total: mapped.length, missingName: missing.length, duplicateNames: dup, valid: mapped.length - missing.length, nameMapped: Boolean(state.mappings.NAME) };
}

export function validateProject() {
  const errors = [], warnings = [];
  if (!state.rows.length) errors.push("No participant data loaded.");
  if (!state.mappings.NAME) errors.push("No column mapped to {{NAME}}.");
  if (!state.elements.length) errors.push("Template has no elements.");
  const secret = String(state.settings.verifySecret || "");
  if (!secret) errors.push("Set a verification signing secret before generating.");
  else if (secret === LEGACY_VERIFY_SALT || secret.length < 8) warnings.push("Your signing secret is weak or the well-known default. Click Randomize for stronger tamper evidence.");
  const missingVars = state.elements.filter(e => e.type === "text" && /\{\{[A-Z0-9_]+\}\}/.test(e.text || "") && !e.variable);
  if (missingVars.length > 3) warnings.push(`${missingVars.length} text elements contain unresolved variables.`);
  const val = validateRows();
  if (val.duplicateNames) warnings.push(`${val.duplicateNames} duplicate names detected.`);
  if (val.missingName) warnings.push(`${val.missingName} rows without a name will be skipped.`);
  return { valid: errors.length === 0, errors, warnings };
}
