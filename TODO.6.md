# Notention Development Plan (TODO.6.md)

> ⚠️ **Superseded by [TODO.7.md](./TODO.7.md).** The improvement loop here relies on a
> static estimator (`uxEvaluator`), an uncapped score (`uiuxEvaluator.ts:426`), and a CLI
> that ignores its own config. TODO.7 rearchitects it around observed measurement,
> a bounded mutation grammar, holdout validation, and a ledger. Kept for history only.

Consolidated from TODO.5.md. Supersedes prior plan. Tracks the original 3 batches (complete), the extensibility foundation (complete), and the self-improving development loop (next).

---

## 0. Current State (Honest)

| Area | State | Blocking |
|------|-------|----------|
| Core semantics | ✅ 398 tests | — |
| UI | 🟡 100+ tests; full-suite run OOMs | Vitest memory (see I5) |
| Golden Path journey | ✅ Green (optimize) | Clean-profile + human test (G1) |
| Storage | ✅ Schema v1 validation + export/import + recovery/snapshots + quota warnings | — |
| Nostr | 🟡 Works, nonconformant | CBOR, NoteID, signing (Tier 0) |
| Agent | 🟡 Headless OK; UI loop partial | Confirmations, traces, undo |
| Capability security | ✅ Core; UI ✅ | — |
| Pattern recognition | ✅ Engine; UI ✅ | — |
| Metaphor system | ✅ 15 defaults, registry, mapper + visual consumers | — |
| Templates | ✅ Generator + ontology + create-note wiring | — |
| CLI | ✅ Full cockpit + docs | — |
| Simulator | ✅ Movie Studio + 13 scenarios + regression + per-agent browser contexts | Community/federation scale |
| Optimizer | ✅ Journey discovery + replay + UX evaluator + `ux-evaluate` | Suggestion engine (Phase 2) |
| Extensibility primitives | ✅ `UIAdapter`/`OntologyAdapter` + registries + suggestion store | Suggester + AB runner |
| Engineering confidence | 🟡 `pnpm verify` passes for core/sim/agent | UI suite OOM; optimize has no tests |
| **3 Batches (A/B/C)** | ✅ **ALL COMPLETE** | Gates G1-G6 remain |
| **Extensibility Phase 1** | ✅ **COMPLETE** | Phases 2-4 remain |

**Test counts:** core 398 | simulator 20 | agent 17 | ui (per-file OK, full run OOM) | optimize 0
**Build:** ✅ `pnpm build` succeeds across all workspaces.

---

## 1. Decision Gates (Hard Stops)

| Gate | Question | Status | If No |
|------|----------|--------|-------|
| **G0** | `pnpm verify` 2× in CI under cap? | ✅ **DONE** | — |
| **G1** | Stranger completes Golden Path <2 min unaided? | ⏳ Next human step | Fix W1; no features |
| **G2** | Humans rate ≥70% matches relevant? | ⏳ After G1 | Fix matching/ontology |
| **G3** | Data loss provably impossible? | ✅ Export/import + recovery + quota | — |
| **G4** | Product direction interop-first? | ✅ **YES** | W5 stays P1 or → P0 |
| **G5** | Users hit single-device limit? | ⏳ After G3 | Defer W6 |
| **G6** | MP4 recordings work reliably for demos/teaching? | ✅ **DONE** | Use localhost:ports instead of lvh.me DNS |

**G4 decided: YES (interop-first).** W5 + W5b complete.

**Human testing (G1, G2) remains the authority.** The automated loop below *informs and accelerates* human testing; it does **not** replace it. A metric threshold passing is evidence, not proof of product quality (see R7).

---

## 2. Three Batches (Sequential PRs) — **ALL COMPLETE ✅**

### Batch A: Trust & Visibility (Settings Panel) — ✅ DONE (PR #1)

| Task | Files | Done When |
|------|-------|-----------|
| A1. Capabilities panel: list grants per note, revoke button | `ui/src/components/settings/CapabilitiesPanel.tsx`, `DataTab.tsx` | ✅ Live indicator + revoke |
| A2. Pattern recognition suggestions in property modal | `InsertPropertyModal.tsx`, `usePatternSuggestions.ts`, `core/src/patternRecognition/` | ✅ Suggestion appears, accept reduces entry |
| A3. Export workspace/note buttons in Data tab | `DataTab.tsx`, `core/src/export/` | ✅ Export → wipe → import = identical |
| A4. Wire `pendingConfirmations` to publish-gate modal | `PendingConfirmationsModal.tsx`, `AppShell.tsx`, `core/src/security/` | ✅ Consequential tools confirm |

