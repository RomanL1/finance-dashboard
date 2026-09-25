// Mermaid sources live in diagrams/*.mmd; diagrams/render.sh turns them into the SVGs used here.
#let diagram(name, caption, width: 100%) = figure(
  image("diagrams/" + name + ".svg", width: width),
  caption: caption,
)
