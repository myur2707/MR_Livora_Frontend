# Mr. Livora logo

`logo-source-luxury.png` is the approved transparent red, black and ivory Mr. Livora circular emblem. Keep this source outside the public bundle. The web UI uses the complete seal at larger sizes and a compact rendering of the same seal for collapsed navigation, browser tabs and installed app icons.

Run `node scripts/generate-icons.mjs` with the existing Playwright Chromium installation to regenerate the committed public PNG assets. The script preserves the approved artwork's colors and alpha channel and scales it into square canvases without stretching. The maskable icon places the entire seal inside the central safe area.

Public outputs are `assets/brand/logo.png`, `assets/brand/monogram.png`, `icons/favicon-32.png`, `icons/icon-192.png`, `icons/icon-512.png` and `icons/maskable-512.png`. The PWA prefetches only these static assets plus its existing shell. Authenticated data remains network-only.

After regeneration run `npm run check` and `npm run test:e2e`. Inspect the full and compact logos in light/dark themes and mobile navigation. Existing installed apps may require the browser/OS to refresh their icon after the updated service worker is activated.
