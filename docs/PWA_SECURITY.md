# Static PWA policy and threat model

## Assets, actors and boundaries

The static code, icons, public branding and empty route shells are safe to distribute. Future authenticated API responses, user identity, resident details, financial records, uploads and session secrets are private. Browser users, shared-device users, application developers and the production operator cross the frontend/API, service-worker/network and browser-storage boundaries.

Frontend assets and configuration are public. A route or a hidden menu cannot authorize data access. Backend authentication, permission and society-scope enforcement remain mandatory when APIs are implemented.

## Cache policy

Angular's [worker configuration](https://angular.dev/ecosystem/service-workers/config) separates versioned static asset groups from runtime data groups. This app has exactly one prefetched, content-hashed asset group and **zero data groups or runtime URL patterns**.

Only `index.html`, root build JavaScript/CSS, manifest, favicon, `assets/brand/*.svg` and install-icon PNGs are enrolled. These are build files, not runtime URL rules: a private response ending in `.js` is not enrolled merely because of its extension. Do not add private files or generated tenant JSON to these public directories. No remote fonts, CDN assets or authenticated responses are cached.

Navigation fallback is limited to the exact known placeholder/UI paths and always returns the public static index. It never saves server-rendered private HTML. API, financial/resident/upload paths and unknown paths are excluded. `pwa:check` validates the actual generated `ngsw.json`, checks content hashes/icon sizes and rejects data groups, runtime patterns or unsafe navigation matches.

The production browser test requests synthetic private responses with an Authorization header and browser credentials, including bills, payments, receipts, residents, an upload and a private `.js` URL. The local test server deliberately returns cacheable headers; the probe uses `fetch` with `cache: no-store` to isolate service-worker behavior from the browser HTTP cache, and those responses never enter Cache Storage. It then goes offline: known shells still render, while private fetches reject or return a non-success response without private content (the worker can return an empty 504). Real future API servers must use `Cache-Control: no-store` for private responses. Test fixtures exist solely in the loopback test server.

## Abuse cases and mitigations

| Abuse case                                                       | Mitigation                                                                                                                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A later developer introduces private-response caching            | Empty data groups, exact navigation allowlist, no runtime asset URL patterns, built-manifest assertions and real browser cache/offline tests in CI.                                                              |
| A shared-device user reads a previous user's private cached data | No identity/data storage, private API caches or offline financial/resident availability. Future logout must clear in-memory private state and any newly reviewed storage; this foundation does not introduce it. |
| A secret is shipped in a frontend configuration file             | No environment loader or API credentials, placeholder-only `.env.example`, ignore rules, source/history secret scans. Review all `src/public` additions as public data.                                          |
| An error becomes an HTML/script injection vector                 | Angular text interpolation, no dynamic HTML insertion, typed controls and public-message mapping contract. A unit test verifies markup-like error content remains text.                                          |
| A route is mistaken for authorization                            | Placeholder-only public routes. Backend permissions and validated tenant membership are future mandatory boundaries.                                                                                             |
| A worker replaces an API request with shell HTML                 | Exact navigation paths, explicit private exclusions and tests of the generated worker configuration.                                                                                                             |
| A stale worker or deployment loses its chunks                    | Content-hashed assets, atomic manifest/assets deployment, previous-asset retention and reload-based update activation; no forced reload during forms.                                                            |

Production operation requires HTTPS, API no-store headers, reviewed security/CSP headers and separate static/API routing. The preview server is for local inspection, not deployment. Installability is validated in Chromium; browser/OS installation and a real device's offline/assistive-technology experience require human review.
