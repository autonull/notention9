# Notention — Development Plan from TODO.11 Design Goals

**Source:** Derived from `TODO.11.md` review of `TODO.9.md` rev 2  
**Status:** Planning document — not yet executed  
**Alignment:** Maps design goals to existing `@notention/optimize` loop architecture

---

## Overview

This plan translates the 13 priority areas from TODO.11 into concrete, sequenced work items that fit the existing `discover → prioritize → synthesize → evaluate → adopt` loop. Each item references the relevant source section and indicates which loop phase(s) it touches.

**Existing loop phases (implemented):**
- `discover` — component/seam scanning, task derivation, golden case mining
- `prioritize` — impact weighting, failure signals, variation threshold
- `synthesize` — T1–T4 candidate generation with static gates (compile, lint, typecheck, a11y, import allowlist, seam conformance, must-win)
- `evaluate` — fast in-process baseline + candidate evaluation; Playwright browser evaluation (via `uiuxEvaluator`)
- `adopt` — versioning, feature flags, rollback, provenance ledger
- `run` — full cycle orchestration with timestamped run directories

---

## Review Verdict (self-review against codebase)

**Viable as sequenced:** P2.4–P2.6, P3.2–P3.4, P4.1, P4.2, P5.1–P5.5. Each maps to existing modules and needs wiring, not invention.

**Not viable as originally written — corrected below:**

| # | Finding | Evidence | Correction |
|---|---|---|---|
| R1 | Candidate evaluation is non-causal. Candidates never execute; results are copied from baseline | `synthesis/evaluation.ts:672-682` | New **P0.1**: candidate execution harness. Must precede all metric work |
| R2 | Must-win gate cannot fail: `passed = candidate >= baseline`, and candidates equal baseline by construction | `synthesis/evaluation.ts:687-690` | **P0.2**: strict improvement + noise band |
| R3 | **Confirmed by execution:** test data loads as empty in the built ESM runtime. `require()` is undefined, the bare `catch` hides it | `synthesis/evaluation.ts:85,134,148,162`; verified: `CORE_EXTRACTION_TEST_CASES.length === 0`, `CORE_MATCH_TEST_CASES.length === 0` in `dist/` | **P0.3**: static imports + fail-loud assertion |
| R4 | `compare` synthesizes outcomes: `Math.random()` assignments, `passed: true` for all, fake n=100 | `loop/subcommands/compare.ts:98-147` | **P0.4**: consume recorded outcomes only |
| R5 | Autonomy tiers are config-only. Adoption ignores `requiresHumanReview` | `synthesis/adoption.ts:271-296` | Moved to **P0.5** (gate integrity), not P2.5 |
| R6 | Reproducibility primitives are dead code | `loop/determinism.ts` exports never imported outside itself | **P0.6**: wire `RunContext` + `ReplaySystem` into `run.ts` |
| R7 | Multi-objective metrics mis-assigned. `correctionFrequency`, `abandonment`, `relevance` need journey data, not in-process | Metric definitions vs `evaluation.ts` | Fixed: metric ownership table |
| R8 | `evidenceGate.humanConfirmsUsability: true` cannot be satisfied while human eval is deferred | `loop.config.json:186` | **P0.7**: explicit unmet-gate policy |
| R9 | `harness.repetitions: 3` is unused; each case runs once | `loop/subcommands/evaluate.ts:61`; `runTestCases` | **P2.3.1** (rewritten) |
| R10 | Stale export: `./synthesis/fastEvaluator` points to a deleted file | `package.json:22` | **P0.8**: remove export |
| R11 | Provider abstraction already exists (`AIExtractionProvider`, `ExtractionPipeline` stages); P4.2 was over-scoped | `core/src/extraction/ExtractionPipeline.ts:185-202` | P4.2 rewritten as adapter work |
| R12 | `deriveTasks` is a hardcoded list; taxonomy arg unused | `loop/subcommands/discoverTasks.ts:15-60` | 1.3.3 scoped as small rewrite |

**Usefulness check:** every item below names a file to change and an observable outcome. Items that only restate TODO.11 prose were dropped or merged.

---

## P0 — Pipeline Integrity (prerequisite for every other phase)

Without P0, evaluation and adoption produce evidence that cannot distinguish a real improvement from a no-op. Do this first.

