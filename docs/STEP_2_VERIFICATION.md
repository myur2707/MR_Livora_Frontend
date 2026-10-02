# Step 2 verification

Executed on **2026-10-02 (Asia/Calcutta)** using Windows, Node **24.21.0**, Angular **22.2.1**, TypeScript **6.0.3** and Playwright Chromium **153**. This completes the Angular foundation only. The backend repository and Step 1 migrations were unchanged; no database connection, migration or business API was introduced.

## Automated checks

| Check                                                   | Result                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Lockfile installation, `npm ci`                         | PASS; 383 packages installed from the committed lockfile                                                                       |
| Format check                                            | PASS                                                                                                                           |
| Typed ESLint and accessible template rules              | PASS; no rule suppressions                                                                                                     |
| Strict application/template, test and tooling typecheck | PASS                                                                                                                           |
| Vitest unit suite                                       | PASS; **11 tests** across four files                                                                                           |
| Production build                                        | PASS; lazy feature chunks, manifest, icons and worker generated; within configured bundle budgets                              |
| `npm run pwa:check`                                     | PASS; generated worker has one hashed static asset group, no runtime URL patterns/data groups, and exact safe shell navigation |
| `npm run test:e2e`                                      | PASS; **7 Chromium browser tests**                                                                                             |
| Dependency audit                                        | PASS; **0 reported vulnerabilities**                                                                                           |
| Workflow syntax (actionlint 1.7.12)                     | PASS                                                                                                                           |
| Git ignore checks                                       | PASS; environment files, build output, dependencies, screenshots and local tools ignored                                       |
| Backend preservation                                    | PASS; backend Git status remained clean                                                                                        |

Unit tests cover validation timing and safe messages, field labels and associated descriptions, markup displayed as text, pagination with zero results or stale pages, rejected invalid inputs, disabled boundary actions, notification dismissal, theme persistence and denied browser storage.

Browser tests visit all six explicit placeholder/UI routes and an unknown route. Axe reports **no violations** under the tested WCAG A/AA rule sets for all seven pages in **light and dark** themes. Keyboard tests cover desktop/sidebar navigation, focused route headings, the mobile drawer at **320px**, resizing to desktop, dialog/drawer Tab and Shift+Tab loops, Escape and opener focus restoration. Forms show associated validation, safe server feedback and a valid-example toast; table pagination changes the displayed page.

## Requested manual scenarios exercised in Chromium

| Scenario                                                   | Actual result                                                                                                                                                                                    | Status |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Run locally and visit every placeholder route              | All routes render the intended headings; feature code is lazy-loaded                                                                                                                             | PASS   |
| Sidebar collapse, mobile navigation and keyboard-only use  | Collapsed links retain accessible names; Enter navigates from mobile drawer; focus moves to the page heading; no 320px page overflow                                                             | PASS   |
| Themes, contrast and visible focus                         | Theme persists through refresh; all placeholder routes pass the tested light/dark axe rules; focus styling and desktop/mobile layouts inspected                                                  | PASS   |
| Production manifest/service worker                         | Manifest, 192/512px icons, maskable icon, `ngsw.json` and `ngsw-worker.js` generated and validated                                                                                               | PASS   |
| PWA browser installability                                 | Chromium `Page.getInstallabilityErrors` returned an empty error list                                                                                                                             | PASS   |
| Install through browser UI and launch the OS-installed app | Headless tests cannot exercise the OS/browser installation UI; follow the steps below on a supported device                                                                                      | MANUAL |
| Unknown route                                              | Clear not-found page with a return link                                                                                                                                                          | PASS   |
| Offline after initial load                                 | A known placeholder route still renders from the static app shell                                                                                                                                | PASS   |
| No authenticated/private response caching                  | Synthetic authorized bill/payment/receipt/resident/upload/private-JS requests remained absent from Cache Storage; offline fetches rejected or returned a failed response with no private content | PASS   |
| Invalid shared form                                        | Required-field feedback is visible and associated via ID/label, aria-describedby and aria-invalid; corrected input becomes valid                                                                 | PASS   |

The cache test uses `cache: no-store` to separate the browser HTTP cache from service-worker caching. Its local synthetic response server is a test fixture only. A future real backend must independently send no-store headers for private responses. See [PWA security](PWA_SECURITY.md).

## Visual and remaining device review

Desktop light/dark and **390px** mobile screenshots were inspected. The UI has responsive cards, a compact mobile header, consistent focus rings and readable status/error text. Local screenshots are ignored under `.local-tools/screenshots/`; they contain no real resident or financial data.

For the OS/device checks:

1. Run `npm run build`, `npm run pwa:check`, then `npm run preview` and open `http://127.0.0.1:4173` in a supported browser, or use a properly configured HTTPS host.
2. Install using the browser's install menu, open the installed app, and verify its standalone window, icon and initial route.
3. After the worker finishes installing, switch offline and navigate between the known static placeholders. No tenant information should appear.
4. Perform a screen-reader pass through landmarks, breadcrumbs, forms, notifications and an open dialog/drawer. Automated axe and keyboard checks supplement this human review.

The workflow runs install, quality gates, dependency audit, production browser tests and Gitleaks. Hosted CI results are linked in the task completion response; local workflow validation alone does not prove a hosted run.

Step 2 stops here. Authentication, APIs, real society screens and later roadmap work remain unimplemented.
