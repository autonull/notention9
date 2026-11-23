# TODO.32 — Every Flow Is an Experiment

**Scope:** the UI/UX space, the evidence loop, the `pnpm verify` pipeline's skipped layers, the remaining seams, and the integration of every UI-relevant system.

**Builds on:** TODO31 (done — the note is the page) and the 2026-11-23 UISG session (46 nodes / 74 edges; 5 journeys green; 7/8 seams).

**Reference specification considered:** `ui-ux-space-graph` v1.0.0 (Parts I–XII). §12 records what we adopt, defer, or reject, and why.

**Non-goals:** a new visual language, a parallel renderer or preview route, new matching or ontology semantics, new dependencies, A2UI or remote-UI protocols as the canonical model.

**Core rule:** a capability is captured when intent, flow, steps, surfaces, states, guards, effects, and evidence are linked; it is complete when a registered journey executes it in CI.

---

## 1. The change in one paragraph

The session proved the loop on five flows. TODO32 makes the loop cover the UI/UX space and the remaining seams, and the integration of every UI-relevant system.

---

## 2. Progress log — 2026-11-23

| Area | State | Landed | Still open |
| :--- | :--- | :--- | :--- |
| UISG module | **Done** | `optimize/src/uisg/{types,validate,query,analyze,compare,toJourney,index,cli}.ts`; `@notention/optimize/uisg`; `pnpm uisg`; 18 tests | — |
| Graph | **Done** | `doc/uisg/graph.json`: 46 nodes / 74 edges; 5/5 journeys; 7/8 seams; `validate` OK; `analyze` 0 | Space coverage (§3) |
| Drift + labels | **Done** | `page-add-detail`; input testIds; `htmlFor`/`id`; label targets; 4.5 s / 4.8 s (`run_1795449721838_sa7kqp3`) | — |
| Golden path v2 | **Done** | Current first-run flow; editor body label; `DEFAULT_ONTOLOGY`; symmetric properties; 0.667 match; `matches[*].matched`; 5.8 s (`run_1795448991964_rvqvbxn`) | — |
| Publish gate | **Done** | `privatePublishNote`; `exact` target; 3.2 s (`run_1795449670372_gur5qq4`) | Policy coverage (W32.7) |
| Conflict detection | **Done** | `capacity: many`; Conflicts tab; `SemanticState.conflicts`; 3.3 s (`run_1795449006711_yqj7jp2`) | Resolution (W32.6) |
| Wrappers | **Done** | `runJourneyTest(id)`; stale `test.skip` replaced; `uisg run` builds dist | Drift (W32.2) |
| Verify pipeline | **Done** | `pnpm verify` L0–L3 green; `uisg:check` in CI; audit specs gated; perf:budget recorded | — |
| Measurement | **Done** | `uisg metrics` ingests friction, latency, probe, eval, drift → `metrics.json` | Hard constraints/Pareto profiles (W32.3) |
| Records | **Done** | `lifecycle` × `implementation`; `evidence` + `provenance`; `decisions.jsonl`; `runs.jsonl` | Regression replay (W32.9) |
| Selection | **Done** | `uisg select` with `requires`/`excludes`/cardinality/lifecycle/platform/modality/theme/context; context profiles in `contexts.json` | — |
| Predicates/effects | **Done** | `predicate`/`effect` nodes; `guards`/`effects` edges; registry validation; 4 CONSEQUENTIAL effects mapped | — |
| Coverage | **Partial** | Inventory counts | Contract + generators + denominators (W32.2) |
| States/surfaces | **Done** | 13 states + 15 surfaces modeled in graph | All states journey-linked or explicit (W32.7) |
| Cleanup | **Partial** | `LocalMatchPreview`, `DashboardLocalMatch` deleted | W32.10 |
| Governance | **Done** | `uisg adopt`, `findings`/`mark-fixed`/`verify`, `canonicalize` round-trip, `diff`, `sync` | Tests for adopt/ledger/transitions (W32.9) |
| Network | **Done** | 5 capabilities modeled (publish, reply, feed, chat, relay-status) | Simulator two-agent scenario (W32.7) |
| Configuration | **Done** | 4 capabilities modeled (theme, density, AI, profile) | Deep links per settings group (W32.7) |
| Intent | **Done** | Declared unsupported (`cap.intent.recognize` rejected) | — |