**P0.1 Candidate execution harness**
- Candidate must supply its own extractor/matcher/strategy; evaluator runs it.
- Replace the baseline copy at `evaluation.ts:672-682` with `candidate.createEvaluator()` or spec-driven executor.
- Acceptance: two candidates with different behavior yield different `taskResults`.
- Runnable check: inject a deliberately worse strategy → evaluation fails.

**P0.2 Gate integrity**
- `mustWinGate`: require `candidate > baseline + noiseMargin`, not `>=`.
- Reject equal scores. Reject candidates whose only wins are corpus tests.
- Acceptance: a no-op candidate is rejected by the gate.

**P0.3 Test-data load correctness (confirmed defect)**
- Confirmed: in `dist/` ESM runtime both `CORE_EXTRACTION_TEST_CASES` and `CORE_MATCH_TEST_CASES` are empty. Baseline is effectively one case.
- Replace `require('fs')` in `evaluation.ts` with top-level imports (`readFileSync`, `join`).
- Add a startup assertion that core cases are non-empty; fail the run, do not continue with zero cases.
- Acceptance: `CORE_EXTRACTION_TEST_CASES.length > 0` and `CORE_MATCH_TEST_CASES.length > 0` in the built runtime.

**P0.4 Real comparison data**
- `compare.ts` must read recorded per-variant outcomes from evaluation reports.
- Delete `generateAssignments` randomization and the `passed: true` default.
- Acceptance: comparison output for identical variants shows no significant difference.

**P0.5 Autonomy enforcement**
- `adopt()` reads candidate tier; T3/T4 require a signed approval token (`--approve <reviewer>`).
- Reject in code, not docs.
- Acceptance: T3 adopt without approval exits non-zero.

**P0.6 Wire reproducibility**
- `run.ts` creates a `RunContext` (from `loop/determinism.ts`) per run; write to run dir.
- Record each evaluation via `ReplaySystem`; read via `verifyReplay`.
- Acceptance: re-running a recorded run with identical inputs yields identical `resultHash`.

**P0.7 Unmet human gate policy**
- While 1.2 is deferred, `humanConfirmsUsability` must report `unmet`, not pass.
- Block T2 auto-adopt on unmet human gate; allow fixture-driven local experiments only.
- Acceptance: adopt reports list all unmet gates explicitly.

**P0.8 Cleanup**
- Remove `./synthesis/fastEvaluator` export from `optimize/package.json`.
- Acceptance: `pnpm build` and `pnpm test` pass; import surface matches `src/`.

**P0.9 Config drift test**
- Assert `loop.config.json` validates against `loop/schema.json`; assert every `outcomeMeasures` key is consumed by code.
- Acceptance: adding a metric to config without implementation fails CI.

---

## P1 — Validate the Foundation (Priority 1 from TODO.11 §10)

### 1.1 Independent Evaluation Datasets
**Source:** §1.1, §2.1, §2.3  
**Phase:** `evaluate`  
**Status:** Partial — core test cases exist in `optimize/src/synthesis/test-data/*.json` and corpus-derived cases; curated cases in `loop/golden-cases.json`

- [ ] **1.1.1** Freeze the curated set (`loop/golden-cases.json`) as protected; mined cases go only to run artifacts
- [ ] **1.1.2** Fail loudly if the curated file is unparseable — `loadCuratedCases` currently returns `[]` on any error (`goldenCaseMiner.ts:201-211`), which silently removes the protected baseline
- [ ] **1.1.3** Add a record of every evaluation run via `ReplaySystem` (P0.6) instead of a second recorder
- [ ] **1.1.4** Add run-vs-run comparison; note that the existing `compare` subcommand does a different job (variant comparison) and is currently unsound (P0.4)
- [ ] **1.1.5** Document dataset governance: add/modify/review rules and versioning in `loop/golden-cases.json`

### 1.2 Human Usability Validation Infrastructure (Deferred)
**Source:** §1.2, §2.1  
**Phase:** `evaluate` (new human-eval sub-phase)  
**Status:** Deferred per user decision — focus on automated eval first  
**Trigger:** Revisit after P2 (reliability) complete and automated eval demonstrates stability

