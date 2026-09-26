# Personal Finance Dashboard

Household finance tracking without bank integration. See `docs/proposal.pdf`.

## Run the production bundle

```bash
[ -f .env ] || echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
# then add RESEND_API_KEY and MAIL_FROM to .env (see .env.example)
docker compose up --build
```

`BETTER_AUTH_SECRET` is required: it signs session cookies, and the api refuses to start in production without it. `RESEND_API_KEY` and `MAIL_FROM` are required too: sign-up confirmation and password-reset mails go out through [Resend](https://resend.com) from a domain verified there. Builds both images and starts the stack at http://localhost:8080. The login page offers one-click demo logins: demo (lands on onboarding) and sample (household with 200 random transactions).
Data lives in the `db-data` volume and survives restarts. Migrations run automatically on boot. Rebuild after code changes with `docker compose up --build`.

The app listens on host port **8080** by default (`APP_PORT` changes it). Optional overrides go in the same `.env` (see `.env.example`): `APP_PORT`, `SEED_DEMO=false` to skip the demo and sample users, `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` when served from another origin (`APP_URL`, the origin in mail links, follows `BETTER_AUTH_URL`).

Swagger (`/docs`) is only mounted outside production; run the backend locally to browse it.

## Development

| part        | stack                                                   | start                                   |
| ----------- | ------------------------------------------------------- | --------------------------------------- |
| `backend/`  | NestJS 12 · drizzle-orm · sqlite (libsql) · better-auth | `bun run db:reset && bun run start:dev` |
| `frontend/` | Angular 22 · signals · Tailwind 4 · better-auth client  | `bun run start`                         |

Demo login after seeding: the buttons on the login page, or `demo@finance.local` / `demo-password` (onboarding) and `sample@finance.local` / `sample-password` (sample data). Without `RESEND_API_KEY` in dev, mails (sign-up confirmation, password reset) are printed to the backend console; open the link from there.

## Tests

| layer                   | where                        | run (in that folder) |
| ----------------------- | ---------------------------- | -------------------- |
| backend unit            | `backend/src/**/*.spec.ts`   | `bun run test`       |
| backend API (e2e)       | `backend/test/*.e2e-spec.ts` | `bun run test:e2e`   |
| frontend unit           | `frontend/src/**/*.spec.ts`  | `bun run test`       |
| end-to-end (Playwright) | `frontend/playwright/e2e/`   | `bun run e2e`        |

Playwright needs Chromium once per machine (`bunx playwright install chromium` in `frontend/`) and starts its own backend and frontend on `:3100` / `:4300`, so it runs alongside the dev servers. Details in `frontend/README.md`.