### Capability guarantee

No capability is removed by this plan. Every seam gets an implementation with a journey or a written unsupported status. Every new surface passes `pnpm check:ui`.

---

## 3. The UI/UX space

### 3.1 Dimensions

| Dimension | Values | Notes |
| :--- | :--- | :--- |
| Viewport | `desktop-1440`, `mobile-390` | Journey parameter; renders at size |
| Theme | `dark`, `light` | Journey parameter; affects component state |
| Modality | `pointer`, `keyboard`, `voice` | Journey parameter; selects strategy |
| Profile | `default`, `minimal`, `full` | Capability subset; gates seams |
| Connectivity | `online`, `offline`, `degraded` | Journey parameter; simulates network |
| Locale | `en-US`, `de-DE`, `ja-JP` | i18n; text expansion testing |
| Expertise | `novice`, `expert` | Affects defaults, density, hints |

### 3.2 Coverage snapshot (2026-11-23)

| Area | Captured | Missing |
| :--- | :--- | :--- |
| Flows | capture, capture-keyboard, golden path, publish, conflict detection | search, explore/feed, chat, replies, DM, import/export, trash/delete, settings, metaphors, skills, offline/degraded, mobile |
| States | empty, private, conflict, saved | loading, error, denied, offline, degraded, publish-ready, extracting, no-match, rejected |
| Viewports | 1440 | 390 for optimize journeys |
| Themes | dark (light via `check:ui` axe) | light journeys for new surfaces |
| Seams | 7/8 implemented | intent; capture/elicit/match alternatives |
| Metrics | steps, duration, assertions | friction, latency, comprehension, screenshot, eval |
| Records | `status`, `source`, `confidence` | implementation, evidence, provenance, decisions |

### 3.3 Coverage targets

1. Every capability has intent → flow → step → surface links and a registered journey, or an explicit unsupported status with a reason.
2. Every surface has a component/route/config key; every overlay has a confirm target.
3. Every state is asserted by at least one journey or marked not applicable.
4. Every seam is implemented with a journey or declared unsupported; each seam with more than one strategy has one experiment or a documented single-strategy decision.
5. Every browse mode and settings group is sampled by a deep link or a journey.
6. One relay-isolated network journey, one import/export, one trash/delete with a guardrail.
7. One mobile and one light-theme journey on the core path; axes cover the rest.
8. Every adopted variant has baseline, variant, compare, evidence, and a decision record.
9. `friction:digest`, `loop latency`, `probe`, `eval:match` feed `doc/uisg/priority.json`.

### 3.4 Coverage contract (adopted from the reference spec)

See `doc/uisg/coverage.json`: generators, applicability, exceptions, materialization, review policy, dimensions, and denominators. Scan proposes; human promotes.

### 3.5 Four kinds of truth (kept separate)

- **Capability truth:** what the product can do, independent of a screen.
- **Possibility truth:** lifecycle of a model entry (`implemented` … `rejected`).
- **Implementation truth:** `verified`/`observed`/`inferred`/`unknown` evidence status.
- **Runtime/evidence truth:** guards, effects, states, run IDs, bundles, human review.

A model entry marked `implemented` is not automatically `verified`; an extracted candidate is not an approved feature; a generated interface is not business authorization.

---

## 4. Systems integration map

| System | Role | UISG touchpoints |
| :--- | :--- | :--- |
| `optimize/src/uisg` | Graph, compile, scan, sync, evidence | Core of this plan |
| `optimize/src/loop` | Friction, ranking, selection | Feeds `priority.json` |
| `optimize/src/cli` | `eval:match`, `friction:digest`, `perf:budget` | Metrics sources |
| `ui/test/optimize` | Journey tests, evidence bundles | Runtime truth |
| `ui/src/dev/bridge.ts` | DevBridge, `SemanticState` | Runtime assertions |
| `optimize/src/policy.ts` | `CONSEQUENTIAL` tools, guardrails | Effect declarations |
| `core/src/security` | Capabilities, approvals | Predicate/effect registry |
| `core/src/patternRecognition` | Intent predictions | Intent seam (W32.8) |
| `data/loop` | Taxonomy, golden cases, runs | Coverage, regression |