- [ ] **1.2.1** Define human evaluation protocol: task scripts, scoring rubrics, recruitment criteria
- [ ] **1.2.2** Add `human-eval` subcommand to loop CLI: launches instrumented browser session, records task completion, hesitation, errors
- [ ] **1.2.3** Implement Golden Path benchmark: "new user completes Golden Path in <2 min without assistance" — automate measurement via Playwright journey + human observer mode
- [ ] **1.2.4** Implement match relevance benchmark: "≥70% matches rated relevant by 5 users" — integrate with `uiuxEvaluator.ts` journey framework
- [ ] **1.2.5** Store human evaluation results alongside automated results in run artifacts (`loop/evidence/`)

### 1.3 Second Workflow Validation (Multi-Workflow Support)
**Source:** §1.3, §8  
**Phase:** `discover`, `synthesize`, `evaluate`  
**Status:** Not started — only capture/match/extraction workflows exercised  
**Decision:** Support multiple candidate workflows abstractly; prioritize based on seam discovery results

- [ ] **1.3.1** Extend `discover.ts` to identify all workflow-relevant seams across candidate domains (commitment, search, recovery, etc.)
- [ ] **1.3.2** Add workflow classification in the discovery artifact (`discovered.json`), not in the shared `Seam` type — avoids cross-package churn in `@notention/core/ui`
- [ ] **1.3.3** Replace the hardcoded task list in `discoverTasks.ts:15-60` with taxonomy-driven derivation; the `taxonomy` argument is currently unused
- [ ] **1.3.4** Enable evaluation tasks 4–6 in `loop.config.json` behind per-task flags; `type` enum already permits `commitment`, `search`, `recovery` (`loop/schema.json:292`)
- [ ] **1.3.5** Run the full loop per workflow; record manual intervention as a count in the run artifact
- [ ] **1.3.6** Document reusable vs workflow-specific mechanisms; generalize only after two workflows share a concrete need

---

## P2 — Strengthen Reliability (Priority 2 from TODO.11 §10)

### 2.1 Multi-Objective Evaluation Model
**Source:** §2.1, §2.3  
**Phase:** `evaluate`  
**Status:** `outcomeMeasures` declared in `loop.config.json:172-180` and required by schema, but only completion/latency are produced by `evaluation.ts`

**Metric ownership (corrected — a metric must be measured where the evidence exists):**

| Metric | Fast (in-process) | Browser (journey) | Human | Notes |
|---|---|---|---|---|
| completion | ✅ | ✅ | — | task success |
| latency | ✅ | ✅ | — | wall clock per task |
| resourceConsumption | ✅ | — | — | `ResourceMonitor` exists |
| interactionSteps | — | ✅ | — | step count from journey |
| errorRate / correctionRate | — | ✅ | — | derived from `act` failures + re-edits |
| abandonment | — | ✅ | ✅ | journey abort |
| matchRelevance | — | partial | ✅ | heuristic in browser; users are authority |
| firstAttemptSuccess | — | ✅ | — | no retry in journey |
| userPreference / satisfaction | — | — | ✅ | deferred with 1.2 |

- [ ] **2.1.1** Extend `BaselineResult` with `metrics: Record<MetricName, number | null>`; `null` = not measured, never 0 (0 is a real value and would corrupt aggregates)
- [ ] **2.1.2** Implement fast-layer metrics: completion, latency, resourceConsumption (P0.1 required first)
- [ ] **2.1.3** Implement browser-layer metrics in `uiuxEvaluator`/journey results: steps, errors, corrections, abandonment
- [ ] **2.1.4** Add metric weights + minimum thresholds to `loop/loop.config.json` (schema change) — per-workflow weights allowed
- [ ] **2.1.5** Reject candidates that breach a minimum threshold even if the weighted score improves (no speed-for-quality trade)
- [ ] **2.1.6** Trade-off reporting: per-metric deltas with direction, not a single composite number
- [ ] **2.1.7** Confidence intervals only where n ≥ 5 real samples; otherwise print `insufficient sample` (P0.4 required)
- [ ] **2.1.8** Leave relevance/satisfaction explicitly `unmeasured` until 1.2 is re-enabled; gate reports must show the gap

### 2.2 Preserve Both Evaluator Layers
**Source:** §2.2  
**Phase:** `evaluate`  
**Status:** Both exist but are separate CLIs — fast in `loop/subcommands/evaluate.ts`, browser in `cli/commands/uxEvaluate.ts`; no shared report

