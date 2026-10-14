# arc42 chapters

Content and shape per chapter. Chapters 4–10 are the core; each lists what it **must** contain.

## 1 Introduction and Goals (brief)
- Two or three sentences on what the system does and for whom.
- **Top 3–5 quality goals**, ranked, as a table `Priority | Quality goal | Motivation`. These drive chapters 4 and 10.
- Stakeholders table `Role | Expectation` only when more than one role matters.

## 2 Constraints (brief)
Table `Constraint | Background`: technical (mandated language, runtime, hosting), organisational (deadline, team size, course/module rules), conventions (style guides, licences).

## 3 Context and Scope (brief)
- **C4 system-context diagram**: the system as one box, users and external systems around it.
- Table `Partner | Input | Output | Channel/protocol`.

## 4 Solution Strategy
The fundamental decisions in one page. Table `Quality goal / problem | Approach | Details (link)`, plus bullets for:
- Technology choices (language, frameworks, DB, auth) with the one-line reason for each.
- Top-level decomposition (e.g. SPA + REST API + relational DB; modular monolith by feature).
- How each top quality goal from ch. 1 is achieved.
- Organisational decisions (monorepo, package manager, CI).
Link each entry to its ADR in ch. 9 or concept in ch. 8. No detail here that belongs there.

## 5 Building Block View
Static decomposition, top-down, as nested levels:
- **Level 1**: C4 container diagram (frontend, backend, DB, external services) as a white-box of the whole system. Table `Building block | Responsibility | Tech`.
- **Level 2**: one white-box per container that has internal structure worth knowing (backend modules, frontend feature areas/routes). C4 component diagram plus the table above, with source path.
- **Level 3** only for a block whose internals are non-obvious.
- State **deliberate deviations** from framework structure (e.g. auth as own module, feature folders instead of type folders) and link to the ADR.
- Frontend and backend each get their own level-2 view.

## 6 Runtime View
2–5 scenarios that show how blocks cooperate: the architecturally interesting ones, not CRUD.
- Pick: login/session flow, the core use case, a flow crossing many blocks, an error or edge-case path, a startup/migration/scheduled job.
- Each scenario: **sequence diagram** plus 2–4 bullets on notable points (transaction boundaries, validation, where errors surface).

## 7 Deployment View
- **Deployment diagram**: nodes (hosts, containers, managed services), what runs on each, protocols and ports between them.
- Table `Node | Artifact | Notes` (image, env config, volume).
- Environments (dev, CI, prod) and how they differ, in one table if more than one.

## 8 Crosscutting Concepts
One sub-section per concept that applies across several blocks, only the ones that are real for this system. Typical: domain model (ER or class diagram), persistence/migrations, authentication & authorisation, validation, error handling, API conventions (REST shape, DTOs, pagination), i18n, state management in the frontend, testing strategy, logging, security, accessibility. Each: the rule, where it is enforced, a pointer to code.

## 9 Architecture Decisions
One **ADR** per important, expensive, risky, or surprising decision, especially every deliberate deviation from requirements or conventions. Number them `ADR-N` and keep them immutable once accepted (supersede, don't rewrite).

```
ADR-N: <decision as a statement>
Status: proposed | accepted | superseded by ADR-M  [· deviates from <requirement id>]
Context: forces and constraints; the question left open.
Options: 2–3 alternatives considered with their main trade-off (table welcome).
Decision: what was chosen, stated precisely.
Consequences: positive, negative, and what would trigger revisiting it.
```

## 10 Quality Requirements
- **Quality tree**: quality goals of ch. 1 at the top, refined into sub-characteristics (ISO 25010 names), leaves = scenario IDs. A mindmap diagram or nested list.
- **Quality scenarios**, table `ID | Quality | Stimulus / source | Environment | Response | Measure`. Every measure is checkable (a number, a time, a pass/fail test). "Fast" is a wish; "dashboard renders in < 1 s with 1 000 transactions on a mid-range laptop" is a requirement.
- Link each scenario to the test, benchmark or audit that verifies it, when one exists.

## 11 Risks and Technical Debt (brief)
Table `Risk / debt | Impact | Mitigation`, ordered by impact.

## 12 Glossary (brief)
Table `Term | Definition`: domain terms and project-specific names only. Use these terms verbatim in every chapter.
