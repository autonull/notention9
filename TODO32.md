# TODO.32 — Every Flow Is an Experiment
**Scope:** the UI/UX space, the evidence loop, the `pnpm verify` pipeline's skipped layers,
the remaining seams, and the integration of every UI-relevant system.
**Builds on:** TODO31 (done — the note is the page) and the 2026-11-23 UISG session
(46 nodes / 74 edges; 5 journeys green; 7/8 seams).
**Reference specification considered:** `ui-ux-space-graph` v1.0.0 (Parts I–XII). §12 records
what we adopt, defer, or reject, and why.
**Non-goals:** a new visual language, a parallel renderer or preview route, new matching or
ontology semantics, new dependencies, A2UI or remote-UI protocols as the canonical model.
**Core rule:** a capability is captured when intent, flow, steps, surfaces, states, guards,
effects, and evidence are linked; it is complete when a registered journey executes it in CI.

---
## 1. The change in one paragraph
The session proved the loop on five flows. TODO32 makes the loop cover the UI/UX space and
the systems that already exist. It adds four kinds of truth (possibility, implementation,
evidence, runtime) to the graph without inventing a second metamodel; it makes UI changes
selection-constrained and evidence-ranked; it turns `pnpm verify` from a pipeline that skips
L2/L3 into the gate that proves every adopted change. The reference specification's large
taxonomy is adopted only where notention has a real system to bind it to.

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
| Measurement | **Open** | `loop latency`, `friction:digest`, `probe`, `eval:match`, `ux-evaluate` exist | Not ingested (W32.3) |
| Records | **Partial** | One `status`; `source`; `confidence` | lifecycle vs implementation, evidence, provenance, decisions (W32.9) |
| Selection | **Absent** | — | `requires`/`excludes`/cardinality, context profiles (W32.3) |
| Predicates/effects | **Done** | `predicate`/`effect` nodes; `guards`/`effects` edges; registry validation; 4 CONSEQUENTIAL effects mapped | — |
| Coverage | **Partial** | Inventory counts | Contract + generators + denominators (W32.2) |
| States/surfaces | **Partial** | empty, private, conflict, saved; 6 surfaces | 13 states; network/search/chat/mobile (W32.7) |
| Cleanup | **Open** | Orphans named | W32.10 |

### Capability guarantee
No capability is removed by this plan. Every seam gets an implementation with a journey or a
written unsupported status. Every new surface passes `pnpm check:ui`.

---
## 3. The UI/UX space

### 3.1 Dimensions
| Dimension | Values | Source of truth |
| :--- | :--- | :--- |
| Surfaces | 6 views; editor; 4 rail tabs (`NOTE_RAIL_TABS`); 3 palette scopes (`PALETTE_SCOPES`); 5 browse modes (`NOTE_BROWSE_MODES`); overlays (publish confirm, import/export, help, template, describe-it, location/time picker, conflict resolution, next-steps drawer, agent panels); mobile context pane | `ui/src/components/views`, `editor`, `ui/src/config/uiSurfaces.ts` |
| Modes | list/canvas/board/map/timeline; 10 sort orders; arrange groups; 21 settings group ids (`SETTINGS_GROUPS`) | `uiSurfaces.ts`, `navigation.ts` |
| States | loading, empty, error, denied, offline, degraded, conflict, saving/saved, publish readiness, extracting, queue/relay offline, no match, rejected match | `optimize/src/state.ts`, hooks |
| Seams | 8 roles (`SEAM_ROLES`): capture, elicit, match, display, layout, explain, ontology, intent | `core/src/constants/seams.ts` |
| Strategies | `Strategy`, `StrategyProfile`/`Variant`, revisions | `core/src/ui/strategy.ts`, `profileTypes.ts`, `ui/src/strategies`, `StrategyResolver` |
| Viewports | 1440 desktop, 390 mobile, coarse pointer | `ui/test/playwright.config.ts` |
| Themes | dark + light (dual-theme axe) | `ui/src/styles` |
| Context profiles | actor role, expertise, device class, connectivity, locale, a11y needs (constraints, not identity) | proposed `doc/uisg/contexts.json` |
| Data | empty, one note, request+offer, conflict pair, private/published, relay-isolated, imported/exported, large workspace | seed fixtures, `data/loop/golden-cases.json` |
| Records | lifecycle, implementation, evidence, provenance, decisions | §3.4 |
| Metrics | steps, duration, assertions, aria snapshot, score, matched keys, friction kinds, latency, comprehension, screenshot diff | `uisg compare`, `loop latency`, `probe`, `ux-evaluate` |

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
1. Every capability has intent → flow → step → surface links and a registered journey, or an
   explicit unsupported status with a reason.