- [ ] **2.2.1** Define a shared `EvaluationReport` envelope with `layer: 'fast' | 'browser' | 'human'` per section
- [ ] **2.2.2** Add `loop evaluate --layer=fast|browser|both` delegating to the existing `uxEvaluate` handler — do not reimplement
- [ ] **2.2.3** Fast layer must pass before browser layer runs (cheap fail-fast in CI)
- [ ] **2.2.4** Cross-validate: every fast extraction case that has a UI surface gets one equivalent journey assertion
- [ ] **2.2.5** Document layer boundaries in `optimize/README.md` (extraction/matching logic vs rendering/keyboard/navigation)

### 2.3 Experiment Reliability
**Source:** §2.3  
**Phase:** `evaluate`, `run`  
**Status:** Config declares `repetitions: 3`, `aggregation: median+spread`, `seededData: true`; none are consumed — each case runs once

- [ ] **2.3.1** Honor `harness.repetitions` and `aggregation` in `runTestCases` (currently single run, `evaluation.ts:569-581`)
- [ ] **2.3.2** Implement seeded data for browser runs; persist the seed in the run artifact
- [ ] **2.3.3** Add environment fingerprint (Node, OS, model pin hash, git commit) to each report — reuse `RunContext` from P0.6
- [ ] **2.3.4** Regression detection: compare current run with an explicit baseline run id; fail when a metric drops beyond configurable margin
- [ ] **2.3.5** Separate automated and human sections in reports (see 2.1.8 for the deferred human section)
- [ ] **2.3.6** Acceptance: same inputs + same seed → identical report hash; a known regression fixture is detected

### 2.4 Security & Accessibility Gates for Generated Code
**Source:** §3.1, §3.2  
**Phase:** `synthesize` (gates)  
**Status:** Existing gates: `typeScriptGate`, `eslintGate`, `a11yGate`, `keyboardGate`, `importAllowlistGate`, `noAmbientCapsGate`, `seamConformanceGate`, `specValidationGate`, `mustWinGate`. Coverage is broader than TODO.11 implies; the gap is verification and enforcement, not construction.

- [ ] **2.4.1** Add gate coverage tests: each gate has a passing fixture and a failing fixture (currently unverified against generated code)
- [ ] **2.4.2** Verify `a11yGate` + `keyboardGate` actually execute against a rendered candidate, not only static source — otherwise they cannot detect focus/contrast failures
- [ ] **2.4.3** Add runtime prop validation requirement to `specValidationGate` (Zod schema must accompany generated components)
- [ ] **2.4.4** Add explicit check that `noAmbientCapsGate` rejects `fs`, `fetch`, `eval`, `localStorage`, `indexedDB` in generated source (config lists them; assert behavior)
- [ ] **2.4.5** Confirm feature-flag default-off at adoption (config `defaultOff: true`); add test
- [ ] **2.4.6** Add one-step rollback verification test: adopt → enable → rollback → flag disabled and artifact archived

### 2.5 Progressive Autonomy Enforcement
**Source:** §3.2  
**Phase:** `synthesize`, `adopt`  
**Status:** Tiers T1–T4 declared in `loop.config.json:57-91`; enforcement is P0.5

- [ ] **2.5.1** Map config tiers to S1–S4 vocabulary in docs; keep T-prefix in code
- [ ] **2.5.2** Add autonomy level to candidate artifacts (`StrategySpec.ts`) and require it in `adopt`
- [ ] **2.5.3** Verify seam-boundary conformance is what prevents T3/T4 from redefining core behavior; add a negative test
- [ ] **2.5.4** Document escalation evidence required per tier (T1→T2: gate pass + no regression; T2→T3: human review + multi-workflow evidence)

### 2.6 Provenance & Audit Records
**Source:** §3.3  
**Phase:** `adopt`, `synthesize`  
**Status:** Partial — `provenance` fields in `AdoptionConfig`, `StrategyArtifact`; ledger in `adoption.ts`

