#import "diagram.typ": diagram

= Deployment View

`compose.yaml` starts two containers. Only `web` publishes a host port, as plain HTTP (TLS termination is not part of the stack, ch. 11); `api` is reachable on the Compose network, and its SQLite file is kept on the `db-data` volume.

#diagram("07_deployment", [Only nginx is reachable from outside; the API starts after migrations and is healthy before nginx starts.], width: 55%)

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Node*], [*Artifact and configuration*]),
  [`web`], [Angular browser bundle in nginx. Host port `APP_PORT` defaults to 8080; `/api/` proxies to `API_UPSTREAM=api:3000`.],
  [`api`], [Bun/NestJS image, port 3000. `DB_FILE_NAME=file:/data/local.db`; migrations run at startup before listening.],
  [`db-data`], [Named Docker volume holding the SQLite file across container restarts.],
)

== Runtime configuration

`BETTER_AUTH_SECRET` is required by Compose and by `env.ts` whenever `NODE_ENV=production`; a fallback secret would make session cookies forgeable. `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` must match the browser-facing origin. `main.ts` exposes Swagger `/docs` and writes OpenAPI only outside production. `SEED_DEMO` defaults to `true` in Compose, creating the demo and sample users on boot; disable it for a non-demo deployment. In local development it defaults to `false`, and `bun run db:seed` fills the local database explicitly.

nginx overwrites `X-Real-IP` with `$remote_addr` before proxying. better-auth uses that header for rate limiting; it does not trust the client-controlled `X-Forwarded-For` chain. If another proxy is placed in front of nginx, `$remote_addr` becomes that proxy's address until a trusted real-IP configuration is added. See the security concept in chapter 8 and `frontend/nginx.conf.template`.

== Development seed

`backend/src/shared/infra/db/seed.ts` creates two sign-in users: `demo` has no household and starts the onboarding wizard; `sample` has a finished household, categories, accounts, budgets, and 200 transactions. The seed is idempotent. The end-to-end backend suite instead migrates and seeds `DB_FILE_NAME=:memory:` (`backend/test/setup-db.ts`).