---

## 5. The optimization loop: measure → rank → select → experiment → adopt

### 5.1 Which UI truth we change

Only **Possibility truth** (lifecycle) and **Implementation truth** (evidence) change during the loop. Capability truth is the stable specification; Runtime truth is the measurement.

### 5.2 Cycle

1. **Scan** into `doc/uisg/scan.json` (components, seams, strategies, journeys, wrappers, orphans, taxonomy, golden cases).
2. **Measure** `friction:digest --days N --json`, `loop latency`, `probe`, `eval:match`, `ux-evaluate`, journey failures, drift findings → `doc/uisg/metrics.json`.
3. **Rank** into `doc/uisg/priority.json`: `score = (impact × confidence) / effort`; `impact = friction frequency × severity + latency + comprehension + failing assertions + drift/orphans`; `confidence = evidence count × reproducibility`; `effort = files + new code + risk`. Tie-break user-visible first.
4. **Select** the feature/context combination (`uisg select`): check `requires`/`excludes`, group cardinalities, lifecycle, platform, modality, theme. Unsatisfiable selections return the request, a human-readable explanation, and a minimal conflict set when available — never a silently relaxed build.
5. **Hypothesize** each candidate: hypothesis, metric, baseline, expected effect, stop condition.
6. **Experiment** as a configuration change or a seam strategy; never a layout fork.
7. **Run** `pnpm uisg run <flowId>` (auto-build); one worker.
8. **Compare** `pnpm uisg compare <baseline> <variant>` (steps, kinds, durations, failed assertions).
9. **Adopt/reject** through the evidence gate; human review for user-visible or consequential variants; update the graph (lifecycle, implementation, provenance, decision).
10. **Record** in `doc/uisg/decisions.jsonl`, then re-measure.

### 5.3 Hard constraints vs soft objectives (adopted from the reference spec)

| Hard constraint (fail if violated) | Soft objective (Pareto) |
| :--- | :--- |
| No regression in adopted journeys | Minimize steps |
| No new `analyze --strict` high findings | Minimize latency |
| No orphan surfaces without decision | Maximize comprehension |
| Every adopted variant has evidence bundle | Maximize keyboard parity |
| `canonicalize` round-trip holds | Minimize bundle size |
| Confirmation for `CONSEQUENTIAL` | Maximize a11y score |

### 5.4 Experiment record

`doc/uisg/experiments.jsonl`: `{ flowId, variantId, hypothesis, metric, baseline, expected, stopCondition, baselineRunId, variantRunId, comparison, decision, adoptedAt, evidence }`.

### 5.5 Cadence

After each workstream: scan → run touched journeys → compare → record. Weekly: full matrix. On user report: add friction, re-rank, model a flow. Before release: `pnpm verify` L0–L3.

---

## 6. Workstreams (Reorganized into Phases)

### Phase A — Foundational Infrastructure (P0, parallelizable)

*Infrastructure for evidence-driven decisions. Both workstreams share `doc/uisg/` data patterns and CLI conventions.*

#### A1: W32.3 — Metrics, Ranking, Selection
**Goal:** the next change is chosen from evidence under explicit constraints.
- [x] `uisg metrics`: ingest `friction:digest`, `loop latency`, `probe`, `eval:match`, `ux-evaluate`, failing assertions, drift findings → `doc/uisg/metrics.json`.
- [x] `uisg rank`: score = (impact × confidence) / effort; emit `doc/uisg/priority.json` with reasons linked to graph nodes.
- [x] `uisg select`: check `requires`/`excludes`, groups, lifecycle, platform, modality, theme, context; deterministic checker; return request + explanation + minimal conflict set; never silently drop.
- [x] Context profiles: `doc/uisg/contexts.json` (actor, expertise, device, connectivity, locale, a11y constraints) as experiment contexts.
- [ ] Hard constraints/Pareto in experiment reports; weight profiles explicit with sensitivity.
- [x] Map friction kinds → seams/params via `optimize/src/loop/frictionMap.ts`; ignore positive kinds.
- [x] Surface top 3 in `uisg inventory` and verify log.
- [ ] Tests for ranking, selection conflicts, metric ingestion.
- **Dogfood:** use `uisg scan` output as denominator for coverage metrics; reuse `analyze` findings as drift evidence.