- [ ] **2.6.1** Ensure all provenance fields captured at generation time: model version, prompt hash, spec version, ontology version
- [ ] **2.6.2** Link evaluation report to adoption record (already in `adoption.ts:adopt`)
- [ ] **2.6.3** Add deployment/rollback history to ledger (partially done)
- [ ] **2.6.4** Implement `pnpm loop audit <strategyId>` CLI to show full provenance chain
- [ ] **2.6.5** Add integrity verification: tamper-evident ledger (hash chaining)

---

## P3 — Expand Representational Capability (Priority 3 from TODO.11 §10)

### 3.1 Non-Market Scenario Testing
**Source:** §4.1, §8  
**Phase:** `discover`, `evaluate`  
**Status:** Not started — ontology biased toward economic exchanges

- [ ] **3.1.1** Define representative non-market scenarios (family, care, community, volunteering, education, resource sharing)
- [ ] **3.1.2** Add scenario test cases to corpus ingestion (`optimize/src/corpus/ingest.ts`)
- [ ] **3.1.3** Run ontology coverage experiment: measure extraction accuracy, missing concepts, relationship gaps
- [ ] **3.1.4** Document ontology gaps per scenario dimension (social form, topology, exchange, stakes, temporality, heterogeneity per §8 table)

### 3.2 Commitment Lifecycle Modeling
**Source:** §4.2  
**Phase:** `discover`, `synthesize` (core domain logic)  
**Status:** `task-4` in config depends on `L17a`; `noteIntent.test.ts` exists

- [ ] **3.2.1** Define explicit lifecycle states: `open → matched → committed → done` + `lapsed`, `cancelled`
- [ ] **3.2.2** Add lifecycle transitions to core domain types (`core/src/types/domain.ts`)
- [ ] **3.2.3** Implement deterministic validation of transitions (no invalid state jumps)
- [ ] **3.2.4** Create commitment seam(s) for UI strategy synthesis
- [ ] **3.2.5** Add commitment workflow tasks to evaluation suite

### 3.3 Flat Attributes vs Structured Facets Benchmark
**Source:** §4.3  
**Phase:** `discover`, `evaluate`  
**Status:** Not started

- [ ] **3.3.1** Implement both representation approaches in parallel (feature flag)
- [ ] **3.3.2** Benchmark extraction accuracy for each approach
- [ ] **3.3.3** Measure query/matching complexity (code paths, performance)
- [ ] **3.3.4** Test incomplete information handling (partial facets vs partial flat attrs)
- [ ] **3.3.5** Test schema evolution/backward compatibility
- [ ] **3.3.6** Decision gate: adopt additional complexity only if practical value demonstrated

### 3.4 Inference with Confidence & Provenance
**Source:** §4.4  
**Phase:** `synthesis` (prompt strategy), `evaluate`  
**Status:** PropertyExtractor exists; inference/confidence not tracked

- [ ] **3.4.1** Distinguish inferred vs confirmed values in property schema (add `source: 'inferred' | 'confirmed'`, `confidence: number`)
- [ ] **3.4.2** Track provenance: which prompt/model generated each inferred property
- [ ] **3.4.3** Implement user confirmation flow for consequential inferences
- [ ] **3.4.4** Add correction mechanism: user overrides propagate to learning loop
- [ ] **3.4.5** Hard rule: never silently convert uncertain inference → binding commitment

### 3.5 Joint Ontology/UI/Prompt Optimization
**Source:** §5.1–§5.4  
**Phase:** `discover`, `synthesize`, `evaluate`  
**Status:** Currently optimized independently

- [ ] **3.5.1** Define experiment matrix varying all three dimensions (ontology variant × UI strategy × prompt strategy)
- [ ] **3.5.2** Implement prompt strategy portfolio in `optimize/src/prompts/`:
  - [ ] Zero-shot extraction
  - [ ] Few-shot extraction
  - [ ] Schema-constrained extraction
  - [ ] Clarification prompts
  - [ ] Repair prompts
  - [ ] Multi-stage extraction
- [ ] **3.5.3** Add deterministic validation after model output (already partially in `validation/`)
- [ ] **3.5.4** Evaluation engine must identify cross-dimension interactions (e.g., revised ontology → different extraction questions)

### 3.6 Multiple Prompt Strategies
**Source:** §5.4  
**Phase:** `synthesize`  
**Status:** Single extraction prompt in `core/src/prompts/`

