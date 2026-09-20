export const snapThreshold = 8;
export const autosaveIntervalMs = 30000;
export const maxHistoryEntries = 50;
export const batchYieldEvery = 15;
export const workerPoolMax = 8;

// Fallback verification URL used when the app runs from file:// or has no usable origin.
export const verifyBaseUrl = "https://abusuraihsakhri.github.io/CertiForge/verify.html";

// Upload ceilings (bytes)
export const maxProjectBytes = 25 * 1024 * 1024;
export const maxImageBytes = 8 * 1024 * 1024;
export const maxSpreadsheetBytes = 20 * 1024 * 1024;

// Field length ceilings applied on import/restore
export const maxTextInput = 5000;
export const maxNameLength = 120;

// Legacy salt: signatures made with it are no longer accepted as authoritative.
export const LEGACY_VERIFY_SALT = "CertiForge-Secure-Salt";
