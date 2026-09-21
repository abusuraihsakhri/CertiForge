/**
 * ECDSA P-256 signing and verification for CertiForge.
 *
 * The studio generates a keypair per project. The private key is stored in
 * IndexedDB (browser origin isolation protects it at rest) and optionally
 * exported passphrase-protected for backup. The public key is published in the
 * verification registry so the portal can verify signatures cryptographically
 * without ever holding the private key.
 *
 * Signing covers the same canonical payload hash that the HMAC path computes,
 * so both algorithms bind the same six fields in the same length-prefixed
 * order. The ECDSA signature is ~86 base64url chars (vs 16 hex for HMAC) and
 * carries genuine forgery resistance — no one without the private key can
 * produce a valid signature, even if they know the payload hash.
 */

const ECDSA_PARAMS = { name: 'ECDSA', namedCurve: 'P-256' };
const ECDSA_SIGN_PARAMS = { name: 'ECDSA', hash: 'SHA-256' };

export function hasWebCrypto() {
  return typeof crypto !== 'undefined' && typeof crypto.subtle === 'object';
}

// ---- Key generation / import / export ----

export async function generateKeyPair() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(ECDSA_PARAMS, true, ['sign', 'verify']);
  return { publicKey, privateKey };
}

export async function exportPublicKeyJWK(key) {
  return crypto.subtle.exportKey('jwk', key);
}

export async function exportPrivateKeyJWK(key) {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKeyJWK(jwk) {
  return crypto.subtle.importKey('jwk', jwk, ECDSA_PARAMS, true, ['verify']);
}

export async function importPrivateKeyJWK(jwk) {
  return crypto.subtle.importKey('jwk', jwk, ECDSA_PARAMS, false, ['sign']);
}

// ---- Signing / verification ----

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

function bytesToBase64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Sign a payload hash (64-char hex from sha256(canonicalPayload)) with the
 * project's ECDSA private key. Returns a base64url-encoded signature.
 */
export async function signPayload(privateKey, payloadHashHex) {
  const sig = await crypto.subtle.sign(ECDSA_SIGN_PARAMS, privateKey, hexToBytes(payloadHashHex));
  return bytesToBase64url(new Uint8Array(sig));
}

/**
 * Verify an ECDSA signature against a payload hash and public key.
 * Returns true only if the signature is valid.
 */
export async function verifySignature(publicKey, payloadHashHex, signatureBase64url) {
  return crypto.subtle.verify(ECDSA_SIGN_PARAMS, publicKey, base64urlToBytes(signatureBase64url), hexToBytes(payloadHashHex));
}

// ---- Passphrase-protected key export (PBKDF2 → AES-GCM) ----

async function derivePassphraseKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithPassphrase(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePassphraseKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { v: 1, salt: bytesToBase64url(salt), iv: bytesToBase64url(iv), ct: bytesToBase64url(new Uint8Array(ct)) };
}

export async function decryptWithPassphrase(encrypted, passphrase) {
  if (encrypted.v !== 1) throw new Error('Unsupported encrypted format.');
  const key = await derivePassphraseKey(passphrase, base64urlToBytes(encrypted.salt));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64urlToBytes(encrypted.iv) },
    key,
    base64urlToBytes(encrypted.ct)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}
