# Steps 2 and 3 manual verification — 2026-10-02

The current application was checked against the requested Step 2/3 manual scenarios while preserving Steps 1–5. The [complete verification report](../../MR_Livora_Backend/docs/testing/STEP_2_3_MANUAL_VERIFICATION.md) distinguishes live browser checks, isolated security tests and the remaining deployed-HTTPS check.

Local application: **http://127.0.0.1:4200**. Start/status commands and test-account locations are in [local testing](LOCAL_TESTING.md).

The actual Chrome PWA was installed into an isolated local profile and opened in standalone mode. While services are running, reopen that preserved installation from this frontend directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .local-tools/Open-MR Livora-PWA.ps1
```

The launcher/profile are ignored local artifacts. A fresh machine can install from Chrome/Edge's browser menu after the production worker activates.

The real 320px populated society table revealed horizontal page overflow. The fix keeps positioned accessible text inside the table scroll boundary and gives table scroll areas the same named keyboard-focusable region markup already used in the shared component gallery. The new browser regression checks arrow-key scrolling, focus of an off-screen link, bounded page width and axe results.

No migration or business API changed. The remaining environment-specific check is cookie behavior on an actual deployed HTTPS host; isolated production-mode security assertions already pass.
