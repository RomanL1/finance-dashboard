#import "diagram.typ": diagram

= System Scope and Context

== Business Context

#diagram("03_business_context", [The household member is the only partner. No bank is connected (ch. 2).], width: 38%)

#table(
  columns: (auto, 1fr, 1fr),
  inset: 6pt,
  table.header([*Partner*], [*Input*], [*Output*]),
  [Household member], [Household setup, accounts, transactions, monthly limits], [Balances, transaction history, category statistics, budget status],
  [Bank], [None: Switzerland has no bank-agnostic API (ch. 2)], [None],
)

== Technical Context

#diagram("03_technical_context", [Everything reaches the system through one origin; the developer also uses CLI scripts.], width: 80%)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt,
  table.header([*Partner*], [*Channel*], [*Details*]),
  [Browser], [HTTP], [One origin (`APP_PORT`, default 8080): nginx serves the Angular bundle and proxies `/api/*` (JSON, session cookie) to the API. No TLS in the stack (ch. 11); containers and ports in ch. 7.],
  [Developer], [CLI], [`bun run db:seed`, `SEED_DEMO` at startup, `bun run openapi:generate`.],
  [Developer], [HTTP], [Swagger UI `/docs`, non-production only.],
)
