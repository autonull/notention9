# Notention Development Plan (TODO.8.md)

> ⚠️ **Superseded by [TODO.9.md](./TODO.9.md).** TODO.9 keeps this relaxed goal and adds a
> metaprogramming layer (derive seams/tasks/schemas/golden cases from source and ontology)
> plus synthesis (LLM-written strategies, or evidence-backed developer requests).
> Kept for reference.

Supersedes TODO.7.md. TODO.7's rigor (maximin coverage, L2 autonomy, t-wise arrays, ratchets) is **relaxed**: the goal is narrower and the timeline shorter.

> **Goal:** optimize Notention's UI/UX so users more ergonomically achieve **reality management** and **intent satisfaction** — and start improving the real system now.

TODO.7's architecture is retained as a reference (see §11 notes and §10 taxonomy). What changes is *what we optimize* and *how strict we are about proving it*.

---

## 0. What changed, and why

| TODO.7 | TODO.8 (relaxed) |
|--------|------------------|
| Prove a general self-improvement machine | Improve ergonomics; prove only what's needed to choose |
| Acceptance requires observed + holdout + golden + constraints + ratchet | Acceptance = better on a task, no golden break, human decides |
| L2 autonomy / auto-apply as a goal | **Not a goal.** Candidates + evidence + human choice |
| Maximin over cells, t-wise coverage as a gate | Taxonomy is a **generator of tasks**, not a gate |
| Heavy statistical apparatus | Medians over N reps, pairwise preference; bootstrap only if cheap |
| Phase A→D infrastructure before value | **Cycle 0 ships a real UI improvement** |
| One best answer | A **policy/portfolio** of configurations, personalized |

**New infrastructure is now explicitly allowed.** The previous "no new test infrastructure" anti-goal is lifted where it serves the goal (a task harness and a UI-strategy spine are the point).

**The single most useful observation:** `UIConfiguration`, `UIRegistry`, `UIAdapter` exist in `core/src/ui/UIAdapter.ts` and are **imported by nothing** (`grep` finds only their own definitions). We built the pluggable-UI spine in Phase 1 and never plugged it in. Wiring it *is* the first UI improvement.

---

## 1. The goal, stated so it can be measured

**Reality management:** the user can represent and act on their actual situation — needs, offers, commitments, obligations, deadlines, status — not just write text.
**Intent satisfaction:** a stated intent reliably reaches an outcome (a match, a plan, a resolved obligation).
**Ergonomics:** the cost of expressing intent is low — few steps, little typing, no re-reading, no guessing what the system wants.

Primary measures (in trust order):

| Measure | Definition | Why |
|---------|-----------|-----|
| **Time-to-intent (TTI)** | start → a note that satisfies the task's intent predicate | direct ergonomics |
| **Steps** | interactions/clicks/keystrokes per intent | direct ergonomics |
| **Completion** | fraction of task attempts that succeed | capability |
| **Error/correction rate** | edits, backtracks, abandoned flows | friction |
| **Match-at-first-attempt** | intent reaches a match without rework | intent satisfaction |
| **Preference** | pairwise win rate between configs on the same task | "don't settle on one" |
| **Satisfaction** | user/LLM-judge rating | soft signal, screened not gated |

LLM-as-judge is a **screening** tool, calibrated against a small human-labeled set. It never decides alone.

---

## 2. The three design spaces are one search space

The open questions aren't separate projects — they are three **coupled genes** that jointly determine ergonomics:

```
        ┌────────────────────────┐
        │ ONTOLOGY STRUCTURE     │  what can be expressed
        │ flat · facets · graph  │
        └───────────┬────────────┘
                    │ constrains what the UI can ask for
        ┌───────────▼────────────┐
        │ UI CONFIGURATION       │  how detail is elicited
        │ strategy per seam      │
        └───────────┬────────────┘
                    │ determines what language must be translated
        ┌───────────▼────────────┐
        │ PROMPT STRATEGY        │  how language becomes structure
        │ zero/few/schema/repair │
        └───────────┬────────────┘
                    ▼
             TTI · steps · completion · preference
```

A change in one shifts the optimum of the others. That's why we search them **jointly** and why the loop matters: the answer to "how should the ontology be structured?" is empirical, not architectural.

---

## 3. UI = a configuration of strategies

### 3.1 Seams and genome

A **seam** is a stable interface for a UI responsibility. A **strategy** is one interchangeable implementation of a seam. A **genome** is one strategy per seam plus parameters.

```ts
interface UIConfiguration {
  id: string;
  strategies: Record<Seam, StrategyId>;   // one choice per seam
  params: UIParams;                        // density, verbosity, suggestion aggressiveness…
  theme?: ThemeConfig;
}
```

