import { test, expect } from '@playwright/test';

const CSV = `Participant Name,Role
"dr. zoe wu, md",Alternate
Dr. Bernadette Montgomery-Walsingham-Ferguson III,Keynote Speaker
Al Kw,Delegate
`;

// 1x1 PNG (all white paper) — enough to exercise the cleaner pipeline.
const SIGNATURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto('/');
  await page.locator('.template-card').first().click();
  await expect(page.locator('.editor-layout')).toBeVisible();
  await page.click('.nav-item[data-step="data"]');
  await page.locator('#dataFile').setInputFiles({
    name: 'participants.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8')
  });
  await expect(page.locator('.import-summary')).toBeVisible();
  await page.click('#toMapping');
  await expect(page.locator('select[data-map="NAME"]')).toHaveValue('Participant Name');
  await page.click('#toPreview');
  await expect(page.locator('#previewSheet svg').first()).toBeVisible();
  await page.click('.nav-item[data-step="editor"]');
  await expect(page.locator('#recordScrubber')).toBeVisible();
});

test('record scrubber stress-tests the longest and shortest names', async ({ page }) => {
  await expect(page.locator('#scrubIndex')).toContainText('Row 1 / 3');

  await page.click('#scrubLongest');
  await expect(page.locator('#scrubIndex')).toContainText('Row 2 / 3');
  await expect(page.locator('#scrubName')).toContainText('Montgomery-Walsingh');

  await page.click('#scrubShortest');
  await expect(page.locator('#scrubIndex')).toContainText('Row 3 / 3');
  await expect(page.locator('#scrubName')).toContainText('Al Kw');

  // Prev/next bicycle through the records.
  await page.click('#scrubPrev');
  await expect(page.locator('#scrubIndex')).toContainText('Row 2 / 3');
});

test('smart auto-fit shrinks a long name and reports telemetry', async ({ page }) => {
  await page.click('#addTextBtn');
  await page.fill('#propText', 'Dr. Bernadette Cathryn-Elisabeth Montgomery-Walsingham-Ferguson de la Viesca y III, MD, PhD, FRCS');

  await page.check('#propAutoFit');
  await expect(page.locator('#autofitTelemetry')).toBeVisible();

  // 100+ chars in a default 600px box must trigger the shrink path.
  await expect(page.locator('#autofitTelemetry')).toContainText(/shrunk|overflows/i, { timeout: 10_000 });
  await page.fill('#propFitMin', '6');
  // The layer list tags the auto-fit state.
  await expect(page.locator('.element-row.selected .tag')).toContainText('auto-fit');
});

test('Clean Case title-cases the mapped NAME column and repaints the scrubber', async ({ page }) => {
  // Current record shows the raw messy value first.
  await expect(page.locator('#scrubName')).toContainText('dr. zoe wu, md');

  await page.click('#cleanCaseBtn');
  await expect(page.locator('.toast.show')).toContainText('Title-cased');
  // The live scrubber + preview must reflect the cleaned value.
  await expect(page.locator('#scrubName')).toContainText('Zoe Wu');
  await page.click('.nav-item[data-step="preview"]');
  await expect(page.locator('#previewSheet svg').first()).toContainText('Dr. Zoe Wu, MD');
});

test('signature cleaner strips the paper background into a layer', async ({ page }) => {
  const layersBefore = await page.locator('.element-row').count();
  await page.locator('#sigUploadInput').setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer: SIGNATURE_PNG });

  await expect(page.locator('.toast.show')).toContainText('Signature cleaned', { timeout: 10_000 });
  const rows = page.locator('.element-row');
  await expect(rows).toHaveCount(layersBefore + 1);
  await expect(rows.last()).toContainText('cleaned');

  // The canvas carries the cleaned (transparent) PNG as a visible img layer.
  await expect(page.locator('#editorCanvas img.image-element').last()).toHaveAttribute('src', /data:image\/png;base64/);
});