- [ ] **3.6.1** Refactor prompt registry to support strategy selection by task/confidence
- [ ] **3.6.2** Implement strategy selector: choose prompt strategy based on task type, input complexity, measured performance
- [ ] **3.6.3** Add prompt performance tracking to evaluation reports

---

## P4 — Improve Adaptation (Priority 4 from TODO.11 §10)

### 4.1 UI Strategy Profiles
**Source:** §6  
**Phase:** `discover`, `synthesize`, `evaluate`  
**Status:** `ProfileRegistry` exists in `core/src/ui/ProfileRegistry.ts`; strategies in `ui/src/strategies/`  
**Decision:** Hybrid — global default profile + per-seam overrides

- [ ] **4.1.1** Define profile configurations per interface boundary (capture, match, display, etc.)
- [ ] **4.1.2** Implement profile configs: `beginner`, `power`, `mobile`, `hiring`, `care` (per §6 table)
- [ ] **4.1.3** Implement global default profile (user-level) with per-seam override support
- [ ] **4.1.4** Add user-level strategy overrides persisted to user settings
- [ ] **4.1.5** Implement contextual strategy selection (time of day, device, task type, user history)
- [ ] **4.1.6** Record selection rationale (why this profile for this user/context)
- [ ] **4.1.7** Measure performance separately by profile in evaluation
- [ ] **4.1.8** Validate profiles as hypotheses with real users (link to 1.2 human eval, when re-enabled)

### 4.2 Model Independence & Offline Operation
**Source:** §7  
**Phase:** `synthesize` (model calls), `evaluate`  
**Status:** Most primitives exist; the gap is adapters and wiring, not architecture

Existing pieces to reuse:
- `AIExtractionProvider` + `ExtractionPipeline` stage composition — `core/src/extraction/ExtractionPipeline.ts:185-270`
- `ModelPinner`, `OutputCache`, `ReplaySystem`, `RunContext` — `optimize/src/loop/determinism.ts` (currently unused outside the module)
- `offline.localModelOnly` and `determinism.pinnedModel` config flags
- `DEFAULT_MODEL_PINS` already names a local model (Llama-3.2-3B) and a remote fallback

- [ ] **4.2.1** Implement a local `AIExtractionProvider` adapter (no new interface needed)
- [ ] **4.2.2** Implement a remote `AIExtractionProvider` adapter with explicit fallback ordering in config
- [ ] **4.2.3** Add capability probe: provider advertises context size and structured-output support; selection uses it
- [ ] **4.2.4** Validate every provider output through the existing validation pipeline before acceptance
- [ ] **4.2.5** Wire `OutputCache` so deterministic replay is the default in evaluation runs
- [ ] **4.2.6** Add a CI job that runs the full loop with network disabled and a stubbed local provider
- [ ] **4.2.7** Record `provider` + `modelId` + pin hash per generated result (extends existing provenance fields)
- [ ] **4.2.8** Define acceptable degraded behavior offline: deterministic extraction stages always work; AI stage is optional

---

## P5 — Expand Autonomous Discovery (Priority 5 from TODO.11 §10)

### 5.1 Discovery Rate Measurement
**Source:** §8  
**Phase:** `discover`, `run`  
**Status:** Discovery runs but no rate tracking

- [ ] **5.1.1** Add discovery metrics to run artifacts:
  - [ ] New problem classes discovered
  - [ ] New ontology gaps identified
  - [ ] New interaction patterns required
  - [ ] Previously unsupported workflows enabled
  - [ ] Reusable capabilities discovered
  - [ ] Manual intervention needed per new workflow
- [ ] **5.1.2** Track discovery rate over successive loop runs
- [ ] **5.1.3** Alert when discovery rate plateaus (indicates coverage saturation)

### 5.2 Automated Missing Capability Identification
**Source:** §8, §10 Priority 5  
**Phase:** `discover`  
**Status:** Duplicate analysis, dead component detection exist

- [ ] **5.2.1** Extend `duplicateAnalyzer` to detect missing seam coverage (tasks with no seam)
- [ ] **5.2.2** Add ontology gap detection: tasks requiring properties not in ontology
- [ ] **5.2.3** Add interaction pattern gap detection: tasks requiring UI patterns not in strategy registry

