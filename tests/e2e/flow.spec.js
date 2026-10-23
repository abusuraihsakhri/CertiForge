import { test, expect } from '@playwright/test';

const CSV = 'Participant Name,Role\nAlice Example,Speaker\nBob Sample,Delegate\n';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto('/');
  await page.locator('.template-card').first().click();
  await expect(page.locator('.editor-layout')).toBeVisible();
  await page.click('.nav-item[data-step="data"]');
});

test('full studio flow: import → map → preview → generate batch', async ({ page }) => {
  // Import participants
  await page.locator('#dataFile').setInputFiles({
    name: 'participants.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8')
  });
  await expect(page.locator('.import-summary')).toBeVisible();
  await expect(page.locator('.import-summary-copy span')).toContainText('2 rows');

  // Mapping: NAME auto-map must be pre-selected
  await page.click('#toMapping');
  await expect(page.locator('#global-EVENT')).toBeVisible();
  await expect(page.locator('select[data-map="NAME"]')).toHaveValue('Participant Name');
  await page.fill('#global-EVENT', 'E2E Test Conference');
  await page.click('#toPreview');

  // Preview renders the real first participant
  const sheet = page.locator('#previewSheet svg').first();
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Alice Example');

  // Generate the batch end-to-end (real workers, real PDF assembly)
  await page.click('#toGenerate');
  await expect(page.locator('#generateBtn')).toBeVisible();
  await page.click('#generateBtn');
  await expect(page.locator('#resultCard')).toContainText('Generation complete', { timeout: 90_000 });
  await expect(page.getByRole('button', { name: /Download ZIP \(2 PDFs\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Download verification registry/ })).toBeVisible();
  await expect(page.locator('#resultCard')).toContainText('2 PDFs are ready');
});

test('importing a file with no name column routes mapping guidance', async ({ page }) => {
  await page.locator('#dataFile').setInputFiles({
    name: 'nonames.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Email,Note\na@b.c,hello\n', 'utf8')
  });
  await expect(page.locator('.import-summary')).toBeVisible();
  await page.click('#toMapping');
  // Continuing without a NAME mapping is blocked with guidance
  await page.click('#toPreview').catch(() => {});
  await page.waitForTimeout(300);
  // The workflow must not reach preview without a NAME mapping
  await page.click('.nav-item[data-step="preview"]');
  await page.waitForTimeout(300);
  await expect(page.locator('select[data-map="NAME"]')).toBeVisible();
});
