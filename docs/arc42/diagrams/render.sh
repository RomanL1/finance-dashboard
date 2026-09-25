#!/usr/bin/env sh
# Renders every Mermaid source in this folder to SVG for the Typst build.
# Usage: docs/arc42/diagrams/render.sh [file.mmd ...]   then: typst compile docs/arc42/main.typ
set -e
cd "$(dirname "$0")"
[ $# -eq 0 ] && set -- *.mmd
for f in "$@"; do
  bunx -p @mermaid-js/mermaid-cli mmdc -q -i "$f" -o "${f%.mmd}.svg" -c mermaid.config.json -b white
done
