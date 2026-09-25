#import "diagram.typ": diagram

= Building Block View

== Level 1: Whitebox Overall System

#diagram("05_level1_containers", [One browser app, one reverse proxy, one API process with auth inside, one SQLite file.], width: 42%)

#table(
  columns: (auto, 1fr, auto),
  inset: 6pt,
  table.header([*Building block*], [*Responsibility*], [*Source*]),
  [Web app], [Screens, client state, routing, theming], [`frontend/`],
  [Web server], [Serves the bundle, proxies `/api/`, sets `X-Real-IP`], [`frontend/nginx.conf.template`],
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
  [`household`], [Membership and household settings; `HouseholdMemberGuard` protects every `/households/:householdId/*` route of the other modules.],
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

#diagram("05_level2_frontend", [Every feature module has the same folders: dumb components only get inputs and emit outputs; only services call the API (components import just its DTO types).], width: 50%)

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Module*], [*Responsibility*]),
  [`shell`], [Authenticated layout, tab navigation, the single scroll panel (ch. 8).],
  [`auth`], [Login page and form.],
  [`onboarding`], [Wizard, localStorage draft, validation calls, final submit.],
  [`household`], [Home page; `HouseholdService` and the onboarding guards.],
  [`transaction`], [Transactions page, history, add/edit dialog, last-used defaults (ch. 8).],
  [`analytics`], [Analytics tab layout and category statistics chart.],
  [`budget`], [Budgets page, limit dialog, safe-to-spend card, take-over (ADR-2).],
  [`settings`], [Household settings, account and category management, sign-out.],
  [`account`, `category`, `stats`], [No own page: components and services reused by Home and Settings.],
  [`config/`], [Routes, prefetch, delayed preload (ch. 8).],
  [`core/`], [Generated API client, better-auth client and `AuthGuard`, theme, i18n, icons.],
  [`components/`], [Feature-independent UI: dialog service, amount, category avatar, tab nav.],
)

Features may import other features' components and services (Home shows account, budget, and stats components); shared code never imports from a feature (`frontend/AGENTS.md`).
