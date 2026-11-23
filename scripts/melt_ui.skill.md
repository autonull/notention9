---
name: ui-ux-space-graph-lite
version: 0.3.0
summary: Map, plan, generate, and experiment with notention UI flows as a thin graph over the existing seam/strategy, journey, and optimize-loop systems.
---

# UI/UX Space Graph — notention

## 1. Mission

Act as a senior product-minded software engineer with strong UX and TypeScript/React skills.

notention is a local-first semantic note system: one note model plus an ontology drives capture, matching, views, and automation. The UI is an optional layer over the semantic kernel, its surfaces are configuration-driven, and UI variants already have first-class mechanisms (seams, strategies, journeys, the optimize loop).

Build and maintain a **UI/UX Space Graph (UISG)** as a thin planning layer over those mechanisms:

1. Map what users can do today — intents, capabilities, flows, steps, surfaces — with source evidence.
2. Plan new or alternative flows against existing seams and surface configuration.
3. Generate variants through the existing strategy and configuration systems, never a parallel renderer.
4. Experiment by compiling flows to journeys and running the evaluate/adopt loop with evidence.

The graph describes user-facing behavior and design intent. The application remains authoritative for business logic, data, permissions, and rendering. New UI must stay a consequence of the same note model, not a new data silo.

Do not build an ontology, graph database, workflow engine, or page designer. Start with one real workflow and one useful, evidenced improvement.

Read before modeling: `README.md`, `ARCHITECTURE.md`, `doc/UI_COMPOSITION.md`, `doc/PLUGIN_ARCHITECTURE.md`, `optimize/README.md`.

## 2. Reuse the implemented system

| Concern | Existing mechanism | Location |
|---|---|---|
| Visual language | Semantic/component tokens, kit primitives, patterns | `ui/src/styles/`, `ui/src/components/ui/kit.tsx`, `ui/src/components/patterns/` |
| Surface configuration | Browse modes, sort orders, rail tabs, sections, arrange groups, palette scopes, settings groups | `ui/src/config/uiSurfaces.ts` |
| Views and routes | Six views, hash routing, view context | `ui/src/components/views/`, `ui/src/utils/navigation.ts`, `ui/src/hooks/useUrlRouting.ts` |
| UI variant seams | `SEAM_ROLES` (capture, elicit, match, display, layout, explain, ontology, intent), `Strategy`, profile resolution | `core/src/constants/seams.ts`, `core/src/ui/strategy.ts`, `ui/src/components/StrategyResolver.tsx`, `ui/src/strategies/` |
| Semantic → visual mapping | Metaphor registry and mapper, UI plugins | `core/src/skills/metaphor/`, `ui/src/plugins/` |
| Executable flows | `JourneySpec` + Zod schemas, step interpreter, evidence bundles, findings, guardrails | `optimize/src/journey.ts`, `optimize/src/journeys.ts`, `optimize/src/execute.ts`, `optimize/src/evidence.ts`, `optimize/src/finding.ts`, `optimize/src/policy.ts` |
| Discovery → synthesis → evaluation | `pnpm loop discover\|prioritize\|synthesize\|evaluate\|adopt\|run` | `optimize/src/loop/`, `optimize/src/discovery/`, `optimize/src/synthesis/`, `data/loop/` |
| Dev inspection | State/action/prompt bridge, kit gallery | `ui/src/dev/DevBridge.tsx`, `ui/src/dev/KitGallery.tsx` |
| Quality gates | `pnpm check:ui`, `pnpm optimize:check`, `pnpm lint:ui-layers` | `package.json`, `scripts/` |

Reference these by ID or path through `implementedBy` edges; never copy their data into the graph. When graph and code disagree, code wins and the graph is stale.

## 3. Graph model

One graph, five node types:

