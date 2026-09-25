#import "diagram.typ": diagram

= Cross-Cutting Concepts

== Domain model

#diagram("08_domain_model", [Household is the ownership root; `transaction` and `budget` reach it only through their parents. `user` and `session` belong to better-auth.])

- `transaction.category_id` null means "Uncategorized" (ADR-1).
- The table is `finance_account` (Drizzle symbol `financeAccount`) because better-auth already uses `account` for login providers.

== Household scoping

- `finance_account`, `category`, and `budget_month` carry `household_id`; `transaction` and `budget` inherit ownership through their parents, without redundant household columns.
- Child reads follow the parent: `TransactionRepository.inHousehold` scopes through the account; budget reads join category and filter `category.householdId`.
- Services check parent ownership before child writes.

== Domain errors at the HTTP boundary

Services throw HTTP-independent `DomainError` subclasses (`backend/src/shared/kernel/domain-error.ts`). `DomainExceptionFilter` maps them at the API boundary: `not_found` 404 · `forbidden` 403 · `conflict` 409 · `validation` 400. Responses contain `statusCode`, the error class name, and its message; domain operations remain usable outside HTTP.

== Money and account numbers

- API and database amounts are integer minor units (cents for supported currencies); UI inputs round major units on submission and divide by 100 for display.
- Opening balances may be signed; transaction amounts are positive with direction in `type`; budget limits are nonnegative.
- Input DTOs cap a single absolute amount at `MAX_AMOUNT = 100_000_000_000` minor units (one billion major units), leaving headroom below JavaScript's `Number.MAX_SAFE_INTEGER` for balance sums. (`backend/src/shared/kernel/currency.ts`).
- Account numbers are unique per household. `nextAccountNumber` computes `max + 1` inside the insert statement, so numbers stay correct inside a batch and under concurrent requests (ADR-3, `account.schema.ts`).

== Security

- better-auth owns sign-in and session cookies (ADR-4). `AuthModule` installs a global guard: every controller route needs a session unless marked `@Public()`, and household routes also pass `HouseholdMemberGuard`.
- `setupApp` allows credentialed CORS only for `TRUSTED_ORIGINS`.
- nginx is the Compose entry point and overwrites `X-Real-IP` with `$remote_addr`; better-auth rate limits on that header instead of client-controlled `X-Forwarded-For`. With an upstream proxy, `$remote_addr` is that proxy until trusted real-IP handling is configured (`frontend/nginx.conf.template`).
- Production requires `BETTER_AUTH_SECRET` to prevent forgeable session cookies; Swagger `/docs` and OpenAPI generation run only outside production (`backend/src/shared/infra/config/env.ts`, `backend/src/main.ts`).

== Theming

- Material 3 `--mat-sys-*` color/type tokens and app `--app-*` tokens (income, expense, warning, accounts) map to semantic Tailwind names such as `bg-surface-low` and `text-income`; templates never use palette utilities.
- Material and app colors use `light-dark()`; `ThemeService` stores light, dark, or follow-system preference per browser and sets `<body>`'s `color-scheme`.
- Canvas cannot resolve `light-dark()`: charts use `ThemeService`'s resolved scheme and resolved Material ink/border colors; CSS avatars can use `light-dark()` directly.

== Responsive shell and dialogs

- `ShellPage` fills `h-dvh`; `MatTabNavPanel` is the sole scroll container and the document disables overscroll. Bottom navigation on phones becomes header tabs at `md`; the panel keeps content above iOS Firefox's translucent bottom toolbar (M15).
- `.app-dialog` is a full-screen sheet below 640px and a centered card above it, including when resized while open.
- Before a lazy dialog import, `DialogService.open` focuses an off-screen input within the tap so iOS keeps the keyboard open when CDK moves focus to `cdkFocusInitial`. Editing may use `focusInput: false`; focus returns to the trigger on close.

== Quick transaction entry

A repeat entry needs only the amount (quality goal 3).

#diagram("08_quick_entry", [Tap, amount, Save. Everything else is prefilled from the last entry.])

- Category and title are optional (ADR-1).
- Code: `TransactionHistoryComponent` (add button), `TransactionFormComponent` (defaults), `TransactionService` (`localStorage` key `transaction-last-used`).

== Route loading

#diagram("08_route_loading", [The shell and the tab page download in parallel with the guard requests; everything else waits 3 s.], width: 85%)

For `/analytics/*`, only the `AnalyticsPage` layout is prefetched; its nested child loads after the guards pass. Other lazy routes preload after 3 s so chart and form chunks do not compete with the first page on slow connections (QS-2, ch. 10).

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
