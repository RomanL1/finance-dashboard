#import "diagram.typ": diagram

= Deployment View

#diagram("07_deployment", [Only nginx is reachable from outside; the API starts after migrations and is healthy before nginx starts.], width: 42%)

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Node*], [*Artifact and configuration*]),
  [`web`], [Angular browser bundle in nginx. Host port `APP_PORT` defaults to 8080; `/api/` proxies to `API_UPSTREAM=api:3000`.],
  [`api`], [Bun/NestJS image, port 3000. `DB_FILE_NAME=file:/data/local.db`; migrations run at startup before listening.],
  [`db-data`], [Named Docker volume holding the SQLite file across container restarts.],
)

== Runtime configuration

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt,
  table.header([*Variable*], [*Required*], [*Purpose*]),
  [`BETTER_AUTH_SECRET`], [Compose, prod], [Signs session cookies; no default value (ADR-6).],
  [`BETTER_AUTH_URL` \ `TRUSTED_ORIGINS`], [Other origin], [Must match the browser-facing origin when it is not `http://localhost:8080`.],
  [`SEED_DEMO`], [No], [Creates the seed users below on startup. Default `true` in Compose, `false` locally; disable outside demos.],
  [`APP_PORT`], [No], [Published HTTP port for `web`; defaults to 8080. TLS termination is outside this stack (ch. 11).],
)

== Seed users

- `demo@finance.local` / `demo-password`: no household yet, starts the onboarding wizard.
- `sample@finance.local` / `sample-password`: household with categories, accounts, budgets, and 200 transactions.
- `SEED_DEMO` only creates missing users and never resets data. `bun run db:seed` (local development) resets both households (`backend/src/shared/infra/db/seed.ts`).
