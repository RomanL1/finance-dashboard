= Introduction and Goals

== Requirements Overview

The dashboard lets a household record accounts and transactions, plan monthly category limits, and inspect balances and spending. `docs/proposal.typ` is the source for the story definitions. These IDs appear in code comments where a rule implements a specific story.

== Quality Goals

#table(
  columns: (auto, 1fr, 2fr),
  inset: 6pt,
  table.header([*Priority*], [*Goal*], [*Why*]),
  [1], [Atomic financial writes], [A failed onboarding or category transfer must not leave a partial household or history.],
  [2], [Responsive navigation], [First-page requests should finish before unrelated route chunks compete for bandwidth; phone and desktop layouts remain usable.],
  [3], [Low-effort transaction entry], [Adding a transaction must take as little effort as possible, so the app never keeps the user from tracking transactions and budgets. Skipped entries make balances and limits drift from reality.],
)

== Stakeholders

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Role*], [*Expectation*]),
  [Developer (Roman Lysser)], [Well-thought-out architecture, tools that are clear to use, fast-running scripts, and a polished overall look and feel.],
  [Lecturer (HSLU)], [
    Minimum project requirements:
    - *Functional:* create, show, change, and delete a self-defined resource; store the data persistently in a database; present the data in at least two different forms.
    - *Responsive:* optimized for desktop as well as mobile and tablet.
    - *Tested:* meaningful automated unit, integration, and E2E tests.
    - *Lighthouse:* score of at least 90 (average of all audits) for mobile and desktop.
    - *Reproducible:* the production bundle starts reproducibly, via a public URL or one `docker compose up`.
    - *Code:* readable and extensible, with a sensible, well-thought-out structure of the whole application.
  ],
  [End user], [A well-structured overview, ease of use, and reliability.],
)