Shared test: `DataTab.test.tsx` ✅ · Gate: enables G3, unblocks W4/W4b.

### Batch B: Demo & Distribution — ✅ DONE (PR #2)

| Task | Files | Done When |
|------|-------|-----------|
| B1. CLI docs + `pnpm run cli` verification | `README.md`, `cli/src/commands/` | ✅ Works end-to-end |
| B2. Simulator Golden Path scenario | `simulator/src/scenarios/golden-path.ts`, `movie_maker.ts` | ✅ Scenario runs, agents match |
| B3. `optimize reproduce --simulator` gate | `optimize/src/cliHandlers/reproduce.ts`, `simulator/src/scenarios/regression.ts` | ✅ Flag added, regression runs |

Shared test: `SimulatorRegression.test.ts` ✅ · Gate: G1, G2.

### Batch C: First Metaphor View — ✅ DONE (PR #3)

| Task | Files | Done When |
|------|-------|-----------|
| C1. Metaphor View plugin interface | `ui/src/plugins/metaphor/MetaphorViewPlugin.ts`, `core/src/skills/metaphor/MetaphorMapper.ts` | ✅ Drop component in dir |
| C2. `conditional-automation` → rule card list | `ConditionalAutomationView.tsx`, `AutomationsView.tsx` | ✅ Renders rule card |
| C3. Template gallery in create-note flow | `DashboardQuickCapture.tsx` | ✅ Template-based creation |

Shared test: `MetaphorViewPlugin.test.tsx` ✅ · Gate: proves "seams over special cases".

---

## 2b. Extensibility Phase 1 — ✅ COMPLETE (PR #4)

**Goal:** Make UI and ontology swappable/testable so simulator + optimizer can *propose and trial* changes.

| Deliverable | Files | State |
|-------------|-------|-------|
| `UIAdapter` + `UIRegistry` (components, variants, themes, lifecycle) | `core/src/ui/UIAdapter.ts`, `core/src/ui/index.ts` | ✅ |
| `OntologyAdapter` + `OntologyRegistry` (versioning, changelog, compatibility) | `core/src/ontology/OntologyAdapter.ts`, `core/src/ontology/index.ts` | ✅ |
| Suggestion types + persistent store (UI + ontology, status workflow, test results) | `core/src/suggestions/SuggestionTypes.ts`, `SuggestionStore.ts`, `index.ts` | ✅ |
| 10 domain scenarios (freelance, hiring, project, mentorship, learning, cofounder, investor, events, OSS, research) | `simulator/src/scenarios/domainScenarios.ts` | ✅ |
| UX evaluator: 10 metrics + thresholds + issue/recommendation generation | `optimize/src/uiuxEvaluator.ts` | ✅ |
| `optimize ux-evaluate` CLI (scenarios, thresholds, JSON report) | `optimize/src/cliHandlers/uxEvaluate.ts`, `optimize/src/cli.ts` | ✅ |
| Journey/finding → simulator scenario bridge | `optimize/src/discovery/simulatorScenarioGenerator.ts` | ✅ |
| `--headless` simulator regression (no browser/MP4) | `optimize/src/cliHandlers/simulator-regression.ts`, `simulator/src/browser_manager.ts` | ✅ |
| MetricsTab (opt-in, localStorage, export/clear) + storage quota warnings + auto-snapshots | `ui/src/components/settings/MetricsTab.tsx`, `ui/src/hooks/useMetrics.ts`, `ui/src/components/settings/DataTab.tsx`, `ui/src/index.tsx` | ✅ |
| Design reference | `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md` | ✅ |

**Verification:** `pnpm optimize ux-evaluate` evaluates 13 scenarios and writes a report. `pnpm optimize reproduce <scenario> --headless` runs the loop. Build + core/sim/agent tests green.

---

## 3. The Automated Development Loop (Next Major Workstream)

