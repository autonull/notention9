# UI/UX Space Graph

Planning layer over notention's seam/strategy, journey, and optimize-loop systems.
Method: `scripts/melt_ui.skill.md`. The application code remains authoritative;
when graph and code disagree, code wins and the graph is stale.

## Files

- `graph.json` — intents, capabilities, flows, steps, surfaces, edges.
- `analysis-2026-11-23.md` — preliminary analysis findings.

## Commands

```bash
pnpm uisg validate            # schema, references, reachability
pnpm uisg query --type flow   # filter by type/status/text/seam/journey/source
pnpm uisg analyze             # findings + journey target drift vs current UI
pnpm uisg to-journey flow.capture-and-edit --out /tmp/opencode/capture.json
pnpm uisg to-journey flow.publish-gate --conditions cancelled --emit-test
pnpm uisg run flow.golden-path            # compile, emit, build, run journey
pnpm uisg compare <bundleA> <bundleB>     # diff evidence (run dirs or files)
pnpm uisg inventory           # coverage: journeys, seams, variants
```

Playwright resolves `@notention/optimize` through `dist`; `uisg run` rebuilds
it automatically (`--no-build` skips). Journey edits outside `uisg run` need
`pnpm --filter @notention/optimize build` first.

## Conventions

- Stable IDs: `<type>.<domain>.<name>`; never derive from array position.
- Ground every implemented node: `source` paths, `seam`/`strategy`/`skill` IDs,
  `component`/`route`/`configKey`, or a registered `journey` ID.
- Step targets quote journey `Target` shapes (role+name, label, testId).
- Branches: one flow per path (`JourneySpec` steps are linear); connect with
  `alternative` edges and `next` conditions.
- Proposals carry status `planned`/`idea` and explicit `confidence`.
- No colors, pixels, or theme CSS; tokens and kit primitives decide appearance.

## Status

2026-11-23: 46 nodes / 74 edges. All five registered journeys linked and
live-verified: `capture-and-edit`, `capture-and-edit-keyboard` (label targets),
`golden-path` v2 (0.667 match, explained keys), `publish-gate` (privacy gate,
cancel branch), `ontology-conflict` v2 (detected conflict). Seams covered 7/8
(capture, elicit, match, display, layout, explain, ontology); `intent` has no UI
implementation. Drift fixed; labels target the property inputs; registry-driven
journey wrappers; inline-detail variant planned in `variants/inline-detail.md`.
See `analysis-2026-11-23.md`.
