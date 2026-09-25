= Architecture Constraints

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Constraint*], [*Background*]),
  [TypeScript, Angular 22, NestJS 12], [Stack fixed in the proposal; one language from database to view.],
  [SQLite, no extra infrastructure], [One database file via libsql; runs with `docker compose up` only.],
  [No bank connection], [Switzerland has no bank-agnostic API for reading balances and transactions, so transactions are entered by hand; balance = opening balance + transactions.],
  [One currency per household], [`household.base_currency` (CHF, EUR, USD, GBP); no exchange rates.],
  [Single developer, course timeline], [Module WEBLAB.F2601; scope bounded by the MoSCoW stories of the proposal and the lecturer's minimum requirements (ch. 1 Stakeholders).],
)