| Node | Meaning | notention example |
|---|---|---|
| `intent` | What the user wants to achieve | Capture a thought as a note |
| `capability` | What the system can do, grounded in a seam, skill, metaphor, or agent tool | Edit note properties (elicit seam) |
| `flow` | A user journey; link a registered `JourneySpec` when executable | `capture-and-edit` |
| `step` | An action, choice, confirmation, or result; targetable by ARIA role+name, label, or testId | Add a structured detail |
| `surface` | A view, editor, rail, palette, settings tab, or overlay | `NotesView` in list mode |

Edge types:

- `supports`: capability → intent
- `uses`: flow → capability
- `invokes`: step → capability
- `contains`: flow → step
- `renders`: step → surface
- `next`: step → step; optional named condition (`when`) such as `confirmed` or `cancelled`
- `alternative`: flow or step → alternative flow or step (a planned variant, seam strategy, or configuration change)
- `implementedBy`: capability or surface → registry ID, config key, route, or source path

Do not add node or edge types unless a real use case cannot be represented with these.

### Minimal node fields

```ts
type Status = "existing" | "partial" | "planned" | "idea" | "removed"; // lifecycle shorthand
type Implementation = "verified" | "observed" | "inferred" | "unknown";

interface BaseNode {
  id: string;          // stable ID; never derive from array position
  type: "intent" | "capability" | "flow" | "step" | "surface";
  name: string;
  status: Status;
  implementation?: Implementation; // default unknown; "existing" is not "verified"
  summary?: string;
  source?: string[];   // file paths, journey IDs, config keys, routes, tests, docs
  evidence?: Array<{ kind: "source" | "test" | "run" | "telemetry" | "human"; ref: string }>;
  provenance?: { author: "human" | "model"; method: "manual" | "reverse-engineered" | "test-derived" | "generated"; date: string; promptHash?: string };
  confidence?: "high" | "medium" | "low";
}
```

Type-specific grounding fields (all optional except where noted):

- `intent`: `actor`, `outcome`.
- `capability`: `seam` (a `SeamRole`), `strategy` (registered strategy ID), `skill` (core/agent skill ID), `risk` (`normal`, `caution`, `destructive`), `guard?`, `effect?`. Guards/effects reference registered predicate/effect IDs (settings ontology, permission, connectivity) and `optimize/src/policy.ts`; never inline code or arbitrary expressions. Consequential actions require confirmation steps.
- `flow`: `entry` (step ID, required), `outcome` (required), `journey` (registered `JourneySpec` ID).
- `step`: `kind` (`show`, `action`, `choice`, `confirm`, `result`, required), `target` (journey `Target`: role+name with optional `exact`, label, or testId), `action` (`click`, `fill`, `press`, `select`), `value`, `guard?`, `effect?`.
  Use `exact: true` for role+name when list rows or other labels also contain the action word; exact matching is case-sensitive.
- `surface`: `component` (registered React component name), `route` (hash route such as `#/notes`), `configKey` (a `uiSurfaces.ts` export such as `NOTE_BROWSE_MODES`), `seam`.

Edges have `from`, `type`, `to`, and optional `when` / `notes`.

The graph may declare a profile selection and context, checked by `select` — never by editing components:

```json
"selection": { "platform": "web", "theme": "dark", "modalities": ["gui", "keyboard"], "exclude": [], "groups": [] },
"context": ["ctx.keyboard-expert.desktop"]
```

Constraints (`requires`, `excludes`, group cardinality, lifecycle, platform) and the context profile are experiment inputs. An unsatisfiable selection returns the request, an explanation, and a labeled conflict set; it never silently drops a feature.

### Example: a real registered flow

