= Solution Strategy

== Technology and decomposition

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Decision*], [*Reason (alternative beaten)*]),
  [SPA + REST API + SQLite], [Three containers (ch. 5) cover a household-sized load; a file database needs no server (beat PostgreSQL).],
  [Modular monolith by feature], [`backend/src/features/*` and `frontend/src/app/features/*` mirror the domain; one deployable (beat type folders such as `controllers/`, `services/`).],
  [Drizzle ORM + drizzle-kit migrations], [Typed schema next to its feature; SQL-close queries (beat TypeORM decorators).],
  [better-auth sessions], [Cookie sessions and rate limiting out of the box, tables in the same Drizzle schema (beat a hand-written JWT flow). Mounting: ADR-4.],
  [OpenAPI → generated client], [`@nestjs/swagger` spec generates `frontend/src/app/core/api/`; no duplicated DTOs.],
  [Angular Material 3 + Tailwind 4], [Accessible components plus semantic utility tokens (ch. 8 Theming).],
  [Monorepo, Bun], [One repository for `frontend/` and `backend/`; Bun as package manager and runtime.],
)

== Quality goals


#table(
  columns: (1fr, 2fr),
  inset: 6pt,
  table.header([*Quality goal*], [*Approach*]),
  [Atomic financial writes], [SQLite via Drizzle and libsql `batch()` for multi-statement changes; see ADR-3 in chapter 9 and the money concept in chapter 8.],
  [Responsive navigation], [A fixed shell with one scroll panel, boot-time current-route prefetch, then delayed background preloading; see chapter 8.],
  [Low-effort transaction entry], [One add button on Home and Transactions; an amount-first dialog with every other field prefilled or optional; see chapter 8 Quick transaction entry and ADR-1.],
)
