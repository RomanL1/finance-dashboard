#set document(title: "Architecture Documentation", author: "Roman Lysser")
#set page(paper: "a4", margin: 2.5cm, numbering: "1 / 1")
#set text(font: "Helvetica Neue", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")

#show heading.where(level: 1): it => block(above: 1.6em, below: 0.9em)[
  #set text(size: 15pt, weight: "bold")
  #it
]
#show heading.where(level: 2): it => block(above: 1.2em, below: 0.6em)[
  #set text(size: 12pt, weight: "bold")
  #it
]
#show heading.where(level: 3): it => block(above: 1.0em, below: 0.5em)[
  #set text(size: 11pt, weight: "bold")
  #it
]

#align(center)[
  #text(size: 20pt, weight: "bold")[Personal Finance Dashboard]
  #v(0.3em)
  #text(size: 13pt)[Architecture Documentation (arc42)]
  #v(0.6em)
  #text(size: 10pt)[Roman Lysser · Module WEBLAB.F2601 · 25. September 2026]
]

#v(1.5em)
#line(length: 100%, stroke: 0.5pt + gray)

#include "01_introduction_and_goals.typ"
#include "02_architecture_constraints.typ"
#include "03_system_scope_and_context.typ"
#include "04_solution_strategy.typ"
#include "05_building_block_view.typ"
#include "06_runtime_view.typ"
#include "07_deployment_view.typ"
#include "08_cross_cutting_concepts.typ"
#include "09_architecture_decisions.typ"
#include "10_quality_requirements.typ"
#include "11_risks_and_technical_debt.typ"
#include "12_glossary.typ"
