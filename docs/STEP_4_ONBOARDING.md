# Step 4: society onboarding

Platform Admin sees limited platform metadata and setup progress. Committee Admin sees its own initial residents/configurations and performs review and activation. Backend authorization, criteria and concurrency checks remain authoritative.

## Local manual flow

1. From the parent workspace run the backend scripts/local.ps1 stop, then start. The guarded runner applies pending additive migrations to its owned MySQL instance, updates restricted runtime grants and retains existing accounts/data.
2. Open http://127.0.0.1:4200. Initial credentials are in ../MR_Livora_Backend/.local-db/manual/TEST_ACCOUNTS.md, ignored by Git.
3. Sign in as platform@example.invalid, open Societies, create a unique uppercase-code draft with timezone Asia/Kolkata, then Begin setup.
4. In Committee Admin invite admin@example.invalid. Open the local email inbox at http://127.0.0.1:8025. Use another browser profile or sign out and log in as that invited admin before reopening the email link. Existing accounts keep their password and global identity.
5. Add a building and flats. Flat numbers accept commas/newlines, up to 100 per building; use the flat-list pagination for larger buildings/societies. Provide two-decimal area if using per-square-foot maintenance.
6. Open the new committee setup link in the workspace chooser. Add initial person-only occupants if appropriate and confirm resident review; explicit vacant-list confirmation is allowed. Platform sees only counts and confirmation.
7. Add a two-decimal maintenance charge and confirm maintenance review. Use the maintenance-list pagination to review larger lists. Rates and resident names remain committee-only.
8. Under Verification confirm the attestation and Record committee review. Under Activate choose Verify & Activate and explicitly confirm in the dialog. Verify the recorded timestamp/member and setup history.
9. Platform can suspend/resume or terminally deactivate an activated society. Verification/history persist. Setup entry is locked after activation.

Existing societies created before Step 4 show metadata only and retain their original lifecycle/data. They are never automatically backfilled or presented as newly verified.

## Negative checks

- Platform cannot open private committee resident/configuration APIs or activate a new society.
- Another society's committee cannot access the wizard by changing its id.
- Missing initial invitation acceptance, flats, resident review, maintenance review/configuration or required area prevents activation.
- Stale revision/from-status requests display a safe refresh conflict. Duplicate flats/buildings and concurrent activation are rejected by the API/database.
- Reissued, expired or accepted invitation links cannot be reused. Existing accounts require their own login; a wrong signed-in account must sign out.
- Review is invalidated when setup changes or returns from pending to editable setup.
- Lifecycle cannot jump DRAFT → ACTIVE or revive DEACTIVATED. Resume retains the original verifier/timestamp.
- API data and tokens never enter service-worker caches, localStorage or sessionStorage. Offline shells can render, but private data requires the network.

## UI and checks

Shared fields, tables, dialogs, cards, badges, form errors and responsive shell are reused. Wizard steps are keyboard buttons with aria-current; activation/status changes use explicit dialogs. Datetime strings arrive in UTC and are displayed using the society's IANA timezone; calendar dates remain unchanged.

Run npm run check and npm run test:e2e. Unit tests cover safe errors, timezone display and CSRF API writes; browser tests cover committee review/confirmation, conflict feedback, platform privacy, invitation validation/token removal, small-screen layout and accessibility. Existing static-only PWA/offline checks remain required. Real backend security and MySQL tests live in the separate backend repository; mocked browser responses are not a security boundary.

The server rollout, full route contract and threat model are in [backend onboarding](../../MR_Livora_Backend/docs/security/SOCIETY_ONBOARDING.md). No business billing/payment screens or ongoing resident-management module are implemented by this step.
