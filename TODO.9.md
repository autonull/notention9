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

## 15. Sequenced next actions

1. **Cycle 0** — wire `optimize/src/discovery` into `pnpm loop discover`; emit seams/tasks/golden.
2. **Cycle 1** — `ComponentStrategy` + auto-registration + baseline harness.
3. **Cycle 2** — S2 LLM strategy synthesis with guards; adopt a winner.
4. **Cycle 3** — S4 request emission for what synthesis can't safely build.
5. **Cycle 4–5** — prompt/ontology synthesis, then real corpora.

**Definition of done (draft):** the loop discovers its own seams, derives its own tasks, generates at least one shipped strategy, emits at least one developer request from evidence, and produces recorded decisions on the ontology and prompt questions — with every adopted change reversible and every number traceable to a run.

---

*End of TODO.9.md (draft) — derive instead of author, synthesize instead of enumerate, sample narratives instead of claiming coverage, and keep humans on the ground truth.*
