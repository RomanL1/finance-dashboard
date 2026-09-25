#set document(title: "Work Journal", author: "Roman Lysser")
#set page(paper: "a4", margin: 2.5cm, numbering: "1 / 1")
#set text(font: "Helvetica Neue", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.65em)

#align(center)[
  #text(size: 20pt, weight: "bold")[Personal Finance Dashboard]
  #v(0.3em)
  #text(size: 13pt)[Work Journal (Arbeitsjournal)]
  #v(0.6em)
  #text(size: 10pt)[Roman Lysser · Module WEBLAB.F2601 · 25. September 2026]
]

#v(1.5em)
#line(length: 100%, stroke: 0.5pt + gray)
#v(1em)

// Define entries as an array of (Date, Hours, Activity)
#let entries = (
  ("2026-09-01", 4.5, [evaluate technologies for frontend and backend, initialized repository and set up backend & frontend]),
  ("2026-09-02", 5.0, [setup first feature slice for categories & mocking auth with minimal frontend]),
  ("2026-09-03", 6.0, [change styling to angular material, add translations, add default categories, implement onboarding workflow including account and currency]),
  ("2026-09-04", 6.0, [add transactions list overview and crud functionality, add settings page, manage categories part 1]),
  ("2026-09-08", 2.0, [finish manage categories]),
  ("2026-09-11", 6.0, [per-household account numbers, transaction stats endpoint, overview stats with material 3 restyle, account badges and category avatars, fix navigation indicators, run production bundle with docker compose]),
  ("2026-09-13", 4.0, [category stats with base-currency conversion via mirrored ECB rates, analytics page with category bar chart, base currency setting]),
  ("2026-09-15", 3.0, [filter and page the transaction list in backend, transactions tab with account/category filter and pager]),
  ("2026-09-16", 6.5, [simplify to one currency per household and drop exchange rates (I was concerned about how this might affect the complexity of upcoming features, but forgot this was out of scope anyway), create, update and delete budgets per month, month summary with visuals per category]),
  ("2026-09-19", 2.5, [copy budgets from previous month]),
  ("2026-09-20", 4.5, [budget tab on home with left-after-budgets figure, refuse deleting accounts with transactions, account type on accounts, keep a month empty after its last limit is removed, ADR for uncategorized as a null category, language selector in settings, validate source category before transferring transactions, write arc42 architecture documentation]),
  ("2026-09-22", 1.5, [ADR for month-to-month budget inheritance, stop locking miscellaneous category in onboarding, harden production security defaults (required auth secret, swagger only outside production, security headers and CSP, self-hosted fonts, rate limiting on real IP, amount caps), write arc42 architecture documentation]),
  ("2026-09-23", 1.5, [expand unit and API integration test coverage, write arc42 architecture documentation]),
  ("2026-09-24", 4.5, [add playwright e2e tests, raise mobile lighthouse score, seed sample user with ready household, write arc42 architecture documentation]),
  ("2026-09-25", 5.5, [show percentage shares per category, unify formatter config, improve usability on mobile and fix dialog focus, clean up stale comments, write arc42 architecture documentation]),
)

// Automatically calculate total hours
#let total-hours = if entries.len() > 0 {
  entries.map(e => float(e.at(1))).sum()
} else {
  0.0
}

#table(
  columns: (auto, auto, 1fr),
  stroke: 0.5pt + gray,
  inset: 8pt,
  align: (center + horizon, center + horizon, left + horizon),
  table.header(
    [*Date*], [*Hours*], [*Activity*]
  ),
  ..entries.map(e => (
    [#e.at(0)],
    [#e.at(1) h],
    [#e.at(2)],
  )).flatten(),
  table.cell(colspan: 1, align: center)[*Total*],
  [*#total-hours h*],
  [*Target scope: ~60 hours*]
)
