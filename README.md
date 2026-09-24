# Personal Finance Dashboard

Household finance tracking without bank integration. See `docs/proposal.pdf`.

## Run the production bundle

```bash
[ -f .env ] || echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
docker compose up
```

`BETTER_AUTH_SECRET` is required: it signs session cookies, and the api refuses to start in production without it. Builds both images and starts the stack at http://localhost:8080. Demo login: `demo@finance.local` / `demo-password`.
Data lives in the `db-data` volume and survives restarts. Migrations run automatically on boot. Rebuild after code changes with `docker compose up --build`.

Optional overrides go in the same `.env` (see `.env.example`): `APP_PORT`, `SEED_DEMO=false` to skip the demo user, `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` when served from another origin.

Swagger (`/docs`) is only mounted outside production; run the backend locally to browse it.

## Development

| part        | stack                                                   | start                                   |
| ----------- | ------------------------------------------------------- | --------------------------------------- |
| `backend/`  | NestJS 12 · drizzle-orm · sqlite (libsql) · better-auth | `bun run db:reset && bun run start:dev` |
| `frontend/` | Angular 22 · signals · Tailwind 4 · better-auth client  | `bun run start`                         |

Demo login after seeding: `demo@finance.local` / `demo-password`.

## Tests

| layer                   | where                        | run (in that folder) |
| ----------------------- | ---------------------------- | -------------------- |
| backend unit            | `backend/src/**/*.spec.ts`   | `bun run test`       |
| backend API (e2e)       | `backend/test/*.e2e-spec.ts` | `bun run test:e2e`   |
| frontend unit           | `frontend/src/**/*.spec.ts`  | `bun run test`       |
| end-to-end (Playwright) | `frontend/playwright/e2e/`   | `bun run e2e`        |

Playwright needs Chromium once per machine (`bunx playwright install chromium` in `frontend/`) and starts its own backend and frontend on `:3100` / `:4300`, so it runs alongside the dev servers. Details in `frontend/README.md`.