Extends the existing `UIConfiguration` (`core/src/ui/UIAdapter.ts:53`) rather than replacing it. **New strategies must be drop-in behind an existing seam** — the same "seams over special cases" rule the metaphor plugins already follow.

### 3.2 Strategy catalog (the initial menu)

| Seam | Strategies | Notes |
|------|-----------|-------|
| `capture` | `structured-form` · `tag-inline` · `natural-language` · `template-first` · `conversational` | existing: `PropertyForm`, `TagInput`, `DescribeItComposer`, `TemplateSelector` |
| `detail-elicitation` | `upfront-required` · `progressive` · `on-match-failure` · `llm-probe` · `ghost-suggest` | **the core ergonomics lever** |
| `workspace-layout` | `list` · `cards` · `two-pane` · `kanban` · `timeline` · `graph` | |
| `match-display` | `inline-badge` · `sidebar` · `digest` · `comparison` | existing: `LocalMatchPreview`, `DashboardLocalMatch` |
| `ontology-browse` | `tree` · `facets` · `graph` · `search-first` | existing: `OntologyView` |
| `intent-surface` | `commitments-board` · `deadlines` · `status-pipeline` | reality management; needs ontology support (§4) |
| `prompt` | `zero-shot` · `few-shot` · `schema-constrained` · `repair-loop` · `tool-use` | §5 |

Parameters (per genome): `density`, `verbosity`, `maxSuggestions`, `autocompleteAggressiveness`, `propertyOrder`, `groupBy`, `progressiveThreshold`.

### 3.3 "Try them all" → a policy, not a winner

The output of evaluation is **not** one blessed UI. It is:

1. **Profiles** — a few named genomes (e.g. `beginner`, `power`, `mobile`, `hiring`, `care`).
2. **A policy** — context → genome. Context features: proficiency, task kind (capture/match/organize), domain, device, note count, match density.
3. **Per-user overrides** — any seam can be pinned; the loop learns from accept/reject and TTI.

That is the path to "a fully evolved UI customized to preferences and use cases": a portfolio plus a selector, evolved continuously.

### 3.4 Reuse, don't rebuild

`UIRegistry`, `UIAdapter`, `ComponentConfig.variant`, and `ThemeConfig` already model most of this. Work is to (a) add `strategies` + `params` + `policy`, (b) register real components against seams, (c) add a runtime switch for evaluation. No new component library; existing components get wrapped.

---

## 4. Ontology structure as a strategy space

What must be expressible: **descriptions** (offers/needs/capabilities) *and* **state** (open → matched → committed → done → lapsed). Reality management requires lifecycle, not just attributes.

Candidate structures to test (as `OntologyAdapter` variants):

| ID | Structure | Strength | Risk |
|----|-----------|----------|------|
| S1 | Flat key + operator + values (status quo) | trivial to elicit | no relations, no state |
| S2 | Typed facets: identity · capability · constraint · commitment · status · time · place · resource | expresses reality management | more to elicit |
| S3 | Graph: typed relations (`person→offers→skill`, `note→satisfies→intent`) | queryable structure | harder to author |
| S4 | Core + domain schemas (hiring/research/care) | precise matching | fragmentation |
| S5 | Freeform + inferred at read time (LLM maps to core) | zero elicitation | accuracy/latency cost |

Measure per structure: match quality on tasks, **elicitation cost to reach expressiveness**, LLM extraction accuracy, and whether a user can express intent unaided.

**Working hypothesis:** S2 (facets with status) + S5 (infer when possible) gives the best ergonomics; S1 is cheap but cannot represent obligations. Test it, don't assume it.

---

## 5. Prompt strategy as a strategy space

LLM uses, each with its own eval:

| Purpose | Strategy space | Measure |
|---------|---------------|---------|
| **Semantic translation** (NL → properties) | zero-shot · few-shot · schema-constrained JSON · repair loop · tool-use (ontology lookup) | extraction precision/recall, latency, tokens |
| **Targeted probing** (ask the 1–3 questions that most raise matchability) | fixed checklist · information-gain ranked · LLM-generated | properties gained per question, TTI |
| **Normalization/aliasing** | rule-based · LLM · hybrid | alias precision, ontology growth |
| **Match explanation** | template · LLM | comprehension, preference |
| **Digest/summary** | extractive · LLM | verbosity preference |
| **Judge** (UX screening) | rubric · pairwise | agreement with humans |

Rules: schema-constrained output first, repair loop on invalid; **pin model versions**; cache outputs keyed by `(prompt, input, model, version)`; run the eval set on every prompt or model change. Existing `LocalProvider`/`RemoteProvider`/`WebLLMProvider` are the substrate.

---

## 6. The loop, relaxed

