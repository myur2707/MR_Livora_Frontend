# Frontend architecture

The existing frontend repository contained README, license and ignore rules only. Angular CLI 22.2.1 was used as the starting configuration rather than upgrading an existing app. Angular 22 supports the selected Node 24 and TypeScript 6 versions: [official compatibility table](https://angular.dev/reference/versions). The CLI's supported Vitest builder is used: [Angular testing guide](https://angular.dev/guide/testing). Tailwind uses its official Angular PostCSS setup: [Tailwind Angular guide](https://tailwindcss.com/docs/installation/framework-guides/angular).

## Boundaries

- `src/app/layout`: shell, responsive sidebar, header navigation and route-derived breadcrumbs.
- `src/app/core`: theme preference and injectable UI ID generator.
- `src/app/shared`: small standalone controls, native-element directives and pure validation/pagination helpers.
- `src/app/features`: lazy auth/platform/society placeholders and the UI component preview.
- `src/styles.css`, `src/styles/`: Tailwind entry point, shared semantic tokens, controls, shell/page styles and responsive rules, kept in separate focused stylesheets.
- `public`: reviewed static mark, illustration, icons, theme bootstrapping script and manifest.
- `scripts`, `e2e`: local build/PWA verification and browser tests.

Platform and society route collections and individual feature components load lazily. Step 3 adds auth forms, an in-memory auth service and guards driven by current server sessions. Guards are UX only; server authorization remains mandatory. Business/financial routes remain placeholders. See [authentication](AUTHENTICATION.md) for protected routes, setup and tests.

## Shared control contract

| Control                                 | Contract                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ButtonDirective`                       | Apply `seButton` to native buttons or links. Set `type="button"` or `type="submit"` explicitly; use real disabled buttons and meaningful link destinations. Icon-only buttons require an accessible label.                                                                                          |
| `FieldComponent`, `ControlDirective`    | Provide unique `controlId`, `label`, optional `hint` and `error`. Project a native `input/textarea[seInput]` or `select[seSelect]`. The directive binds the ID, description and invalid state to the wrapper. Use Angular reactive forms and native `required`/appropriate autocomplete attributes. |
| `fieldError`, `FormNoticeComponent`     | Show field errors after touch/submission. Generic server/form feedback uses text interpolation and an alert. Map future API codes to reviewed public messages; never pass raw driver errors or stack traces.                                                                                        |
| `CardComponent`, `BadgeComponent`       | Lightweight content containers with optional headings and tone. Status text carries meaning as well as color.                                                                                                                                                                                       |
| `TableDirective`, `PaginationComponent` | Native semantic table with caption, scoped headers and scroll wrapper. Pagination validates inputs, clamps stale pages and disables boundary actions. Callers provide data; no schema-driven table framework.                                                                                       |
| `DialogComponent`, `DrawerComponent`    | Native modal dialogs make surrounding content inert, contain keyboard focus and restore the opener on close. Dialogs are labelled, close with Escape/backdrop/close button, and use controlled open state. Drawers reuse this behavior at either viewport edge.                                     |
| `ToastService`, `ToastRegionComponent`  | At most three in-memory notifications, polite announcements and explicit dismissal; no short timer that hides messages from assistive-technology users. Use only reviewed public messages.                                                                                                          |
| `StateComponent`                        | Consistent loading/empty/error feedback with busy/status/alert semantics and optional projected action.                                                                                                                                                                                             |

Angular CDK 22.2.1 supplies the dialog's Tab/Shift+Tab focus loop; native dialogs supply modality and opener restoration. The `/ui` route exercises these contracts using synthetic interface examples, including invalid input and sample server feedback. It does not save form data.

## Design and accessibility

Ivory surfaces, forest accents, generous spacing, restrained borders and a serif display face sit over locally available system fonts. CSS custom properties define spacing, radii, typography, text/surface/action colors and focus rings. Dark mode changes semantic tokens. The bootstrapping script applies a valid saved preference or system preference before rendering; manual theme selection stores only `se-theme`. Denied browser preference storage does not prevent switching.

Native form elements, landmark HTML, a skip link, page titles, route breadcrumbs, visible focus, text status labels and reduced-motion support are part of the baseline. Route activation focuses the new main heading. At widths below 960px, the sidebar becomes a modal navigation drawer; resizing to desktop closes it. Tables scroll inside their labelled region instead of overflowing the page. The sidebar can collapse on desktop without losing accessible link names.

Automated axe checks supplement keyboard/browser tests; they do not replace human screen-reader and OS installation testing. Follow [Step 2 verification](STEP_2_VERIFICATION.md) for executed checks and remaining manual scenarios.
