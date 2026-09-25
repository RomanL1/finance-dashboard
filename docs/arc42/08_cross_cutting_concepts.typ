#import "diagram.typ": diagram

= Cross-Cutting Concepts

== Domain model

#diagram("08_domain_model", [Household is the ownership root; `transaction` and `budget` reach it only through their parents. `user` and `session` belong to better-auth.])

- `transaction.category_id` null means "Uncategorized" (ADR-1).
- `budget_month` marks months whose limits were touched (ADR-2).
- The table is `finance_account` (Drizzle symbol `financeAccount`) because better-auth already uses `account` for login providers.

== Household scoping

Financial records belong to a household, directly or through a parent. `finance_account` and `category` carry `household_id`; `transaction` inherits ownership through its account, and `budget` through its category. Child tables have no redundant `household_id`. Reads of child rows follow the parent: `TransactionRepository.inHousehold` scopes through the account, while budget reads join category and filter `category.householdId`. Services check parent ownership before creating or changing child rows. The `budget_month` marker belongs directly to a household. See the schemas and repositories under `backend/src/features/`.

== Domain errors at the HTTP boundary

Services throw `DomainError` subclasses from `backend/src/shared/kernel/domain-error.ts` without importing HTTP exceptions. `DomainExceptionFilter` in `backend/src/shared/infra/errors/` maps their kinds to responses:

#table(
  columns: (1fr, auto),
  inset: 6pt,
  table.header([*Domain error kind*], [*HTTP status*]),
  [`not_found`], [404],
  [`forbidden`], [403],
  [`conflict`], [409],
  [`validation`], [400],
)

The response contains `statusCode`, the error class name, and its message. This mapping is applied once at the API boundary, leaving domain operations usable outside HTTP.

== Testing

Four suites cover unit, integration, and end-to-end level. All passed on 2026-09-25:

