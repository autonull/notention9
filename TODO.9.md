# Notention Development Plan (TODO.9.md) — **revision 2**

Supersedes TODO.8.md and revision 1 of this document. The relaxed product goal stands (UI/UX ergonomics for reality management and intent satisfaction). Revision 2 makes explicit what revision 1 implied: **the system optimizes for what users can accomplish, and it must be able to evolve its prompts and UI using compact, local, offline models.**

> **Central principle.** Notention should be able to improve its own behaviour without requiring a large remote model, while its definition of improvement remains grounded in what people can actually accomplish.

---

## 0. What changed in revision 2, and what was already covered

| Recommendation | Where it lives | Was it already planned? |
|----------------|----------------|-------------------------|
| 1. Primary objective = user success | §1 | Partly (metrics existed; framing and journey model did not) |
| 2. Prompts/UI evolution first-class | §6 | Mostly (synthesis existed; artifact versioning/rollback not explicit) |
| 3. Compact, offline, browser-local models | §2, §14 (M-items) | **No** — new architectural requirement |
| 4. Evaluation-driven loop | §9, §14 (E-items) | Partly (harness existed; workflow-level, determinism, offline, independence not explicit) |
| 5. Principled prioritisation | §5, §14 (O-items) | **No** — new |
| 6. User interaction model | §10, §14 (I-items) | Partly (capture/elicitation existed; explainability, recovery, clarification value not) |
| 7. Capability showcase generation | §11, §14 (S-items) | **No** — new product capability |
| 8. Prove with one end-to-end workflow | §19 (Phases), §20 (Completion), §14 (X-items) | Partly (cycles existed; explicit proof + constrained-operation demo did not) |
| 9. Architectural boundaries | §3, §14 (B-items) | **No** — new |

**Preserved from revision 1:** the metaprogramming layer and the AST scanner decision (§7), synthesis tiers and guards (§8), the closed-loop hazard (§4.1), the three design spaces (§6.5), UI as portfolio (§6.6), coverage-as-sampling (§12), the taxonomy (§13), the complete backlog and parked work (§14–§18).

**Verdict carried forward:** a plan that can generate prompts and UI variants is not a success. Success is a measured improvement in a real workflow, reproducible, inspectable, and reversible.

---

## 1. Primary objective: user success

### 1.1 North star

> A user expresses an intent and reaches the outcome they intended, with as little unnecessary effort as possible.

Everything else — extraction accuracy, match scores, component tests, synthesis — is instrumental. **A more sophisticated improvement system is not a better product.** Changes must demonstrate a meaningful improvement in actual workflows.

### 1.2 Model the complete journey

Every evaluation must consider the whole path, not one step:

```
express intent → interpret → (clarify?) → match → decide → act → outcome
```

Metrics that stop at "interpretation succeeded" or "a match was returned" are insufficient (E1).

### 1.3 Friction from the user's perspective

Discover unnecessary steps, confusing questions, failed matches, repeated corrections, and dead ends **by observing flows**, not by inferring usability from code structure, component count, or UI complexity (O3). Complexity signals are hypotheses; observed friction is evidence.

### 1.4 Success criteria

| Criterion | Definition |
|-----------|-----------|
| Task completion | intent reached its outcome predicate |
| Outcome relevance | the result actually satisfied the intent (human-rated; ≥70%) |
| Correction frequency | revisions per completion |
| Unnecessary clarification | questions asked that did not change the outcome |
| Abandonment | flows started and not completed |
| Latency | wall-clock per stage and end-to-end |
| Resource consumption | model size, memory, inference time, tokens where applicable |

Time-to-intent (TTI) and steps remain useful *secondary* signals; completion and relevance dominate.

### 1.5 Automation subordinate to user value

The loop may only claim an improvement when §9's evidence gate passes **and** a human confirms the workflow is at least as usable (X4). No metric threshold alone ships a change.

---

## 2. Compact, offline, browser-local models

New architectural requirement. Current code already contains the substrate: `ui/src/services/ai/` has `LocalProvider`, `RemoteProvider`, and `WebLLMProvider`.

### 2.1 Model independence is architectural, not a preference

- Core behaviour must not depend on one provider, a remote API, or a large model being available.
- All model access goes through one inference interface with **capability probing** and an explicit **fallback chain**: `local-model → remote → deterministic rules`. The app must remain usable when any link is missing.
- No prompt or strategy may assume a specific model family; prompts declare requirements (context length, structured output support) and the router selects.

### 2.2 Compact local models

Design for constrained hardware, including in-browser execution. The evaluation suite must be runnable against a small local model (X6), not only a frontier model.

### 2.3 Deterministic logic outside the model

Predictable behaviour uses explicit schemas, validation, rules, state transitions, and constraints (M3). Models are used for **interpretation and generation** — extracting meaning, proposing prompts, generating candidate strategies, interpreting intent — never for invariants that must hold.

### 2.4 Design for imperfect inference

Malformed output, low confidence, missing context, timeouts, and unsupported operations must never corrupt state or block the user (M4). Every model call has: schema validation, a repair attempt, a deterministic fallback, and a user-visible degradation path.

### 2.5 Meaningful offline operation

Core workflows, the evaluation suite, and *approved* prompt/UI changes must work without network access, subject to local capability (M5). "Offline" means tested offline, not merely able to start.

### 2.6 Measure resource constraints

Latency, memory, model size, and inference cost are first-class evaluation outputs, not footnotes (M6). A quality gain that costs 10× latency is not automatically a gain.

---

## 3. Architectural boundaries

### 3.1 Runtime vs improvement machinery

Normal product use must not require an optimization process to be running (B1). The loop is an offline/developer-time activity that writes versioned artifacts; the runtime reads artifacts.