### 5.3 S2 Strategy Synthesis Expansion
**Source:** §3.2 (S2 = generate new implementations of existing patterns)  
**Phase:** `synthesize`  
**Status:** T2 enabled in config; template generator exists

- [ ] **5.3.1** Expand template library for common interaction patterns
- [ ] **5.3.2** Add pattern variation generator (systematic parameter space exploration)
- [ ] **5.3.3** Integrate with prioritization: focus synthesis on high-impact seams

### 5.4 Human Review Process for S3
**Source:** §3.2 (S3 = propose new interaction interfaces)  
**Phase:** `synthesize`, `adopt`  
**Status:** `requiresHumanReview: true` for T3 but no review workflow

- [ ] **5.4.1** Implement T3 candidate review UI: show diff, evaluation report, risk assessment
- [ ] **5.4.2** Add approval workflow: human reviewer signs off with reason
- [ ] **5.4.3** Record approval in provenance ledger

### 5.5 Automated Prioritization of Discovered Opportunities
**Source:** §10 Priority 5  
**Phase:** `prioritize`  
**Status:** `prioritize.ts` exists with impact weights

- [ ] **5.5.1** Incorporate discovery metrics into prioritization (gap severity, user impact estimate)
- [ ] **5.5.2** Add cost-benefit estimation for candidate synthesis (token cost vs expected improvement)
- [ ] **5.5.3** Implement opportunity backlog with scoring

---

## Cross-Cutting: Adoption & Rollout Hardening

**Source:** §9  
**Phase:** `adopt`, `run`  
**Status:** Core adoption mechanism exists; staging/rollout incomplete

- [ ] **A.1** Implement staged adoption pipeline:
  1. Generate candidate
  2. Static/security checks (gates)
  3. Deterministic evaluation (fast)
  4. Browser integration tests (Playwright)
  5. Human approval (where required by autonomy level)
  6. Deploy to feature flag (limited audience)
  7. Measure actual outcomes (telemetry/opt-in)
  8. Expand adoption or rollback
- [ ] **A.2** Add automatic rollback on defined regression thresholds (configurable per metric)
- [ ] **A.3** Separate "passes automated tests" from "demonstrates real-world value" — both required for significant changes
- [ ] **A.4** Complete decision history: every adopt/rollback/enable/disable with actor, reason, evidence

---

## Engineering Principles Checklist (TODO.11 §11)

Each implementation PR should self-certify against these:

- [ ] **Evidence before adoption** — Candidate has independent evaluation report
- [ ] **Human outcomes over internal metrics** — Success defined by user task completion, not pipeline throughput
- [ ] **Deterministic boundaries** — AI proposes; app logic validates state changes
- [ ] **Reversible experimentation** — Every change traceable and rollback-testable
- [ ] **Progressive autonomy** — Autonomy matches demonstrated reliability
- [ ] **Representational breadth** — Ontology tested beyond economic exchanges
- [ ] **Independent evaluation** — Generator ≠ evaluator
- [ ] **Modularity without premature abstraction** — Generalize after ≥2 workflows
- [ ] **Provider independence** — Core works with local model only
- [ ] **Human validation** — Automated success ≠ usability proof

---

## Strategic Questions to Resolve (TODO.11 §12)

**Before P1.2 (Human Eval):**
1. ~~What minimum human validation is required before auto-adopt?~~ **Interim answer (P0.7):** none available, therefore T2 auto-adopt is blocked while human eval is deferred. Only fixture-driven local runs may auto-adopt.
2. ~~Which changes always require human approval?~~ **Answer:** T3/T4 always; T2 until human eval exists; any ontology or security-seam change.

**Before P2.1 (Multi-Objective):**
3. How should evaluation metrics be weighted when they conflict? (Propose defaults in config; require an explicit per-workflow override rather than a global number)

**Before P3.1/3.2 (Ontology):**
4. What is the minimum ontology for non-market relationships? (Run 3.1.3 experiment first; no abstraction before data)

**Before P3.4 (Inference):**
5. How should uncertain/inferred information be presented to users? (UI design needed — profile-dependent)

**Before P4.1 (Profiles):**
6. How will system detect evaluation scenarios no longer represent real needs? (Monitor discovery rate + human feedback drift)
7. What evidence generalizes a capability across workflows? (≥2 workflows with same seam pattern, per §1.3)

