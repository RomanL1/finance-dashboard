# finance-dashboard backend

NestJS 12 (express) · drizzle-orm 1.x on libsql/sqlite · better-auth 1.7 · bun.

## Quickstart

```bash
bun install
cp .env.example .env        # set BETTER_AUTH_SECRET
bun run db:migrate          # apply drizzle migrations
bun run db:seed             # demo user + household (idempotent)
bun run start:dev           # http://localhost:3000, swagger at /docs
```

Demo login (seeded, use while real auth UI does not exist yet — user story M1):

| field    | value                |
| -------- | -------------------- |
| email    | `demo@finance.local` |
| password | `demo-password`      |

`requests.http` contains ready-to-run requests (VS Code REST Client / IntelliJ).

## Scripts

| script               | purpose                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `db:generate`        | create a migration from the drizzle schema barrel                                     |
| `db:migrate`         | apply migrations to `DB_FILE_NAME`                                                    |
| `db:seed`            | seed demo user + household                                                            |
| `db:reset`           | delete `local.db`, migrate, seed                                                      |
| `openapi:generate`   | write `openapi.json` without starting the server (dev start writes it too)            |
| `auth:generate`      | regenerate better-auth tables into `shared/infra/auth/auth.schema.ts`; see note below |
| `test` / `test:e2e`  | vitest unit specs / e2e against an in-memory sqlite                                   |
| `typecheck` / `lint` | `tsc --noEmit` / oxlint                                                               |

## Architecture

Feature-sliced. See [CLAUDE.md](AGENTS.md) for the rules; `features/household` is the reference slice.

```
src/
├── features/
│   └── household/       api/ · model/ · repository/ · service/ · household.module.ts
└── shared/
    ├── infra/
    │   ├── auth/        better-auth instance, AuthModule + global AuthGuard, @Public, @CurrentUser
    │   ├── config/      env.ts (validated process.env)
    │   ├── db/          drizzle client, DbModule (DRIZZLE token), schema barrel, seed
    │   ├── errors/      DomainError -> HTTP mapping
    │   └── app.setup.ts wiring shared by main.ts and e2e tests
    └── kernel/          DomainError family, Id helpers
```

## OpenAPI → frontend

Dev start (and `bun run openapi:generate`) writes `openapi.json`. The frontend generates its typed client from it with hey-api (`bun run api:generate` in `frontend/`). Operation ids are `{controller}{Method}` (e.g. `householdMine`) via `shared/infra/openapi.ts`.

## Auth

- better-auth serves `/api/auth/*` (sign-up/sign-in/sign-out/get-session …) via `mountAuthHandler`, mounted **before** Nest's body parser.
- Every controller route requires a session (global `AuthGuard`). Opt out with `@Public()`.
- Read the caller with `@CurrentUser()`.
- Frontend origin must be listed in `TRUSTED_ORIGINS` (CORS + better-auth CSRF check).

Note on `auth:generate`: the published `@better-auth/cli` lags behind better-auth 1.7. After regenerating, re-add the
`issuer` column + `(issuer, accountId)` unique index on `account` and delete the `relations(...)` block (drizzle-orm 1.x
removed `relations`). The adapter validates the schema at first use and tells you what is missing.
