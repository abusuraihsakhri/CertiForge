export const snapThreshold = 8;
export const autosaveIntervalMs = 30000;
export const maxHistoryEntries = 50;
export const batchYieldEvery = 15;
export const workerPoolMax = 8;

// Verification QR target. Empty string = same origin as the studio (recommended
// for GitHub Pages, where verify.html ships next to index.html). Set an
// absolute URL — e.g. https://certs.example.com/verify.html — to make it
// authoritative on EVERY origin; this is required when the studio runs on one
// host but the verification portal is self-hosted on a VPS (see
// docs/VPS_VERIFICATION.md). The fallback below only applies when the studio
// itself has no usable origin (file://).
export const verifyBaseUrl = "";
export const fileVerifyFallback = "https://abusuraihsakhri.github.io/CertiForge/verify.html";

// Upload ceilings (bytes)
export const maxProjectBytes = 25 * 1024 * 1024;
export const maxImageBytes = 8 * 1024 * 1024;
export const maxSpreadsheetBytes = 20 * 1024 * 1024;

// Field length ceilings applied on import/restore
export const maxTextInput = 5000;
export const maxNameLength = 120;

// Legacy salt: generation is blocked while the secret equals this value, and
// the portal treats it as non-authoritative. Certificates signed with it in
// older builds remain verifiable only against previously published registries.
export const LEGACY_VERIFY_SALT = "CertiForge-Secure-Salt";
