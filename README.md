# SocietyEase frontend

Step 9 adds [resident dashboard, authorized flats/bills, own payments/receipts, notices, complaints and profile](docs/STEP_9_RESIDENT_PORTAL.md), plus validated community switching. Open `/society/resident/dashboard`; backend membership, verified person and occupancy rules enforce access.

A thoughtful Angular PWA for community living. Steps 2–9 contain the shared shell, cookie authentication, workspace selection, society onboarding/activation, property/resident management, verified resident access, billing/payment screens and the resident portal. The independent `MR_Livora_Backend` enforces authorization and preserves database history.

See [Step 7 billing](docs/STEP_7_BILLING.md) for charge versions, billing periods, reviewed generation, discounts, immutable bill details and outstanding reports. Monthly maintenance uses the full amount at period start with no proration. Open the Maintenance navigation after selecting an ACTIVE society with finance permissions. Step 8 supports payment recording and resident Step 9 pages expose only authorized own records.

## Run locally

For the configured backend, database, test accounts and reset-email inbox, follow [local manual testing](docs/LOCAL_TESTING.md). The backend's Windows runner starts the production PWA at `http://127.0.0.1:4200`, including its service worker and same-origin API proxy.

Use **Node 24.21.0** (`.node-version`; minimum 24.15), with its bundled npm. The repository previously contained no Angular application or styles; this establishes Angular **22.2.1**, TypeScript **6.0.3**, Tailwind **4.3.3** and the CLI's Vitest runner. Direct packages are pinned and `package-lock.json` is committed.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4200`. Run the backend on port 3000; the Angular dev proxy forwards API requests. Configure backend APP_ORIGIN to match this exact origin. See [authentication setup](docs/AUTHENTICATION.md). Read [AGENTS.md](AGENTS.md) before making changes.

| Route                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `/platform/dashboard` | Limited platform metadata            |
| `/platform/societies` | Society directory and creation       |
| `/society/dashboard`  | Resident summary                     |
| `/login`              | Login form                           |
| `/forgot-password`    | Generic reset request                |
| `/reset-password`     | Single-use password reset            |
| `/workspace`          | Validated society selection          |
| `/ui`                 | Interactive shared component preview |
| Any unknown route     | Clear not-found page                 |

Use /platform/societies/:id for platform setup progress and /onboarding/societies/:id for the authorized Committee Admin wizard. Email links open /accept-invitation with a single-use fragment token. Read [Step 4 onboarding](docs/STEP_4_ONBOARDING.md) for the manual flow. Backend sessions and permissions enforce every operation. The society dashboard now shows the resident summary.

## Verify

See [Step 6 resident access](docs/STEP_6_RESIDENT_ACCESS.md) for `/register`, `/verify-resident-email`, `/join-society`, `/resident-invitation` and the committee `/society/resident-access` screen. New membership requests stay pending until committee verification; existing global accounts are reused.

```sh
npm run check
npm audit --audit-level=high
npx --no-install playwright install chromium
npm run test:e2e
```

`check` runs format validation, typed ESLint (including accessible templates), strict application/template/test/tool typechecking, unit tests, production build and built PWA validation. `test:e2e` starts and stops a separate local production preview server and verifies routes, accessibility, themes, form feedback, pagination, modal/drawer focus, mobile navigation, offline shell behavior and private-response cache exclusion. CI also runs these checks on Linux.

To inspect the production PWA yourself:

```sh
npm run build
npm run pwa:check
npm run preview
```

Open `http://127.0.0.1:4173`. The service worker is enabled in production builds only. Installation requires HTTPS or loopback and a supported browser. The OS/browser install interaction still needs human verification. Stop the preview server with Ctrl+C. To regenerate the PNG icons from the repository's SVG mark after installing Chromium, run `node scripts/generate-icons.mjs`.

## Architecture and safety

See [frontend architecture and components](docs/FRONTEND_ARCHITECTURE.md), [PWA policy and threat model](docs/PWA_SECURITY.md) and [Step 2 verification](docs/STEP_2_VERIFICATION.md).

Frontend configuration and compiled bundles are public. This application does not consume `.env` files; `.env.example` documents this boundary. Never include tokens, passwords, database settings, private fixtures or tenant data in `src`, `public`, build-time configuration or caches. Theme choice is the only localStorage preference.

Serve the static build from `dist/society-ease/browser`. A production host should return the static index for application routes, keep API/upload routes separate, use HTTPS and suitable security headers, and serve `ngsw.json`, `ngsw-worker.js` and the index with revalidation. The supplied preview server is a loopback development/testing tool, not a production application server. Its synthetic private-response fixtures are enabled only by the browser-test runner and are not business APIs.

On deployments, retain older hashed assets during rollout so existing clients can finish loading, deploy the generated assets and worker manifest together, and reload to activate a newly installed worker. No automatic mid-form reload is introduced. Offline availability covers only the static interface. Authenticated APIs, resident data, bills, payments, receipts and uploads remain network-only.
Step 5 adds society-scoped Buildings, Flats, Residents, occupancy history and reviewed CSV imports. See [management guide](docs/STEP_5_PROPERTY_MANAGEMENT.md). Select an active society as Committee Admin for management; Steps 7?8 add permission-scoped billing and payment features.

Step 8 [payment recording, printable receipts, returns and collection reports](docs/STEP_8_PAYMENTS.md) extends the existing Maintenance workspace. The backend owns additive local upgrades; existing accounts and earlier-step data are retained.
