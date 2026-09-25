#import "diagram.typ": diagram

= Quality Requirements

== Quality Tree

#diagram("10_quality_tree", [QS-1, QS-2, QS-4, and QS-5 check the quality goals of ch. 1; QS-3, QS-6, and QS-7 check the lecturer's requirements.], width: 70%)

== Quality Scenarios

#let aspect(name) = table.cell(colspan: 3, fill: luma(235))[*#name*]

#block[
  #set par(justify: false)
  #table(
    columns: (auto, 1.3fr, 1fr),
    inset: 6pt,
    table.header([*Quality*], [*Steps to reproduce*], [*Expected outcome*]),
    aspect[Consistency],
    [QS-1 \ Atomic onboarding (goal 1)],
    [
      + Sign in as `demo@finance.local` in local development.
      + In `backend/local.db`, add a trigger that aborts inserts into `finance_account` (`raise(abort, …)`).
      + Finish the onboarding wizard, then drop the trigger.
    ],
    [Submit fails with 500. No `household`, `household_member`, or `category` row exists for the user; the wizard draft is still in localStorage.],
    aspect[Performance],
    [QS-2 \ Loading order (goal 2)],
    [
      + Sign in at `http://localhost:8080`.
      + DevTools → Network: disable cache, throttle to "Slow 4G".
      + Reload `/transactions`.
    ],
    [Shell and transactions chunks start before `get-session` and `households/me` return. Other route chunks start at least 3 s after the page renders.],
    [QS-3 \ Lighthouse],
    [
      + `docker compose up --build`, sign in as `sample@finance.local`.
      + DevTools → Lighthouse, all four categories, on Mobile and Desktop for each shell tab.
    ],
    [Average of Performance, Accessibility, Best Practices, and SEO is at least 90 for Mobile and for Desktop.],
    aspect[Usability],
    [QS-4 \ Phone layout (goal 2)],
    [
      + Open `/transactions` on a phone (iOS Firefox) or in the Playwright `mobile` project.
      + Scroll to the end of the list.
    ],
    [Bottom navigation stays visible; the document does not scroll, only the tab panel does.],
    [QS-5 \ Quick entry (goal 3)],
    [
      + On a phone, add one expense with account and category.
      + Tap +, type an amount, tap Save.
    ],
    [Keyboard is open when the dialog appears; account and category match the previous entry; the entry saves without touching another field.],
    aspect[Deployability],
    [QS-6 \ One-command start],
    [
      + Fresh clone: `cp .env.example .env`, set `BETTER_AUTH_SECRET`.
      + `docker compose up --build`.
      + Sign in at `http://localhost:8080` as `demo@finance.local` / `demo-password`, enter data.
      + `docker compose restart`.
    ],
    [Both containers report healthy; the demo user reaches onboarding; data entered before the restart is still there.],
    aspect[Maintainability],
    [QS-7 \ Test suites],
    [
      + Backend: `bun run test`, `bun run test:e2e`.
      + Frontend: `bun run test`, `bun run e2e`.
    ],
    [All four suites pass (scope and counts in ch. 8 Testing).],
  )
]

== Lighthouse Results

Production bundle via `docker compose` (port 8080), 2026-09-25. Every run meets QS-3.

#let shot(file, caption) = figure(image("pictures/" + file, width: 80%), caption: caption)

#shot("lighthouse_home_desktop.png", [Home `/`, Desktop: average 100.])
#shot("lighthouse_home_analytics_budgets_desktop.png", [Budgets `/analytics/budgets`, Desktop: average 100.])
#shot("lighthouse_transactions_mobile.png", [Transactions `/transactions`, Mobile: average 96.5 (Performance 88, Accessibility 98).])
