import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

// Render the supplied artwork consistently for the UI and browser/OS install icons.
const source = await readFile('branding/logo-source-luxury.png');
const image = 'data:image/png;base64,' + source.toString('base64');
await mkdir('public/icons', { recursive: true });
await mkdir('public/assets/brand', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const outputs = [
    { path: 'public/assets/brand/logo.png', width: 640, height: 640, inset: 0 },
    { path: 'public/assets/brand/monogram.png', width: 128, height: 128, inset: 0.03 },
    ...[32, 192, 512].map((size) => ({
      path: size === 32 ? 'public/icons/favicon-32.png' : 'public/icons/icon-' + size + '.png',
      width: size,
      height: size,
      inset: size === 32 ? 0.02 : 0.04,
    })),
    // The whole mark fits inside the maskable icon's central 40% radius safe zone.
    { path: 'public/icons/maskable-512.png', width: 512, height: 512, inset: 0.23 },
  ];
  for (const output of outputs) {
    await page.setViewportSize({ width: output.width, height: output.height });
    await page.setContent('<body style="margin:0"><canvas></canvas></body>');
    await page.locator('canvas').evaluate(
      async (canvas, { image, output }) => {
        canvas.width = output.width;
        canvas.height = output.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas rendering is unavailable.');
        const artwork = canvas.ownerDocument.createElement('img');
        artwork.src = image;
        await artwork.decode();
        const insetX = canvas.width * output.inset;
        const insetY = canvas.height * output.inset;
        context.drawImage(
          artwork,
          0,
          0,
          artwork.naturalWidth,
          artwork.naturalHeight,
          insetX,
          insetY,
          canvas.width - 2 * insetX,
          canvas.height - 2 * insetY,
        );
      },
      { image, output },
    );
    await page.locator('canvas').screenshot({ path: output.path, omitBackground: true });
  }
} finally {
  await browser.close();
}
