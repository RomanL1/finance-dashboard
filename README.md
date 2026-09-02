# Personal Finance Dashboard

Household finance tracking without bank integration. See `docs/proposal.pdf`.

| part       | stack                                                   | start                                   |
| ---------- | ------------------------------------------------------- | --------------------------------------- |
| `backend/` | NestJS 12 · drizzle-orm · sqlite (libsql) · better-auth | `bun run db:reset && bun run start:dev` |
| `frontend/`| Angular 22 · signals · Tailwind 4 · better-auth client  | `bun run start`                         |

Demo login after seeding: `demo@finance.local` / `demo-password`.