**Vision:** a closed, semi-automatic loop where simulation produces evidence, the optimizer proposes concrete UI/ontology changes, variants are trialled head-to-head, and humans approve what ships.

```
        ┌──────────────────────────────────────────────────────────┐
        │  1. SIMULATE   13+ domain scenarios × (UI × ontology)     │
        │     simulator/src/scenarios, testing/MatrixRunner         │
        └───────────────────────────┬──────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │  2. EVALUATE   10 UX metrics → issues → recommendations   │
        │     optimize/src/uiuxEvaluator.ts        (✅ exists)      │
        └───────────────────────────┬──────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │  3. SUGGEST    metrics/evidence → typed proposals        │
        │     optimize/src/suggestion/{UISuggester,OntologySuggester}│
        │     → SuggestionStore          (store ✅, suggesters TODO)│
        └───────────────────────────┬──────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │  4. TRIAL      A/B + matrix: control vs variant           │
        │     optimize/src/abtest/{ABTestRunner,TestMatrix}         │
        └───────────────────────────┬──────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │  5. REVIEW     human approves/rejects in UI or CLI        │
        │     optimize apply-suggestion / suggestions + review UI   │
        └───────────────────────────┬──────────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │  6. APPLY      merge change; 7. GUARD regression suite     │
        │     re-run matrix; auto-rollback on metric regression     │
        └──────────────────────────────────────────────────────────┘
```

### Phase 2: Suggestion Engine (next)

| Task | Files | Done When |
|------|-------|-----------|
| P2.1 `UISuggester`: metric patterns → `UISuggestion` (rule table from design §2.2) | `optimize/src/suggestion/UISuggester.ts` | `ux-evaluate` report → N typed UI suggestions in store |
| P2.2 `OntologySuggester`: property frequency/co-occurrence/never-matched → `OntologySuggestion` | `optimize/src/suggestion/OntologySuggester.ts` | Frequency analysis → add/modify/hierarchy proposals |
| P2.3 `SuggestionEngine` orchestrator (dedupe, severity, impact estimate) | `optimize/src/suggestion/SuggestionEngine.ts` | Deterministic IDs, no duplicate suggestions |
| P2.4 CLI: `suggest ui|ontology --from-report`, `suggestions --status` | `optimize/src/cliHandlers/suggest.ts` | Commands list/emit suggestions |
| P2.5 Evidence wiring: attach originating metric/ontology evidence + scenario/domain | suggester + store | Every suggestion traceable to evidence |
| P2.6 Unit tests (no mocks): report fixtures → expected suggestions | `optimize/src/suggestion/*.test.ts` | Deterministic tests per rule |

**Acceptance:** `pnpm optimize ux-evaluate && pnpm optimize suggest ontology --from-report ./ux-evaluation-report.json` produces the known match-relevance gap as a `ontology-add-property`/`modify-operator` suggestion with evidence.

### Phase 3: A/B & Matrix Testing

| Task | Files | Done When |
|------|-------|-----------|
| P3.1 `ABTestRunner`: run scenario under control vs variant, collect metrics | `optimize/src/abtest/ABTestRunner.ts` | Two runs, metric deltas reported |
| P3.2 `TestMatrix`: (UI variants × ontology variants × scenarios × reps) | `optimize/src/abtest/TestMatrix.ts` | Config-driven matrix executes |
| P3.3 Statistical significance (effect size + confidence) | `optimize/src/abtest/StatisticalTest.ts` | Reject no-effect below threshold |
| P3.4 `VariantManager` + `MatrixRunner` in simulator | `simulator/src/testing/{VariantManager,MatrixRunner}.ts` | Variants injected at runtime |
| P3.5 Comparison report (markdown + JSON) | `optimize/src/abtest/report.ts` | Control-vs-variant table |

**Acceptance:** `pnpm optimize abtest --config config/abtests/compact-dashboard.json` yields a pass/fail verdict with effect size and writes a comparison artifact.

### Phase 4: Integration, Review & Guardrails