```json
{
  "version": 1,
  "nodes": [
    { "id": "intent.structured-note", "type": "intent", "name": "Capture a note and edit its properties", "status": "existing", "outcome": "The note carries structured, ontology-backed details." },
    { "id": "cap.property.edit", "type": "capability", "name": "Edit note properties", "status": "existing", "seam": "elicit", "strategy": "property-form", "source": ["ui/src/components/editor/PropertyEditor.tsx", "ui/src/strategies/PropertyFormStrategy.tsx"] },
    { "id": "flow.capture-and-edit", "type": "flow", "name": "Capture and edit", "status": "existing", "entry": "step.detail.open", "outcome": "Property indexed and shown as a chip.", "journey": "capture-and-edit", "source": ["optimize/src/journeys.ts"] },
    { "id": "step.detail.open", "type": "step", "name": "Open Add detail", "status": "existing", "kind": "action", "action": "click", "target": { "testId": "page-add-detail" } },
    { "id": "step.detail.fill", "type": "step", "name": "Enter key, operator, value", "status": "existing", "kind": "action", "action": "fill", "target": { "testId": "property-key-input", "modal": "Add detail" } },
    { "id": "step.detail.confirm", "type": "step", "name": "Confirm the detail", "status": "existing", "kind": "confirm", "action": "click", "target": { "role": "button", "name": "Add detail", "modal": "Add detail" } },
    { "id": "step.detail.done", "type": "step", "name": "Property indexed", "status": "existing", "kind": "result", "summary": "assertState note.propertyIndex.framework" },
    { "id": "surface.editor", "type": "surface", "name": "Note editor", "status": "existing", "component": "EditorManager", "route": "#/notes/:noteId" },
    { "id": "surface.property-editor", "type": "surface", "name": "Add detail popup", "status": "existing", "component": "PropertyEditor" }
  ],
  "edges": [
    { "from": "cap.property.edit", "type": "supports", "to": "intent.structured-note" },
    { "from": "flow.capture-and-edit", "type": "uses", "to": "cap.property.edit" },
    { "from": "flow.capture-and-edit", "type": "contains", "to": "step.detail.open" },
    { "from": "flow.capture-and-edit", "type": "contains", "to": "step.detail.fill" },
    { "from": "flow.capture-and-edit", "type": "contains", "to": "step.detail.confirm" },
    { "from": "flow.capture-and-edit", "type": "contains", "to": "step.detail.done" },
    { "from": "step.detail.open", "type": "renders", "to": "surface.editor" },
    { "from": "step.detail.open", "type": "next", "to": "step.detail.fill", "when": "opened" },
    { "from": "step.detail.fill", "type": "renders", "to": "surface.property-editor" },
    { "from": "step.detail.fill", "type": "next", "to": "step.detail.confirm", "when": "filled" },
    { "from": "step.detail.confirm", "type": "invokes", "to": "cap.property.edit" },
    { "from": "step.detail.confirm", "type": "renders", "to": "surface.property-editor" },
    { "from": "step.detail.confirm", "type": "next", "to": "step.detail.done", "when": "saved" },
    { "from": "step.detail.done", "type": "renders", "to": "surface.editor" }
  ]
}
```

The example references real files and the registered `capture-and-edit` journey; its step targets quote that journey. Verify every reference against the repository before extending the graph; mark uncertain findings `confidence: "low"` rather than inventing paths.

Worked finding (resolved 2026-11-23): the journey originally targeted `add-detail` and `property-key-input`, but the UI exposed `page-add-detail` (`ui/src/components/patterns/PageSurface.tsx:142`) and no input testIds. `validate`/`analyze` flagged the drift; the fix retargeted journeys to `page-add-detail` and restored input testIds with associated labels. Keep step targets quoted from the registered journey so drift stays detectable.

## 4. Behavior, states, and presentation

- The graph stores named references only. Core and agent code execute handlers and enforce privacy and publish gates; the graph never grants access or authorizes an operation.
- Represent meaningful states where relevant: `loading`, `empty`, `error`, `success`, `denied`, `offline`, `conflict`. Assert them with journey `assertState` / `waitForState` against the DevBridge `SemanticState`, not screenshots alone.
- `JourneySpec` steps are linear. Model each branch path as its own flow and journey (compare `capture-and-edit` with `capture-and-edit-keyboard`); connect them with `alternative` edges and `next` conditions in the graph.
- Destructive or consequential steps need a clear consequence and a confirmation or recovery path; see the `publish-gate` journey.
- Include cancel/back behavior for multi-step flows where it matters.

