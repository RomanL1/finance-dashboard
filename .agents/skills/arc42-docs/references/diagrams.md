# Diagrams

Diagrams are **diagrams-as-code**, versioned next to the text, rendered by the doc toolchain.

## C4 to arc42 mapping

| C4 level / view | arc42 chapter |
|---|---|
| System context | 3 Context and Scope |
| Container | 5 Building Block View, level 1 |
| Component | 5 Building Block View, level 2 |
| Dynamic / sequence | 6 Runtime View |
| Deployment | 7 Deployment View |
| ER / class (domain model) | 8 Crosscutting Concepts |

Skip C4 level 4 (code); the code is its own diagram.

## Tool by doc format

| Format | Tool |
|---|---|
| Markdown | Mermaid (`flowchart`, `sequenceDiagram`, `erDiagram`, `C4Context`, `mindmap`) in fenced ` ```mermaid ` blocks |
| AsciiDoc | PlantUML with C4-PlantUML, or Mermaid, via asciidoctor-diagram |
| Typst | `fletcher` package (`#import "@preview/fletcher:<version>"`) for boxes and arrows, `chronos` for sequence diagrams; or render Mermaid/PlantUML to SVG and `#image("diagrams/x.svg")` with the source file kept alongside |
| Many views from one model | Structurizr DSL |

## Rules

- One diagram, one question: context, containers, one scenario. Split rather than cram.
- Every box has name + technology (`Backend · NestJS`); every arrow a verb + protocol (`reads/writes · SQL`).
- Include a legend when shapes or colours carry meaning.
- Names match building blocks in ch. 5 and code identifiers exactly.
- A caption states what the reader should take away.