| Task | Files | Done When |
|------|-------|-----------|
| P4.1 Suggestion review UI (list, filter, evidence, approve/reject) | `ui/src/components/settings/SuggestionsTab.tsx` | Status transitions persist via store |
| P4.2 CLI lifecycle: `apply-suggestion`, `rollback-suggestion` | `optimize/src/cliHandlers/apply.ts` | Apply = write ontology/UI config + record |
| P4.3 Nightly CI matrix job (artifact only, no auto-merge) | `.github/workflows/` or `scripts/` | Report uploaded; failures loud |
| P4.4 Auto-rollback guard: re-run matrix on apply; revert on regression | `optimize/src/abtest/guard.ts` | Regression blocks apply |
| P4.5 Suggestion precision/recall measurement vs human review | store metadata + metrics | Precision/recall tracked |

**Acceptance:** end-to-end demo: evaluate → suggest → A/B trial → human approve → apply → regression guard → (auto)rollback path exercised.

### Non-negotiable guardrails for the loop

1. **No unattended merges.** Suggestion application always has a human gate (P4.1/P4.2).
2. **No single-metric optimization.** Require multi-metric confirmation before a proposal is `approved` (avoid R7 reward hacking).
3. **Every applied change is reversible** via versioned ontology + UI configs (adapters already support `extends`/versioning).
4. **Ontology changes are additive-first**; removals require explicit human sign-off.
5. **Metrics are estimates.** `UXEvaluator` heuristics must be labelled as such; G2 human ratings remain ground truth.

---

## 4. Deferred (Require Gates)

| Workstream | Trigger | Gate |
|------------|---------|------|
| W3 Extraction Quality + Prompt Eval | Human relevance ratings (G2) | G2 |
| W4 Agent Loop Closure | Confidence from G1/G2 | G1, G2 |
| W5 Protocol Foundation (CBOR, NoteID, Signing) | G4=interop-first | ✅ **COMPLETE** |
| W5b Simulator Protocol Testbed | W5 promoted | ✅ **COMPLETE** |
| W6 Multi-Device Sync | Users hit single-device limit (G5) | G3, G5 |
| G6 MP4 Recording Infrastructure | Demos, teaching, CI evidence | ✅ **DONE** |
| Federated/community simulation (multi-relay) | Loop stable single-relay | Phase 3+ |

---

## 5. Metrics to Instrument (In-App, Opt-In)

| Metric | Where Captured | Target |
|--------|----------------|--------|
| Time-to-first-match | Journey assertion | < 120s |
| Match acceptance/rejection rate | Match result UI | ≥ 70% acceptance |
| Export/import success rate | DataTab buttons | 100% round-trip |
| Capability grant/revoke rate | CapabilitiesPanel | > 0 (engagement) |
| Pattern suggestion acceptance | PropertyModal | Measurable reduction in manual entry |
| Template usage → match success | CreateNoteModal + MatchEngine | Template notes match faster |

**Bridge to automated loop:** the same metric names feed `UXEvaluator` thresholds. Keep the vocabulary shared (`optimize/src/uiuxEvaluator.ts` `DEFAULT_THRESHOLDS` ↔ `ui/src/hooks/useMetrics.ts` `Metrics`).

---

## 6. Insights Learned (Evidence, not vibes)

| # | Insight | Evidence | Implication |
|---|---------|----------|-------------|
| I1 | **Architecture is genuinely pluggable** | `UIAdapter`/`OntologyAdapter` registries mirror battle-tested metaphor/capability patterns | Phase 2-4 can proceed without new abstraction work |
| I2 | **Match relevance is the bottleneck** | `match-relevance` 0.50-0.55 vs 0.70 threshold across domain scenarios | First real suggestion should target ontology matching (aligns with G2) |
| I3 | **Template discoverability drives usage** | `template-usage-rate` 0.60 (with `template-user` trait) vs 0.15 (without) | UI suggestions for template promotion have measurable effect |
| I4 | **Dashboard clarity degrades predictably** | clarity drops as agent count >15/>25 and event density >1/>2 per sec | Scaling issues are quantifiable before human testing |
| I5 | **UI full-suite test run OOMs** | `npx vitest run` in `ui/` → heap OOM / IPC channel closed; per-file passes | Must fix before CI matrix (P4.3) can include UI |
| I6 | **Optimizer has zero tests** | `optimize` vitest: "No test files found" | Phase 2 must ship tests with suggesters |
| I7 | **Optimizer is non-conformant with NodeNext** | `pnpm build` passes, but `.js`/`.d.ts` artifacts had to be gitignored | Treat `dist` as canonical; avoid stray emit in `src` |