2. Every surface has a component/route/config key; every overlay has a confirm target.
3. Every state is asserted by at least one journey or marked not applicable.
4. Every seam is implemented with a journey or declared unsupported; each seam with more than
   one strategy has one experiment or a documented single-strategy decision.
5. Every browse mode and settings group is sampled by a deep link or a journey.
6. One relay-isolated network journey, one import/export, one trash/delete with a guardrail.
7. One mobile and one light-theme journey on the core path; axes cover the rest.
8. Every adopted variant has baseline, variant, compare, evidence, and a decision record.
9. `friction:digest`, `loop latency`, `probe`, `eval:match` feed `doc/uisg/priority.json`.

### 3.4 Coverage contract (adopted from the reference spec)
Completeness is not claimed; a declared contract replaces it. Store in `doc/uisg/coverage.json`:
`scope`, `generators` (candidate-producing rules), `applicability` (typed predicates),
`exceptions` (with rationale/provenance), `materialization` (virtual/proposed/materialized),
`reviewPolicy` (candidate → approved), and `coverageDimensions` (metric + denominator).
Generators propose candidates (list/detail/edit/search/export/archive/history, permitted/denied,
pending/error/retry/cancel, risk/confirm/audit/recovery, stale/conflict, deep-link/refresh/
back). A generator never asserts that an operation exists or is allowed; candidates enter the
review queue and are not counted as covered.

### 3.5 Four kinds of truth (kept separate)
- **Capability truth:** what the product can do, independent of a screen.
- **Possibility truth:** lifecycle of a model entry (`implemented` … `rejected`).
- **Implementation truth:** `verified`/`observed`/`inferred`/`unknown` evidence status.
- **Runtime/evidence truth:** guards, effects, states, run IDs, bundles, human review.

A model entry marked `implemented` is not automatically `verified`; an extracted candidate is
not an approved feature; a generated interface is not business authorization.

---
## 4. Systems integration map
| System | Contract | Integration point | Owner |
| :--- | :--- | :--- | :--- |
| Core ontology/matching | `OntologyNode`, `MatchEngine`, `detectConflicts`, `DEFAULT_ONTOLOGY` | capabilities as intents/flows; extraction expectations; conflict flows | W32.2, W32.6, W32.8 |
| Notes as records | `Note` (properties/tags/privacy/priority) | domain truth for guards and effects | W32.1 |
| Metaphors | `metaphorRegistry`, `MetaphorMapper` | automation/schedule/monitoring capabilities and surfaces | W32.7 |
| Seams/strategies | `SEAM_ROLES`, `Strategy`, `StrategyProfile`/`Variant` | variant experiments, selection by profile/experiment | W32.3, W32.4 |
| Selection constraints | `requires`/`excludes`/groups; deterministic checker | `uisg select`, conflict explanation, no silent drops | W32.3 |
| Predicates/effects | typed guard/effect IDs; `policy.ts` `CONSEQUENTIAL` | step guards, command effects, reversibility/risk | W32.1 |
| Journeys/evidence | `JourneySpec`, `Step`, `Target`, `EvidenceBundle`, `deriveFindings`, `replay` | executable flows, regression, adoption evidence | W32.1, W32.9 |
| Loop | `discover → prioritize → synthesize → evaluate → adopt`, `frictionMap`, `timeToMatch` | scan inputs, priority, strategy candidates | W32.2, W32.3, W32.9 |
| Friction journal | `FRICTION_KINDS`, duration buckets | priority signals per seam/workflow | W32.3 |
| Findings repository | `findings`/`mark-fixed`, statuses `open/fixed/verified` | UISG findings as repository findings | W32.9 |
| Intent cases | `optimize/src/optimizer/evaluation/intentCaseRunner.ts`, `pnpm prompts:eval` | intent seam evaluation | W32.8 |
| UX evaluation | `pnpm ux-evaluate` (`ux-evaluation-report.json`) | scenario metrics recorded in the graph | W32.9 |
| Perf budget | `pnpm optimize perf:budget` | metric guard for changes | W32.0 |
| Simulator | scenarios, dashboard, recording | network/chat/multi-agent evidence | W32.7 |
| DevBridge | `SemanticState`, action/prompt traces | state assertions, explanations, match keys | W32.1, W32.7 |
| Policy/guardrails | `CONSEQUENTIAL`, `Guardrail` | consequential coverage: publish, delete, merge, permissions | W32.0, W32.7 |
| Notes as configuration | theme/AI/capability settings as notes | configuration variants for experiments | W32.7 |
| Audit suites | `ui/test/audit/space.spec.ts`, `task-first.spec.ts` | structural and duplicate-primary signals | W32.0 |
| Screenshots | `pnpm screenshot <group>`, `pnpm screenshots` | visual evidence per milestone | W32.11 |
| Gates | `pnpm check:ui`, `uisg:check`, `verify` L0–L3, `verify.yml` | no change lands red | W32.0 |

