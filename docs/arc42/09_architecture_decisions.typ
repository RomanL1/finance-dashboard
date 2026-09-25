#import "diagram.typ": diagram

= Architecture Decisions (ADRs)

== ADR-1: "Uncategorized" is the absence of a category, not a reserved category row

*Status:* accepted · deviates from the wording of M5 and M6 in the proposal.

=== Context

M5 lets a transaction be entered without choosing a category, M6 lets a category be deleted without leaving its transactions unassigned. The proposal describes both with a _reserved catch-all category_ that such transactions fall into.

=== Options

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Option*], [*Trade-off*]),
  [Reserved category row], [Must be seeded per household, protected from rename/deletion/self-transfer, omitted from onboarding suggestions, and identified by a flag or magic name in special-case queries.],
  [Nullable `category_id`], [Database handles deletion with `on delete set null`; the bucket cannot be renamed or given its own limit.],
)

=== Decision

- `transaction.category_id` is nullable; `null` means "Uncategorized". Deleting a category sets its transactions to `null` (`on delete set null`) unless the user transfers them to another category.
- The transaction list, history filter (`categoryId=none`), statistics, and chart show "Uncategorized" as a bucket of its own.

=== Consequences

- M5/M6 hold: entry needs no category, and deletion offers another category or "Uncategorized"; every transaction has a visible bucket. The database fallback needs no row to seed, protect, migrate, or hide.
- The label comes from the translation files and cannot be renamed. Limits use `(category_id, month)`, so it has no limit; its spending still reduces monthly cashflow and Safe-to-Spend. No Should-have story requires that limit.
- If a limit becomes necessary, insert a reserved category per household and move the `null` rows to it.

== ADR-2: A new month takes over the nearest earlier limits, automatically only for the current and next month

*Status:* accepted · deviates from the wording of S4 in the proposal.

=== Context

S4 asks that a new month takes over the limits of the _previous month_, can be changed there, and leaves the previous month unchanged, so that limits need not be entered again every month.

Three questions are left open by that sentence:
- What counts as the previous month when that month has no limits, for example because the app was not used in August?
- When is a month "new"? The system has no scheduler, and a month nobody opens needs no limits.
- What happens to a month the user emptied on purpose? S1 lets every limit be removed, S3 lets a month stay deliberately unbudgeted. A rule that refills every empty month undoes both.

=== Decision

- Copy independent `budget` rows from the nearest earlier month with limits; reads never inherit limits, so copies can change without changing their source and "no row" still means "no limit" (S3).
- On first view, `POST …/:month/copy-previous?auto=true` applies only to the current and next month. Sequence: ch. 6 Monthly limits take-over. Other months need an explicit action; a month that already has limits returns 409.
- `budget_month(household_id, month)` marks months whose limits were set, removed, or taken over, in the same batch as the change (ADR-3). Automatic take-over skips touched months; the explicit action may refill them.

#diagram("09_adr2_take_over", [Take-over decision as implemented in `BudgetService.copyFromPrevious` (backend) and `loadMonth` (frontend).], width: 60%)

=== Consequences

- S1, S3, and S4 hold together: a new month shows earlier limits, editing them leaves the source month unchanged, and a month the user emptied stays empty.
- Unopened months cost nothing; past months fill only on request.
- Skipping is decided per month: an emptied August does not stop September from taking over July's limits. Treating an emptied month as "inherit nothing" was rejected because it would lose the plan after every unused month.
- The trigger is the client clock (current/next month), since the server knows no household timezone. A client with a wrong clock can at most fill a month early; the user can remove the copies.

== ADR-3: Use libsql `batch()` for atomic multi-statement writes

*Status:* accepted.

=== Context

Onboarding inserts a household, owner membership, categories, and accounts together. Category transfer updates transactions before deleting the category; a household currency change updates accounts with the household; every limit change also marks its month (ADR-2). In the libsql in-memory e2e database, `db.transaction` swaps the client's connection after an explicit transaction and loses that database.

=== Options

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Option*], [*Trade-off*]),
  [`db.transaction`], [Natural Drizzle API, but the libsql connection swap breaks `:memory:` e2e state.],
  [Sequential writes], [Simple, but a later failure can leave a partial household or transfer.],
  [`db.batch`], [libsql executes the statements in one transaction and rolls back together; statements must be assembled before execution.],
)

