---
name: arc42-docs
description: Writes and reviews software architecture documentation structured by arc42, weighted on chapters 4–10 (solution strategy, building blocks, runtime, deployment, crosscutting concepts, ADRs, quality scenarios). Use when documenting a system's architecture, writing an ADR, drawing C4/context/deployment diagrams, or filling or auditing an arc42 chapter.
metadata:
  version: "1.0"
---

# arc42 Architecture Docs

Architecture documentation for a **software engineer** joining the project: short, precise, concise. It records what the code cannot tell: goals, constraints, structure above file level, and the _reasons_ behind decisions. Diagrams carry structure; prose carries rationale.

## Steps

1. **Locate existing docs.** Search for an arc42 folder (`docs/arc42`, `docs/architecture`, files named `0x_*`). Write in the format already in use (Typst, AsciiDoc, Markdown) and keep its file-per-chapter layout. None exists → one file per chapter in Markdown under `docs/arc42/`, named `NN_snake_case_title.md`. Done when the target folder and format are fixed.

2. **Gather evidence.** Read the code, not just the READMEs: package manifests, entry points, module/folder layout, DB schema and migrations, auth, config, Dockerfiles/compose/CI, and requirement docs (proposal, user stories). List every **deliberate deviation** from requirements or from framework conventions you find; each one is an ADR candidate. Done when every chapter 4–10 has concrete facts (names, versions, paths) to draw from.

3. **Write chapters 4–10**, following [references/chapters.md](references/chapters.md) for each chapter's content and shape. Chapters 1–3 and 11–12 stay brief; fill them only enough that 4–10 have their anchors (quality goals in 1, context in 3). Diagrams follow [references/diagrams.md](references/diagrams.md).

4. **Cross-check.** Done when all of these hold:
   - Every top quality goal of ch. 1 maps to an approach in ch. 4 and at least one scenario in ch. 10.
   - Every building block in ch. 5 exists in the code under the name shown; every diagram element has a label and every arrow a verb.
   - Every ADR in ch. 9 is referenced from where it bites (ch. 4, 5 or 8), and every deviation from step 2 has an ADR.
   - The document builds/renders without errors (e.g. `typst compile`, `asciidoctor`, a Markdown preview with Mermaid).

## Style

- **Brevity**: tables, bullet lists, diagrams. A paragraph earns its place only by explaining _why_.
- **Concrete**: name the real module, table, endpoint, version. "Uses a database" says nothing; "PostgreSQL 17, schema via Drizzle migrations in `backend/drizzle/`" says it all.
- **Rationale first**: every choice states the alternative it beat and the reason.
- **Single source of truth**: a fact lives in one chapter; others link to it. The code is a source too: point at a file rather than copying its contents.
- **Stable**: describe structure and concepts, not line-level detail that changes weekly.