---
## 5. The optimization loop: measure → rank → select → experiment → adopt

### 5.1 Which UI truth we change
- **Possibility changes** edit `doc/uisg/graph.json` (`create`, `link`, `update`, `retire`,
  `merge` in W32.9).
- **Selection changes** edit profiles/flags (`uisg select`) or a seam strategy.
- **Runtime/realization changes** edit `ui/src/components` or strategies (code).
Do not edit generated output; the graph and the code are the editable sources.

### 5.2 Cycle
1. **Scan** into `doc/uisg/scan.json` (components, seams, strategies, journeys, wrappers,
   orphans, taxonomy, golden cases).
2. **Measure** `friction:digest --days N --json`, `loop latency`, `probe`, `eval:match`,
   `ux-evaluate`, journey failures, drift findings → `doc/uisg/metrics.json`.
3. **Rank** into `doc/uisg/priority.json`:
   `score = (impact × confidence) / effort`; `impact = friction frequency × severity + latency +
   comprehension + failing assertions + drift/orphans`; `confidence = evidence count ×
   reproducibility`; `effort = files + new code + risk`. Tie-break user-visible first.
4. **Select** the feature/context combination (`uisg select`): check `requires`/`excludes`,
   group cardinalities, lifecycle, platform, modality, theme. Unsatisfiable selections return
   the request, a human-readable explanation, and a minimal conflict set when available — never
   a silently relaxed build.
5. **Hypothesize** each candidate: hypothesis, metric, baseline, expected effect, stop condition.
6. **Experiment** as a configuration change or a seam strategy; never a layout fork.
7. **Run** `pnpm uisg run <flowId>` (auto-build); one worker.
8. **Compare** `pnpm uisg compare <baseline> <variant>` (steps, kinds, durations, failed
   assertions).
9. **Adopt/reject** through the evidence gate; human review for user-visible or consequential
   variants; update the graph (lifecycle, implementation, provenance, decision).
10. **Record** in `doc/uisg/decisions.jsonl`, then re-measure.

### 5.3 Hard constraints vs soft objectives (adopted from the reference spec)
A variant failing a hard constraint is ineligible, even if it is faster:
correctness, authorization, declared WCAG target, safe destructive handling, keyboard access,
no unreachable required state, no unsafe transition, no arbitrary executable content, privacy.
Soft objectives stay a vector — actions, navigation depth, choice burden, repeated entry, error
and recovery cost, discoverability, consistency, density, flexibility, satisfaction — reported
as a Pareto frontier with denominators and assumptions; no single composite score, no universal
"UX quality". Compare generated and hand-built variants on the same task/context matrix.

### 5.4 Experiment record
```json
{
  "id": "exp.inline-detail.1",
  "flowId": "flow.inline-detail",
  "seam": "elicit",
  "variant": "inline",
  "context": "ctx.keyboard-expert.desktop",
  "metric": ["steps", "durationMs", "matchedKeys", "a11yErrors"],
  "baseline": { "bundle": "run_1795449721838_sa7kqp3", "value": { "steps": 11, "durationMs": 4500 } },
  "expected": "same outcome with 2 fewer steps and no a11y regression",
  "observed": null,
  "decision": "pending",
  "evidence": [],
  "at": "2026-11-23"
}
```

### 5.5 Cadence
After each workstream: scan → run touched journeys → compare → record. Weekly: full matrix.
On user report: add friction, re-rank, model a flow. Before release: `pnpm verify` L0–L3.

---
## 6. Workstreams

### W32.0 — Unskip the gates, then guard them (P0)
**Goal:** `pnpm verify` runs every layer it advertises locally; CI disabled (rely on local tests).
- [x] `scripts/verify.ts`: delete skipped L2/L3; L2 = `pnpm uisg run flow.capture-and-edit`;
      L3 = `pnpm uisg run flow.golden-path`, `flow.publish-gate`, `flow.ontology-conflict`.
- [x] Delete the never-existing L3 specs (`compose-match`, `golden-demo`, `seeded-workspace`) — never existed.
- [x] Root `uisg:check`: `validate` + `analyze --strict` (fails on any high finding).
- [x] CI `verify.yml`: disabled (`.github/workflows/verify.yml.disabled`); local verify includes all gates.
- [x] Add `ui/test/audit/space.spec.ts` and `task-first.spec.ts` to local verify; surface
      duplicate-primary findings to `uisg analyze`.
