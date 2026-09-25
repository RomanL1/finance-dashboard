= Glossary

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Term*], [*Definition*]),
  [Household], [Ownership root of all financial data; has one base currency and owner/member users.],
  [Finance account], [A money container (checking, savings, cash, …) with opening balance; table `finance_account`.],
  [Transaction], [Positive amount of type `expense` or `income` booked on one finance account.],
  [Uncategorized], [Bucket of transactions without category (`category_id` null), ADR-1.],
  [Limit (budget)], [Spending cap of one category for one month `YYYY-MM`; no row = no limit.],
  [Take-over], [Copying the nearest earlier month's limits into an empty month, ADR-2.],
  [Touched month], [Month recorded in `budget_month`; never auto-filled again.],
  [Minor units], [Integer cents used for every stored amount.],
  [Shell], [Authenticated layout with tab navigation and the single scroll panel.],
)
