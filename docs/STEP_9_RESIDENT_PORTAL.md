# Step 9 resident portal

Resident pages are lazy standalone Angular features under `/society/resident`. Select an approved ACTIVE community in Workspace; a header Community selector appears for multiple memberships. Switching first leaves the private page, calls the existing CSRF-protected server context endpoint, reloads validated permissions, and opens the new resident dashboard. Server authorization determines every record.

| Route suffix                         | Purpose                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `/dashboard`                         | Current due, overdue, own recent payment and published notices             |
| `/flats`, `/flats/:id`               | Multiple currently authorized flats and own occupancy dates                |
| `/bills`, `/bills/:id`               | Authorized issued bills, status/flat filter and exact item/balance details |
| `/payments`                          | Own payment history                                                        |
| `/receipts`, `/payments/:id/receipt` | Own receipts and native Print / save PDF                                   |
| `/notices`, `/notices/:id`           | Published society-wide announcements, rendered as text                     |
| `/complaints`, `/complaints/:id`     | Own history, status and complaint submission for a current authorized flat |
| `/profile`                           | Own verified tenant contact details and login email; existing reset link   |

`/society/dashboard` opens the same resident summary. Existing committee property, billing/payment and onboarding routes remain separate permission-scoped features. A committee user's resident view still requires that user's own approved occupancy. Platform privilege alone supplies no resident access.

The user selected current approved occupancy plus billing-period start within its dates for bill access, and own-payer-only payment/receipt access. Other residents' names/contact information and collector/recorder details are omitted. Own historical receipts and membership-submitted complaints can remain visible after occupancy ends; expired/inactive membership removes portal access. Profile corrections go through the committee. A user without current occupancy can see an empty flat/bill state and own profile/published notices but cannot submit a complaint or claim a flat.

All list calls paginate; authorized flat selection on the complaint form also paginates. Bills can filter by authorized flat and settlement status. Decimal currency strings are displayed without floating-point calculations. UTC instants and society-local DATE values retain their backend semantics. Text inputs show associated validation; strict backend schemas reject protected fields and controls. A failed complaint request with uncertain outcome asks the user to inspect history before retrying.

## Session and PWA boundary

ResidentView is feature-private request state: it clears on user/society changes, discards obsolete and destroyed-page responses, and never persists domain data. An API 401 clears identity and CSRF; ResidentShell destroys private child pages and shows access recovery. Guards remain usability checks only. The context selector has no stored role or tenant preference.

The existing worker keeps `dataGroups=[]`, hashed static asset caching only, and explicit static navigation shells. Authenticated API requests use same-origin credentials, `no-store` and existing CSRF protection. APIs, bills, payments, receipts, contacts and complaints are never cached by the worker or written to localStorage/sessionStorage. Theme preference remains the only storage entry. Printing uses the existing receipt print layout; the user controls the native browser printer/PDF destination.

## Run and verify

Use the backend managed local stop/start runner after checks to rebuild both projects and add narrow notice/complaint DB grants without resetting existing accounts. Open `http://127.0.0.1:4200/society/resident/dashboard` and sign in with an approved local account. Existing credentials remain in the ignored backend `.local-db/manual/TEST_ACCOUNTS.md`; do not place them in browser source or docs.

Run `npm run check` and `npm run test:e2e`. Units verify strict API payloads and response races/context clearing; browser tests cover all pages, two memberships, multiple flats, empty occupancy, safe IDOR errors, expired sessions, complaint validation/CSRF/plain text, exact balances, native print layout, 320px layout and light/dark accessibility. Existing worker tests exercise static offline shells and absence of private responses in caches. Real backend MySQL integration tests supply the authorization evidence; browser API mocks independently verify UX.

No new dependency or schema migration is required. Committee notice publishing, audience targeting, complaint assignment/resolution and later roadmap steps are not implemented. Read the backend [contract](../../MR_Livora_Backend/docs/resident/STEP_9_RESIDENT_PORTAL.md), [threat model](../../MR_Livora_Backend/docs/security/RESIDENT_PORTAL.md) and [verification report](../../MR_Livora_Backend/docs/testing/STEP_9_VERIFICATION.md) in the shared workspace.