- [x] Add `pnpm optimize perf:budget` to `verify`; record the budget in the log.
**Acceptance:** local `pnpm verify` green without skips; a deliberately broken graph or
wrapper fails `uisg:check`; the log lists every layer and duration.

### W32.1 — Compile faithfully; typed guards and effects (P0)
**Goal:** a modeled flow compiles to the journey a person would register, with typed contracts.
- [x] `assertVisible` step: schema + executor; `toJourney` maps `show` → a visibility assertion.
- [x] Route substitution: fill `:noteId`-style segments from the seed; omit `navigate` when no
      seed fits.
- [x] Dimensions in compiled specs: `--viewport`, `--theme`, `--profile`, `--seed`, `--context`,
      `--conditions`; validate every spec.
- [x] Branch selection: `to-journey`/`run --conditions`; compile `publish-gate` as `cancelled`
      and `confirmed`.
- [x] Typed guards/effects: `step.guard?` and `capability.effect?` reference registered
      predicate/effect IDs; schema supports predicate/effect nodes and guards/effects edges.
- [x] Effect declarations: reversibility (`reversible/compensatable/irreversible/unknown`), risk,
      confirmation, failure modes; map `CONSEQUENTIAL` (`publish_note`, `delete_note`,
      `merge_ontology`, `grant_permission`) to confirmation steps; added to graph.
- [x] Registry allowlist: registered components and action/predicate IDs only; unknown or missing
      bindings fail the compile gate (validateAgainstRegistry).
- [x] Emit manifest: per flow `{ flowId, spec, journeyFile, bundle, compilerVersion, warnings,
      sourceMap }` into `doc/uisg/manifests/`; deterministic output for identical inputs.
- [x] DevBridge parity: expose the state a journey asserts (`note`, `matches[*].matched`,
      `conflicts`, `pendingConfirmations`, `saveStatus`).
- [x] Tests: mappings, substitution, flags, branches, guard/effect rejection, manifest
      determinism.
**Acceptance:** all five implemented flows compile; both publish branches compile; `show`
compiles to visibility; an unregistered component or predicate fails; identical inputs emit
identical manifests.

### W32.2 — Scan the whole space; detect drift; declare coverage (P0)
**Goal:** the graph cannot silently go stale, and completeness is a contract, not a claim.
- [x] `uisg scan`: read `uiSurfaces.ts`, `navigation.ts`, `seams.ts`, `journeys.ts`,
      `ui/src/strategies`, component imports, `data/loop/{taxonomy,golden-cases}.json`, the newest
      `data/loop/runs/run-*`; write `doc/uisg/scan.json`; `--discover` runs `pnpm loop discover`.
- [x] Coverage contract: `doc/uisg/coverage.json` (§3.4) with generators, applicability,
      exceptions, materialization, review policy, dimensions and denominators; `scan` proposes
      candidates, never auto-promotes.
- [ ] Analyzer families (each finding: severity, IDs, evidence, suggested fix):
      - integrity: duplicates, dangling, forbidden cycles, unreachable, orphans, stale sources,
        superseded, invalid groups, unsupported bindings;
      - traceability: capability without intent, control without capability, implemented without a
        pathway, intent without realization, task without outcome, duplicate labels without a dedup
        decision;
      - flow/state: dead ends, loops without exit, missing events/guards/effects/targets,
        unguarded actions, unhandled error/conflict, no cancel/back, no restoration, destructive
        without risk controls, async without pending/error;
      - a11y/responsive: name/role/value, keyboard and focus restoration, target size/focus
        visibility, overflow/text expansion, RTL assumptions, color-only meaning, unresolvable
        roles/hints;
      - consistency/ergonomics: inconsistent labels/placement, navigation depth, dense branching
        for high-risk contexts, duplicate confirmations without risk rationale, keyboard parity
        gaps, long forms/repeated entry, inconsistent loading/empty/error patterns.
- [x] `sync`: compare the graph with code and propose repairs (stale bindings, new routes,
      contract changes) — never overwrite hand-authored files.
- [ ] Seeded regression catalogue `doc/uisg/regressions.json` (fixture graph, expected diagnostic,
      severity, oracle) covering the §13.2 anti-patterns.
- [ ] Inventory reports per dimension and denominator; "unknown" is never "covered"; no single
      completeness percentage.
**Acceptance:** `analyze --strict` catches every seeded regression; `scan` deterministic; `sync`
proposes (does not apply); baselines change only with `--update`.

### W32.3 — Measure, rank, select, and prioritize (P0)
**Goal:** the next change is chosen from evidence under explicit constraints.
- [ ] `uisg metrics`: ingest `friction:digest`, `loop latency`, `probe`, `eval:match`,
      `ux-evaluate`, failing assertions, and drift into `doc/uisg/metrics.json`.
