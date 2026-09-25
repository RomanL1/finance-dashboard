= Solution Strategy

== Technology and decomposition

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Decision*], [*Reason (alternative beaten)*]),
  [SPA + REST API + SQLite], [Browser app, one API process, and one database file (ch. 5) cover a household-sized load; a file database needs no server (beat PostgreSQL).],
  [Modular monolith by feature], [`backend/src/features/*` and `frontend/src/app/features/*` mirror the domain; the backend stays one deployable API (beat type folders such as `controllers/`, `services/`).],
  [Drizzle ORM + drizzle-kit migrations], [Typed schema next to its feature; SQL-close queries (beat TypeORM decorators).],
  [better-auth sessions], [Cookie sessions and rate limiting out of the box, tables in the same Drizzle schema (beat a hand-written JWT flow). Mounted before Nest's body parser (ADR-4); replaces the simulated login (ADR-5).],
  [OpenAPI → generated client], [`@nestjs/swagger` spec generates `frontend/src/app/core/api/`; no duplicated DTOs.],
  [Angular Material + Tailwind], [Accessible components plus semantic color tokens (ch. 8 Theming).],
  [Monorepo, Bun], [One repository for `frontend/` and `backend/`; Bun as package manager and runtime.],
)

== Quality goals

#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  table.header([*Quality goal*], [*Approach*]),
  [Atomic financial writes], [Multi-statement writes run as one libsql `batch()` (ADR-3).],
  [Responsive navigation], [Prefetch the current tab at boot, preload the rest later; one scroll panel in a fixed shell (ch. 8 Route loading, Responsive shell).],
  [Low-effort transaction entry], [One add button; the dialog needs only the amount, everything else is prefilled or optional (ch. 8 Quick transaction entry).],
)
