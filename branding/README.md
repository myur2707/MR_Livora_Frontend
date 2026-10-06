# Mr. Livora logo

`logo-source.png` is the supplied green-and-gold Mr. Livora artwork. Keep this original outside the public bundle. The web UI uses the complete logo; the collapsed sidebar, sidebar footer, browser tab and installed app use its MR monogram.

Run `node scripts/generate-icons.mjs` with the existing Playwright Chromium installation to regenerate the committed public PNG assets. The script renders crops of the original artwork, preserves its colors and cream background, and scales them without stretching. Crop coordinates are tied to the supplied 1264 × 1264 source; update them if the source artwork changes. The maskable icon places the entire mark inside the central 40% radius safe zone.

Public outputs are `assets/brand/logo.png`, `assets/brand/monogram.png`, `icons/favicon-32.png`, `icons/icon-192.png`, `icons/icon-512.png` and `icons/maskable-512.png`. The PWA prefetches only these static assets plus its existing shell. Authenticated data remains network-only.

After regeneration run `npm run check` and `npm run test:e2e`. Inspect the full and compact logos in light/dark themes and mobile navigation. Existing installed apps may require the browser/OS to refresh their icon after the updated service worker is activated.