#### A2: W32.9 — Evidence, Records, Governance
**Goal:** decisions and findings are recorded, not remembered.
- [x] Records: `lifecycle` (implemented/partial/planned/candidate/experimental/removed/rejected) × `implementation` (verified/observed/inferred/unknown); `evidence` + `provenance` (manual/reverse-engineered/test-derived/generated, source, commit, date, confidence); migrations keep IDs.
- [x] Lifecycle transitions with actor, time, reason, evidence, impact recorded in `decisions.jsonl`.
- [x] `uisg run` appends `{flowId, runId, bundle, status, at}` to `doc/uisg/runs.jsonl`.
- [x] `uisg adopt <flowId>`: compare bundles, require evidence, update graph (lifecycle, implementation, provenance, bundle), append decision; validate before write.
- [x] Findings repo: `findings`/`mark-fixed`, statuses open/fixed/verified with stable IDs.
- [x] Canonicalization: stable field/edge/enum ordering, explicit defaults, schema version, unknown-field policy, deterministic hash; round-trip `canonicalize(parse(serialize(canonicalize(G)))) == canonicalize(G)`; `uisg diff` (revision/variant; semantic vs ordering); `uisg sync` proposes only.
- [ ] Regression: `pnpm optimize replay` on adopted flows; `pnpm optimize ux-evaluate` metrics linked to graph.
- [ ] Tests: atomic adopt, ledger append, transition legality, finding status, round-trip, diff.
- **Dogfood:** `validateGraph`/`analyzeGraph` as the source of truth for "evidence"; reuse manifest emission for provenance; `syncGraphWithCode` proposals as finding candidates.

**Phase A Acceptance:** seeded friction + two bundles produce stable ranking; invalid selection rejected with explanation; top experiments in inventory; adopt atomic+validated; findings in repo; round-trip green; no single UX score.
- Status: Core infrastructure implemented (metrics, rank, select, contexts, adopt, canonicalize, diff, findings, runs). Remaining: hard constraints/Pareto profiles, regression replay, comprehensive tests.

---

### Phase B — Experiment Program (P1)

*Run the seam experiments using Phase A infrastructure. Each: hypothesis → baseline → variant → compare → adopt/reject with human review.*

#### B1: W32.4 — Seam Experiments
**Goal:** every seam with a real alternative is evaluated, not assumed.
- [x] Elicit: inline detail vs popup (`flow.inline-detail`); strategy registered (`InlineDetailStrategy`), selected by profile/experiment; a11y/keyboard parity.
- [ ] Capture: quick-capture strategy vs page `New note`; steps vs comprehension.
- [ ] Match: reason badges vs expandable details; explanations found/understood?
- [ ] Display/layout: list vs board defaults, rail share, density (config variants only).
- [ ] Each experiment: hypothesis, metric, baseline, expected effect, stop condition, compare, adopt/reject with human review.
- [ ] Second realization: one alternative pathway (keyboard/palette) on same capability; 2 themes × 2 viewports for skeleton; 30–40 records.
- [ ] Absorb TODO31 W31.0 extraction (`ListRow`, `Field`, `ContextPanel`) only on second use.
- **Dogfood:** `uisg select` picks variants; `uisg adopt` records evidence; `scan`/`sync` verify new surfaces.

#### B2: W32.5 — Explain Consolidation
**Goal:** the golden path's explained match is complete and singular.
- [x] Move expandable "Why this match?" details into `MatchItem` (shared pattern); keep badges.
- [x] Delete/rehome `LocalMatchPreview` and `DashboardLocalMatch`; update orphan baseline.
- [ ] Journey asserts explanation visibility + reason text (`assertVisible`).
- [ ] axe dark/light on note with rail open.