```
 TASKS (from taxonomy + real dogfooding)
    │
    ▼
 CONFIGS (genomes: strategies × params)  ──► dedicated task harness (Playwright, seeded)
    │                                              │
    │                                              ▼
    │                                        TTI · steps · errors · completion
    │                                              │
    │                                              ▼
    │                                     aggregate + pairwise preference
    │                                              │
    │                                              ▼
    │                                     CANDIDATES (ranked, with evidence)
    │                                              │
    │                                              ▼
    └──────────────────────────────────────► HUMAN DECIDES → ship profile or default
                                                   │
                                                   ▼
                                             LEDGER-LITE (what changed, measured delta, why)
```

Differences from TODO.7: no autonomy ladder, no ratchet requirement, no covering-array prerequisite. The ledger is a simple append-only JSON of decisions and deltas — enough to avoid repeating failures and to show progress.

**Relaxed acceptance rule:** keep a candidate if `median(TTI_target)` or completion improves beyond run-to-run noise over N ≥ 10 reps, no golden behavior breaks, and a human signs off. That's it.

**Determinism** stays (seeded runs, cached LLM outputs) because it is cheap and makes comparisons honest.

---

## 7. Task harness

Tasks, not scenarios, are the unit of measurement. A task = start state + intent predicate + success check.

Initial set (each with a machine-checkable predicate):

1. Capture a need with ≥3 properties in < 20 s, no help text.
2. Capture an offer and see ≥1 match without re-editing.
3. Convert a free-text paragraph into a valid structured note.
4. Convert an open note into a commitment with a status and a deadline.
5. Find a specific note by intent, not by title.
6. Add a missing detail after a failed match (elicitation test).

Harness: Playwright, per-config browser context (already supported by `BrowserManager`), seeded data, N reps, median + spread; optional pairwise preference via two configs side by side (human or judge).

---

## 8. Immediate wins (start now)

**Cycle 0 (this week) — wire the spine, ship one real improvement**
| # | Item | Files | Done when |
|---|------|-------|-----------|
| 0.1 | `UIConfiguration` with `strategies` + `params`; runtime switch (dev toggle) | `core/src/ui/UIAdapter.ts`, `ui/src/…/UIConfigProvider` | Switch genomes at runtime, no reload |
| 0.2 | Register two `capture` strategies: `structured-form` (existing) and `natural-language` (`DescribeItComposer` → schema-constrained extraction + repair) | editor components, `ui/src/services/ai/` | Both produce a valid note |
| 0.3 | Register two `detail-elicitation` strategies: `upfront-required` vs `progressive` (+ `on-match-failure`) | `InsertPropertyModal`, `EnhancedPropertyForm` | Selectable, behavior differs |
| 0.4 | Task harness with tasks 1–3, N=10 | new `ui/eval/` | Emits TTI/steps/errors per config |
| 0.5 | Pick default from evidence; keep both selectable | settings | Recorded in ledger-lite |

**Cycle 1 — layouts and preference**
- Add `workspace-layout` (`list` vs `two-pane`) and `match-display` (`inline` vs `sidebar`).
- Pairwise preference on tasks 2 and 5 (human dogfood + judge screen).
- Derive first two profiles (`beginner`, `power`) and a trivial policy.

**Cycle 2 — ontology and prompts**
- Test S1 vs S2 (facets + status) on tasks 1–4; measure elicitation cost.
- Sweep prompt strategies for semantic translation (few-shot vs schema vs repair) on tasks 3 and 6.
- Add task 4 (commitment) only if S2 shows promise.

---

## 9. Roadmap

| Phase | Focus | Exit |
|-------|-------|------|
| **0** | Spine + 2 capture + 2 elicitation strategies + tasks 1–3 | Shipped default backed by measurement |
| **1** | Layouts, match display, preference, 2 profiles | Contextual policy v0 |
| **2** | Ontology structures (S1/S2), prompt strategies, task 4 | Evidence on the ontology question |
| **3** | Personalization (per-user overrides, learned), more strategies | "Customized to preferences" |
| **4** | Taxonomy-driven breadth (§10), adversarial tasks | Coverage of use cases |
| later | Adversarial robustness, real corpora, community sim | — |

---

## 10. Taxonomy (retained for further consideration)

Kept as a **generator of tasks and scenarios**, not a gate. Structure vs skin: domains are skins; structure stresses the system.

| Axis | Levels | Source |
|------|--------|--------|
| Social form | communal sharing · authority ranking · equality matching · market pricing | Fiske |
| Topology | 1:1 · 1:N · N:M · chain · coalition · hierarchy · mesh | matching markets |
| Exchange | goods · labor · knowledge · capital · care · space · access · commitment · status · identity | Polanyi + needs |
| Stakes | informational · social · economic · legal · safety · existential | severity |
| Temporality | one-shot · recurring · open-ended · deadline · ephemeral · generational | time structure |
| Heterogeneity | shared jargon · cross-domain · multilingual · tacit · contested | Hall |

