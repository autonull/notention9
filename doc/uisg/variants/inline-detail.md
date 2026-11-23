# Variant plan: inline detail entry (elicit seam)

Status: **planned** — not implemented. Graph node `flow.inline-detail`
(`idea`, low confidence), capability `cap.property.inline` (`planned`).
Method: `scripts/melt_ui.skill.md`, `plan` operation.

## Artifact

```json
{
  "id": "elicit-inline-detail",
  "kind": "ui",
  "version": "0.1.0",
  "interface": "elicit-0",
  "config": {
    "mode": "inline",
    "affordance": "inline-token",
    "commit": "on-blur",
    "reusePopup": false
  },
  "requires": [{ "name": "contenteditable-selection" }],
  "provenance": {
    "author": "human",
    "date": "2026-11-23",
    "graph": "doc/uisg/graph.json#flow.inline-detail",
    "baselineBundle": "run_1795447512023_x1okcg9"
  }
}
```

## Hypothesis

Inline detail entry removes the modal interrupt from `flow.capture-and-edit`
without weakening property extraction, keyboard access, or ontology
validation. Expected effect: fewer steps and context switches for the same
`note.propertyIndex` outcome.

## Contract

Implement against the `elicit-0` seam props:

```ts
{
  onInsert(key, operator, value, icon?), initialKey, initialOperator,
  initialValue, attributeDef, ontology, isEditing, onPickLocation, suggestions
}
```

Current implementations: `TagInputStrategy`, `PropertyFormStrategy`
(`ui/src/strategies/`). Register the variant as an elicit strategy; select it
through a strategy profile or experiment, never by forking the editor layout.

## Implementation sketch

1. Add `InlineDetailStrategy` beside the existing elicit strategies; reuse the
   ontology-aware validation from `PropertyEditor` (do not duplicate rules).
2. Register in the generated strategy configs (`ui/src/strategies/`,
   `scripts/generate-definitions.ts` source of truth: `core/src/constants/seams.ts`).
3. Render inline at the caret for new details; keep the popup for editing
   existing chips until evidence supports replacing it.
4. Give the inline control an accessible name and stable testIds; preserve the
   keyboard path (Escape cancels, Enter commits).
5. Update `flow.inline-detail` with real step targets, then compile:
   `pnpm uisg to-journey flow.inline-detail --emit-test --ready`.

## Experiment protocol

1. Baseline: `pnpm uisg run flow.capture-and-edit` (green: 4.5 s,
   `run_1795447512023_x1okcg9`).
2. Variant: same seed, same outcome assertions, inline entry steps.
3. Compare: `pnpm uisg compare <baselineBundle> <variantBundle>` — steps,
   durations, failed assertions.
4. Gates: `pnpm check:ui` (axe, keyboard journeys), `pnpm optimize:check`,
   graph `validate`/`analyze` at 0 findings.
5. Adopt only through `pnpm loop adopt` evidence gates; record the decision and
   provenance in the graph (`status`, `confidence`, `source`).

## Acceptance

- Same `note.propertyIndex` outcome with fewer steps or lower duration.
- No accessibility regressions (labels, focus, escape/cancel, keyboard-only).
- No new dependencies; no second visual language; popup remains available.
- Comparison evidence attached to the graph node before any status change.