#### B3: W32.6 — Conflict Resolution & Ontology Health
**Goal:** detection leads to resolution.
- [x] Extend conflict journey: select, resolve (update/remove/merge), assert `conflicts.length === 0` with data preserved.
- [ ] State paths for suggestions/resolution; capability "Resolve ontology conflict"; steps/surfaces updated.
- [ ] Gardener/merge flow coverage; `ontology:audit` output linked to graph.

**Phase B Acceptance:** ≥1 evaluated experiment per seam with 2 strategies; every decision recorded; no variant without evidence bundle; `check:ui` green; resolution journey green; detection+resolution capabilities; no silent data loss.
- Status: Elicit experiment (inline-detail vs popup) implemented; Explain consolidation done (MatchItem expanded, orphans removed); Conflict resolution journey extended. Remaining: Capture/Match/Display experiments, gardener/merge flow, journey assertions for explanations.

---

### Phase C — Broad Coverage (P1)

**Phase C Acceptance:** all dimensions denominated; state journeys modeled; network capabilities captured; import/export/trash modeled; configuration variants modeled; mobile journeys modeled; intent seam decided (unsupported).
- Status: State journeys (12 states) modeled; Network capabilities (5) modeled; Import/export/trash modeled; Configuration variants (4) modeled; Mobile journeys (2) modeled; Intent seam declared unsupported. All in graph with statuses.

#### C1: W32.7 — States, Network, Configuration
**Goal:** the space's states and non-note surfaces are captured.
- [x] State journeys modeled: loading, empty, error, denied, offline, degraded, conflict, saving/saved, publish-ready, extracting, no-match, rejected (graph nodes added).
- [x] Network capabilities: relay-isolated publish/reply; explore feed; chat; DM privacy; relay status; queue/offline banner.
- [x] Import/export round trip; trash/delete with consequential guardrail modeled.
- [x] Metaphor/skill/automation surfaces: automation rule, scheduled task, monitoring agent (capabilities added, marked planned).
- [x] Configuration variants: theme, density, AI on/off, capability profile (capabilities added).
- [x] Mobile: 390 journey on capture/match modeled (flows added, marked planned).
- **Dogfood:** `uisg scan` verifies coverage; `sync` proposes missing state journeys.

#### C2: W32.8 — Intent Seam Decision
**Goal:** the 8th seam has a status, not a silence.
- [x] Investigated `core/src/patternRecognition` and `optimize/src/optimizer/evaluation/intentCaseRunner.ts`; `pnpm prompts:eval` exists.
- [x] Declared unsupported with reason in graph: `cap.intent.recognize` (rejected) — pattern recognition exists in core but no UI surface/strategy implemented; no journey or evaluation for intent seam.

---

### Phase D — Polish (P2)

#### D1: W32.10 — Cleanup & Hygiene
- [ ] Resolve orphans: delete/wire `QuickCapture`, `DashboardLocalMatch`, `LocalMatchesPanel`, `LocalMatchPreview`.
- [ ] Absorb TODO31 residuals: `ListRow`/`Field`/`ContextPanel` on second use; tone tail per changed surface; mobile context bottom-pane parity.
- [ ] Audit `knownJourneys.ts` duplicates and `scene-editor-note`; separate `mcp-contract`/`replay` in README; fix stale sources.

#### D2: W32.11 — Docs, Screenshots, Final Matrix
- [ ] Update skill ops (`scan`, `select`, `run`, `compare`, `adopt`, `rank`, `diff`, `sync`), `doc/uisg/README.md`, analysis closure.
- [ ] Reconcile with `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md`: suggestion store = findings + priority + decisions.
- [ ] Refresh screenshots from B/C (one worker, relay isolation).
- [ ] Run final matrix; record run IDs.

**Phase D Acceptance:** no orphan without reason; `analyze` 0 findings or documented baseline; statuses match reality; every documented command works; matrix green; no skipped layer.

---

## 7. Acceptance — Definition of Done (Consolidated)

