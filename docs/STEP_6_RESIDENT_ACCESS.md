# Step 6: invitations and resident registration

The backend enforces every access decision. Angular guards and disabled controls provide UX only. No later financial feature was added.

| Route                    | Flow                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /register                | New global login signup; generic email instructions. Existing accounts sign in.                                                                            |
| /verify-resident-email   | Single-use fragment token; explicit email confirmation creates a login with no society access.                                                             |
| /join-society            | Authenticated users request another society using codes/address, inspect pending/approved/rejected/cancelled status, and cancel their own pending request. |
| /resident-invitation     | Committee-approved Resident invitation. Existing accounts sign in with the intended email and reopen the mail link; new accounts create a password.        |
| /society/resident-access | Authorized Committee Admin: pending requests, explicit review/approve/reject, invitation lists and delivery state, invite/resend/revoke.                   |

Workspace and login pages link to the new flows. Registering or knowing a flat number grants no society access. After approval/acceptance, open Workspace and select the society; the existing session identity is refreshed rather than stored in localStorage.

Committee approval shows the claimed identity/address as unverified information. The reviewer must check committee records, choose the correct person (or a profile for the account's original identity), flat and current occupancy, record a verification note and explicitly attest before approval. Use the person/flat search pickers and paginated current-occupancy picker to link an existing record. Matching name/mobile is not a merge rule. Historical/future-only occupancies do not grant current access. Safe server conflicts remain visible in the dialog.

Invitations require an existing person with contact email and current occupancy. They grant RESIDENT only. Resend issues a replacement link; the old link becomes invalid. Revoke invalidates a pending link. Accepted invitations are final. UI lists are paginated and filtered by status, with QUEUED/SENT/FAILED delivery and local-time expiry. Resend/revoke/reject require a note and confirmation.

All tokens remain in component memory after the URL fragment is removed. Refresh or navigation requires reopening the mail link; no secret is put into a return URL, environment file, localStorage or cache. Forms use labelled controls, bounded inputs and associated validation; shared dialogs preserve keyboard focus, and tables scroll within named keyboard-focusable regions. Only static app-shell routes were added to service-worker navigation. API responses, including requests and invitations, remain network-only.

The [backend contract and threat model](https://github.com/myur2707/MR_Livora_Backend/blob/dev-sprint-1/docs/security/RESIDENT_ACCESS.md) documents transactions, tenant identity, token binding, rate limits, runtime grants and retention. Apply migrations 010–011 and grants before using the new UI.

For local manual testing, use the existing [Windows setup](LOCAL_TESTING.md). Restart the managed setup after pulling code so both production builds and additive migrations/grants are updated. Mailpit at http://127.0.0.1:8025 captures verification/invitation mail; no real outbound mail is sent.

Run `npm run check`, `npm run test:e2e` and dependency audit. Browser fixtures validate UI behavior; real backend/isolated-MySQL tests validate security. Do not claim a mocked approval proves backend authorization.

The [Step 6 verification report](https://github.com/myur2707/MR_Livora_Backend/blob/dev-sprint-1/docs/testing/STEP_6_VERIFICATION.md) records the 142 automated tests and real local UI/API/MySQL/SMTP checklist results. Local resident credentials are in the backend's ignored `.local-db/manual/STEP6_TEST_ACCOUNTS.md`; initial committee credentials remain in `TEST_ACCOUNTS.md`.
