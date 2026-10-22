import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Keep the suite hermetic: no third-party font fetches.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

test('app boots, registers all 13 templates, and throws no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err));

  await page.goto('/');
  await expect(page.locator('.template-card')).toHaveCount(13);
  await expect(page.locator('#appSidebar')).toBeVisible();
  await expect(page.locator('.nav-item[data-step="generate"]')).toBeVisible();

  expect(errors, `uncaught page errors: ${errors.map(e => e.message).join('; ')}`).toEqual([]);
});

test('template filtering narrows the gallery', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Academic' }).first().click();
  const count = await page.locator('.template-card').count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(13);
});
