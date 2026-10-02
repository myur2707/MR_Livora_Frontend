# Local testing with the backend

The Windows workspace has a managed runner in ../MR_Livora_Backend/scripts/local.ps1. It starts a production Angular PWA on **http://127.0.0.1:4200**, backend on port 3000, isolated MySQL on port 3307 and a password-reset inbox on **http://127.0.0.1:8025**.

From the parent workspace:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File MR_Livora_Backend/scripts/local.ps1 start
powershell -NoProfile -ExecutionPolicy Bypass -File MR_Livora_Backend/scripts/local.ps1 status
powershell -NoProfile -ExecutionPolicy Bypass -File MR_Livora_Backend/scripts/local.ps1 stop
```

Use setup instead of start the first time only. Open ../MR_Livora_Backend/.local-db/manual/TEST_ACCOUNTS.md for initial local credentials. The backend [local testing guide](../../MR_Livora_Backend/docs/testing/LOCAL_TESTING.md) lists role accounts, manual checks, safe database/configuration handling and prerequisites.

The production preview accepts PREVIEW_API_ORIGIN=http://127.0.0.1:3000 to proxy /api to the local backend. The managed runner sets this and PORT=4200 automatically, matching the backend APP_ORIGIN. Its default npm run preview mode on port 4173 still has no backend; browser-test fixtures remain separate. Remote API targets and simultaneous fixture/proxy mode are rejected.

Implemented features are authentication, password reset, role-based workspace selection, the shared component gallery, responsive navigation, theme and static-shell PWA behavior. Step 4 adds the platform society directory and initial onboarding wizard; follow [the manual flow](STEP_4_ONBOARDING.md). Stop/start the backend runner after upgrading source so it applies additive migration 008 and restarts the updated API/PWA. Ongoing resident and financial screens remain later steps. Frontend configuration contains no credentials; all private API responses remain network-only.