- [ ] `uisg rank`: §5.2 into `doc/uisg/priority.json`, with reasons linked to graph nodes.
- [ ] `uisg select`: check `requires`/`excludes`, groups, lifecycle, platform, modality, theme,
      context; deterministic checker first; return request + explanation + labelled conflict set;
      never silently drop a feature.
- [ ] Context profiles: `doc/uisg/contexts.json` (actor, expertise, device, connectivity, locale,
      a11y constraints) used as experiment contexts, not identity labels; no sensitive telemetry.
- [ ] Hard constraints/Pareto reporting (§5.3) in experiment reports; weight profiles are explicit
      and show sensitivity.
- [ ] Map friction kinds → seams/params via `optimize/src/loop/frictionMap.ts`; ignore positive
      kinds (`capture_started`, `need_expressed`, `match_viewed`).
- [ ] Surface top three in `uisg inventory` and the CI log.
- [ ] Tests for ranking, selection conflicts, and metric ingestion.
**Acceptance:** seeded friction + two bundles produce a stable ranking; an invalid selection is
rejected with an explanation; top experiments appear in inventory; no single UX score.

### W32.4 — The seam experiment program (P1)
**Goal:** every seam with a real alternative is evaluated, not assumed.
- [ ] Elicit: inline detail vs popup (`flow.inline-detail`); strategy registered, selected by
      profile/experiment; a11y and keyboard parity.
- [ ] Capture: quick-capture strategy vs page `New note`; does it reduce steps without harming
      comprehension?
- [ ] Match: reason badges vs expandable details; are explanations found and understood?
- [ ] Display/layout: list vs board defaults, rail share, density (configuration variants only).
- [ ] Each experiment: hypothesis, metric, baseline, expected effect, stop condition, compare,
      adopt/reject with human review for user-visible change.
- [ ] Second realization and context: one alternative pathway (keyboard/palette) on the same
      capability; 2 themes and 2 viewports for the skeleton; 30–40 records.
- [ ] Absorb TODO31 W31.0 extraction (`ListRow`, `Field`, `ContextPanel`) only on second use.
**Acceptance:** ≥1 evaluated experiment per seam with two strategies; every decision recorded; no
variant without an evidence bundle; `check:ui` green.

### W32.5 — Explain consolidation (P1)
**Goal:** the golden path's explained match is complete and singular.
- [ ] Move the expandable "Why this match?" details into `MatchItem` (shared pattern); keep badges.
- [ ] Delete or rehome `LocalMatchPreview` and `DashboardLocalMatch`; update the orphan baseline.
- [ ] Journey asserts explanation visibility and reason text (`assertVisible`).
- [ ] axe dark/light on the note with the rail open.
**Acceptance:** one explanation surface; journey asserts it; no orphan remains.

### W32.6 — Conflict resolution and ontology health (P1)
**Goal:** detection leads to resolution.
- [ ] Extend the conflict journey: select, resolve (update/remove/merge), assert
      `conflicts.length === 0` with data preserved.
- [ ] State paths for suggestions/resolution; capability "Resolve ontology conflict"; steps and
      surfaces updated.
- [ ] Gardener/merge flow coverage; `ontology:audit` output linked to the graph.
**Acceptance:** resolution journey green; detection + resolution capabilities; no silent data loss.

### W32.7 — Cover states, network, and configuration (P1)
**Goal:** the space's states and non-note surfaces are captured.
- [ ] State journeys: loading, empty, error, denied, offline, degraded, conflict, saving/saved,
      publish-ready, extracting, no-match, rejected.
- [ ] Network: relay-isolated publish and reply; explore feed; chat; DM privacy; relay status;
      queue/offline banner; a `simulator` scenario for a two-agent exchange.
- [ ] Import/export round trip; trash/delete with the consequential guardrail; settings deep links
      per group (`general` … `skills, data, metrics, revisions, advanced, labels, ontology`);
      `ai`, `automation`, `matchDigest`, `network`, `nostr`, `sync`, `relayDiscovery`.
- [ ] Metaphor/skill/automation surfaces: one automation rule, one scheduled task, one monitoring
      agent flow, or explicit unsupported.
- [ ] Configuration variants: theme, density, AI on/off, capability profile; note-based
      configuration variant.
- [ ] Mobile: one 390 journey on capture/match; light-theme journey on the core path.
**Acceptance:** each state asserted once; one relay-isolated, one mobile, one light journey; every
settings group reachable; no new dependency or parallel surface.

