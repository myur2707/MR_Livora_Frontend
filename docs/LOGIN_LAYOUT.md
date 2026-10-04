# Compact sign-in layout

The sign-in header uses a proportionate logo, with a smaller variant on short/mobile viewports. Desktop sign-in pairs a bounded community illustration with a 400px card. The card groups its icon and title, removes doubled field margins, places password recovery beside the password label and keeps account creation below the submit action. These rules also style the existing password recovery/reset forms without changing authentication behavior.

At widths up to 900px the decorative story panel is hidden to prioritize the form. Height breakpoints at 700px and 620px reduce padding, image height and decorative content. The layout uses natural content sizing rather than hidden overflow, so controls and errors remain reachable on exceptionally short screens, with large text or browser zoom.

Browser checks exercise 1366x768, 1366x600, 1280x600, 1093x614, 1024x576 and 320x640 in light/dark themes. At these sizes, the initial login, required-field feedback and incorrect-credentials feedback must fit without horizontal or vertical scrolling; the logo, inputs, recovery, sign-in and registration actions remain visible. Existing keyboard, authentication, password recovery, accessibility and PWA/offline checks remain required.

Run `npm run check` and `npm run test:e2e`. Manually verify the laptop's OS scaling/browser zoom and password-manager autofill. Authentication/session/storage/cache policies are preserved; no API or database migration is needed.
