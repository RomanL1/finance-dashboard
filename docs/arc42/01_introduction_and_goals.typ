= Introduction and Goals

== Requirements Overview

The dashboard lets a household record accounts and transactions, plan monthly limits per category, and see balances and spending. Story IDs such as M5 or S4 refer to `docs/proposal.typ`.

== Quality Goals

#table(
  columns: (auto, 1fr, 2fr),
  inset: 6pt,
  table.header([*Priority*], [*Goal*], [*Why*]),
  [1], [Atomic financial writes], [A failed multi-step write leaves no partial household, transfer, or history.],
  [2], [Responsive navigation], [The first page loads quickly on slow connections, and the layout works on phone and desktop.],
  [3], [Low-effort transaction entry], [If entering is tedious, entries get skipped and balances and limits drift from reality.],
)

== Stakeholders

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  table.header([*Role*], [*Expectation*]),
  [Developer (Roman Lysser)], [Well-thought-out architecture, tools that are clear to use, fast-running scripts, and a polished overall look and feel.],
  [Lecturer (HSLU)], [
    Minimum project requirements:
    - Create, show, change, and delete a self-defined resource, stored in a database and shown in at least two different views.
    - Responsive for desktop, tablet, and mobile.
    - Automated unit, integration, and end-to-end tests.
    - Lighthouse average of at least 90 on mobile and desktop.
    - Reproducible start via a public URL or one `docker compose up`.
    - Readable, extensible, well-structured code.
  ],
  [Household member (end user)], [A well-structured overview, ease of use, and reliability.],
)