### W32.8 — Intent seam decision (P2)
**Goal:** the 8th seam has a status, not a silence.
- [ ] Investigate `core/src/patternRecognition` and `optimize/src/optimizer/evaluation/
      intentCaseRunner.ts`; `pnpm prompts:eval`.
- [ ] Either implement an `intent` surface/strategy with a journey and evaluation, or declare it
      unsupported with a reason in `doc/uisg/README.md` and the inventory.
**Acceptance:** inventory and README agree; no silent gap.

### W32.9 — Evidence, records, governance (P1)
**Goal:** decisions and findings are recorded, not remembered.
- [ ] Records: separate `lifecycle` (`implemented/partial/planned/candidate/experimental/
      removed/rejected`) from `implementation` (`verified/observed/inferred/unknown`); add
      `evidence` and `provenance` (`manual/reverse-engineered/test-derived/generated`, source,
      commit, date, confidence); migrations keep IDs.
- [ ] Lifecycle transitions: `candidate → planned|experimental|rejected|implemented`; `planned →
      experimental|implemented|rejected`; `experimental → implemented|planned|rejected`;
      `implemented → partial|removed`; `partial → implemented|planned|removed`; `removed → planned|
      candidate` only via a decision record. Record actor, time, reason, evidence, impact.
- [ ] `uisg run` appends `{flowId, runId, bundle, status, at}` to `doc/uisg/runs.jsonl`.
- [ ] `uisg adopt <flowId>`: compare latest bundles, require evidence, update the graph
      (`lifecycle`, `implementation`, `provenance`, bundle), append `decisions.jsonl`; validate
      before writing.
- [ ] Emit UISG findings into the findings repository (`findings`/`mark-fixed`, statuses
      `open/fixed/verified`) with stable IDs.
- [ ] Canonicalization + diff + sync: stable field/edge/enum ordering, explicit defaults, schema
      version, unknown-field policy, deterministic hash; round trip
      `canonicalize(parse(serialize(canonicalize(G)))) == canonicalize(G)`; `uisg diff` (revision/
      variant; semantic vs ordering changes); `uisg sync` proposes repairs only.
- [ ] Regression: `pnpm optimize replay` on adopted flows; `pnpm optimize ux-evaluate` scenario
      metrics linked to the graph.
- [ ] Tests: atomic adopt, ledger append, transition legality, finding status, round trip, diff.
**Acceptance:** adopt is atomic and validated; findings appear in `findings`; replay passes;
round-trip test green; illegal transitions rejected.

### W32.10 — Cleanup and hygiene (P2)
**Goal:** every status is true.
- [ ] Resolve orphans: delete or wire `QuickCapture`, `DashboardLocalMatch`, `LocalMatchesPanel`,
      `LocalMatchPreview`.
- [ ] Absorb TODO31 residual items: `ListRow`/`Field`/`ContextPanel` on second use; tone tail routed
      per changed surface; mobile context bottom-pane parity.
- [ ] Audit `knownJourneys.ts` duplicates and `scene-editor-note`; separate `mcp-contract`/`replay`
      in the README; fix stale sources.
**Acceptance:** no orphan without a reason; `analyze` 0 findings or a documented baseline; statuses
match reality.

### W32.11 — Docs, screenshots, final matrix (P2)
**Goal:** documentation describes the system that exists.
- [ ] Update skill operations (`scan`, `select`, `run`, `compare`, `adopt`, `rank`, `diff`, `sync`),
      `doc/uisg/README.md`, and the analysis closure.
- [ ] Reconcile with `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md`: its suggestion store is
      findings + priority + decisions, not a parallel system.
- [ ] Refresh screenshots touched by W32.4–W32.7 (one worker, relay isolation).
- [ ] Run the final matrix and record run IDs.
**Acceptance:** every documented command works; the matrix is green; no skipped layer.

---
## 7. Acceptance — definition of done

### 7.1 Gates
| Gate | Command | Pass |
| :--- | :--- | :--- |
| Types | `pnpm --filter @notention/optimize exec tsc --noEmit` | clean |
| UISG tests | `pnpm --filter @notention/optimize test` | all pass |
| Graph | `pnpm uisg validate` | OK |
| Findings | `pnpm uisg analyze --strict` | 0 high findings |
| UI unit | `pnpm test:ui` | all pass |
| UI gate | `pnpm check:ui` | lint:type/tone/ui-layers + typecheck + dual-theme axe + golden path |
| Audit | `space.spec.ts`, `task-first.spec.ts` | pass |
| Full | `pnpm verify` | L0–L3, no skips |
| CI | `Verify` workflow | green |

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
- [ ] `create`, `query`, `validate`, `analyze`, `select`, `simulate`, `generate`, `diff`, `sync`
      demonstrated on the slice; graph changes reviewable without editing generated files.

