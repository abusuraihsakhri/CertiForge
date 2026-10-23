import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Keep the suite hermetic: no third-party font fetches.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto('/');
});

test('preset library exposes 100 layouts without changing the curated gallery', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err));

  // The curated editorial gallery keeps its 13 cards.
  await expect(page.locator('.template-card')).toHaveCount(13);
  await expect(page.locator('#presetGrid')).toBeVisible();

  // The library opens on the Academic archetype: 10 of the 100 presets.
  await expect(page.locator('.preset-card')).toHaveCount(10);
  await expect(page.locator('.preset-card[data-preset="tpl-001"]')).toBeVisible();

  // A different palette family re-renders the grid (Medical = tpl-011 … tpl-020).
  await page.locator('#presetFilters [data-preset-cat="Medical"]').click();
  await expect(page.locator('.preset-card')).toHaveCount(10);
  await expect(page.locator('.preset-card[data-preset="tpl-011"]').first()).toBeVisible();

  // "All" surfaces the whole zero-asset library.
  await page.locator('#presetFilters [data-preset-cat="All"]').click();
  await expect(page.locator('.preset-card')).toHaveCount(100, { timeout: 30_000 });

  expect(errors, `uncaught page errors: ${errors.map(e => e.message).join('; ')}`).toEqual([]);
});

test('applying a preset loads an editable design', async ({ page }) => {
  await page.locator('.preset-card[data-preset="tpl-001"]').click();
  await expect(page.locator('.editor-layout')).toBeVisible();

  // The preset header copy paints onto the live canvas.
  await expect(page.locator('#editorCanvas')).toContainText('CERTIFICATE OF ACCREDITATION');

  // The name layer is the {{NAME}} text layer: it must resolve to a real value
  // (never an empty box) in the canvas and stay reachable from the layer list.
  const nameLayerButton = page.locator('#elementList .element-item').filter({ hasText: /\{\{NAME\}\}|^NAME/ }).first();
  await expect(nameLayerButton).toHaveCount(1);
  const nameLayerId = await nameLayerButton.getAttribute('data-el');
  expect(nameLayerId, 'the {{NAME}} layer must be addressable from the layer list').toBeTruthy();

  const nameLayer = page.locator(`#editorCanvas [data-id="${nameLayerId}"]`);
  await expect(nameLayer).toBeVisible();
  const resolvedName = ((await nameLayer.textContent()) || '').trim();
  expect(resolvedName.length, 'the {{NAME}} layer must resolve to a non-empty value').toBeGreaterThan(0);

  const layerCount = await page.locator('#elementList .element-row').count();
  expect(layerCount, 'a preset layout carries at least 12 layers').toBeGreaterThanOrEqual(12);

  // Selecting the name layer opens the inspector with its auto-fit toggle on.
  await nameLayerButton.click();
  await expect(page.locator('#propAutoFit')).toBeChecked();

  // Presets are additive: the curated gallery is still 13 cards.
  await page.click('.nav-item[data-step="templates"]');
  await expect(page.locator('.template-card')).toHaveCount(13);
});