Presentation hints stay theme-independent:

```ts
type PresentationHint = {
  role?: "primary-action" | "secondary-action" | "navigation" | "status" | "warning";
  emphasis?: "low" | "normal" | "high";
  density?: "compact" | "normal" | "spacious";
  grouping?: "related" | "separate";
};
```

Hints map to kit primitives (`Chip`, `Segmented`, `Tabs`, `ChoiceGrid`, …) and configuration (`ARRANGE_GROUPS`, density tokens). Never store colors, pixel sizes, fonts, or theme CSS in the graph; tokens and primitives decide appearance. The accessibility contracts in `doc/UI_COMPOSITION.md` are mandatory. A step that cannot be targeted by role+name, label, or testId is an accessibility finding, not a modeling exception.

## 5. Operations

Implement as agent capabilities or small scripts over the existing tooling. A dedicated CLI is optional until repeated manual use becomes inconvenient.

| Operation | Implementation |
|---|---|
| `scan` | `pnpm loop discover` (component scanner + seam analyzer); read `uiSurfaces.ts`, `navigation.ts`, the metaphor registry, and `optimize/src/journeys.ts`; `pnpm lint:ui-layers` for layering violations. |
| `create` / `link` / `update` | Edit `doc/uisg/graph.json`; preserve stable IDs. |
| `query` | In-memory `Map` indexes by ID, type, and edge (`optimize/src/uisg/query.ts`). |
| `validate` | Zod schema beside the graph (zod is already an optimize dependency); cross-check journey targets against current UI testIds/roles; `pnpm optimize:check` for forbidden locator patterns. |
| `select` | Deterministic checker over `requires`, `excludes`, group cardinality, lifecycle, platform, modality, and context; returns the normalized selection, a readable explanation, and a labeled conflict set; never silently relaxes a request. |
| `diff` | Compare graph revisions or variants: semantic changes (nodes, edges, guards, effects) versus ordering/serialization changes. |
| `sync` | Compare graph and code bindings; propose repairs for stale sources, new routes, and contract changes; never overwrite hand-authored files. |
| `analyze` | Reachability and completion checks; `journeyTargetDrift` cross-checks registered journey targets against current UI testIds; `optimize/src/loop/frictionMap.ts` seam/param hypotheses; `deriveFindings` over evidence bundles. |
| `plan` | Propose a variant as surface-configuration data or a seam strategy; record it in `doc/uisg/variants/<name>.md` as a StrategyArtifact-shaped plan with provenance, hypothesis, experiment protocol, and acceptance gates. Record it as an `alternative` with status `planned` or `idea`. |
| `generate` | Configuration variants render through existing surfaces; strategy variants through `StrategyResolver` profiles or `pnpm loop synthesize` gates. Inspect via the existing dev surfaces. Never evaluate code or JSX from graph data. |
| `simulate` | Compile the flow to a `JourneySpec` (`toJourney`); `pnpm uisg run <flowId>` emits the journey test, rebuilds optimize (Playwright resolves `dist`), and runs it on seeded local state; respect `policy.ts` guardrails. |
| `compare` | `pnpm uisg compare <bundleA> <bundleB>` diffs status, step kinds, durations, and failed assertions; `pnpm loop evaluate`, `optimize/src/synthesis/strategyComparison.ts`, `pnpm screenshot <view>`. |
| `adopt` | `pnpm loop adopt` evidence gate; record the decision and provenance in the graph. |
| `export` | Version-controlled JSON. `JourneySpec` and `StrategyArtifact` (with `Provenance`) are the interchange formats for executable flows and generated variants. |

Operations return concrete results: changed records, query matches, validation errors, findings, an evidence bundle path, or an adopt/reject decision.

