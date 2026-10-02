import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

// Rasterize the repository's vector mark for browser/OS install icons.
const source = await readFile('public/favicon.svg');
const image = 'data:image/svg+xml;base64,' + source.toString('base64');
await mkdir('public/icons', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [size, maskable] of [
    [192, false],
    [512, false],
    [512, true],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      '<body style="margin:0;display:grid;place-items:center;width:100vw;height:100vh;background:#214d3d"><img alt="" src="' +
        image +
        '" width="' +
        (maskable ? size * 0.75 : size) +
        '" height="' +
        (maskable ? size * 0.75 : size) +
        '"></body>',
    );
    await page.locator('img').evaluate(async (image) => {
      await image.decode();
    });
    await page.screenshot({
      path: 'public/icons/' + (maskable ? 'maskable-' : 'icon-') + size + '.png',
    });
  }
} finally {
  await browser.close();
}