| Phase | Gate | Command | Pass |
|-------|------|---------|------|
| A | Types | `pnpm --filter @notention/optimize exec tsc --noEmit` | clean |
| A | UISG tests | `pnpm --filter @notention/optimize test` | all pass |
| A | Graph | `pnpm uisg validate` | OK |
| A | Findings | `pnpm uisg analyze --strict` | 0 high findings |
| A | Metrics | `pnpm uisg metrics` + `pnpm uisg rank` + `pnpm uisg select` | deterministic |
| A | Adopt | `pnpm uisg adopt <flowId>` | atomic+validated |
| A | Diff/Sync | `pnpm uisg diff` + `pnpm uisg sync` | round-trip, proposals only |
| B | UI unit | `pnpm test:ui` | all pass |
| B | UI gate | `pnpm check:ui` | lint:type/tone/ui-layers + typecheck + dual-theme axe + golden path |
| B | Audit | `space.spec.ts`, `task-first.spec.ts` | pass |
| B | Experiments | `uisg inventory` shows top 3 | recorded |
| C | Coverage | `uisg scan` + `uisg sync` | all dimensions denominated |
| D | Full | `pnpm verify` | L0–L3, no skips |
| D | CI | `Verify` workflow | green (when re-enabled) |

### 7.2 Space coverage

Each dimension reports counts **and denominators**; "unknown" is never "covered".

| Item | Pass condition |
| :--- | :--- |
| Capabilities | every capability journey-linked or explicitly unsupported |
| Surfaces | every surface component/route/config; overlays have confirm targets |
| States | every state asserted once or not applicable |
| Seams | 7 implemented + intent decided |
| Strategies | each alternative experimented or documented |
| Modes | every browse mode and settings group sampled |
| Contexts | ≥2 context profiles evaluated on the skeleton |
| Viewports/themes | 390 + 1440; dark + light on new surfaces |
| Data | empty, populated, conflict, private/public, relay-isolated, imported/exported |
| Policy | delete/merge/permission covered by a confirmation assertion |
| Metrics | priority built from friction + latency + probe + eval |
| Records | every status has a run ID; every variant evidence + decision |

### 7.3 Expressiveness and canonical model

- [ ] Three representative workflows modeled, including one awkward/legacy flow.
- [ ] Lossy representation identified explicitly, never hidden.
- [ ] `canonicalize(parse(serialize(canonicalize(G)))) == canonicalize(G)`.
- [ ] Migrations preserve IDs, edges, lifecycle, provenance.
- [ ] Identical inputs/toolchain emit identical manifests.

### 7.4 Analysis, solver, generation payoff

- [ ] Analyzers detect every seeded regression in `regressions.json`.
- [ ] Invalid selection rejected with a human-readable conflict explanation; no silent drops.
- [ ] Skeleton compiles to a runnable React preview; behavior matches declared guards/effects.
- [ ] Tests cover positive, denied, invalid-input, loading, error, cancel, recovery.
- [ ] Automated a11y + manual critical-path review; generated output traceable to graph IDs.
- [ ] Generated vs hand-built variants compared on ≥3 dimensions with human feedback where possible.
- [ ] `create`, `query`, `validate`, `analyze`, `select`, `simulate`, `generate`, `diff`, `sync` demonstrated on the slice; graph changes reviewable without editing generated files.

### 7.5 Non-goals

No new dependencies, no parallel renderer or preview route, no second visual language, no new matching or ontology semantics, no mandatory A2UI, no graph database, no universal UX score, no unrestricted code generation, no exhaustive enumeration, no OWL/SHACL reasoning.

---

## 8. Reference-specification adoption map (§12)

