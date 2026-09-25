#import "diagram.typ": diagram

= Building Block View

== Level 1: Whitebox Overall System

#diagram("05_level1_containers", [One browser app, one reverse proxy, one API process with auth inside, one SQLite file.], width: 42%)

#table(
  columns: (auto, 1fr, auto),
  inset: 6pt,
  table.header([*Building block*], [*Responsibility*], [*Source*]),
  [Web app], [Screens, client state, routing, theming], [`frontend/`],
  [Web server], [Serves the bundle, proxies `/api/`], [`frontend/nginx.conf.template`],
  [API], [REST endpoints, business rules, household scoping], [`backend/src/features/`],
  [Auth], [Sign-in, session cookies, rate limiting], [`backend/src/shared/infra/auth/`],
  [Database], [Persistent state; schema via migrations], [`backend/drizzle/`],
)

== Level 2: Backend Architecture

#diagram("05_level2_backend", [Every feature module has the same four layers: controllers never touch the database, services never see HTTP.])

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Module*], [*Responsibility*]),
  [`household`], [Membership and household settings; provides `HouseholdMemberGuard` (ch. 8 Security).],
  [`onboarding`], [Wizard validation and atomic household creation (ADR-3).],
  [`account`], [Finance accounts: numbering, archive or delete (M16).],
  [`category`], [Categories, default list, transfer on delete (ADR-1).],
  [`transaction`], [Transactions, filters, statistics.],
  [`budget`], [Monthly limits and take-over (ADR-2); checks categories via `category`.],
  [`shared/infra/`], [`AuthModule` (global `AuthGuard`), `DbModule` (libsql), `HealthModule`, `setupApp()` (CORS, auth handler, validation, error filter; ADR-4).],
  [`shared/kernel/`], [`Id`, `Currency`, `DomainError`; no Nest or Drizzle imports.],
)

New tables must be re-exported from `shared/infra/db/schema.ts`: drizzle-kit and the better-auth adapter both read the schema from there.

== Level 2: Frontend Architecture

#diagram("05_level2_frontend", [Feature modules use these folders as needed: `budget` and `transaction` have all four, `shell` and `settings` only pages. Dumb components only get inputs and emit outputs; only services call the API.], width: 50%)

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Module*], [*Responsibility*]),
  [`shell`], [Authenticated layout, tab navigation, the single scroll panel (ch. 8 Responsive shell).],
  [`auth`], [Login page and form.],
  [`onboarding`], [Wizard, localStorage draft, validation calls, final submit.],
  [`household`], [Home page; `HouseholdService` and the onboarding guards.],
  [`transaction`], [Transactions page, history, add/edit dialog, last-used defaults (ch. 8 Quick transaction entry).],
  [`analytics`], [Analytics tab layout and category statistics chart.],
  [`budget`], [Budgets page, limit dialog, safe-to-spend card, take-over (ADR-2).],
  [`settings`], [Household settings, account and category management, sign-out.],
  [`account`, `category`, `stats`], [No own page: components and services reused by Home and Settings.],
  [`config/`, `core/`, `components/`], [Shared: routes and preloading (ch. 8 Route loading), generated API client, auth client and guard, theme, i18n, and feature-independent UI such as the dialog service.],
)

Features may import other features' components and services (Home shows account, budget, and stats components); shared code never imports from a feature (`frontend/AGENTS.md`).