Modifiers: scale (dyad→Dunbar→org→market), trust, Ostrom governance, power asymmetry, formality, dignity/face/honor.

Universals audit (map each to ≥1 cell): kinship · gift/reciprocity · redistribution · market · division of labor · property · contract · conflict resolution · law · ritual · status · alliance · family formation · apprenticeship · caregiving · inheritance · hospitality · taboo · commons · debt · reputation · oath · sanctuary · tribute.

**Optional coverage tool:** t-wise covering arrays (IPOG) to pick the next task family to add. Use when breadth matters, not as a precondition.

Honest audit retained: all 13 current scenarios are one cell (N:M · market pricing · economic · one-shot · shared vocabulary) — single-digit pairwise coverage. Expect care/kinship/obligation tasks to expose that the core model assumes priced, simultaneous, dyadic exchange.

---

## 11. Notes retained from TODO.7

- **Observed, not estimated.** Metrics from a real run (the simulator already uses the real `MatchEngine`). Static heuristics are labelled priors.
- **`uxEvaluator` is not trustworthy yet:** metrics derive from scenario config; `uiuxEvaluator.ts:426` scores >1; the CLI ignores `--scenarios`/`--threshold-*` (`uxEvaluate.ts:37`). Fix before trusting any number, or bypass it in favour of the task harness.
- **Search may be cheap; decisions must be honest.** Proxies propose; task measurement disposes; humans decide.
- **Ledger-lite:** append-only record of decisions, deltas, evidence; prevents repeating failures.
- **Determinism:** seeds + cached LLM outputs; replayable comparisons.
- **Versioned artifacts:** ontology and UI configs are versioned; UI changes are reversible.
- **Golden behaviours:** a small set that must never break (round-trip, capability gate, a11y).
- **Human ratings are ground truth**; LLM judges are screening only.

**Truly deferred:** L2/L3 autonomy, auto-apply, maximin ratchets, formal power analysis, nightly CI matrix, federated simulation.

---

## 12. Risks (relaxed register)

| ID | Risk | Mitigation |
|----|------|------------|
| U1 | Optimizing speed, not ergonomics | include preference + satisfaction, not just TTI |
| U2 | Overfitting synthetic tasks | real dogfooding; rotate tasks; human ratings |
| U3 | LLM-judge bias | calibrate on human labels; never sole gate |
| U4 | Config explosion / fragmentation | stable seams, shared tokens, bounded catalog, deprecation path |
| U5 | Prompt/model drift invalidates results | pin versions, cache, re-run eval on change |
| U6 | Ontology churn breaks notes | additive-first, versioned adapters, golden set |
| U7 | Untrusted numbers (known evaluator defects) | fix or bypass; task harness is authoritative |
| U8 | Elicitation makes capture feel like a form | measure abandonment; progressive-first hypothesis |
| U9 | Too many variants confuse users | profiles + policy; users pick a profile, not a genome |

---

## 13. Sharpened research agenda

1. **Ontology:** is facet-with-status (S2) + infer-when-possible (S5) better than flat (S1) for *both* expressiveness and elicitation cost? → Tasks 1–4 across S1/S2.
2. **Elicitation:** progressive + on-match-failure vs upfront — which yields lower TTI *and* lower abandonment? → Task 6, then task 2.
3. **Prompting:** schema-constrained + repair vs few-shot for semantic translation — accuracy per token, and does better extraction actually reduce user effort? → Tasks 3, 6.
4. **Configuration:** are the best strategies dependent on proficiency/task enough to justify a policy, or is one genome good enough? → pairwise preference across profiles.
5. **Reality management:** does adding lifecycle/status to notes change behavior (commitments completed) or just add fields? → task 4.

Each has a concrete experiment, a measure, and a decision it informs.

---

## 14. Sequenced next actions

1. **Cycle 0.1** — add `strategies`/`params` to `UIConfiguration` and a runtime switch.
2. **Cycle 0.2** — wrap existing components as strategies; make `natural-language` capture real (schema-constrained + repair).
3. **Cycle 0.4** — task harness for tasks 1–3; establish baselines.
4. **Cycle 0.5** — ship the measured default, keep both selectable, log the decision.
5. Then Cycle 1 (layouts + preference + profiles) and Cycle 2 (ontology + prompts).

**Definition of done for the relaxation:** within two cycles, at least one *shipped* default UI change is backed by measured TTI/steps/completion improvement, at least two strategies remain user-selectable per changed seam, and the ontology/prompt experiments have produced decisions rather than opinions.

---

*End of TODO.8.md — optimize ergonomics, ship improvements now, search three coupled spaces (ontology · UI · prompts), and let the UI be a portfolio of strategies rather than a single compromise.*
