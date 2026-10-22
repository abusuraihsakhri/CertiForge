import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

test('theme toggle switches, persists across reload, and announces itself', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#themeToggleBtn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('certiforge-theme'))).toBe('dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Toggle dark theme');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile drawer opens, traps behind backdrop semantics, and closes on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');

  const sidebar = page.locator('#appSidebar');
  const trigger = page.locator('#mobileMenuBtn');
  await expect(sidebar).not.toHaveClass(/mobile-open/);

  await trigger.click();
  await expect(sidebar).toHaveClass(/mobile-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(sidebar).not.toHaveClass(/mobile-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('skip link and help dialog accessibility hooks exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.skip-link')).toHaveCount(1);

  await page.click('#helpBtn');
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#helpTitle')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
