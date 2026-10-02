# SocietyEase frontend

A thoughtful Angular PWA for community living. Steps 2–3 contain the shared shell and controls plus cookie-based login, logout, password reset and workspace selection. Business routes remain placeholders. The independent `MR_Livora_Backend` contains the preserved database baseline and server-enforced authentication/authorization.

## Run locally

Use **Node 24.21.0** (`.node-version`; minimum 24.15), with its bundled npm. The repository previously contained no Angular application or styles; this establishes Angular **22.2.1**, TypeScript **6.0.3**, Tailwind **4.3.3** and the CLI's Vitest runner. Direct packages are pinned and `package-lock.json` is committed.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4200`. Run the backend on port 3000; the Angular dev proxy forwards API requests. Configure backend APP_ORIGIN to match this exact origin. See [authentication setup](docs/AUTHENTICATION.md). Read [AGENTS.md](AGENTS.md) before making changes.

| Route                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `/platform/dashboard` | Workspace overview placeholder       |
| `/platform/societies` | Societies placeholder                |
| `/society/dashboard`  | Society workspace placeholder        |
| `/login`              | Login form                           |
| `/forgot-password`    | Generic reset request                |
| `/reset-password`     | Single-use password reset            |
| `/workspace`          | Validated society selection          |
| `/ui`                 | Interactive shared component preview |
| Any unknown route     | Clear not-found page                 |

Authentication, tenant selection, real society screens and business APIs are later steps. These public previews grant no permissions or access to tenant data. No credentials are accepted and no backend calls are made. Example form values exist only in memory and are neither submitted nor persisted.

## Verify

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