Agent-generated UI follows the existing path: a model-authored strategy carries `Provenance` (`author: "model"`, `promptHash`, `evidenceBundle`), passes synthesis gates, and reaches users only through human adoption. No unregistered component or handler ever renders.

## 6. Analysis: actionable findings

For a selected flow, check:

1. **Reachability:** Can the user reach every intended step? Dead ends?
2. **Completion:** Does each path reach a clear outcome or intentionally stop?
3. **Recovery:** Error, cancel, denied, and destructive paths handled (model: `publish-gate`, `ontology-conflict`)?
4. **Clarity:** Choices and consequences understandable; labels action-oriented (`pnpm lint:tone`).
5. **Efficiency:** Unnecessary steps, repeated entry, avoidable jumps; friction kinds and time-to-first-match (`pnpm loop latency`).
6. **Consistency:** One visual language; similar capabilities behave and appear similarly (`pnpm lint:ui-layers`).
7. **Accessibility:** `doc/UI_COMPOSITION.md` contracts; dual-theme axe and keyboard journeys in `ui/test/journeys/`.
8. **Coverage:** Seams × surfaces × journeys matrix; what is mapped, unmapped, uncertain, or stale.

Run analyzer families: integrity (duplicates, dangling, forbidden cycles, orphans, stale sources, superseded records, invalid groups), traceability (capability without intent, control without capability, implemented without a pathway, task without outcome, duplicate labels without a dedup decision), flow/state (dead ends, loops without exit, missing events/guards/effects, unguarded actions, unhandled error/conflict, no cancel/restoration, destructive without risk controls), a11y/responsive (name/role/value, keyboard and focus restoration, target size, overflow/expansion, RTL, color-only meaning, unresolved roles/hints), and consistency/ergonomics (labels/placement, navigation depth, dense branching, duplicate confirmations, keyboard parity, long forms, inconsistent loading/empty/error).

Hard constraints make a variant ineligible: correctness, authorization, declared WCAG target, safe destructive handling, keyboard access, no unsafe transition, no arbitrary executable content, privacy. Soft objectives (steps, duration, choice burden, repeated entry, recovery cost, discoverability, density) form a Pareto vector with denominators — never one composite score.

Return findings as `issue`, `evidence`, `impact`, `suggested change`. Evidence is a `file:line`, journey ID, run path under `data/loop/runs/`, or friction kind — not a vibe. Prioritize issues; no artificial overall UX score. Distinguish observed facts from hypotheses.

## 7. Workflow

Do not begin with a rewrite.

1. **Inspect, read-only.** Package scripts, `uiSurfaces.ts`, `navigation.ts`, views, kit, seams and strategies, metaphor registry, registered journeys, dev bridge, tests. Summarize how the UI is assembled.
2. **Inventory.** Surfaces from views + configuration; capabilities from seams, skills, metaphors, and agent tools. Registered journeys are pre-modeled flows: link them, do not re-model them.
3. **Model one flow.** Start from `golden-path` or `capture-and-edit`. Add the intent, the normal path, the most important cancel/error/permission branches, and one planned alternative. Keep the first graph small.
4. **Validate and analyze.** Fix broken references and obvious flow problems. Ask for human review when source evidence is ambiguous or product intent cannot be inferred safely.
5. **Experiment.** Plan one variant (configuration data or seam strategy). Compile the flow to a journey, run `pnpm optimize`, compare evidence with `pnpm loop evaluate`. Keep the original UI intact; previews live in dev surfaces or strategy profiles.
6. **Adopt.** Use the evidence gate (`pnpm loop adopt`). Record the decision and provenance in the graph. `pnpm check:ui` stays green.

Repeat for adjacent workflows. No exhaustive modeling before the first useful comparison exists.

## 8. Implementation choices

Least new infrastructure possible; everything below reuses present dependencies and patterns.