---

## 7. File Index

| Area | Primary Files |
|------|---------------|
| **Batch A** | `ui/src/components/settings/CapabilitiesPanel.tsx`, `DataTab.tsx`, `InsertPropertyModal.tsx`, `usePatternSuggestions.ts`, `PendingConfirmationsModal.tsx`, `AppShell.tsx`, `core/src/security/CapabilityManager.ts`, `core/src/patternRecognition/`, `core/src/export/` |
| **Batch B** | `README.md`, `cli/src/commands/`, `simulator/src/scenarios/golden-path.ts`, `movie_maker.ts`, `optimize/src/cliHandlers/reproduce.ts`, `simulator/src/scenarios/regression.ts` |
| **Batch C** | `ui/src/plugins/metaphor/*`, `ui/src/components/dashboard/{AutomationsView,QuickCapture}.tsx`, `core/src/templates/TemplateGenerator.ts` |
| **Phase 1 (✅)** | `core/src/ui/*`, `core/src/ontology/OntologyAdapter.ts`, `core/src/suggestions/*`, `simulator/src/scenarios/domainScenarios.ts`, `optimize/src/uiuxEvaluator.ts`, `optimize/src/cliHandlers/uxEvaluate.ts`, `optimize/src/discovery/simulatorScenarioGenerator.ts`, `ui/src/components/settings/MetricsTab.tsx` |
| **Phase 2 (next)** | `optimize/src/suggestion/{UISuggester,OntologySuggester,SuggestionEngine}.ts`, `optimize/src/cliHandlers/suggest.ts` |
| **Phase 3** | `optimize/src/abtest/{ABTestRunner,TestMatrix,StatisticalTest,report}.ts`, `simulator/src/testing/{VariantManager,MatrixRunner}.ts` |
| **Phase 4** | `ui/src/components/settings/SuggestionsTab.tsx`, `optimize/src/cliHandlers/apply.ts`, `optimize/src/abtest/guard.ts`, CI matrix script |

---

## 8. Test Strategy (Minimal Overhead)

| Area | Test File | Scope |
|------|-----------|-------|
| Batch A | `ui/src/components/settings/SettingsPanel.test.tsx` | Capabilities, Export, Pattern suggestions, Confirmations |
| Batch B | `simulator/src/scenarios/SimulatorRegression.test.ts` | Golden Path, `reproduce --simulator` |
| Batch C | `ui/src/plugins/metaphor/MetaphorViewPlugin.test.tsx` | Plugin interface, view, template wiring |
| Phase 1 | `simulator/src/scenarios/*.test.ts` | Scenario structure (20 tests passing) |
| Phase 2 | `optimize/src/suggestion/*.test.ts` | Report fixture → expected suggestions (deterministic, no mocks) |
| Phase 3 | `optimize/src/abtest/*.test.ts` | Effect-size math, matrix expansion, verdict logic |
| Phase 4 | `ui/src/tests/components/SuggestionsTab.test.tsx` | Status transitions, evidence rendering |

**No new test infrastructure** — reuse vitest + optimize + Simulator. Fix I5 (UI suite memory) before adding CI matrix breadth.

---

## 9. Risk Register

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Golden Path fails relevance (G2) | Kill criteria: stop features, fix matching/ontology |
| R2 | Capabilities UI exposes unsafe actions | Confirmation modal + per-session grants + immediate revoke |
| R3 | Simulator regression engine not adopted | Concrete B3 deliverable; CI gate enforces |
| R4 | Metaphor plugin interface over-engineered | Ship one working example (C2) before generalizing |
| R5 | G4 decision delays W5 | Decided (YES); W5b validated |
| R6 | MP4 recording blocks demo/teaching | Fixed (localhost:ports) |
| **R7** | **Suggestion loop optimizes metrics, not product (reward hacking)** | Multi-metric confirmation; human gate; holdout scenarios; G2 ground truth |
| **R8** | **Ontology drift breaks existing notes** | Additive-first; versioned adapters; compatibility check; removals need sign-off |
| **R9** | **False-positive suggestions overwhelm reviewers** | Severity filtering + batch review + precision tracking (P4.5) |
| **R10** | **Metric heuristics mistaken for user truth** | Label estimates; never ship on metrics alone; G1/G2 remain authority |
| **R11** | **UI test OOM blocks CI matrix** | Fix I5 (shard/limit workers) before P4.3 |
| **R12** | **Optimizer untested (I6)** | Phase 2 ships tests with each suggester |

