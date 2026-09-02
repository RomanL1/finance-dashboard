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