**Before P4.1 (Profiles):**
8. How should profile selection balance user preference vs contextual optimization? (Default: user preference wins; contextual override opt-in)

**Before P4.2 (Offline):**
9. What is acceptable degradation offline? (Core capture/match must work; advanced extraction may degrade)

**Before P5 (Autonomous Discovery):**
10. What evidence demonstrates system becoming more useful over cycles? (Track human outcome metrics across runs, not candidate count)

---

## Suggested Success Metrics (TODO.11 §13)

**Per improvement cycle, verify:**
- [ ] Real problem/opportunity identified (discovery artifact)
- [ ] Candidate generated (synthesis artifact)
- [ ] Independently evaluated (evaluation report with baseline comparison)
- [ ] Regressions & trade-offs measured (comparison report)
- [ ] Change adopted safely (adoption record + feature flag)
- [ ] Human outcomes improved (human eval or production metrics)
- [ ] Result reproducible & reversible (run artifacts + rollback test)

**North Star:** Successive versions help people accomplish real intentions more reliably and with less effort.

**Current honest status:** the "human outcomes improved" criterion is **unmet** and will remain unmet while 1.2 is deferred. Do not report it as satisfied. P0.7 makes this visible in every adoption record.

---

## Sequencing & Dependencies

```
P0 (pipeline integrity) ──┬──→ P1.1 (independent datasets)
                          ├──→ P1.3 (multi-workflow discovery)
                          └──→ P2.1 (multi-objective eval)
                                   │
P1.2 (human eval) ─────────── DEFERRED until P2.1–2.3 stable
                                   │
        ├─→ P2.2 (dual evaluator layers)
        ├─→ P2.3 (experiment reliability)
        ├─→ P2.4 (gate verification)
        ├─→ P2.5 (autonomy enforcement)
        └─→ P2.6 (provenance/audit)
                │
                ├─→ P3.1 (non-market scenarios)
                ├─→ P3.2 (lifecycle modeling)
                ├─→ P3.3 (flat vs facets)
                ├─→ P3.4 (inference confidence)
                ├─→ P3.5 (joint optimization)
                └─→ P3.6 (prompt portfolio)
                        │
                        ├─→ P4.1 (UI profiles)
                        └─→ P4.2 (provider adapters + offline)
                                │
                                └─→ P5.1–5.5 (discovery expansion)
                                        │
                                        └─→ A.1–A.4 (staged rollout)
```

**Critical path:** P0.1 → P0.2 → P2.1. Nothing earlier produces trustworthy evidence.

**Parallelizable:** P1.1, P1.3, P2.4, P2.6, P3.2 (core domain), P4.2 (adapters).

---

## Open Design Choices (Require Decision)

1. **Second workflow selection** → **Resolved**: Support all candidates abstractly; prioritize by seam discovery results (see 1.3)
2. **Human evaluation recruitment** → **Resolved**: Deferred until automated eval solid (see 1.2)
3. **Profile granularity** → **Resolved**: Hybrid — global default + per-seam overrides (see 4.1)
4. **Local model requirement** — Which local models are target? (Impacts P4.2 implementation effort)
5. **Staged adoption audience** — Internal only? Beta users? Percentage rollout? (Impacts A.1)
6. **Regression thresholds** — Absolute vs. relative? Per-metric or composite? (Impacts A.2)

---

## File Map: Where Changes Land

| Area | Primary Files |
|------|---------------|
| Loop CLI & orchestration | `optimize/src/loop/` |
| Discovery | `optimize/src/discovery/` |
| Synthesis & gates | `optimize/src/synthesis/` |
| Evaluation (fast) | `optimize/src/synthesis/evaluation.ts` |
| Evaluation (browser) | `optimize/src/uiuxEvaluator.ts`, `optimize/src/stepExecutors/` |
| Adoption & provenance | `optimize/src/synthesis/adoption.ts` |
| Corpus & golden cases | `optimize/src/corpus/`, `optimize/src/discovery/testgen/` |
| Config | `loop/loop.config.json`, `loop/schema.json` |
| Core domain/ontology | `core/src/types/domain.ts`, `core/src/validation/` |
| UI strategies | `ui/src/strategies/`, `core/src/ui/` |
| Prompts | `core/src/prompts/`, `optimize/src/prompts/` |