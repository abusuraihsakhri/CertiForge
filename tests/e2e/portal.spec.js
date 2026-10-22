import { test, expect } from '@playwright/test';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';
import { canonicalPayload, sha256 } from '../../js/variables.js';

// Build a real schema-3 registry fixture signed with a throwaway P-256 key.
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pubJwk = publicKey.export({ format: 'jwk' });
const FIELDS = {
  CERTIFICATE_ID: 'E2E-2026-0001',
  NAME: 'Alice Example',
  ROLE: 'Speaker',
  EVENT: 'E2E Verify Event',
  DATE: '22 Oct 2026',
  ORGANIZATION: 'E2E Society'
};
const hashHex = sha256(canonicalPayload(FIELDS));
const ecdsaSig = nodeSign('sha256', Buffer.from(hashHex, 'hex'), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

const REGISTRY = {
  schema: 3,
  publicKey: pubJwk,
  event: 'E2E Verify Event',
  organization: 'E2E Society',
  generatedAt: new Date().toISOString(),
  signature: { algorithm: 'ecdsa-p256', hash: 'sha256-canonical-payload' },
  totalCertificates: 1,
  certificates: [{ id: FIELDS.CERTIFICATE_ID, sig: ecdsaSig, h: hashHex }]
};

async function serveRegistry(page) {
  await page.route('**/verification-registry.json', route => route.fulfill({ json: REGISTRY }));
}

test('valid ECDSA QR tuple verifies cryptographically', async ({ page }) => {
  await serveRegistry(page);
  await page.goto(`/verify.html?id=${FIELDS.CERTIFICATE_ID}&sig=${encodeURIComponent(ecdsaSig)}&h=${hashHex}`);
  await expect(page.getByText('Credential Cryptographically Verified')).toBeVisible();
  await expect(page.getByText('ECDSA P-256 Signature Verified')).toBeVisible();
  await expect(page.locator('#verifyCard')).toContainText(FIELDS.CERTIFICATE_ID);
});

test('a tampered payload hash fails signature verification', async ({ page }) => {
  await serveRegistry(page);
  const wrongHash = 'b'.repeat(64);
  await page.goto(`/verify.html?id=${FIELDS.CERTIFICATE_ID}&sig=${encodeURIComponent(ecdsaSig)}&h=${wrongHash}`);
  await expect(page.getByText('Signature Verification Failed')).toBeVisible();
  await expect(page.getByText('Credential Cryptographically Verified')).toHaveCount(0);
});

test('a revoked certificate shows REVOKED even with valid signature material', async ({ page }) => {
  const revokedRegistry = {
    ...REGISTRY,
    certificates: [
      ...REGISTRY.certificates,
      { id: 'E2E-2026-0002', sig: ecdsaSig, h: hashHex, revoked: true, revokedAt: '2026-10-01T00:00:00Z' }
    ]
  };
  await page.route('**/verification-registry.json', route => route.fulfill({ json: revokedRegistry }));
  await page.goto(`/verify.html?id=E2E-2026-0002&sig=${encodeURIComponent(ecdsaSig)}&h=${hashHex}`);
  await expect(page.getByText('This Certificate Has Been Revoked')).toBeVisible();
  await expect(page.getByText('Certificate Revoked')).toBeVisible();
  await expect(page.getByText('Credential Cryptographically Verified')).toHaveCount(0);
});

test('an unregistered ID is rejected', async ({ page }) => {
  await serveRegistry(page);
  await page.goto(`/verify.html?id=NOPE-2026-9999&sig=${encodeURIComponent(ecdsaSig)}&h=${hashHex}`);
  await expect(page.getByText('Certificate ID Not Found')).toBeVisible();
});

test('without a registry the portal refuses to claim verification', async ({ page }) => {
  await page.route('**/verification-registry.json', route => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto(`/verify.html?id=${FIELDS.CERTIFICATE_ID}&sig=${encodeURIComponent(ecdsaSig)}&h=${hashHex}`);
  await expect(page.getByText('Cannot Verify Without a Registry')).toBeVisible();
});
