# Step 4: society onboarding

Platform Admin sees limited platform metadata and setup progress. Committee Admin sees its own initial residents/configurations and performs review and activation. Backend authorization, criteria and concurrency checks remain authoritative.

## Local manual flow

1. From the parent workspace run the backend scripts/local.ps1 stop, then start. The guarded runner applies pending additive migrations to its owned MySQL instance, updates restricted runtime grants and retains existing accounts/data.
2. Open http://127.0.0.1:4200. Initial credentials are in ../MR_Livora_Backend/.local-db/manual/TEST_ACCOUNTS.md, ignored by Git.
3. Sign in as platform@example.invalid, open Societies or Townships, create a unique uppercase-code draft with timezone Asia/Kolkata, then Begin setup.
4. In Committee Admin invite admin@example.invalid. Open the local email inbox at http://127.0.0.1:8025. Use another browser profile or sign out and log in as that invited admin before reopening the email link. Existing accounts keep their password and global identity.
5. Open Buildings / Wings / Flats. Choose A, B, C or D from the Wing code suggestions, or enter a custom code such as EAST. A blank name becomes Wing A (or your entered code). Enter individual flat numbers or ranges such as `101-110, 201-210`; review the generated preview, then select Add wing and flats. Ranges include both endpoints; `001-010` preserves zero padding. Overlapping/duplicate numbers, descending ranges and more than 100 flats are rejected. Wing A and wing B can both contain flat 101. Use Add multiple wings below to create wings with matching ranges together. Provide a two-decimal area if using per-square-foot maintenance.
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

Society or Township is the shared onboarding label; the existing society/building API and database models are retained. A wing uses the existing building record and its tenant-scoped flat uniqueness. Range expansion happens before sending the existing explicit flat array; the backend validates every flat and saves the wing/flat batch transactionally. This change adds no migration and does not grant Platform Admin tenant-private access.

### Add row houses

In the property step choose **Row houses** instead of **Flats**. Wing mode, code, name and selection fields are hidden. Enter a range such as `1-5` (or comma-separated numbers), review the row house preview and choose **Add row houses**. Optional area applies to each house. Up to 200 houses can be added per submission; later ranges reuse the same society-scoped group. Overlapping numbers or a stale revision save none of the submission and preserve the draft. Choose Flats to use the existing single/multiple-wing flow. This choice is local to the form and supports both societies and townships, including mixed properties.

Row houses reuse the existing building/flat storage and downstream occupancy and maintenance workflows. The internal `ROW_HOUSES` group code is reserved; no migration is needed. Other screens may still use the shared flat terminology. Deploy the matching backend `/row-houses` endpoint with this UI.

### Add multiple wings

In Buildings / Wings / Flats choose **Add multiple wings**, select A/B/C/D (or **Select all A-D**) and optionally enter other comma-separated codes. Enter the shared flat ranges once. The preview shows every wing and the total flats. Choose **Add selected wings and flats** to save. For different ranges or areas, submit separate groups or use Single wing. A batch supports up to 10 wings, 100 flats per wing and 500 total flats. A duplicate or stale-revision conflict saves none of the batch and retains the form for correction.

The batch API uses the existing server authorization, CSRF, setup lifecycle checks and revision lock. It validates every wing/flat, inserts them in one transaction, advances the revision once and records a `building.created` audit event per wing. No schema migration is required. Platform access remains limited to initial setup.

# Resident property choice

In the committee Residents step, choose Flats or Row houses, then open the property picker. Search by number or building, browse matching pages inside the picker, and select a result. The chosen property remains visible while browsing or searching; switching property type clears it. Row houses display their house number without a building prefix. The server validates the selected property's society and type; changing this choice does not create or reclassify properties.
