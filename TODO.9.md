# Notention Development Plan (TODO.9.md) — **draft**

Supersedes TODO.8.md. Keeps the relaxed product goal (UI/UX ergonomics for reality management and intent satisfaction, improving the live system now). Adds two things TODO.8 lacked:

1. **A metaprogramming layer** — derive seams, strategies, tasks, schemas, and golden cases from source and ontology instead of hand-writing them.
2. **Synthesis** — the loop may *invent* new UI, either as LLM-written code behind a seam or as a well-formed request to a developer/agent.

> Honest verdict carried forward: TODO.8 was a good *product process* and a weak *self-improving system*. It could only choose among strategies a human had already written. That ceiling is removed here: **the action space is now generated, not enumerated.**

---

## 0. What changed

| TODO.8 | TODO.9 |
|--------|--------|
| Catalog of hand-written strategies | Strategies **discovered** from source, **generated** by LLM, or **requested** |
| Tasks hand-written per feature | Tasks **derived** from ontology + type lattice |
| Prompt schemas written by hand | JSON schema **derived** from `OntologyAdapter` |
| Golden corpus authored separately | **Mined** from the existing test suites |
| Loop chooses among N options | Loop **expands N**, then chooses |
| "Cover the narrative space" implied | Explicitly **sample, expand, never claim coverage** |
| Taxonomy as generator | Taxonomy retained, now one of three sampling sources |

**The key realization:** most of the hard machinery already exists in `optimize/src/discovery/` — `ComponentScanner`, `TsAstScanner`, `TypeSchemaBuilder`, `StateSchemaInferencer`, `JourneyGenerator`, `GoldenCaseMiner`, `selectorInference`. We have been hand-writing things we already know how to derive. The metaprogramming layer is mostly *wiring*, not new invention.

---

## 1. Goal and measures (retained, brief)

**Reality management** (represent and act on needs, offers, commitments, obligations, status) · **intent satisfaction** (an intent reliably reaches an outcome) · **ergonomics** (low cost to express intent).

Measures in trust order: **time-to-intent (TTI)**, **steps**, **completion**, **error/correction rate**, **match-at-first-attempt**, **pairwise preference**, **satisfaction** (judge-screened).

---

## 2. The loop, upgraded

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ 1 DISCOVER   static analysis + ontology                          │
  │   seams · unused/duplicate components · routes · dialogs         │
  │   fields · state paths · tasks · prompt schemas · golden cases   │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 2 SYNTHESIZE  expand the option space                            │
  │   S1 params/compose · S2 LLM writes strategy · S3 new seam       │
  │   S4 spec/request to developer or delegated agent                │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 3 EVALUATE   task harness (Playwright, seeded)                   │
  │   TTI · steps · errors · completion · preference                 │
  └───────────────┬──────────────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ 4 ADOPT      profiles + policy + overrides; ledger; reversible  │
  └──────────────────────────────────────────────────────────────────┘
```

One cycle: `pnpm loop` → `loop/runs/<id>/` bundle (discovered.json, candidates/, results.json, decision.md).

---

## 3. Metaprogramming layer (derive, don't author)

Reuse `optimize/src/discovery/`; add only the glue.

| Derive | From | With | Replaces |
|--------|------|------|----------|
| **Seams** | components sharing a prop-shape + role | `ComponentScanner` (`ComponentInfo`, `PropInfo`) + `TsAstScanner` | hand-authored seam list |
| **Candidate strategies** | components that already implement a seam shape | same | hand-wrapping each component |
| **Dead/duplicate strategies** | unused components; near-identical props/JSX | `ComponentScanner` | manual audits |
| **Tasks** | ontology properties/relations/constraints × type lattice | `TypeSchemaBuilder` + `OntologyAdapter` | hand-written Playwright specs |
| **Prompt schemas** | operators, allowed values, constraints | `OntologyAdapter.getConstraints` | hand-written JSON schema |
| **Golden cases** | existing vitest/Playwright assertions | `GoldenCaseMiner` (exists) | a separate golden file |
| **Journeys/steps/selectors** | goals + state paths | `JourneyGenerator`, `stepBuilder`, `selectorInference` (exist) | manual journey authoring |
| **Narrative skins** | real corpora | ingestion + LLM flavor | inventing domains by hand |

**Anti-boilerplate primitives:**

```ts
// one base class; any matching component becomes a strategy with zero glue
abstract class ComponentStrategy<P> implements Strategy {
  abstract readonly id: StrategyId;
  abstract readonly seam: Seam;
  constructor(protected props: P) {}
  abstract render(): React.ReactElement;
  get params(): ParamSpec { return deriveParams<P>(); }   // from prop types
}

