import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto('/');
  await page.locator('.template-card').first().click();
  await expect(page.locator('.editor-layout')).toBeVisible();
});

test('adding a text element selects it and opens the inspector', async ({ page }) => {
  const rowsBefore = await page.locator('.element-row').count();
  await page.click('#addTextBtn');
  await expect(page.locator('.element-row')).toHaveCount(rowsBefore + 1);
  await expect(page.locator('#propText')).toHaveValue('New text');
  await expect(page.locator('.element-row.selected')).toHaveCount(1);
});

test('inspector edits repaint the layer label; undo and redo restore history', async ({ page }) => {
  await page.click('#addTextBtn');

  const editedLabel = page.locator('.element-item span', { hasText: 'E2E Edited Text' });
  const addedLabel = page.locator('.element-item span', { hasText: /^New text$/ });
  await expect(addedLabel).toHaveCount(1);

  await page.fill('#propText', 'E2E Edited Text');
  await page.locator('#propText').blur();
  await expect(editedLabel).toHaveCount(1);
  await expect(addedLabel).toHaveCount(0);

  await page.click('#undoBtn');
  await expect(addedLabel).toHaveCount(1);
  await expect(editedLabel).toHaveCount(0);

  await page.click('#redoBtn');
  await expect(editedLabel).toHaveCount(1);
});

test('deleting an element removes it from the layers panel', async ({ page }) => {
  await page.click('#addTextBtn');
  const count = await page.locator('.element-row').count();
  await page.click('#deleteEl');
  await expect(page.locator('.element-row')).toHaveCount(count - 1);
  await expect(page.locator('#properties .empty')).toBeVisible();
});

test('shift-click multi-select enables the align toolbar', async ({ page }) => {
  await page.click('#addTextBtn');
  await page.fill('#propText', 'Alpha Label');
  await page.locator('#propText').blur();
  await page.click('#addTextBtn');

  const alignLeft = page.locator('[data-align="left"]');
  // Single selection keeps the toolbar disabled (aria-disabled = Playwright
  // refuses to click it, which is the guard working).
  await expect(alignLeft).toHaveAttribute('aria-disabled', 'true');

  // …and a two-element selection enables alignment.
  const alphaRow = page.locator('.element-item', { hasText: 'Alpha Label' });
  await alphaRow.click({ modifiers: ['Shift'] });
  await expect(alignLeft).toHaveAttribute('aria-disabled', 'false');
  await alignLeft.click();
  await expect(page.locator('.toast.show')).toContainText('Aligned selection');
});
