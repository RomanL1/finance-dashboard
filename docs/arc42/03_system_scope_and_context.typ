#import "diagram.typ": diagram

= System Scope and Context

== Business Context

#diagram("03_business_context", [The household member is the only partner. No bank is connected (ch. 2).], width: 38%)

#table(
  columns: (auto, 1fr, 1fr),
  inset: 6pt,
  table.header([*Partner*], [*Input*], [*Output*]),
  [Household member], [Household setup, accounts, transactions, monthly limits], [Balances, transaction history, category statistics, budget status],
)

== Technical Context

#diagram("03_technical_context", [Users reach the Compose stack on port 8080; Swagger exists only on a locally started API.], width: 80%)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt,
  table.header([*Partner*], [*Channel*], [*Details*]),
  [Browser], [HTTP], [Compose stack: one origin on port 8080 serves the app bundle and the REST API under `/api/*` (ch. 7).],
  [Developer], [CLI], [`bun run db:seed`, `bun run openapi:generate`.],
  [Developer], [HTTP], [Swagger UI at `http://localhost:3000/docs` when the API runs locally; not in the Compose stack (ch. 8 Security).],
)