registerDiscoveredStrategies(seam, dir);   // glob → inspect → wrap → register
```

**Guarantees this buys:** adding a component to the repo can automatically make it a testable strategy; adding an ontology property can automatically create capture/repair tasks and a prompt schema. The search space grows with the codebase, not with our to-do list.

### 3.1 Decision applied: AST only, no regex

`ComponentScanner` was regex-based (its own comment said "TypeScript AST is heavy"). Regex is unsafe here: it misses multi-line destructured props, inherited interfaces, `React.FC<Props>` type arguments, and it counts `useFake` inside strings, comments, and imports as hooks. It also cannot report real source locations.

Rewritten against `ts-morph`, sharing one project factory with `TsAstScanner`:

| Now derived | Previously |
|-------------|------------|
| props via referenced type, `extends` chain, type-literal aliases, `React.FC<T>` | one `interface *Props` regex, single-line only |
| hooks via `CallExpression` matching `use[A-Z]` | substring match over the whole file (strings/comments/imports included) |
| JSX as a real tree with attribute values and line/column | flat `matchAll` over `<Tag ...>`, line 0 |
| exports via declaration nodes + export declarations + default | first `export (function\|const\|class)` occurrence |
| project root found by walking up to `pnpm-workspace.yaml` | hardcoded `/home/me/notention9` |

**Bug found while doing this:** `TsAstScanner` constructed `new Project({ tsConfigFilePath: '<root>/tsconfig.json' })`, but the repo has **no root tsconfig** — construction threw `File not found`, so the entire type-schema discovery pipeline was inert. Fixed by the shared `createAstProject` factory, which uses explicit compiler options and only loads a tsconfig when one exists.

**Verified:** 6 tests (real fixtures on disk, no mocks); live scan of `ui/src` finds 194 components (139 with props), accurate multi-line prop types, zero hook false-positives, ~4s.

**Remaining hardcoding in the scanner (deliberate, next cycle):** `analyzeRoutes`, `analyzeDialogs`, and `analyzeActions` are still seeded from named components and hand-written action lists. They are heuristics, not regex, and will be derived from JSX (buttons, labels, triggers) in Cycle 0 follow-up.

---

## 4. Synthesis: inventing UI

Synthesis is a **mutation class** with tiers. Risk rises with blast radius; autonomy falls.

| Tier | Action | Gate | Mode |
|------|--------|------|------|
| **S1** | Compose/parametrize existing strategies | normal evaluation | automatic |
| **S2** | **LLM writes a new strategy behind an existing seam** | compile + lint + typecheck + a11y + import allowlist + seam conformance + it must win | automatic adopt allowed |
| **S3** | New **seam** + strategy (no existing seam fits) | S2 + human design review | human |
| **S4** | **Spec / request** for a developer or delegated coding agent | human or agent implements; re-enters at S2/S3 | human |

**S2 contract (LLM-coded strategy):**

```ts
interface StrategySpec {
  seam: Seam;
  intent: string;                  // "elicit a numeric budget with unit"
  must: string[];                  // a11y, keyboard, no network
  may: string[];                   // allowed imports (ui/*, react, tokens)
  mustNot: string[];               // core/security/storage/network, eval, remote URLs
  accepts: JSONSchema;             // props
  emits: EventSchema;              // interaction events the harness observes
  examples: string[];              // few-shot renders
}
```

Generation pipeline: `spec → prompt → candidate code → static gates → sandboxed build → harness → adopt/reject`. Candidates are kept under `loop/candidates/<seam>/<id>/` with provenance (model, version, prompt hash, diff).

**Hard guards (non-negotiable):**

- **Import allowlist.** Generated UI may import `react`, design tokens, and `ui/*`; never `core/security`, `core/storage`, `core/network`.
- **No ambient capability.** No `fetch`, `eval`, dynamic URL import, `localStorage` writes, or filesystem access in generated code.
- **Seam conformance.** Must implement the interface exactly; otherwise rejected before build.
- **A11y + keyboard.** Automated assertions (roles, names, focus order) from `a11y.ts`.
- **Feature-flagged and reversible.** Generated strategies ship off by default; removing one is a config change.
- **Deterministic synthesis.** Pinned model, temperature 0, cached by `(prompt, spec, model, version)`; the same cycle reproduces.
- **Untrusted-content fencing.** Ontology/scenario/corpus text is **data**, never instructions. Strip and fence before prompting. (Prompt-injection → code-generation is a supply-chain risk.)
- **Provenance + license check** recorded in the ledger.
- **S3/S4 require a human**; S2 may auto-adopt only when it wins and passes every gate.

**S4 — the developer path.** When a need is architectural or synthesis fails gates, emit a spec:

```
loop/requests/<id>.md
  Need:        ergonomic elicitation of a recurring schedule
  Evidence:    task 4, TTI +240% when schedule has >2 fields
  Proposal:    new seam `schedule-elicitation`; strategies considered
  Constraints: keyboard, a11y, no new deps, reversible
  Acceptance:  task 4 median TTI < 15s, no golden regression
```

A human developer — or a delegated coding agent — can take that spec and re-enter the loop. This is how "prompting a developer of the need for one" becomes a first-class, evidence-backed artifact instead of a hallway conversation.

**Honest limit:** LLM synthesis invents *implementations*, and can vary interaction patterns within a spec. It does not reliably invent a new interaction theory. Genuinely novel paradigms remain S3/S4 — human design, machine execution.

---

## 5. Two generative axes — and the closed-loop hazard

A self-improving system must generate both **problems** and **solutions**:

| Axis | Generate | Ground truth |
|------|----------|--------------|
| **Solutions** | strategies, prompts, ontology facets | harness + human |
| **Problems** | tasks, narratives, scenario skins | **real corpora + humans** |

**Hazard:** if the same model invents a task and the component that solves it, you get self-consistent delusion — a closed loop that improves its own fiction.

**Mitigation, in order of strength:**

1. **Problems from real corpora** (job boards, RFPs, mutual-aid posts, CFPs, care forums) — not invented.
2. **Human-authored tasks** for anything that gates adoption.
3. **Separation:** the solution-generator never sees the evaluation tasks; evaluation tasks are holdout by construction.
4. **Narrative diversity ≠ narrative validity.** LLM-generated narratives are for *exploration*, admitted to the task set only after corpus/human validation.

---

## 6. The three design spaces (retained)

Ontology structure (what can be expressed) × UI configuration (how it is elicited) × prompt strategy (how language becomes structure). Change one and the optimum of the others moves — so search jointly.

| Space | Candidates | Synthesis |
|-------|-----------|-----------|
| Ontology | S1 flat · **S2 facets + status** · S3 graph · S4 core+domain · S5 infer-at-read | facet/prompt synthesis (S1/S2 tiers) |
| UI | `capture` · `detail-elicitation` · `workspace-layout` · `match-display` · `ontology-browse` · `intent-surface` · `prompt` | S2 LLM strategies |
| Prompts | zero-shot · few-shot · **schema-constrained** · repair · tool-use · probing | schema derived from ontology |

**Working hypothesis (test, don't assume):** S2 facets-with-status + S5 infer-when-possible beats flat keys on *both* expressiveness and elicitation cost. Reality management needs lifecycle (`open → matched → committed → done → lapsed`), which flat attributes cannot express.

---

## 7. UI as portfolio (retained, condensed)

Genome = one strategy per seam + params. Output = **profiles** (`beginner`, `power`, `mobile`, `hiring`, `care`) + **policy** (context → genome) + **per-user overrides**. "Try them all" resolves to a portfolio, not a single compromise. Seams are stable interfaces; strategies are interchangeable and now partly generated.

---

## 8. Coverage: sample and expand, never claim completeness

**Answer to "can we cover the full space of use-case narratives?" — No.**

Narratives are unbounded; culture is unbounded. What is finite is *structure* and *observed behavior*.

| Layer | What we do | Metric |
|-------|-----------|--------|
| Structural sampling | taxonomy axes (§9); t-wise arrays optional | cells covered |
| Vocabulary/narrative grounding | real corpora ingestion | corpus coverage |
| Generative expansion | LLM diversifies narratives, corpus-validated | **novel narrative classes per cycle** |
| Longitudinal | real usage + community sim | drift/discovery rate |

**Reframe the metric:** stop measuring "percent of space covered" (meaningless at unbounded scale) and start measuring **discovery rate** — how many previously-unseen narrative classes, ontology gaps, and failure modes the loop surfaces per cycle. A self-improving system is one that keeps *finding new things to be wrong about*.

---

## 9. Taxonomy (retained for further consideration)

Structure vs skin. Axes: **social form** (Fiske: communal · authority · equality · market), **topology** (1:1 · 1:N · N:M · chain · coalition · hierarchy · mesh), **exchange** (goods · labor · knowledge · capital · care · space · access · commitment · status · identity), **stakes** (info · social · economic · legal · safety · existential), **temporality** (one-shot · recurring · open-ended · deadline · ephemeral · generational), **heterogeneity** (shared · cross-domain · multilingual · tacit · contested).

Modifiers: scale, trust, Ostrom governance, power asymmetry, formality, dignity/face/honor.

Universals audit (each maps to ≥1 cell): kinship · gift · redistribution · market · division of labor · property · contract · conflict resolution · law · ritual · status · alliance · family formation · apprenticeship · caregiving · inheritance · hospitality · taboo · commons · debt · reputation · oath · sanctuary · tribute.

Retained honest audit: all current scenarios are one cell (N:M · market pricing · economic · one-shot · shared vocabulary). Expect care/kinship/obligation tasks to expose priced-dyadic-exchange assumptions in the core model.

---

## 10. Measurement (retained, condensed)

Task harness: Playwright, per-config browser context, seeded data, N≥10 reps, median + spread. Tasks: (1) capture need ≥3 properties <20s; (2) capture offer → ≥1 match without re-edit; (3) paragraph → valid structured note; (4) open note → commitment with status+deadline; (5) find note by intent; (6) add missing detail after failed match.

**Acceptance (relaxed):** median TTI or completion improves beyond noise, no golden break, human signs off.

**Known untrustworthy numbers:** `uxEvaluator` derives metrics from config; `uiuxEvaluator.ts:426` scores >1; `uxEvaluate.ts:37` ignores `--scenarios`/`--threshold-*`. Use the task harness as authoritative; fix or bypass the evaluator.

---

## 11. Cycles (concrete)

**Cycle 0 — Discover (no user-facing change, unblocks everything)**
- `pnpm loop discover`: `ComponentScanner` + `TsAstScanner` → seams, candidate strategies, dead/duplicate components, routes/dialogs/fields, state paths.
- Derive tasks from ontology + `TypeSchemaBuilder`; mine golden cases via `GoldenCaseMiner`.
- Output `loop/discovered.json`, `loop/tasks.json`, `loop/golden.jsonl`.
- **Acceptance:** ≥3 real seams discovered; ≥1 duplicate-component finding; tasks generated for every required ontology property.
- **Done so far:** ✅ scanner is AST-based and the type-schema pipeline no longer throws (§3.1). Next: seam clustering, duplicate detection, `pnpm loop discover` emission.

**Cycle 1 — Auto-register + baseline**
- `ComponentStrategy<P>` + `registerDiscoveredStrategies`.
- Register existing components as strategies with zero per-component glue.
- Harness runs tasks 1–3; baseline TTI/steps/errors.
- **Acceptance:** a component added to the repo appears as a strategy automatically.

**Cycle 2 — Synthesize a strategy (S2)**
- `StrategySpec` → generator prompt → static gates → sandbox build → harness.
- Generate 3 candidate `capture` and 3 `detail-elicitation` strategies; evaluate; adopt a winner if it beats baseline.
- **Acceptance:** one LLM-written strategy ships behind a flag with provenance; all guards pass.

**Cycle 3 — Developer-request path (S4)**
- Emit `loop/requests/<id>.md` when synthesis fails gates or no seam fits.
- **Acceptance:** one request produced from real evidence and handed to a human/agent.

**Cycle 4 — Prompt + ontology synthesis**
- Derive JSON schema from ontology → schema-constrained extraction; repair loop.
- LLM-probe questions ranked by information gain (properties gained per question).
- Test S1 vs S2 ontology structures on tasks 1–4.
- **Acceptance:** a decision recorded on the ontology question, with evidence.

**Cycle 5 — Real corpora**
- Ingest one real corpus → vocabulary + narrative patterns → tasks + ontology targets.
- **Acceptance:** ≥1 narrative class not in the taxonomy; ≥1 ontology gap found from real language.

---

## 12. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| V1 | LLM-generated UI is subtly insecure | import allowlist, no ambient capabilities, seam conformance, a11y gates, human review for S3+ |
| V2 | Prompt injection via ontology/corpus → codegen | fence untrusted content as data; no instructions from data; review diffs |
| V3 | Closed-loop hallucination (invent task + solve it) | problems from real corpora/humans; generator never sees eval tasks |
| V4 | Discovery noise (bad seams/duplicates) | human review of `discovered.json`; confidence thresholds |
| V5 | Synthesis floods review | budget per cycle; require winning; ledger pruning |
| V6 | Generated code rots | generated strategies are versioned artifacts with tests; regenerate on dependency change |
| V7 | Overfitting synthetic tasks | real corpora + dogfooding + rotating tasks |
| V8 | Optimizing speed over ergonomics | preference + satisfaction, not TTI alone |
| V9 | Config fragmentation | stable seams, shared tokens, deprecation path |
| V10 | Untrusted evaluator numbers | harness authoritative; fix `uiuxEvaluator` defects |
| V11 | Narrative "coverage" claimed falsely | measure discovery rate, not coverage % |

---

## 13. Retained notes

- Observed, not estimated. Static heuristics are labelled priors.
- Search may be cheap; decisions must be honest.
- Ledger-lite: append-only record of discoveries, candidates, decisions, deltas, provenance.
- Determinism: seeds + cached LLM outputs; replayable cycles.
- Versioned artifacts; UI changes reversible.
- Small golden set that must never break.
- Human ratings ground truth; LLM judges screen only.
- **Deferred:** L2/L3 autonomy for non-UI mutations, maximin ratchets, formal power analysis, nightly CI matrix, federated simulation.

---

## 14. Sharpened research agenda

1. **Ontology:** facets-with-status + infer-at-read vs flat — better on *both* expressiveness and elicitation cost? (Tasks 1–4, S1/S2.)
2. **Elicitation:** progressive + on-match-failure vs upfront — lower TTI *and* abandonment? (Task 6.)
3. **Prompting:** schema-constrained + repair vs few-shot — accuracy per token, and does better extraction actually reduce user effort? (Tasks 3, 6.)
4. **Synthesis:** can LLM-written strategies beat hand-written ones on harness metrics often enough to justify the review cost? (Cycle 2+.)
5. **Discovery:** does static seam discovery find strategies we would not have thought to test? (Cycle 0–1.)
6. **Reality management:** does lifecycle/status change behavior, or just add fields? (Task 4.)
7. **Narratives:** does real-corpus ingestion surface ontology gaps the taxonomy missed? (Cycle 5.)

---

## 15. Status ledger (as of this commit)

| Track | State |
|-------|-------|
| Batches A/B/C (trust, demo, metaphor) | ✅ done |
| W5 + W5b (CBOR/NoteID/signing, protocol testbed) | ✅ done |
| Extensibility Phase 1 *infrastructure* | ✅ written — ⚠️ **unused by the app** (see D5) |
| 13 domain scenarios + `ux-evaluate` | ✅ written — ⚠️ numbers untrustworthy (D1, D2) |
| Taxonomy + coverage design | ✅ drafted (§9) — ⚠️ not a file yet (L1) |
| `ComponentScanner` AST rewrite + tests | ✅ done (194 components, 139 with props) |
| `TsAstScanner` tsconfig crash | ✅ fixed (pipeline was inert) |
| Seam clustering / duplicate detection | ⬜ next (L3, L4) |
| `pnpm loop` command | ⬜ does not exist (L2) |
| Task harness / `ui/eval` | ⬜ does not exist (L9) |
| Strategy synthesis (S2/S4) | ⬜ not started (L10–L14) |
| Human gates G1, G2, G5 | ⏳ pending |

**Known test state:** core 398 · simulator 20 · agent 17 · cli 6 · optimize 12 · ui per-file OK, plain `pnpm test` OOMs (D3).

---

## 16. Complete backlog — all remaining work

Nothing is tracked outside this document. TODO.6/7/8 are superseded; anything still live from them is transcribed below. Status: ⬜ open · 🟨 in progress · ✅ done · 🅿️ parked (§17).

### D — Defects and debt (fix before trusting any measurement)

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| D1 | Uncapped normalized score (`1 - (v-max)/max` > 1) | `optimize/src/uiuxEvaluator.ts:426` | score ∈ [0,1] asserted | — |
| D2 | CLI builds config then calls the singleton; `--scenarios`/`--threshold-*` ignored | `optimize/src/cliHandlers/uxEvaluate.ts:37` | flags change output (test) | D1 |
| D3 | Plain `pnpm test` OOMs on `ui` | `ui/vitest.config.ts`, root scripts | `pnpm test` exits 0 | — |
| D4 | UI batching is a hand-maintained list; new tests silently excluded | `scripts/test-ui-batched.ts` | glob + chunk, no manual list | D3 |
| D5 | Phase 1 infra has zero consumers: `uiRegistry`, `ontologyRegistry`, `suggestionStore`, `OntologyAdapter`, `UIAdapter` | `core/src/ui/`, `core/src/ontology/OntologyAdapter.ts`, `core/src/suggestions/` | wired in L2/L7 **or deleted** | L2 |
| D6 | `analyzeRoutes`/`analyzeDialogs`/`analyzeActions` are hardcoded component lists | `optimize/src/discovery/componentScanner.ts` | derived from JSX (buttons, labels, triggers) | L3 |
| D7 | `BrowserManager.createPage()` returns the first agent's page (surprising ownership) | `simulator/src/browser_manager.ts` | explicit page/context per use | — |
| D8 | `Scenario` has no tags/`requires`/`difficulty`; `ScenarioRunner` logs instead of emitting events | `simulator/src/types.ts`, `scenario.ts`, `agent.ts` | typed `RunEvent` sink | — |
| D9 | `MetricsTab` has no test | `ui/src/components/settings/MetricsTab.tsx` | render + consent persistence test | — |
| D10 | Metrics persistence is broken: `track()` never persists; `flush()` clears the queue *then* persists the now-empty queue, so events vanish after 5s and never survive reload | `ui/src/hooks/useMetrics.ts` (`flush`, `track`) | queued events survive flush + reload; test | — |

### L — Improvement loop

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| L1 | `loop/taxonomy.json` + `loop.config.json` + schema | `loop/` | loads; universals audit complete | — |
| L2 | `pnpm loop` command + root script; `discover` subcommand | `optimize/src/cli.ts`, `package.json` | `pnpm loop --dry` runs | L1, D5 |
| L3 | Cluster prop-bearing components into seams | `optimize/src/discovery/seams.ts` | ≥3 seams with members | L2 |
| L4 | Detect duplicate/dead/inlined strategy candidates | `optimize/src/discovery/duplicates.ts` | ≥1 actionable finding | L3 |
| L5 | Emit `loop/discovered.json`, `loop/tasks.json`, `loop/golden.jsonl` | `optimize/src/loop/` | artifacts reproducible | L2, L3 |
| L6 | Golden cases mined from existing test assertions | `GoldenCaseMiner` wiring | ≥10 cases; injected break detected | L5 |
| L7 | `ComponentStrategy<P>` + `registerDiscoveredStrategies` | `ui/src/strategies/`, `core/src/ui/` | new component auto-registers | L3, D5 |
| L8 | Wrap existing components as strategies (zero per-component glue) | `ui/src/strategies/` | `PropertyForm`, `TagInput`, `DescribeItComposer`, `TemplateSelector` registered | L7 |
| L9 | Task harness + tasks 1–3, N≥10, seeded | `ui/eval/` | TTI/steps/errors per config | L8 |
| L10 | `StrategySpec` + generator prompt + candidate dir | `optimize/src/synthesis/` | candidates emitted with provenance | L9 |
| L11 | Static gates: typecheck, lint, seam conformance, import allowlist, no ambient capabilities | `optimize/src/synthesis/gates.ts` | bad candidates rejected pre-build | L10 |
| L12 | Sandbox build + harness run for candidates | `optimize/src/synthesis/` | candidate measured against baseline | L11 |
| L13 | Adopt winner behind flag; record provenance | `ui/`, ledger | reversible adoption | L12 |
| L14 | S4 request emission (`loop/requests/<id>.md`) | `optimize/src/synthesis/requests.ts` | request from real evidence | L12 |
| L15 | Derive prompt JSON schema from ontology; repair loop | `ui/src/services/ai/`, `optimize/` | extraction validated against schema | L2 |
| L16 | LLM probe questions ranked by information gain | `ui/src/services/ai/` | properties gained per question measured | L15 |
| L17 | Ontology experiment: S1 flat vs S2 facets+status | `core/src/ontology/`, harness | recorded decision with evidence | L9, L17a |
| L17a | Lifecycle/status facet (`open→matched→committed→done→lapsed`) | `core/src/ontology/` | note can carry status; task 4 passes | — |
| L18 | Real-corpus ingestion → vocabulary + narrative tasks | `optimize/src/corpus/` | ≥1 narrative class beyond taxonomy | L5 |
| L19 | Ledger-lite (append-only decisions/deltas/provenance) | `core/src/suggestions/SuggestionStore.ts` | survives restart; dedupes | L5 |
| L20 | Determinism: pinned models, cached outputs, replay | `optimize/src/loop/` | identical hash on replay | L9 |
| L21 | A11y + keyboard assertions in the harness | `optimize/src/a11y.ts`, `ui/eval/` | violations fail the task | L9 |
| L22 | Pairwise preference measurement (human + judge, calibrated) | `ui/eval/` | win-rate with human calibration set | L9 |
| L23 | Profiles + policy + per-user overrides | `ui/src/settings/`, config | 2 profiles selectable, overrides persist | L8, L22 |
| L24 | Add simulator + optimize tests to `pnpm verify` | `scripts/verify.ts` | verify runs all suites | D3 |

### P — Product ergonomics (each needs a backend from L)

| ID | Item | Files | Acceptance | Depends |
|----|------|-------|-----------|---------|
| P1 | Natural-language capture path, end to end (schema + repair + review) | `DescribeItComposer`, `ExtractionReview`, `ui/src/services/ai/` | intent captured with fewer steps than form | L15 |
| P2 | Progressive + `on-match-failure` elicitation | `InsertPropertyModal`, `EnhancedPropertyForm` | lower TTI **and** lower abandonment | L9 |
| P3 | `workspace-layout` strategies: list vs two-pane | `DashboardView`, `NotesView` | selectable, measured | L8 |
| P4 | `match-display` strategies: inline vs sidebar | `LocalMatchPreview`, `DashboardLocalMatch` | selectable, measured | L8 |
| P5 | `intent-surface`: commitments/deadlines/status board | new view + L17a | a commitment can be completed | L17a, P3 |
| P6 | Template-first + conversational capture strategies | `TemplateSelector`, new | selectable, measured | L8 |
| P7 | Persist per-user strategy overrides | settings | survives reload | L23 |

### H — Human gates and research

| ID | Item | Acceptance | Depends |
|----|------|-----------|---------|
| H1 | **G1** stranger completes Golden Path <2 min unaided | 1 clean-profile run recorded (MP4/headless) | L9 artifacts |
| H2 | **G2** ≥70% of matches rated relevant by humans | 5 users, recorded ratings | H1, L22 |
| H3 | **G5** do users hit the single-device limit? | answered from H1/H2 sessions | H1 |
| H4 | Research decisions recorded (ontology, elicitation, prompting, synthesis, discovery, reality mgmt, narratives) | one decision doc per question in §14 | L17, L16, L12, L3 |

### Q — Quality and docs

| ID | Item | Acceptance |
|----|------|-----------|
| Q1 | Extend discovery tests (seam clustering, duplicates, task derivation) | each new module has focused tests |
| Q2 | Telemetry tests for `RunEvent` emission | event stream matches scenario actions |
| Q3 | README section for `pnpm loop` usage and artifacts | documented and accurate |
| Q4 | Keep `pnpm build` green across all six workspaces | CI gate |
| Q5 | Reconcile or retire `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md` (describes suggesters/AB tests that TODO.8/9 dropped) | no stale design doc left implying unimplemented work |

---

## 17. Parked work (explicit, with triggers)

Nothing here is forgotten; each has a reopen condition.

| ID | Work | Trigger to reopen |
|----|------|-------------------|
| W4 | Agent loop closure: confirmations, traces, undo (UI side) | clients request agent actions, or L2 autonomy for agent tools |
| W6 | Multi-device sync | G5 says users hit the single-device limit |
| A-L2 | Auto-apply medium-risk changes (non-UI mutation autonomy) | ≥10 clean cycles with 100% correct rollbacks |
| A-L3 | Canary autonomy | real-user telemetry at higher fidelity |
| CV | Maximin ratchets + t-wise covering arrays as *gates* | breadth work (L18) shows regressions across cells |
| ST | Formal power analysis | effect sizes prove noisy in practice |
| CI | Nightly matrix artifact run | D3 + L20 done and loop is cheap |
| FED | Federated / multi-relay community simulation | L18 stable on single relay |
| UI-R | `SuggestionsTab` review UI | CLI review of `loop/requests` becomes the bottleneck |
| DEP | Dead-code removal of Phase 1 infra **if** D5 wiring is abandoned | decided at L2 |

---

## 18. Sequenced next actions

1. **D1, D2** — make the evaluator honest (cheap, removes a trap).
2. **D10, D3, D4** — fix metrics persistence, then make `pnpm test` reliable, before any harness work.
3. **L1, L2** — taxonomy/config files and the `pnpm loop` entry point.
4. **L3, L4, D6** — seam clustering, duplicate detection, AST-derived actions. (Closes Cycle 0.)
5. **L7, L8, L9** — auto-registered strategies + baseline harness. (Closes Cycle 1.)
6. **D5** — decide: wire the registries (L2/L7) or delete them.
7. **L10–L14** — synthesis with gates, then the request path. (Cycles 2–3.)
8. **L15–L17a** — prompt schema, probing, ontology experiment. (Cycle 4.)
9. **L18** — real corpora. (Cycle 5.)
10. **H1 → H2 → H3** — human testing, in parallel from step 5.
11. **L19–L24, P1–P7** — ledger, determinism, profiles, product surfaces.
12. **Q1–Q4** — tests and docs alongside each step, not after.

**Definition of done (draft):** the loop discovers its own seams, derives its own tasks, generates at least one shipped strategy, emits at least one developer request from evidence, and produces recorded decisions on the ontology and prompt questions — with every adopted change reversible and every number traceable to a run.

---

*End of TODO.9.md (draft) — derive instead of author, synthesize instead of enumerate, sample narratives instead of claiming coverage, and keep humans on the ground truth. This document is the single source of truth for remaining work.*