| Idea from the reference spec | Status | Where |
| :--- | :--- | :--- |
| Four kinds of truth | **Adopted** | §3.5, this plan |
| Coverage contract (generators, denominators) | **Adopted** | `doc/uisg/coverage.json`, §3.4 |
| Analyzer families (integrity, traceability, flow/state, a11y, ergonomics) | **Adopted** | W32.2 analyzer list |
| Seeded regression catalogue | **Planned** | `doc/uisg/regressions.json` |
| Optimization loop (measure→rank→select→experiment→adopt) | **Adopted** | §5.2, Phase A+B |
| Hard constraints vs soft objectives (Pareto) | **Adopted** | §5.3 |
| Experiment record schema | **Adopted** | §5.4 |
| Canonicalization + diff + sync | **Adopted** | W32.9, `uisg diff`/`sync` |
| Evidence ledger (`runs.jsonl`, `decisions.jsonl`) | **Adopted** | W32.9 |
| Findings repository with statuses | **Adopted** | W32.9 |
| Context profiles as experiment dimensions | **Adopted** | `doc/uisg/contexts.json`, W32.3 |
| Friction → seam mapping | **Adopted** | `frictionMap.ts`, W32.3 |
| Capability/possibility/implementation/runtime truth separation | **Adopted** | §3.5 |

---

## 9. Failure modes to actively prevent (adopted from the reference spec)

| Failure mode | Prevention |
| :--- | :--- |
| Silent graph drift | `uisg scan` + `sync` + `analyze --strict` in verify |
| Untested capability | Every capability journey-linked or explicit unsupported |
| Orphan surface | `sync` proposes; inventory flags; `analyze` warns |
| Evidence-free adoption | `uisg adopt` requires evidence bundle + comparison |
| Selection silently drops feature | `uisg select` returns request + explanation + conflict set |
| Round-trip corruption | `canonicalize` test in `uisg validate`; CI gate |
| Findings repo divergence | `findings`/`mark-fixed` stable IDs; UISG emits to repo |
| Lifecycle regression | Transition legality tests; ledger append validation |
| Single UX score | Multiple dimensions; Pareto front; no aggregation |
| Untested context/viewport | Dimensions explicit; `uisg inventory` reports per denominator |

---

## 10. Dogfooding & Metaprogramming Opportunities

### Component Dogfooding

| Pattern | Current | Dogfood Target |
| :--- | :--- | :--- |
| `uisg scan` | Walks `ui/src` for components | Use `strategyResolver` component map as authoritative surface registry |
| `uisg sync` | Proposes repairs textually | Emit TypeScript AST patches via `ts-morph` for auto-fixable items |
| `toJourney` | Compiles graph → journey spec | Reflect on `JourneySpec` Zod schema for self-validating compilation |
| Registry validation | Scans files for exports | Import `StrategyResolver` at runtime; query registered strategies directly |

### Reflection/Metaprogramming

1. **Schema-driven CLI**: `JourneySpecSchema` (Zod) → auto-generate `--flags` for `to-journey`/`run` (dimensions, conditions, status). Eliminates manual flag parsing.

2. **Graph as code**: `UisgGraph` nodes/edges → TypeScript branded types; `validateGraph` = type checker + semantic rules. `toJourney` = typed transformation pipeline.

3. **Auto-manifest**: `emitManifest` reads `JourneySpec` Zod schema → generates source map from graph node IDs → step indices automatically.

4. **Analyzer as type predicates**: Each analyzer family = `type IsIntegrityIssue = ...`; `analyzeGraph` = type narrowing over graph.

5. **Selection as constraint solving**: `uisg select` = SAT/SMT over `requires`/`excludes`/cardinality; `z3` or custom backtracking for conflict sets.

6. **Canonicalization via serialization**: `JSON.stringify` with stable key sort + explicit defaults = deterministic hash; `uisg diff` = semantic diff on canonicalized AST.

---

## 11. Metaprogramming implementation notes

### `optimize/src/uisg/codegen.ts` (new)
```typescript
// Generate CLI flags from Zod schemas
export function generateFlagsFromSchema(schema: z.ZodObject<any>): FlagDef[] { ... }

// Generate sync proposals as ts-morph operations
export function syncToAstOps(proposals: SyncProposal[]): ts.Statement[] { ... }

// Canonicalize graph for deterministic hashing
export function canonicalize(graph: UisgGraph): UisgGraph { ... }
```

### Integration points
- `cli.ts`: import `generateFlagsFromSchema(JourneySpecSchema)` → auto-flags
- `sync.ts`: `syncToAstOps` → `--apply` writes actual fixes
- `validate.ts`: `canonicalize` round-trip test in CI
- `toJourney.ts`: schema-driven compilation with Zod refinements