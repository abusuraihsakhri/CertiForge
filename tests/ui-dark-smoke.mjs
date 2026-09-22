import { chromium } from 'playwright';
import fs from 'node:fs';

function assert(value, message) { if (!value) throw new Error(message); }
fs.mkdirSync('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  // Desktop: theme, shell, editor, data and mapping.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await desktop.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await desktop.waitForSelector('.template-card');

  let state = await desktop.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    bodyScroll: document.body.scrollHeight,
    viewport: innerHeight,
    horizontal: document.documentElement.scrollWidth - innerWidth,
    sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width || 0,
    workspaceOverflow: getComputedStyle(document.querySelector('.workspace')).overflowY
  }));
  assert(state.theme === 'dark', 'Desktop should default to dark theme');
  assert(state.horizontal <= 2, 'Desktop has horizontal overflow');
  assert(state.sidebarWidth >= 250, 'Desktop sidebar is not fixed-width studio navigation');
  assert(state.workspaceOverflow === 'auto', 'Workspace should scroll independently');

  await desktop.locator('#themeToggleBtn').click();
  assert(await desktop.evaluate(() => document.documentElement.dataset.theme) === 'light', 'Theme toggle did not switch to light');
  await desktop.reload({ waitUntil: 'networkidle' });
  assert(await desktop.evaluate(() => document.documentElement.dataset.theme) === 'light', 'Light theme did not persist');
  await desktop.locator('#themeToggleBtn').click();
  assert(await desktop.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'Theme did not switch back to dark');

  await desktop.screenshot({ path: 'artifacts/desktop-templates-dark.png', fullPage: true });

  await desktop.locator('.template-card').first().click();
  await desktop.waitForSelector('.editor-layout');
  state = await desktop.evaluate(() => {
    const canvas = document.querySelector('.certificate-canvas')?.getBoundingClientRect();
    const stage = document.querySelector('.canvas-stage');
    return {
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      stageBg: getComputedStyle(stage).backgroundImage,
      horizontal: document.documentElement.scrollWidth - innerWidth
    };
  });
  assert(state.width > 300 && state.height > 180, 'Editor certificate artboard collapsed');
  assert(state.stageBg.includes('radial-gradient'), 'Editor stage is missing dot-grid background');
  assert(state.horizontal <= 2, 'Editor has horizontal overflow');
  await desktop.screenshot({ path: 'artifacts/desktop-editor-dark.png', fullPage: true });

  await desktop.locator('[data-step="data"]').click();
  await desktop.setInputFiles('#dataFile', 'examples/participants.csv');
  await desktop.waitForSelector('.import-summary');
  await desktop.locator('#toMapping').click();
  await desktop.waitForSelector('.mapping-table');
  assert(await desktop.locator('.mapping-table tbody tr').count() >= 8, 'Mapping rows missing');
  await desktop.screenshot({ path: 'artifacts/desktop-mapping-dark.png', fullPage: true });

  // Verification portal should inherit the stored dark theme in the same origin context.
  await desktop.goto('http://127.0.0.1:4173/verify.html', { waitUntil: 'networkidle' });
  await desktop.waitForSelector('.verify-card');
  assert(await desktop.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'Verify portal did not inherit dark theme');
  assert(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Verify portal horizontal overflow');
  await desktop.screenshot({ path: 'artifacts/desktop-verify-dark.png', fullPage: true });
  await desktop.close();

  // Mobile: off-canvas drawer, no workflow strip, editor stacking.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await mobile.waitForSelector('.template-card');

  let mobileState = await mobile.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    return {
      horizontal: document.documentElement.scrollWidth - innerWidth,
      menuVisible: getComputedStyle(document.querySelector('#mobileMenuBtn')).display !== 'none',
      sidebarLeft: sidebar.getBoundingClientRect().left,
      sidebarRight: sidebar.getBoundingClientRect().right
    };
  });
  assert(mobileState.horizontal <= 2, 'Mobile has horizontal overflow');
  assert(mobileState.menuVisible, 'Mobile hamburger is not visible');
  assert(mobileState.sidebarRight <= 1, 'Mobile sidebar should start off canvas');

  await mobile.locator('#mobileMenuBtn').click();
  await mobile.waitForTimeout(350);
  mobileState = await mobile.evaluate(() => ({
    open: document.querySelector('.sidebar').classList.contains('mobile-open'),
    left: document.querySelector('.sidebar').getBoundingClientRect().left,
    backdrop: document.querySelector('#sidebarBackdrop').classList.contains('show'),
    expanded: document.querySelector('#mobileMenuBtn').getAttribute('aria-expanded')
  }));
  assert(mobileState.open && mobileState.left >= -1, 'Mobile sidebar did not open');
  assert(mobileState.backdrop && mobileState.expanded === 'true', 'Mobile drawer state is incomplete');
  await mobile.screenshot({ path: 'artifacts/mobile-drawer-dark.png', fullPage: true });

  await mobile.locator('[data-step="templates"]').click();
  await mobile.waitForTimeout(100);
  assert(await mobile.locator('.sidebar').evaluate(el => !el.classList.contains('mobile-open')), 'Drawer should close after workflow navigation');

  await mobile.locator('.template-card').first().click();
  await mobile.waitForSelector('.editor-layout');
  const order = await mobile.evaluate(() => Array.from(document.querySelector('.editor-layout').children).map(el => el.className));
  assert(order.some(x => x.includes('canvas-column')), 'Mobile editor canvas missing');
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Mobile editor has horizontal overflow');
  await mobile.screenshot({ path: 'artifacts/mobile-editor-dark.png', fullPage: true });

  await mobile.goto('http://127.0.0.1:4173/verify.html', { waitUntil: 'networkidle' });
  await mobile.waitForSelector('.verify-card');
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Mobile verification has horizontal overflow');
  await mobile.screenshot({ path: 'artifacts/mobile-verify-dark.png', fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
}

console.log('Dark studio browser smoke: PASS');
