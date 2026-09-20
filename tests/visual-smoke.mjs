import { chromium } from 'playwright';
import fs from 'node:fs';

function assert(cond, msg) { if (!cond) throw new Error(msg); }
fs.mkdirSync('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const cases = [
    { name: 'desktop', viewport: { width: 1440, height: 960 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } }
  ];

  for (const tc of cases) {
    const page = await browser.newPage({ viewport: tc.viewport });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.template-card');

    const initial = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      cards: document.querySelectorAll('.template-card').length,
      sidebar: Boolean(document.querySelector('.sidebar')),
      appHeight: document.querySelector('#app')?.getBoundingClientRect().height || 0
    }));
    assert(initial.scrollWidth <= initial.innerWidth + 2, tc.name + ': horizontal overflow on template page');
    assert(initial.cards >= 10, tc.name + ': template cards did not render');
    assert(initial.sidebar, tc.name + ': workflow navigation missing');
    assert(initial.appHeight > 100, tc.name + ': application content has invalid height');

    await page.locator('.template-card').first().click();
    await page.waitForSelector('.editor-layout');
    const editor = await page.evaluate(() => {
      const canvas = document.querySelector('.certificate-canvas')?.getBoundingClientRect();
      const layout = document.querySelector('.editor-layout')?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        canvasW: canvas?.width || 0,
        canvasH: canvas?.height || 0,
        layoutW: layout?.width || 0
      };
    });
    assert(editor.scrollWidth <= editor.innerWidth + 2, tc.name + ': horizontal overflow in editor');
    assert(editor.canvasW > 100 && editor.canvasH > 60, tc.name + ': certificate canvas failed to render');
    assert(editor.layoutW > 200, tc.name + ': editor layout collapsed');

    await page.screenshot({ path: 'artifacts/' + tc.name + '.png', fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('Visual smoke tests: PASS');