### 7.5 Non-goals
No new dependencies, no parallel renderer or preview route, no second visual language, no new
matching or ontology semantics, no mandatory A2UI, no graph database, no universal UX score, no
unrestricted code generation, no exhaustive enumeration, no OWL/SHACL reasoning.

---
## 8. Reference-specification adoption map (§12)
| Idea from the reference spec | Status | Where |
| :--- | :--- | :--- |
| Lifecycle vs implementation status | **Adopt** | §3.5, W32.9 records |
| Provenance/evidence records | **Adopt** | §3.5, W32.9 |
| Typed predicate DSL + effect contracts | **Adopt (bounded)** | W32.1; registry IDs, no inline code |
| Feature constraints (`requires`/`excludes`/groups) | **Adopt** | §5.2 `select`, W32.3 |
| Context/actor profiles | **Adopt (privacy-aware)** | §3.1, W32.3 `contexts.json` |
| Coverage contract + generators | **Adopt** | §3.4, W32.2 |
| Wider analyzer taxonomy | **Adopt** | W32.2 |
| Hard constraints vs soft objectives/Pareto | **Adopt** | §5.3, W32.3/4 |
| Staged compiler + manifest + content hash | **Adopt (light)** | W32.1, W32.9 |
| Component/action/predicate allowlist | **Adopt** | W32.1 |
| Canonicalization + diff + sync | **Adopt** | W32.9 |
| Lifecycle transition governance | **Adopt** | W32.9 |
| Seeded regression catalogue | **Adopt** | W32.2, §13.2 |
| Walking-skeleton expansion (2nd realization, 2 themes/viewports) | **Adopt** | W32.4, W32.7 |
| Seven node families (Entity/Command/…), four separate artifacts | **Defer** | notention's 5 node types + references suffice; map: graph = design space, core = domain, journeys/`SemanticState` = runtime, strategies/registry/tokens = realization |
| Full SAT/SMT solver, TypeBox/Ajv, XState, graph DB, editor UI | **Defer** | deterministic checker first; zod/replay; no new deps until measured need |
| A2UI adapter | **Defer to milestone 6** | optional, pinned version, not canonical |
| DTCG token interchange | **Defer** | tokens + `uiSurfaces.ts` suffice for now |
| GOMS/KLM effort estimates | **Adopt as qualified estimates** | §5.3; never a UX score |
| Ontology reasoning (OWL/SHACL) | **Reject** | no cross-system reasoning use case |

---
## 9. Failure modes to actively prevent (adopted from the reference spec)
- **Completeness fantasy:** unbounded UI space presented as an exhaustive inventory.
- **Graph rot:** model and code diverge because neither is checked in CI.
- **Two editable sources:** people hand-edit both the graph and generated files.
- **Generic-UI blandness:** generated UI removes crafted workflows.
- **Metric Goodhart:** fewer clicks at the cost of safety, discoverability, or control.
- **Modeling tax:** authoring/maintenance costs more than the feature.
- **Premature ontology:** heavyweight semantics before a working use case.
- **Status confusion:** candidate/planned/implemented/removed/verified conflated.
- **Graph conflation:** possibility, task, domain state, runtime state in one edge type.
- **False authorization:** client predicates treated as a security boundary.
- **False accessibility:** automation success treated as conformance.
- **Uncontrolled generation:** model data chooses imports/handlers/styles.
- **Silent lossy compile:** unsupported semantics dropped without diagnostics.
- **No human loop:** optimization on heuristics alone.