### 3.2 Separate data, strategy, and execution

User information and domain state are distinct from the prompts and UI strategies that operate on them (B2). Strategies are parameters plus implementations; user data never lives inside a strategy artifact.

### 3.3 Decisions must be inspectable

For every adopted change, preserve: which strategy ran, what changed, the evidence, the comparison, and why it was accepted or rejected (B3, B5). If it cannot be explained, it should not be adopted.

### 3.4 Privacy is explicit

Default: **no user interaction leaves the device.** Define what may be retained for evaluation, how sensitive fields are excluded or redacted, and that corpus ingestion uses public data only (B4). Opt-in metrics remain opt-in (D10 must be fixed first — they currently do not persist).

### 3.5 Reproducibility

Record model, prompt, strategy, ontology, and evaluator versions with each result (B5). Same inputs + same versions ⇒ comparable results.

### 3.6 Avoid premature generalisation

Introduce reusable abstractions when the **first** working workflow demonstrates what needs generalising (B6). One validated loop beats five speculative frameworks.

---

## 4. The loop

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ 1 DISCOVER   static analysis + ontology + observed friction      │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 2 PRIORITISE user impact, failure signals, uncertainty (§5)      │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 3 SYNTHESIZE T1 params · T2 LLM strategy · T3 new seam · T4 spec │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 4 EVALUATE   complete workflows, local models, deterministic     │
  │              checks + outcome measures (§9)                      │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 5 ADOPT      evidence gate + human confirmation; versioned;      │
  │              reversible; inspectable (§3, §9.7)                  │
  └──────────────────────────────────────────────────────────────────┘
