# Personal Finance Dashboard

Household finance tracking without bank integration. See `docs/proposal.pdf`.

## Run the production bundle

```bash
docker compose up
```

Builds both images and starts the stack at http://localhost:8080. Demo login: `demo@finance.local` / `demo-password`.
Data lives in the `db-data` volume and survives restarts. Migrations run automatically on boot. Rebuild after code changes with `docker compose up --build`.

Optional overrides go in a root `.env` (see `.env.example`): `APP_PORT`, `BETTER_AUTH_SECRET` (set this before exposing the instance; without it the api logs a warning and uses an insecure default), `SEED_DEMO=false` to skip the demo user, `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` when served from another origin.

Swagger (`/docs`) is not exposed through the compose stack; run the backend locally to browse it.

## Development

| part       | stack                                                   | start                                   |
| ---------- | ------------------------------------------------------- | --------------------------------------- |
| `backend/` | NestJS 12 · drizzle-orm · sqlite (libsql) · better-auth | `bun run db:reset && bun run start:dev` |
| `frontend/`| Angular 22 · signals · Tailwind 4 · better-auth client  | `bun run start`                         |

Demo login after seeding: `demo@finance.local` / `demo-password`.