=== Decision

Use `db.batch()` in `OnboardingRepository`, `CategoryRepository.deleteCategory` when transferring, `HouseholdRepository.update` when changing currency, and the `BudgetRepository` writes (`upsert`, `delete`, `insertMany`) together with the month marker.

=== Consequences

- These writes remain atomic in production and against the in-memory e2e database.
- Operations that need a result to choose the next statement cannot use this prepared batch shape; they need a separate design.
- Revisit if libsql fixes explicit-transaction connection handling or the persistence driver changes.

== ADR-4: Mount better-auth's HTTP handler before Nest initializes

*Status:* accepted.

=== Context

better-auth's Node handler needs the raw request body for `/api/auth/*`. Nest's default body parser consumes that stream during initialization. Auth endpoints also need CORS headers even when the handler responds without entering Nest's controller pipeline.

=== Options

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Option*], [*Trade-off*]),
  [Nest controller wrapper], [Would run after body parsing and hand the handler a consumed stream.],
  [Disable Nest body parsing], [Preserves the auth stream but requires manual parser wiring for ordinary controllers.],
  [Early Express middleware], [Keeps Nest defaults for controllers while giving better-auth the raw stream.],
)

=== Decision

`setupApp` registers CORS, then `mountAuthHandler`, before `app.init()` or `listen()`. The middleware handles `/api/auth/*` directly and calls `next()` for other paths. `AuthModule` remains inside Nest to expose the auth instance and install the global controller guard.

=== Consequences

- Requests take two paths: better-auth answers `/api/auth/*` and owns validation and responses there; all other requests pass Nest's body parser, guards, validation pipe, and error filter.
- The order in `app.setup.ts` and `auth.handler.ts` is part of the contract and must stay beside the code.
- Revisit if Nest or better-auth gains an integration that preserves the raw stream and response behavior.

== ADR-5: Real sessions replace the simulated login; onboarding creates the household

*Status:* accepted · deviates from M1 and C1 in the proposal.

=== Context

M1 asks for a simulated login with a fixed household until real authentication exists. C1 (Could have) asks for a sign-up that creates the household with the user as owner. A usable household also needs a name, categories, and a first account (M4, M7).

=== Options

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Option*], [*Trade-off*]),
  [Simulated login (M1)], [No auth code, but every request trusts one fixed user; must be replaced later.],
  [Sign-up creates the household (C1)], [One step, but the household starts without categories or accounts.],
  [Real sessions + onboarding], [better-auth from the start; one request creates a complete household.],
)

=== Decision

- better-auth sessions from the start (ADR-4). Signing up creates only the user.
- `POST /api/households/onboarding` creates the household with the user as owner, together with categories and the first account (ADR-3).
- The frontend has a login page but no sign-up page; users come from the seed (ch. 7) or `POST /api/auth/sign-up/email`.

=== Consequences

- M1 is exceeded: real access control instead of a simulation.
- C1 is partly met: sign-up works through the API only, and the household comes from onboarding, not from sign-up.
- A sign-up page needs frontend work only; after sign-up, the onboarding guard takes over.

== ADR-6: Require `BETTER_AUTH_SECRET` instead of shipping a default

*Status:* accepted · qualifies M20 in the proposal.

=== Context

M20 asks that `docker compose up` starts the production bundle without extra knowledge. better-auth signs session cookies with `BETTER_AUTH_SECRET`; anyone who knows the secret can forge sessions.

=== Options

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Option*], [*Trade-off*]),
  [Default secret in `compose.yaml`], [True one-command start, but every deployment that forgets to override it has forgeable sessions.],
  [Generate on first start], [One command, but the secret must be persisted, or every restart signs everyone out.],
  [Require it in `.env`], [One setup step before `docker compose up`; no known secret ever ships.],
)

=== Decision

Compose refuses to start without `BETTER_AUTH_SECRET` (`${BETTER_AUTH_SECRET:?…}`), and `env.ts` requires it when `NODE_ENV=production`. `.env.example` documents the variable.

=== Consequences

- M20 holds with one setup step: `cp .env.example .env` and set the secret (QS-6).
- Revisit if the stack gets a persistent secret store.