```

One cycle: `pnpm loop` → `loop/runs/<id>/` bundle (`discovered.json`, `candidates/`, `results.json`, `decision.md`).

### 4.1 Two generative axes — and the closed-loop hazard

| Axis | Generate | Ground truth |
|------|----------|--------------|
| **Solutions** | prompts, strategies, ontology facets, UI | harness + human |
| **Problems** | tasks, narratives, scenario skins | **real corpora + humans** |

If the same model invents a task and the component that solves it, the loop improves its own fiction. Mitigation, strongest first: problems from real corpora; human-authored tasks for anything gating adoption; the solution generator never sees the evaluation tasks; generated narratives are exploration-only until corpus- or human-validated (V3).

---

## 5. What to improve, and how to decide

### 5.1 Prioritise by user impact

Score candidate problems by **frequency × severity × recoverability × reach** (workflows/users affected) (O4). A rare crash outranks a common cosmetic delay; an unrecoverable dead end outranks a recoverable one.

### 5.2 Observed failures are the learning signal

Capture failed matches, repeated corrections, abandoned tasks, and opt-in user feedback (O5). These are the input to prioritisation, not code smell.

### 5.3 Distinguish failure from legitimate variation

A user rejecting one match does not prove the matcher is defective (O6). Require repeated patterns or corroborating signals before treating variation as failure.

### 5.4 Account for uncertainty

The system must be able to say "not enough evidence" and propose nothing (O7). An abstention is a correct outcome, not a failure.

### 5.5 Smallest change that solves a demonstrated problem

No new prompt, UI element, or strategy without a clear demonstrated benefit (O8). Complexity is a cost paid by every future change.

### 5.6 Safety and control boundaries

| Category | Examples | Autonomy |
|----------|----------|----------|
| Auto-testable, auto-promotable | prompt wording, suggestion ordering, extraction hints | after evidence gate |
| Human approval required | new strategy code, layout changes, clarification sequences | always |
| Never autonomous | data deletion, capability grants, network egress, ontology removals | human sign-off |

---

## 6. Evolvable artifacts: prompts, UI, ontology

### 6.1 Artifact model

Prompts and UI strategies are **versioned artifacts with interfaces and reproducible configurations**, not behaviour embedded in unchangeable code (B-items, L-items):

```ts
interface StrategyArtifact {
  id: string;
  kind: 'prompt' | 'ui' | 'ontology-facet';
  version: string;          // semver
  interface: string;        // seam it satisfies
  config: Record<string, unknown>;
  requires: Capability[];   // e.g. 'structured-output', 'context>=4k'
  provenance: Provenance;   // author/model/prompt-hash/diff/date
}
```

### 6.2 Proposal is separate from acceptance

Generation never mutates the running configuration. Candidates live under `loop/candidates/` until the evidence gate (§9.7) and human confirmation pass.

### 6.3 Known-good preservation

Every accepted version is retained; comparison and rollback are one command. An unsuccessful experiment cannot silently degrade the product (L13, X5).

### 6.4 Reuse the loop across workflows

The same discover→prioritise→synthesise→evaluate→adopt machinery applies to capture, elicitation, matching, explanation, and layouts. No per-feature optimisation mechanism (B6).

### 6.5 The three design spaces (retained)

Ontology structure (what can be expressed) × UI configuration (how it is elicited) × prompt strategy (how language becomes structure). They are coupled: changing one moves the optimum of the others.

| Space | Candidates |
|-------|-----------|
| Ontology | flat keys · **facets + status** · typed graph · core + domain schemas · infer-at-read |
| UI/seams | `capture` · `detail-elicitation` · `workspace-layout` · `match-display` · `ontology-browse` · `intent-surface` · `explain` |
| Prompts | zero-shot · few-shot · **schema-constrained** · repair · tool-use · probing |

**Working hypothesis (test, don't assume):** facets-with-status + infer-when-possible beats flat keys on both expressiveness and elicitation cost.

### 6.6 UI as a portfolio (retained)

Genome = one strategy per seam + params. Output = **profiles** + **contextual policy** + **per-user overrides** (L23). "Try them all" resolves to a portfolio, not one compromise.

---

## 7. Metaprogramming layer (derive, don't author)

Reuse `optimize/src/discovery/`; add only glue.

| Derive | From | With | Replaces |
|--------|------|------|----------|
| **Seams** | components sharing prop-shape + role | `ComponentScanner` + `TsAstScanner` | hand-authored seam list |
| **Candidate strategies** | components already matching a seam | same | hand-wrapping |
| **Dead/duplicate strategies** | unused; near-identical props/JSX | `ComponentScanner` | manual audits |
| **Tasks** | ontology × type lattice × observed friction | `TypeSchemaBuilder` + `OntologyAdapter` | hand-written specs |
| **Prompt schemas** | operators, values, constraints | `OntologyAdapter.getConstraints` | hand-written JSON schema |
| **Golden cases** | existing test assertions | `GoldenCaseMiner` | a separate golden file |
| **Journeys/steps/selectors** | goals + state paths | `JourneyGenerator`, `stepBuilder`, `selectorInference` | manual authoring |
| **Narrative skins** | real corpora | ingestion + LLM flavour | inventing domains |

```ts
abstract class ComponentStrategy<P> implements Strategy {
  abstract readonly id: StrategyId;
  abstract readonly seam: Seam;
  constructor(protected props: P) {}
  abstract render(): React.ReactElement;
  get params(): ParamSpec { return deriveParams<P>(); }
}
registerDiscoveredStrategies(seam, dir);   // glob → inspect → wrap → register
```

### 7.1 Decision applied: AST only, no regex

Regex could not see multi-line destructured props, inherited interfaces, or `React.FC<T>` arguments, and counted `useFake` in strings/comments/imports as hooks. `ComponentScanner` is now `ts-morph`-based and shares a project factory with `TsAstScanner`.

**Bug found and fixed:** `TsAstScanner` required `<root>/tsconfig.json`, which does not exist here, so construction threw and the type-schema pipeline was inert.

**Verified:** 6 tests (real fixtures), live scan of `ui/src` = 194 components (139 with props), zero hook false-positives, ~4s.

**Remaining hardcoding:** `analyzeRoutes`/`analyzeDialogs`/`analyzeActions` (D6) — derived from JSX next.

---

## 8. Synthesis: inventing UI

| Tier | Action | Gate | Mode |
|------|--------|------|------|
| T1 | Compose/parametrise existing strategies | normal evaluation | automatic |
| T2 | LLM writes a strategy behind an existing seam | compile + lint + typecheck + a11y + import allowlist + seam conformance + must win | automatic adopt after evidence gate |
| T3 | New seam + strategy | T2 + human design review | human |
| T4 | Spec/request for a developer or delegated agent | implemented, re-enters at T2/T3 | human |

```ts
interface StrategySpec {
  seam: Seam;
  intent: string;
  must: string[];        // a11y, keyboard, offline
  may: string[];         // react, tokens, ui/*
  mustNot: string[];     // core/security|storage|network, eval, remote URLs
  accepts: JSONSchema;
  emits: EventSchema;
  examples: string[];
}
```

**Hard guards:** import allowlist; no ambient capability (`fetch`, `eval`, URL import, `localStorage` writes, filesystem); exact seam conformance; a11y + keyboard assertions; feature-flagged and reversible; deterministic synthesis (pinned model, temperature 0, cached by `(prompt, spec, model, version)`); untrusted-content fencing (corpus/ontology text is data, never instructions); provenance + licence check; T3/T4 always human.

**T4 — developer path.** Emit `loop/requests/<id>.md` with need, evidence, proposed seam, constraints, acceptance. A human or delegated agent implements it and re-enters the loop.

**Honest limit:** LLM synthesis invents implementations and varies patterns within a spec; it does not invent new interaction theory. Novel paradigms remain T3/T4.

---

## 9. Evaluation-driven improvement

### 9.1 Task harness

Playwright, per-config browser context, seeded data, N≥10 reps, median + spread. Tasks: (1) capture need ≥3 properties <20s; (2) capture offer → ≥1 match without re-edit; (3) paragraph → valid structured note; (4) open note → commitment with status+deadline; (5) find note by intent; (6) add missing detail after failed match.

### 9.2 Evaluate complete workflows, not isolated outputs

A prompt that produces better structured data is not better if the interaction becomes harder (E1). Score the journey (§1.2), including corrections and abandonment.

### 9.3 Deterministic checks wherever possible

Validate schemas, invariants, state transitions, required behaviours, and offline behaviour independently of model judgement (E2). Deterministic checks gate; model judgements inform.

### 9.4 Outcome-based evaluation when exact answers don't exist

Combine observable task results with explicit criteria for relevance, usefulness, and interaction quality. LLM judges screen and rank; humans confirm (§1.4, §9.7).

### 9.5 Offline evaluation

The suite must run with local models and local data, no network (E3, M5). If it cannot run offline, it cannot support the central principle.

### 9.6 Separation of evaluation from optimisation

A candidate must never be judged by an evaluator it produced or configured (E4). Evaluators, tasks, and golden cases are fixed inputs to a cycle.

### 9.7 Evidence gate and baseline retention

Promote only when: deterministic checks pass; the target outcome improves beyond run-to-run noise; no golden case regresses; resource cost is acceptable; a human confirms usability. Otherwise **retain the baseline** and record why (E5).

**Known untrustworthy numbers:** `uxEvaluator` derives metrics from config; `uiuxEvaluator.ts:426` scores >1; `uxEvaluate.ts:37` ignores `--scenarios`/`--threshold-*`. Fix (D1, D2) or bypass in favour of the harness.

---

## 10. User interaction model

### 10.1 Natural-language intent

Users describe what they need without first learning Notention's structures (P1). Structured entry remains available, not mandatory.

### 10.2 Explainable semantic matching

Results must say why they fit, where they differ, and what is missing (I1). An unexplained match is a trust failure even when correct.

### 10.3 Clarification only when it changes the outcome

Ask only when the answer could materially change the result or prevent a meaningful error (L16). Measure "questions that changed the outcome" vs "questions asked".

### 10.4 Progressive clarification

Gather the minimum to proceed; request more only when useful (P2). Measure both TTI and abandonment — aggressive elicitation can reduce time while increasing drop-off.

### 10.5 Correction and recovery

Users can correct interpretations, reject matches, revise intent, and continue without restarting (I2). Recovery is a first-class flow, not an error state.

### 10.6 Evaluate interaction strategies empirically

Test whether question sequences, explanations, and layouts actually help (L22). Preference and completion, not designer intuition.

---

## 11. On-demand capability showcase generation

A **product capability**, not a documentation synchronisation system. Existing `MovieMaker`/`MovieServer`/`recording_manager` are the substrate.

| Requirement | Detail |
|-------------|--------|
| On-demand recordings | Capture selected workflows as illustrative demonstrations (S1) |
| Show what is possible | Capability- and outcome-oriented, not step-by-step tutorials (S2) |
| Realistic scenarios | An intent expressed, Notention's response, the accomplished outcome |
| Optional and selective | Useful scenarios, not exhaustive coverage (S3) |
| Presentation-ready | Optional narration and captions (S4) |
| Standalone artifacts | Independent of future UI changes; versioned at capture time (S5) |
| No mandatory sync | No automatic regeneration on every prompt/UI/workflow change |

Recordings are local artifacts. They are never an acceptance gate for the loop.

---

## 12. Coverage: sample and expand, never claim completeness

Narratives are unbounded. What is finite is structure and observed behaviour.

| Layer | What we do | Metric |
|-------|-----------|--------|
| Structural sampling | taxonomy axes (§13); t-wise arrays optional | cells covered |
| Vocabulary grounding | real corpus ingestion | corpus coverage |
| Generative expansion | LLM diversifies narratives, corpus-validated | novel narrative classes / cycle |
| Longitudinal | real usage | drift / discovery rate |

Stop measuring "percent of space covered"; measure **discovery rate** — new narrative classes, ontology gaps, and failure modes surfaced per cycle.

---

## 13. Taxonomy (retained)

Structure vs skin. Axes: **social form** (Fiske: communal · authority · equality · market), **topology** (1:1 · 1:N · N:M · chain · coalition · hierarchy · mesh), **exchange** (goods · labour · knowledge · capital · care · space · access · commitment · status · identity), **stakes** (info · social · economic · legal · safety · existential), **temporality** (one-shot · recurring · open-ended · deadline · ephemeral · generational), **heterogeneity** (shared · cross-domain · multilingual · tacit · contested). Modifiers: scale, trust, Ostrom governance, power asymmetry, formality, dignity/face/honour.

Universals audit (each maps to ≥1 cell): kinship · gift · redistribution · market · division of labour · property · contract · conflict resolution · law · ritual · status · alliance · family formation · apprenticeship · caregiving · inheritance · hospitality · taboo · commons · debt · reputation · oath · sanctuary · tribute.

Honest audit: all current scenarios are one cell (N:M · market pricing · economic · one-shot · shared vocabulary). Expect care/kinship/obligation tasks to expose priced-dyadic-exchange assumptions.

---

## 14. Complete backlog

Nothing is tracked outside this document. Status: ⬜ open · 🟨 in progress · ✅ done · 🅿️ parked (§18). Tracks marked **essential** are architectural prerequisites; **supporting** tracks add capability on top.

### D — Defects and debt (fix before trusting any measurement)

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| D1 | Uncapped normalized score (`1 - (v-max)/max` > 1) | `optimize/src/uiuxEvaluator.ts:426` | score ∈ [0,1] asserted | — | ✅ |
| D2 | CLI builds config then calls the singleton; flags ignored | `optimize/src/cliHandlers/uxEvaluate.ts:37` | flags change output (test) | D1 | ✅ |
| D3 | Plain `pnpm test` OOMs on `ui` | `ui/vitest.config.ts`, root scripts | `pnpm test` exits 0 | — | ✅ |
| D4 | UI batching is a hand-maintained list | `scripts/test-ui-batched.ts` | glob + chunk | D3 | ✅ |
| D5 | Phase 1 infra has zero consumers (`uiRegistry`, `ontologyRegistry`, `suggestionStore`, adapters) | `core/src/ui/`, `core/src/ontology/`, `core/src/suggestions/` | wired (L7) or deleted | L2a | ✅ **decision: wire** |
| D6 | `analyzeRoutes`/`analyzeDialogs`/`analyzeActions` hardcoded | `optimize/src/discovery/componentScanner.ts` | derived from JSX | L3 |
| D7 | `BrowserManager.createPage()` returns the first agent's page | `simulator/src/browser_manager.ts` | explicit page/context per use | — | ✅ |
| D8 | `Scenario` lacks tags/`requires`/`difficulty`; runner logs instead of emitting events | `simulator/src/types.ts`, `scenario.ts`, `agent.ts` | typed `RunEvent` sink | — | ✅ |
| D9 | `MetricsTab` untested | `ui/src/components/settings/MetricsTab.tsx` | render + consent test | — | ✅ |
| D10 | Metrics persistence broken: `track()` never persists; `flush()` clears then persists empty | `ui/src/hooks/useMetrics.ts` | survives flush + reload; test | — | ✅ |

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| D1 | Uncapped normalized score (`1 - (v-max)/max` > 1) | `optimize/src/uiuxEvaluator.ts:426` | score ∈ [0,1] asserted | — | ✅ |
| D2 | CLI builds config then calls the singleton; flags ignored | `optimize/src/cliHandlers/uxEvaluate.ts:37` | flags change output (test) | D1 | ✅ |
| D3 | Plain `pnpm test` OOMs on `ui` | `ui/vitest.config.ts`, root scripts | `pnpm test` exits 0 | — | ✅ |
| D4 | UI batching is a hand-maintained list | `scripts/test-ui-batched.ts` | glob + chunk | D3 | ✅ |
| D5 | Phase 1 infra has zero consumers (`uiRegistry`, `ontologyRegistry`, `suggestionStore`, adapters) | `core/src/ui/`, `core/src/ontology/`, `core/src/suggestions/` | wired (L7) or deleted | L2a | ✅ **decision: wire** |
| D6 | `analyzeRoutes`/`analyzeDialogs`/`analyzeActions` hardcoded | `optimize/src/discovery/componentScanner.ts` | derived from JSX | L3 |
| D7 | `BrowserManager.createPage()` returns the first agent's page | `simulator/src/browser_manager.ts` | explicit page/context per use | — |
| D8 | `Scenario` lacks tags/`requires`/`difficulty`; runner logs instead of emitting events | `simulator/src/types.ts`, `scenario.ts`, `agent.ts` | typed `RunEvent` sink | — |
| D9 | `MetricsTab` untested | `ui/src/components/settings/MetricsTab.tsx` | render + consent test | — | ✅ |
| D10 | Metrics persistence broken: `track()` never persists; `flush()` clears then persists empty | `ui/src/hooks/useMetrics.ts` | survives flush + reload; test | — | ✅ |

### M — Model independence and offline operation · essential

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| M1 | One inference interface + capability probing + fallback chain (`local → remote → rules`) | `ui/src/services/ai/inference.ts`, `ui/src/services/ai/init.ts` | app usable with any link missing | — | ✅ |
| M2 | Local/browser model path for capture and extraction (`WebLLMProvider`) | `ui/src/services/ai/WebLLMProvider.ts`, `DescribeItComposer` | intent captured with local model only | M1 | ✅ |
| M3 | Deterministic core: schemas, validation, rules, state transitions outside the model | `ui/src/services/ai/schema.ts`, `core/` | invariants hold regardless of model output | — | ✅ |
| M4 | Imperfect-inference handling: malformed, uncertain, timeout, unsupported | `ui/src/services/ai/inference.ts`, `ui/src/services/ai/schema.ts` | no state corruption; user never blocked | M1 | ✅ |
| M5 | Offline mode: core workflows + evaluation + approved changes without network | app + `ui/eval/` | tested with network disabled | M2, E3 | 🟨 |
| M6 | Resource metrics in evaluation (latency, memory, model size, cost) | `ui/eval/` | reported per candidate | L9 | 🟨 |

### B — Architectural boundaries · essential

| ID | Item | Acceptance | Depends |
|----|------|-----------|---------|
| B1 | Runtime independent of the loop process | app runs with no optimization process | — |
| B2 | Data / strategy / execution separation | user data never inside strategy artifacts | L7 |
| B3 | Inspectable decision records (strategy, change, evidence, verdict) | any adopted change explainable from the bundle | L19 |
| B4 | Privacy policy: retention, redaction, egress | written policy; default no egress | L19 |
| B5 | Reproducibility record (model/prompt/strategy/ontology/evaluator versions) | replay matches record | L20 |
| B6 | No premature abstraction | second workflow before generalising | X4 |

### O — Objective and prioritisation · essential

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| O1 | Journey model: intent → interpret → clarify → match → decide → act → outcome | `ui/eval/` | every task scored on the full path | L9 |
| O2 | Outcome success as primary metric | `ui/eval/` | completion + relevance dominate TTI | L9 |
| O3 | User-perspective friction discovery (steps, dead ends, rework) | `ui/eval/` | friction found from flows, not code | L9 |
| O4 | Impact scoring (frequency × severity × recoverability × reach) | `optimize/src/loop/` | ranked problem list per cycle | L5 |
| O5 | Failure signal capture (failed matches, corrections, abandonment, opt-in feedback) | app + `optimize/` | signals recorded locally, opt-in | M4 |
| O6 | Failure vs legitimate variation discrimination | `optimize/src/loop/` | single rejection ≠ defect | O4 |
| O7 | Abstain on insufficient evidence | `optimize/src/loop/` | "no proposal" is a valid cycle output | O4 |
| O8 | Smallest-change preference | `optimize/src/loop/` | complexity delta reported per candidate | O4 |

### E — Evaluation quality · essential

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| E1 | Complete-workflow evaluation | `ui/eval/` | journey scored end to end | L9 |
| E2 | Deterministic invariant checks (schema, state, required behaviour) | `ui/eval/`, `optimize/` | failures block promotion | L9 |
| E3 | Offline evaluation runner | `ui/eval/` | runs with no network | M1 |
| E4 | Evaluator independence | `optimize/src/loop/` | candidate cannot configure its judge | L12 |
| E5 | Baseline retention on inconclusive/regression | `optimize/src/loop/` | decision.md states why retained | L12 |

### L — Improvement loop

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| L1 | `loop/taxonomy.json` + `loop.config.json` + schema | `loop/` | loads; universals audit complete | — | ✅ |
| L2 | `pnpm loop` + root script; `discover` subcommand | `optimize/src/cli.ts`, `package.json` | `pnpm loop --dry` runs | L1 | ✅ |
| L2a | D5 decision: wire Phase 1 registries or delete | `core/src/ui/`, `core/src/ontology/`, `core/src/suggestions/` | decision recorded | — | ✅ **wire** |
| L3 | Cluster prop-bearing components into seams | `optimize/src/discovery/seams.ts` | ≥3 seams with members | L2 | ✅ |
| L4 | Detect duplicate/dead/inlined candidates | `optimize/src/discovery/duplicates.ts` | ≥1 actionable finding | L3 | ✅ |
| L5 | Emit `discovered.json`, `tasks.json`, `golden.jsonl` | `optimize/src/loop/` | reproducible artifacts | L2, L3 | ✅ |
| L6 | Golden cases mined from existing tests | `GoldenCaseMiner` wiring | ≥10 cases; injected break caught | L5 | ✅ |
| L7 | `ComponentStrategy<P>` + `registerDiscoveredStrategies` | `ui/src/strategies/`, `core/src/ui/` | new component auto-registers | L3, L2a | ✅ |
| L8 | Wrap existing components as strategies | `ui/src/strategies/` | `PropertyForm`, `TagInput`, `DescribeItComposer`, `TemplateSelector` | L7 | ✅ |
| L9 | Task harness + tasks 1–3, N≥10, seeded | `ui/eval/` | TTI/steps/errors per config | L8 | ✅ |
| L10 | `StrategySpec` + generator + candidate dir | `optimize/src/synthesis/` | candidates with provenance | L9 | ✅ |
| L11 | Static gates: typecheck, lint, seam conformance, imports, no ambient caps | `optimize/src/synthesis/gates.ts` | bad candidates rejected pre-build | L10 | ✅ |
| L12 | Sandbox build + harness run | `optimize/src/synthesis/` | candidate measured vs baseline | L11 | ✅ |
| L13 | Adopt winner behind flag; provenance; rollback | `ui/`, ledger | reversible adoption | L12 | ✅ |
| L14 | T4 request emission | `optimize/src/synthesis/requests.ts` | request from real evidence | L12 | ✅ |
| L15 | Prompt JSON schema derived from ontology; repair loop | `optimize/src/services/ai/extractionSchema.ts` | extraction validated | L2 | ✅ |
| L16 | Clarification questions ranked by information gain | `ui/src/services/ai/` | "changed outcome" rate measured | L15 | ✅ |
| L17a | Lifecycle/status facet (`open→matched→committed→done→lapsed`) | `core/src/ontology/` | note carries status; task 4 passes | — | ✅ |
| L17 | Ontology experiment: flat vs facets+status | `core/src/ontology/`, harness | recorded decision | L9, L17a |
| L18 | Real-corpus ingestion → vocabulary + tasks | `optimize/src/corpus/` | ≥1 class beyond taxonomy | L5 |
| L19 | Ledger-lite (append-only decisions/deltas/provenance) | `core/src/suggestions/SuggestionStore.ts` | survives restart; dedupes | L5 |
| L20 | Determinism: pinned models, cached outputs, replay | `optimize/src/loop/` | identical hash on replay | L9 |
| L21 | A11y + keyboard assertions in harness | `optimize/src/a11y.ts`, `ui/eval/` | violations fail the task | L9 |
| L22 | Preference + interaction-strategy comparison (human + calibrated judge) | `ui/eval/` | win-rate on question sequences, explanations, layouts | L9 |
| L23 | Profiles + policy + per-user overrides | `ui/src/settings/`, config | 2 profiles; overrides persist | L8, L22 |
| L24 | Add simulator + optimize tests to `pnpm verify` | `scripts/verify.ts` | verify runs all suites | D3 |

### P — Product ergonomics · supporting

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| P1 | Natural-language capture end to end (schema + repair + review) | `DescribeItComposer`, `ExtractionReview`, `ui/src/services/ai/` | fewer steps than form; works with local model | L15, M2 |
| P2 | Progressive + `on-match-failure` elicitation | `InsertPropertyModal`, `EnhancedPropertyForm` | lower TTI **and** lower abandonment | L9 | ✅ |
| P3 | `workspace-layout` strategies: list vs two-pane | `DashboardView`, `NotesView` | selectable, measured | L8 |
| P4 | `match-display` strategies: inline vs sidebar | `LocalMatchPreview`, `DashboardLocalMatch` | selectable, measured | L8 |
| P5 | `intent-surface`: commitments/deadlines/status | new view + L17a | a commitment can be completed | L17a, P3 |
| P6 | Template-first + conversational capture | `TemplateSelector`, new | selectable, measured | L8 |
| P7 | Persist per-user overrides | settings | survives reload | L23 |

### I — Interaction model · supporting

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| I1 | Explainable match results (why it fits, how it differs, what is missing) | `LocalMatchPreview`, match UI | explanation shown for every match | P4 | ✅ |
| I2 | Correction and recovery flows (reject, revise, continue without restart) | editor + match UI | recovery measurable; no forced restart | P3, P4 | ✅ |

### S — Capability showcases · supporting

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| S1 | On-demand recording of selected workflows | `simulator/src/movie_maker.ts`, `recording_manager.ts` | one workflow recorded on request | — |
| S2 | Capability-oriented scenario library | `simulator/src/scenarios/` | scenarios show outcomes, not tutorials | S1 |
| S3 | Optional/selective generation + local artifact | scripts | no workflow requires a recording | S1 |
| S4 | Presentation output (optional narration/captions) | `movie_maker.ts` | captions present when requested | S1 |
| S5 | Standalone versioned artifacts, no mandatory sync | `loop/showcases/` | recording valid after UI change | S1 |

### X — End-to-end proof · essential

| ID | Item | Acceptance | Depends |
|----|------|-----------|---------|
| X1 | Choose one representative valuable journey | journey named and justified | — |
| X2 | Baseline: success rate, friction, failure modes, resources | baseline recorded with evidence | L9 |
| X3 | Run the complete loop locally | problem → proposal → evaluation → selection → verification | X2, L12 |
| X4 | Demonstrate meaningful evolution without manual rewrite | measurable improvement, human-confirmed | X3 |
| X5 | Regression protection and rollback demo | rejected candidate; known-good restored | X3 |
| X6 | Constrained operation: compact local model, network off | workflow completes offline on local model | X3, M5 |
| X7 | Evidence document (baseline, change, results, resources, outcome) | `loop/evidence/<id>.md` complete | X3–X6 |

### H — Human gates and research

| ID | Item | Acceptance | Depends |
|----|------|-----------|---------|
| H1 | **G1** stranger completes Golden Path <2 min unaided | clean-profile run recorded | L9 |
| H2 | **G2** ≥70% of matches rated relevant | 5 users, recorded ratings | H1, L22 |
| H3 | **G5** single-device limit observed? | answered from H1/H2 | H1 |
| H4 | Decision records for each research question (§16) | one doc per question | L17, L16, L12, L3 |

### Q — Quality and docs

| ID | Item | Acceptance |
|----|------|-----------|
| Q1 | Tests for seam clustering, duplicates, task derivation | focused tests per module |
| Q2 | Telemetry tests for `RunEvent` | event stream matches actions |
| Q3 | README for `pnpm loop` and artifacts | accurate docs |
| Q4 | `pnpm build` green across all six workspaces | CI gate |
| Q5 | Reconcile or retire `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md` | no stale doc implying dropped work |

---

## 15. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| V1 | LLM-generated UI is subtly insecure | import allowlist, no ambient capabilities, seam conformance, a11y gates, human review T3+ |
| V2 | Prompt injection via corpus → codegen | fence untrusted content as data; review diffs |
| V3 | Closed-loop hallucination | problems from corpora/humans; generator never sees eval tasks |
| V4 | Discovery noise | human review of `discovered.json`; thresholds |
| V5 | Synthesis floods review | budget per cycle; must win; ledger pruning |
| V6 | Generated code rots | versioned artifacts with tests; regenerate on dependency change |
| V7 | Overfitting synthetic tasks | real corpora + dogfooding + rotating tasks |
| V8 | Optimising speed over outcomes | completion + relevance primary; preference |
| V9 | Config fragmentation | stable seams, shared tokens, deprecation path |
| V10 | Untrusted evaluator numbers | harness authoritative; fix D1/D2 |
| V11 | Narrative coverage claimed falsely | measure discovery rate |
| V12 | Local model quality gap makes evolution inert | capability probing + fallback; evaluate on small models (M2, X6) |
| V13 | Offline evaluation unrepresentative | include real corpora and observed flows; rotate tasks |
| V14 | Premature generalisation | B6; one workflow before abstractions |
| V15 | Privacy leakage through retained interactions | B4; local-only default; redaction; opt-in |
| V16 | Showcase recordings imply guarantees | versioned, capability-scoped, never an acceptance gate |
| V17 | Misreading legitimate variation as failure | O6; repeated patterns required |

---

## 16. Research agenda

1. **Ontology:** facets-with-status + infer-at-read vs flat — better on *both* expressiveness and elicitation cost? (L17)
2. **Elicitation:** progressive + on-match-failure vs upfront — lower TTI *and* abandonment? (P2, L16)
3. **Prompting:** schema-constrained + repair vs few-shot — accuracy per token, and does it reduce user effort? (L15)
4. **Synthesis:** can LLM-written strategies beat hand-written ones often enough to justify review cost? (L12)
5. **Discovery:** does static seam discovery find strategies we would not have tested? (L3)
6. **Reality management:** does lifecycle/status change behaviour, or just add fields? (L17a, P5)
7. **Narratives:** does real-corpus ingestion surface ontology gaps the taxonomy missed? (L18)
8. **Local models:** is a compact browser model sufficient for capture and proposal quality? (M2, X6)
9. **Explainability:** do explanations improve completion or just add noise? (I1, L22)
10. **Clarification value:** what fraction of questions change the outcome? (L16)

---

## 17. Status ledger

| Track | State |
|-------|-------|
| Batches A/B/C (trust, demo, metaphor) | ✅ done |
| W5 + W5b (CBOR/NoteID/signing, protocol testbed) | ✅ done |
| Extensibility Phase 1 *infrastructure* | ✅ written — ✅ wired (D5, L2a) |
| 13 domain scenarios + `ux-evaluate` | ✅ written — ✅ numbers trustworthy (D1, D2 fixed) |
| Taxonomy + coverage design | ✅ done (L1) |
| `ComponentScanner` AST rewrite + tests | ✅ done |
| `TsAstScanner` tsconfig crash | ✅ fixed |
| Model independence / offline (M1–M4) | ✅ done (inference router, capability probing, fallback, schema validation, repair) |
| Architectural boundaries | ⬜ not started (B1–B6) |
| Prioritisation by impact | ✅ done (O1–O8, L2, L4, prioritize cmd) |
| Workflow-level evaluation | 🟨 partial (E1–E5, harness simulated, L9, L12) |
| Seam clustering / duplicates | ✅ done (L3, L4) |
| `pnpm loop` + discover/prioritize/synthesize/evaluate/adopt/request/run | ✅ **done (L2, L5, L10–L14)** |
| **Loop config (taxonomy, config, schema)** | ✅ **done (L1)** |
| Task harness | 🟨 simulated (L9, N≥10 reps, seeded) |
| Synthesis (T2/T4) | ✅ done (L10–L14) |
| Capability showcases | ⬜ not started (S1–S5) |
| End-to-end proof | 🟨 partial (X1–X3 loop runs, X4–X7 pending) |
| Human gates G1/G2/G5 | ⏳ pending |

**Test state:** core 398 · simulator 20 · agent 17 · cli 6 · optimize 32 · ui 37 batched ✅ (D3, D4 fixed)

---

## 18. Parked work (explicit triggers)

| ID | Work | Reopen when |
|----|------|-------------|
| W4 | Agent loop closure (confirmations, traces, undo) | clients request agent actions |
| W6 | Multi-device sync | G5 says users hit the limit |
| A-L2 | Auto-apply medium-risk changes | ≥10 clean cycles, 100% correct rollbacks |
| A-L3 | Canary autonomy | real-user telemetry at higher fidelity |
| CV | Maximin ratchets / t-wise coverage as gates | L18 shows cross-cell regressions |
| ST | Formal power analysis | effect sizes prove noisy |
| CI | Nightly matrix artifact run | D3 + L20 done, loop cheap |
| FED | Federated / multi-relay simulation | L18 stable single-relay |
| UI-R | `SuggestionsTab` review UI | CLI review becomes the bottleneck |
| DEP | Dead-code removal of Phase 1 infra | L2a decides against wiring |

---

## 19. Phased implementation order

Dependency order, not a prohibition on parallel work.

| Phase | Focus | Exit |
|-------|-------|------|
| **1. Define success + baseline** | Choose one journey (X1); identify friction; define measurable outcomes; small evaluation suite | Baseline recorded with evidence (X2); harness on tasks 1–3 |
| **2. Make strategies evolvable** | Version prompts/UI/ontology artifacts; interfaces; model-independent runtime; fallback chain | Artifacts versioned; app works with any inference link missing (M1, B2) |
| **3. Safe local experimentation** | Generate candidates; evaluate offline; deterministic checks; reject regressions; promote with rollback | Evidence gate enforced; rollback demonstrated (X5) |
| **4. Demonstrate the complete loop** | Compact local model contributes a measured improvement in the real workflow, network off | X3–X7 complete |
| **5. Showcases + generalise** | Selective recordings; extend the validated loop to more workflows | S1–S5 done; second workflow validated (B6) |

---

## 20. Completion criteria

Not "Notention can generate new prompts or UI variants." Completion requires demonstrating that:

1. A real user problem is identified — from observed friction, not code structure (O3, X2).
2. The system generates a plausible improvement (L10–L12).
3. The improvement is evaluated **locally with a compact model and deterministic checks** (M2, E2, E3).
4. The selected change improves a **measurable user outcome** without unacceptable regressions (X4, E5).
5. The change can be **reproduced, inspected, and reversed** (B3, B5, L13).
6. The resulting workflow is at least as usable as before, preferably demonstrably better (X4).

And the architectural principle holds: **the system improved its own behaviour without a large remote model**, while "improvement" remained grounded in what people can actually accomplish.

---

## 21. Sequenced next actions

1. ✅ **D1, D2** — make the evaluator honest.
2. ✅ **D9, D10, D3, D4** — metrics test and persistence, then reliable `pnpm test` (glob+batch).
3. ✅ **L1** — `loop/taxonomy.json` + `loop.config.json` + schema.
4. ✅ **L2a** — D5 decision (wire or delete). Blocker for L7. → **wired**
5. ✅ **L2** — `pnpm loop` + `discover` / `prioritize` / `synthesize` / `evaluate` / `adopt` / `request` / `run`.
6. ✅ **L3, L4, D6** — seam clustering, duplicates, AST-derived routes/dialogs/actions.
7. ✅ **L5, L6** — discover artifacts; mine golden cases; verify injected break is caught.
8. ✅ **L7, L8, B1, B2** — `ComponentStrategy<P>` + auto-registration; wrap existing components; runtime independent of the loop, data separated from strategy.
9. 🟨 **L9, O1–O3, E1, E2** — harness; journey model; outcome-primary scoring; workflow-level evaluation and deterministic checks. *(harness simulated, needs real Playwright integration)*
10. ✅ **M1, M2, M3, M4** — inference interface, local model path, deterministic core, imperfect-inference handling.
11. ✅ **D7, D8, Q2** — simulator telemetry sink and explicit page ownership; verify event stream.
12. ✅ **L17a** — lifecycle/status facet.
13. ✅ **L10–L14, E4, E5, X5** — synthesis with gates; evaluator independence; baseline retention; rollback demo.
14. 🟨 **L15, L16, I1, I2, P1, P2** — prompt schema, clarification value, explainability, recovery, NL capture, progressive elicitation.
15. **E3, M5, M6, X6** — offline evaluation; offline workflows; resource metrics; constrained-operation demo.
16. **O4–O8, L19, L20, B3–B5** — impact scoring, failure signals, abstention, minimal change; ledger; determinism; inspectability; privacy; reproducibility.
17. **X1–X4, X7, H1–H4** — one-journey proof, evidence doc, human gates, decision records.
18. **L21–L24, P3–P7, L17, L18** — a11y, preference, profiles, layouts, ontology experiment, real corpora.
19. **S1–S5, Q1–Q5, B6** — showcases; tests and docs alongside; generalise only after the second workflow proves the abstraction.

**Definition of done:** §20 satisfied, every adopted change reversible and traceable to a run, and the offline/local-model constraint demonstrated end to end.

---

*End of TODO.9.md (revision 2) — optimise for what users accomplish; evolve prompts and UI locally; keep humans and deterministic checks on the ground truth. This document is the single source of truth for remaining work.*