#table(
  columns: (auto, auto, auto, auto, 1fr),
  inset: 6pt,
  align: (left, left, right, right, left),
  table.header([*Suite*], [*Tool*], [*Files*], [*Tests*], [*What is tested*]),
  [Backend unit], [Vitest], [24], [191], [Model rules (`build*`: amounts, months, date ranges, unique names), services, controllers and mappers, guards, env config, `DomainExceptionFilter`.],
  [Backend integration], [Vitest, supertest], [10], [108], [HTTP contract of every feature: auth, onboarding, accounts, categories, transactions and filters, statistics, budgets; household isolation (foreign household's URL or ids).],
  [Frontend unit], [Vitest, jsdom], [53], [277], [Services (API calls, onboarding draft, last-used defaults), dumb components (inputs, outputs, forms), smart components and dialogs, guards, theme, i18n, preload strategy.],
  [Browser end-to-end], [Playwright], [6], [8 × 2], [Login (anonymous redirect, wrong password), onboarding, account create and rename, transaction add/edit/delete with balance, income and expense on Home, budget overspend; each flow on desktop and mobile.],
)

- *Where:* backend `src/**/*.spec.ts` (`bun run test`) and `test/*.e2e-spec.ts` (`bun run test:e2e`); frontend `src/**/*.spec.ts` (`bun run test`) and `playwright/e2e/` (`bun run e2e`).
- *Fakes over mocks:* unit specs replace collaborators with small fakes typed as `Pick<Repository, 'method'>` or `Pick<Service, 'method'>`, implementing only the methods the subject calls; a cast supplies the full class type.
- *No mocks in integration:* backend integration specs run the real `AppModule`, including `setupApp()` and better-auth, on `:memory:` SQLite migrated and seeded per run (`test/setup-db.ts`).
- *Isolated browser flows:* Playwright starts its own API (:3100, `:memory:`) and `ng serve` (:4300), in projects `desktop` (Desktop Chrome) and `mobile` (Pixel 7, QS-4). Fixtures in `playwright/fixtures/test.ts` sign up a fresh user, and onboard a household when needed, through the API for each test, so tests share no state and run fully parallel.

== Theming

Angular Material 3 defines `--mat-sys-*` system colors and type tokens in `frontend/src/material-theme.scss`. App-specific income, expense, warning, and account colors use `--app-*` tokens there. `frontend/src/styles.css` maps these tokens to Tailwind names such as `bg-surface-low`, `text-on-surface-variant`, and `text-income`. Templates in `src/app/` use these semantic names, never palette utilities such as `gray-*`, `red-*`, or `green-*`.

Material and app colors use `light-dark()` pairs. `ThemeService` stores light, dark, or follow-system preference per browser and sets `color-scheme` on `<body>`; the browser then resolves the tokens for the selected scheme. Canvas consumers use the service's resolved light/dark value because canvas cannot evaluate CSS colors. The Material 3 theme is configured with `mat.theme()` in `material-theme.scss`.

The category avatar returns a CSS `light-dark()` color, while `categorySchemeColor` returns one explicit scheme color for Chart.js. `CategoryBarChartComponent` also reads resolved Material ink and border colors from its DOM wrapper. The chart takes `ThemeService.resolved` rather than passing a `light-dark()` expression to canvas (`frontend/src/app/components/category-avatar/category-color.ts`).

== Security

better-auth owns sign-in and session cookies; `AuthModule` installs a global guard for Nest controller routes (ADR-4). `setupApp` applies credentialed CORS only to configured `TRUSTED_ORIGINS`. In the Compose deployment, nginx is the public entry point and overwrites `X-Real-IP` with its peer address. better-auth keys rate limits on that header; using the forwarded-for chain would let a client choose its own rate-limit key. Production requires `BETTER_AUTH_SECRET`, and Swagger UI is disabled there (`backend/src/shared/infra/config/env.ts`, `backend/src/main.ts`). Deployment values and the proxy trust boundary are in chapter 7.

== Money and account numbers

Amounts travel through the API and database as integer minor units (cents for the supported currencies); UI inputs convert major units with rounding at submission and display them divided by 100. Account opening balances can be signed, transaction amounts are positive with direction in `type`, and budget limits are nonnegative. Input DTOs cap a single absolute amount at `MAX_AMOUNT = 100_000_000_000` minor units (one billion major units), leaving headroom under JavaScript's `Number.MAX_SAFE_INTEGER` for balance sums; it is not a cap on the number of transactions. Keep short unit annotations at field boundaries (`backend/src/shared/kernel/currency.ts`).

`finance_account.number` is unique within a household. `nextAccountNumber` computes `coalesce(max(number), 0) + 1` inside the insert statement, so onboarding's ordered libsql batch assigns 1 through N without a client-side read/modify/write race. Account creation uses the same expression. See ADR-3 and `backend/src/features/account/model/account.schema.ts`.

== Responsive shell and dialogs

`ShellPage` fills the viewport (`h-dvh`); its `MatTabNavPanel` is the only scroll container. The document has `overscroll-behavior: none`, and the shell uses a bottom navigation bar on phones and tabs under the header from the `md` breakpoint. Keeping page content inside the panel prevents iOS Firefox from painting it behind its translucent bottom toolbar, which clips fixed elements at the layout viewport (`shell.page.ts`, `material-theme.scss`, `styles.css`; M15).

Form dialogs use the `.app-dialog` CSS class: a full-screen sheet below 640px and a centered card above it, so an already-open dialog responds to resizing. `DialogService.open` synchronously focuses an off-screen input during the tap before the lazy dialog import; iOS then keeps the keyboard open when CDK moves focus to `cdkFocusInitial`. Editing can opt out with `focusInput: false`. The service restores focus to the original trigger after close (`frontend/src/app/components/dialog/dialog.service.ts`).

== Quick transaction entry

A repeat entry needs only the amount (quality goal 3).

#diagram("08_quick_entry", [Tap, amount, Save. Everything else is prefilled from the last entry.])

- Category and title are optional; no category means "Uncategorized" (ADR-1).
- Code: `TransactionHistoryComponent` (add button), `TransactionFormComponent` (defaults), `TransactionService` (`localStorage` key `transaction-last-used`).

== Route loading

#diagram("08_route_loading", [The shell and the tab page download in parallel with the guard requests; everything else waits 3 s.], width: 85%)

At bootstrap, `prefetchShellTab(location.pathname)` starts downloading the shell and the page of the first URL segment before auth and household guards finish their requests. For `/analytics/*` that page is the `AnalyticsPage` layout; its nested child (`CategoryStatsPage` or `BudgetsPage`) loads only after the guards pass. After router startup, `DelayedPreloadingStrategy` waits 3000 ms before loading each other lazy route, so chart and form chunks do not compete with the first page on a slow connection. Cached, content-hashed bundles then make later tab switches cheaper (`frontend/src/main.ts`, `config/routes.config.ts`, `config/delayed-preloading.strategy.ts`; quality scenario QS-2 in chapter 10).