---
## 10. File map
| Area | Files |
| :--- | :--- |
| UISG module | `optimize/src/uisg/{types,validate,query,analyze,compare,toJourney,select,diff,sync,canonical,metrics,rank,index,cli}.ts`, `uisg.test.ts` |
| Graph data | `doc/uisg/{graph,scan,metrics,priority,coverage,contexts}.json`, `{runs,decisions}.jsonl`, `orphans.json`, `regressions.json`, `manifests/` |
| Variants | `doc/uisg/variants/*.md` |
| Journeys | `optimize/src/journeys.ts`, `knownJourneys.ts`, `state.ts`; `ui/test/optimize/*.journey.ts` |
| Journey runtime | `optimize/src/journey.ts`, `steps.ts`, `stepExecutors/*` (incl. `assertVisible.ts`), `ui/test/optimize/support/journeyTest.ts` |
| Compiler | `optimize/src/uisg/toJourney.ts`, `journeyFileGenerator.ts` |
| Seams/strategies | `core/src/constants/seams.ts`, `core/src/ui/{strategy,profileTypes}.ts`, `ui/src/strategies/*`, `StrategyResolver.tsx`, `scripts/generate-definitions.ts` |
| Explain/matches | `ui/src/components/match/MatchItem.tsx`, `ui/src/components/dashboard/LocalMatchPreview.tsx` |
| Conflicts/ontology | `ui/src/components/views/OntologyView.tsx`, `ui/src/components/ontology/OntologyConflicts.tsx`, `ui/src/hooks/useOntologyView.ts` |
| Bridge/state | `ui/src/dev/DevBridge.tsx`, `ui/src/dev/bridge.ts`, `optimize/src/state.ts` |
| Telemetry | `core/src/telemetry/{journal,frictionUtils}.ts`, `optimize/src/loop/frictionMap.ts`, `scripts/comprehension-probe.ts` |
| Loop/metrics | `optimize/src/loop/*`, `scripts/run-demo-loop.ts`, `optimize/src/cli/commands/{frictionDigest,findings,markFixed,replay,uxEvaluate,perfBudget}.ts` |
| Simulator | `simulator/README.md`, `simulator/src/*` |
| Gates/CI | `scripts/verify.ts`, `package.json`, `.github/workflows/verify.yml`, `scripts/{check-ui-layers,check-tone}.mjs` |
| Audit | `ui/test/audit/{space,task-first}.spec.ts` |
| Docs | `scripts/melt_ui.skill.md`, `README.md`, `doc/uisg/README.md`, `doc/uisg/analysis-2026-11-23.md`, `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md` |

---
## 11. Order of work
1. **W32.0** — gates first; a skipped layer cannot hide a regression.
2. **W32.2** — scan, contract, drift, regression catalogue.
3. **W32.3** — measure, rank, select, context profiles.
4. **W32.1** — compile, guards/effects, allowlist, manifest.
5. **W32.5** — explain consolidation.
6. **W32.6** — conflict resolution.
7. **W32.7** — states/network/config coverage.
8. **W32.4** — seam experiments and adoption.
9. **W32.8** — intent seam decision.
10. **W32.9** — records, governance, canonicalization/diff/sync.
11. **W32.10** — cleanup.
12. **W32.11** — docs, screenshots, final matrix.

Do not start a later workstream while `pnpm verify` is red. Do not mark a node `implemented`
without a run ID or `verified` implementation. Do not ship a variant without an evidence bundle.
Do not add a surface where a selection or a seam strategy would do.

---
## 12. Risks and guards
| Risk | Guard |
| :--- | :--- |
| Coverage theater | Per-dimension denominators; generators enter the review queue, never "covered" |
| Metric gaming | Hard constraints first; pair steps with comprehension and a11y |
| Matrix explosion | Two-level samples per dimension; no full cross-product |
| Verify slowness hides layers again | L2/L3 only in verify/CI; one worker; build cache; upload bundles |
| Selection silently relaxed | Conflict explanation + labelled conflict set; tests |
| Inline/capture variant forks layout | Seam props only; configuration-driven selection |
| Profile/context drift | Same seed and outcome; compare before adopt; context profiles versioned |
| Ontology seed drift | `DEFAULT_ONTOLOGY` in seeds; extraction expectations asserted |
| Findings rot | Repository statuses; stale-finding check |
| Record status confusion | Lifecycle and implementation separate; legal transitions only |
| Graph/code drift | `uisg sync` proposes repairs; CI drift findings |
| Screenshot churn | Groups by surface; one worker; archive the old set |
| Pre-existing dirty tree | Separate commits; do not mix `agent/` and `core/src/security/` changes |

---
## 13. Fresh-session start
Read, in order: `TODO32.md`; `doc/uisg/README.md` and `analysis-2026-11-23.md`;
`scripts/melt_ui.skill.md`; `scripts/verify.ts` (the skipped L2/L3 block);
`optimize/src/uisg/{cli,toJourney,analyze}.ts`; `optimize/src/journeys.ts`;
`ui/src/config/uiSurfaces.ts`; `ui/src/dev/DevBridge.tsx`.
Then run:
```bash
pnpm uisg validate
pnpm uisg analyze
pnpm uisg inventory
pnpm uisg run flow.capture-and-edit
pnpm uisg run flow.golden-path
pnpm uisg run flow.publish-gate
pnpm uisg run flow.ontology-conflict
pnpm optimize friction:digest --days 7
pnpm verify
```
Start with W32.0. The first line of `pnpm verify` output must prove that L2 and L3 ran. Then
scan, measure, rank, and pick the top experiment before writing UI code.

---
**The one-sentence test:** a stranger types one sentence, keeps one note, and sees one
explained match; the plan measures that path, ranks the next change from the measurement under
explicit constraints, and CI proves both on every pull request.