- **Data:** `doc/uisg/graph.json`, version-controlled. Split files only when review becomes difficult.
- **Code:** `optimize/src/uisg/{types,validate,query,analyze,compare,toJourney,cli}.ts`, run with `tsx` (`pnpm uisg`). No new dependencies; zod and Playwright are already in the workspace.
- **Experiment path:** `to-journey --emit-test` materializes `ui/test/optimize/<id>.journey.ts` via `generateTestFile`; `run` compiles, emits, rebuilds optimize, and executes; `compare` diffs two evidence bundles. Playwright resolves `@notention/optimize` through `dist`, so journey edits need a rebuild before running.
- **`toJourney` mapping:** `show` → `captureAria`/`assertAriaSnapshot`; `action` → `act` + `waitForState`; `choice` → one journey per branch; `confirm` → `act` with a modal `Target`; `result` → `assertState`/`capture`. Seed from `ui/test/fixtures/workspace.ts` or `data/loop/golden-cases.json`; isolate the network like the existing journeys. Match-dependent flows must seed a real ontology: `ontology: []` is truthy and replaces `DEFAULT_ONTOLOGY` in the matching engine.
- **Rendering:** No new renderer or preview route. Variants render through `StrategyResolver` profiles and surface configuration; dev-only inspection uses `ui/src/dev/`.
- **Tests:** vitest with the optimize config; no mocks. Cover validation, a `toJourney` round-trip, one representative flow path, selection rejection, and a seeded regression (`doc/uisg/regressions.json`).
- **Canonical model and drift:** canonical JSON (stable ordering, explicit defaults, schema version, unknown-field policy, deterministic hash); round trip `canonicalize(parse(serialize(canonicalize(G)))) == canonicalize(G)`; `diff`/`sync` catch drift; never silently lower unsupported semantics.
- **Allowlist:** registered components and guard/effect IDs only; unknown IDs fail compile; the backend rechecks authorization.
- **Manifest:** per run `{ flowId, spec, bundle, compilerVersion, warnings }` under `doc/uisg/manifests/`; deterministic.
- **Ontology boundary:** UI hints belong to the ontology, not the graph. Note-based configuration is the system's direction; a later version may project graph nodes as notes. v1 stays JSON.

## 9. Definition of done

- One real flow mapped with source evidence and a journey link.
- `validate`, `query`, `select`, and `analyze` runnable; broken references, unreachable steps, missing recovery, and invalid selections detected.
- The flow compiles to a `ready` `JourneySpec` that passes `pnpm optimize optimize <journeyId>`.
- One variant compared against baseline with an evidence bundle; adopt/reject recorded in the graph; lifecycle and implementation recorded separately.
- Canonical round trip green; seeded regressions caught; no silent feature drop.
- `pnpm check:ui` green; no new dependencies; no parallel renderer; existing screens unchanged except adopted improvements.

Not required: an ontology, graph database, constraint solver, pixel-perfect layout engine, whole-app rewrite, or exhaustive enumeration of possible UIs.

## 10. Execution prompt for the coding agent

> Inspect this repository (notention) read-only and apply the UI/UX Space Graph method. Identify the stack from `README.md` and `ARCHITECTURE.md`, then the implemented UI system: `ui/src/config/uiSurfaces.ts`, views, kit primitives, seams and strategies, metaphor registry, and the registered journeys in `optimize/src/journeys.ts`. Recommend one representative workflow — prefer an existing journey such as `capture-and-edit` or `golden-path`. Create the smallest useful graph in `doc/uisg/graph.json` with source evidence and uncertainty marked. Implement Zod validation, basic queries, actionable analysis, and a `toJourney` compiler under `optimize/src/uisg/`. Run the flow with `pnpm optimize`, then plan and compare one variant through surface configuration or a seam strategy using `pnpm loop evaluate`. Do not replace existing screens, change business logic, add dependencies, or build a parallel renderer. Report files changed, commands run, findings with evidence, limitations, and the next highest-value workflow.