---

## 10. Execution Order

```
1. Decide G4 (interop-first?)            — ✅ DONE (YES)
2. Batch A (Trust & Visibility)          — ✅ DONE
3. Batch B (Demo & Distribution)         — ✅ DONE
4. Batch C (Metaphor View)               — ✅ DONE
5. Fix G6 (MP4 recordings)               — ✅ DONE
6. W5 Protocol Foundation                — ✅ COMPLETE
7. W5b Simulator Protocol Testbed        — ✅ COMPLETE
8. Extensibility Phase 1 (adapters/store/UX eval) — ✅ COMPLETE
9. Extensibility Phase 2 (Suggestion Engine)     — NEXT
10. Extensibility Phase 3 (A/B + Matrix)         — then
11. Extensibility Phase 4 (Review/CI/Guard)      — then
12. Human testing (G1, G2) — run in parallel from step 9
13. If G2 passes → W3/W4; W6 after G5
```

Human testing is **not** blocked by Phases 2-4; start G1 alongside Phase 2 so the loop has real ratings to validate against.

---

## 11. Anti-Goals (Enforced)

- No new test infrastructure
- No new component library
- No migration logic (schema is v1, validation-only)
- No protocol work before G4 (satisfied)
- No sync before G5
- No feature without verification artifact
- **No unattended suggestion merges**
- **No single-metric-driven decisions**
- **No ontology removals without human sign-off**
- **No claiming metric scores are user satisfaction**

---

## 12. Robustness & Self-Optimization (State)

| Area | Implementation | Files |
|------|----------------|-------|
| **Metrics Instrumentation** | Opt-in metrics, consent, localStorage queue, export/clear | `ui/src/hooks/useMetrics.ts`, `ui/src/components/settings/{MetricsTab,DataTab}.tsx` |
| **Storage Recovery** | Snapshots (auto 24h + manual), corruption recovery, quota monitoring + warning | `core/src/storage/recovery.ts`, `core/src/storage/recovery.test.ts` |
| **Extensibility** | UI/ontology adapters + registries + suggestion store | `core/src/ui/`, `core/src/ontology/OntologyAdapter.ts`, `core/src/suggestions/` |
| **Automated Evaluation** | 10-metric UX evaluator + `ux-evaluate` CLI + 13 scenarios | `optimize/src/uiuxEvaluator.ts`, `simulator/src/scenarios/domainScenarios.ts` |
| **Test Coverage** | DataTab, SimulatorRegression, MetaphorViewPlugin, 13 scenario structure | see §8 |

**Core 398 | Simulator 20 | Agent 17 | Build ✅ | Verify ✅ (core/sim/agent)**

---

## 13. Immediate Next Actions (Clarified)

1. **Fix I5** – make `ui` full test suite run without OOM (limit workers / `--max-old-space-size`, or shard) — prerequisite for CI matrix.
2. **P2.1–P2.6** – ship `UISuggester` + `OntologySuggester` + `SuggestionEngine` + `suggest` CLI, with tests.
3. **Target the real gap** – ensure the first emitted ontology suggestion addresses I2 (match-relevance 0.50-0.55).
4. **Start G1** – clean-profile stranger test using `--headless`/MP4 demo artifacts now available.
5. **P3.1–P3.5** – A/B runner + matrix + statistical verdict.
6. **P4.1–P4.5** – review UI, apply/rollback CLI, nightly artifact CI, regression guard.

---

*End of TODO.6.md — Batches A/B/C + W5/W5b + Extensibility Phase 1 complete. Next: fix UI test OOM → Suggestion Engine (Phase 2) → A/B Matrix (Phase 3) → Review/CI/Guard (Phase 4), running G1/G2 human testing in parallel. Evidence-driven; human approval gates every applied change.*
