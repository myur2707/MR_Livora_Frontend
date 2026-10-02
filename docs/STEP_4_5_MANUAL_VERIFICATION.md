# Steps 4 and 5 manual verification — 2026-10-02

The [complete checklist report](https://github.com/myur2707/MR_Livora_Backend/blob/dev-sprint-1/docs/testing/STEP_4_5_MANUAL_VERIFICATION.md) records live UI/API/database evidence, isolated negative tests and the retained local demonstration.

The app remains at **http://127.0.0.1:4200**. Credentials and service commands are described in [local testing](LOCAL_TESTING.md). Use the platform account to inspect the checklist society's metadata and the admin account to open its activated community workspace.

The automated quality gates passed **115 tests**: 19 backend offline, 54 fresh-MySQL integration, 21 Angular unit, 3 proxy and 18 browser tests. No migration or later roadmap module was added. The original [Step 4 guide](STEP_4_ONBOARDING.md) and [Step 5 guide](STEP_5_PROPERTY_MANAGEMENT.md) remain applicable.

Live checks passed for invitation delivery, refresh-persistent wizard progress, committee activation and audit records, property creation, occupancy history, CSV correction/confirmation, pagination and tenant boundaries. The import summaries match SQL: **26 flats, 21 new people and 22 occupancies**. Populated pages passed accessibility checks and the flat-detail view fits a 390 px viewport.
