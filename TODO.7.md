# Notention Development Plan (TODO.7.md)

Supersedes TODO.6.md. Gates, completed batches, and shipped infrastructure carry forward. The improvement loop is rearchitected so that "self-improvement" means **measured, bounded, reversible, holdout-validated change** — not a queue of suggestions judged by a static estimator.

---

## 0. Why TODO.6's loop cannot self-improve (verified)

| Defect | Evidence | Consequence |
|--------|----------|-------------|
| **It estimates, it does not measure** | `optimize/src/uiuxEvaluator.ts` computes every metric from `Scenario` *config* (`estimate*` methods read `agents`/`events`). It never consumes simulation output. | Optimizing it improves nothing real. It is a static heuristic, not a measurement of the product. |
| **The score is mathematically broken** | `uiuxEvaluator.ts:426` — when only `max` is set, `1 - (value - max)/max` is uncapped, so values below `max` score **>1**. Observed overall scores of 108–113%. | A "score" that exceeds 100% cannot rank candidates or gate anything. |
| **CLI flags are silently ignored** | `cliHandlers/uxEvaluate.ts:23-37` builds a `config`, then calls `uxEvaluator.evaluateAll()` on the module singleton. `--scenarios freelance-marketplace` reported "Scenarios Evaluated: 13". | No reproducible, configurable evaluation. Trust is impossible. |
| **No holdout, no ledger, no regression oracle** | Suggester/ABTest/guard do not exist yet. | Search would overfit the proxy; nothing accumulates; no way to know if change #7 broke change #3. |
| **Human gate is the only gate** | Design: every suggestion needs human apply. | This is *assisted* improvement, not self-improvement, and it does not scale. |

**The shift:** separate **search** (cheap, biased, exploratory) from **acceptance** (strict, observed, holdout-validated, reversible). Tie it together with a **ledger** so gains accumulate and failures are remembered.

---

## 1. What "true self-improvement" must mean — and its honest ceiling

A change counts as improvement only if all hold:

1. **Observed** — metrics come from an actual run (real `MatchEngine`, real UI or headless), not from config.
2. **Attributable** — a controlled trial isolates the change from noise.
3. **Holdout-validated** — gains reproduce on scenarios the search never saw.
4. **Constraint-safe** — no hard metric or golden case regresses.
5. **Reversible** — the change is a versioned artifact that can be swapped back atomically.
6. **Accumulated** — recorded in a ledger; the holdout curve is non-decreasing over accepted changes.

**Viability verdict (honest):**

| Level | Achievable | Notes |
|-------|-----------|-------|
| Analyze only | ✅ trivially | Today's state |
| Propose, human applies (L1) | ✅ soon | Good value, low risk |
| **Auto-apply reversible low-risk changes (L2)** | ✅ **target** | Realistic ceiling for "self-improvement" now |
| Auto-apply medium-risk with canary (L3) | 🟡 later | Needs higher-fidelity measurement + real users |
| Unbounded code self-rewrite (L4) | ❌ not viable | Unverifiable, unsafe; stays an out-of-band human PR |

Self-improvement here = **the loop reliably finds and keeps small, real, reversible gains**. It is not an autonomous programmer. Claiming otherwise would be dishonest and would produce reward-hacked junk.

---

## 2. Invariants (enforced in code and tests)

1. **Search never decides acceptance.** Proposers may use cheap proxies; acceptance may not.
2. **Acceptance requires observed metrics + holdout + golden corpus + constraints** — all four.
3. **Every applied change is a versioned artifact.** Apply = swap; rollback = swap back.
4. **Same config + same seed ⇒ identical run-bundle hash.** Non-determinism is a bug.
5. **The ledger is append-only.** Rejected/failed proposals are remembered and never silently retried.
6. **No auto-apply outside the allowlist and declared bounds.**
7. **Proxy estimates are labelled.** Never reported as user truth.
8. **Human ratings (G2) are ground truth.** The loop cannot override them; it can only propose.

---

## 3. Architecture: the Loop

```
 config ─┐
         ▼
 ┌───────────────┐   RunBundle (events.jsonl, seed, hash)
 │ 1 RUNNER      │──────────────────────────────┐
 │ scenarios     │                              │
 │ train/holdout │                              │
 └───────────────┘                              ▼
 ┌───────────────┐   metrics.json        ┌───────────────┐
 │ 2 ANALYZER    │◄──────────────────────│ observed      │
 │ observed only │                       │ telemetry     │
 └───────┬───────┘                       └───────────────┘
         ▼
 ┌───────────────┐
 │ 3 SCORER      │  objective vector + hard constraints + Pareto
 └───────┬───────┘
         ▼
 ┌───────────────┐   proposals.json      (config-driven mutation grammar)
 │ 4 PROPOSER    │◄──────────────────── ledger.read()   ◄── avoids re-proposing failures
 └───────┬───────┘
         ▼
 ┌───────────────┐   trials.json, verdicts.json
 │ 5 TRIAL       │  control vs candidate on TRAIN; effect + bootstrap CI
 └───────┬───────┘
         ▼
 ┌───────────────┐   holdout.json
 │ 6 VERIFY      │  holdout + golden corpus + constraints
 └───────┬───────┘
         ▼
 ┌───────────────┐   applied.json, version bump
 │ 7 POLICY      │  autonomy ladder: auto-apply L2-eligible, else queue
 └───────┬───────┘
         ▼
 ┌───────────────┐   ledger entry (change, evidence, delta, verdict, outcome)
 │ 8 LEDGER      │  append-only memory
 └───────┬───────┘
         ▼
 ┌───────────────┐
 │ 9 GUARD       │  watch golden corpus + constraints → auto-rollback
 └───────────────┘
```

One cycle = one `pnpm loop` invocation = one immutable `loop/runs/<runId>/` bundle. No hidden state outside the ledger and the run bundle.

---

## 4. Honest measurement — Phase A (highest priority)

The single highest-leverage change: **the analyzer must consume observed telemetry.**

- **Runner telemetry:** `ScenarioRunner`/`Agent` currently `console.log` matches. Add a structured `RunEvent` sink (`agent.publish`, `match`, `match.explain`, `latency`) and write `events.jsonl`. `Agent` already runs the real `MatchEngine` (`simulator/src/agent.ts:67`), so observed matching is free.
- **Analyzer:** derive metrics from events (e.g. `match-relevance` = observed accepted-relevance proxy, `time-to-first-match` = first match timestamp − first publish timestamp, `notification-timeliness` = observed delta). Keep the static estimators only as `priors`, clearly labelled, used by search — never by acceptance.
- **Scorer:** objective **vector** of 3–4 core metrics + hard constraints for the rest. Fix `uiuxEvaluator.ts:426`; assert `0 ≤ score ≤ 1` in tests.
- **CLI honesty:** pass config into the evaluator (kill the singleton call at `uxEvaluate.ts:37`); test that `--scenarios` and `--threshold-*` actually change output.
- **Determinism:** seed agents/relays/timers; `--replay <runId>` reproduces the bundle hash.

**Acceptance:** identical config+seed ⇒ identical `events.jsonl` hash; `--scenarios X` evaluates only X; every score ∈ [0,1]; metrics derived from events, not config.

---

## 5. Objective: constraints + Pareto, not a weighted sum

- **Objective vector** (small, tractable): `match-relevance`, `time-to-first-match`, `match-acceptance-rate`.
- **Hard constraints** (everything else): e.g. `export-success-rate == 1.0`, `confirmation-clarity >= 0.8`, `no golden case regresses`, `per-scenario drop <= 0.03`.
- **Ranking:** (1) drop candidates violating constraints → (2) Pareto-nondominance on the vector → (3) tie-break by declared priority order.
- **No arbitrary global weights** in acceptance. Weights may exist as a search prior only.

Rationale: weighted sums are gameable and arbitrary; dominance + constraints is honest and doesn't require tuning.

---

## 6. Change space: one typed grammar, config-driven

Replace `UISuggester` + `OntologySuggester` (duplicated rule tables) with **one `MutationEngine`** reading `mutations` config. Proposals are typed deltas over existing artifacts:

| Class | Examples | Risk | Autonomy |
|-------|----------|------|----------|
| `ontology.alias.add` | add synonym to an attribute | low | L2 |
| `ontology.operator.default` | change default operator for a key | low | L2 |
| `ontology.property.add` | add missing property (rare) | medium | L1 |
| `ontology.property.remove` | remove property | high | L1 + sign-off |
| `ontology.hierarchy.add` | group co-occurring keys | medium | L1 |
| `template.add` / `template.promote` | new/boosted template | low | L2 |
| `match.weight.tune` | bounded numeric tuning | low | L2 (bounded) |
| `ui.component.prop` / `ui.variant` | adapter config delta | medium | L1 |
| `core.code` | source rewrite | — | ❌ denied |

Search strategy (efficient first): **deterministic rule proposals** from evidence, plus **bounded coordinate-ascent** for numeric knobs within declared bounds. No evolutionary search until rule-based search plateaus (deferred; costs time we don't need to spend yet).

---

## 7. Ledger: the memory that makes it "self"

Extend `core/src/suggestions/SuggestionStore.ts` (don't add a database): each entry gains `change` (artifact delta), `evidence`, `trialDeltas`, `holdoutVerdict`, `outcome` (`applied|rejected|rolled-back`), `runId`, `artifactVersion`.

The ledger gives:
- **Dedupe/pruning** — never re-propose a known failure (invariant 5).
- **Audit** — every current behavior is traceable to a change + evidence.
- **The north-star metric** — a **cumulative holdout-composite curve** per accepted change. If it isn't non-decreasing, the loop isn't self-improving.

---

## 8. Verifier: golden corpus is the regression oracle

`loop/golden/corpus.jsonl`: curated cases capturing behavior we must not lose (specific match pairs, note round-trips, capability decisions, accessibility snapshots). Any accepted change must pass **all** golden cases; failure ⇒ block (pre-promotion) or **auto-rollback** (post-apply). This is what prevents "improving" one metric by breaking another.

---

## 9. Autonomy ladder (what ships without a human)

| Level | Applies | Gate |
|-------|---------|------|
| L0 | nothing | report only |
| L1 | nothing (queue only) | human applies |
| **L2** | allowlisted low-risk ops within bounds | observed + holdout + golden + constraints + auto-rollback armed |
| L3 (deferred) | medium-risk with canary | L2 + higher-fidelity measurement |

Default ships at **L2** for `{alias.add, operator.default, template.add/promote, match.weight.tune}`. Everything else is L1. `core.code` is denied.

---

## 10. Configurability — the whole interface is a config file

Everything variable is data. Hardcoded policy is a defect.

```jsonc
// loop.config.json
{
  "seed": 42,
  "autonomy": "L2",
  "objective": {
    "vector": ["match-relevance", "time-to-first-match", "match-acceptance-rate"],
    "priority": ["match-relevance", "match-acceptance-rate", "time-to-first-match"],
    "constraints": [
      { "metric": "export-success-rate", "op": "==", "value": 1.0 },
      { "metric": "confirmation-clarity", "op": ">=", "value": 0.8 }
    ],
    "noRegression": { "perScenarioMaxDrop": 0.03 }
  },
  "corpus": {
    "train":   ["freelance-marketplace", "hiring-pipeline", "cofounder-matching"],
    "holdout": ["research-collaboration", "events-networking", "open-source-contrib"],
    "golden":  "./loop/golden/corpus.jsonl",
    "repetitions": 3
  },
  "mutations": {
    "allow": ["ontology.alias.add", "ontology.operator.default", "template.add", "match.weight.tune"],
    "bounds": {
      "match.weight.tune": { "min": 0.5, "max": 2.0, "maxDelta": 0.25 },
      "template.add": { "maxPerCycle": 2 }
    },
    "deny": ["ontology.property.remove", "core.code"]
  },
  "budget": { "maxProposals": 8, "maxTrials": 24, "wallClockMs": 900000, "parallelism": 4 },
  "fidelity": { "search": "observed-headless", "promote": "holdout+human-sample" },
  "promotion": { "minEffect": 0.02, "confidence": 0.95, "minHoldoutRuns": 3 },
  "rollback": { "onGoldenFailure": true, "onConstraintBreach": true },
  "telemetry": { "sink": "./loop/runs", "retain": 50 }
}
```

Run bundle (immutable, hashable):

```
loop/runs/<runId>/
  config.json  seed.txt  events.jsonl  metrics.json
  proposals.json  trials.json  verdicts.json  holdout.json
  applied.json  ledger.diff  summary.md
```

Commands (one entry point, not many):

```
pnpm loop                 # one cycle: run → score → propose → trial → verify → policy → ledger
pnpm loop --dry           # analyze + propose only (L0/L1)
pnpm loop:replay <runId>  # deterministic reproduction
pnpm loop:diff <a> <b>    # cycle comparison
pnpm loop:apply <id>      # human apply (L1 queue)
pnpm loop:rollback <id>
```

---

## 11. Determinism & execution efficiency

- **Seeds everywhere** (agents, timer jitter, shuffle). Same config ⇒ byte-identical bundle.
- **Fidelity ladder for speed:** search screens at headless-observed (no browser); only promoted candidates run the real UI (Playwright) — and only once promotion is actually needed.
- **Budgeted cycles:** `maxProposals/maxTrials/wallClockMs/parallelism` in config; the loop stops on budget, not on a mood.
- **Ledger pruning:** skip spaces already proven bad.
- **Scenario corpus curated, not exhaustive:** keep the 6–9 scenarios that discriminate; drop redundant ones (13 undifferentiated scenarios is wasted compute).
- **Caching:** keyed by `(artifact version, scenario, seed)`; reuse unchanged control runs across a cycle.

---

## 12. Consolidated work items (reprioritized)

Order is deliberate: **measurement → change space → closed loop → autonomy → surfaces.** Each phase is independently shippable.

### Phase A — Honest Measurement (do first; unblocks everything)
| # | Item | Acceptance |
|---|------|-----------|
| A1 | `RunEvent` telemetry sink → `events.jsonl` | Events captured from real `MatchEngine` run |
| A2 | Analyzer computes metrics from events; estimators demoted to `priors` | Metrics are observed, not config-derived |
| A3 | Scorer: objective vector + constraints + Pareto; fix `uiuxEvaluator.ts:426`; cap [0,1] | `score ∈ [0,1]` asserted; Pareto ranking tested |
| A4 | Config plumbed into evaluator; kill singleton call | `--scenarios`/thresholds change output (test) |
| A5 | Seeded determinism + `loop:replay` | Identical hash on replay (test) |

### Phase B — Change Space + Ledger + Oracle
| # | Item | Acceptance |
|---|------|-----------|
| B1 | `MutationEngine` from `mutations` config; typed proposals | Config drives which proposals appear |
| B2 | Extend `SuggestionStore` → ledger fields; append-only | Outcomes recorded; failures deduped |
| B3 | Golden corpus loader + regression check | Injected regression blocks promotion |
| B4 | Artifact apply/rollback via adapter versioning | apply→rollback restores byte-identical artifact |

### Phase C — Closed Loop (L1)
| # | Item | Acceptance |
|---|------|-----------|
| C1 | `TrialEngine` (control vs candidate, train-only, deterministic) | Deltas reproducible |
| C2 | Verdict: effect size + bootstrap CI + constraints | No-effect candidates rejected |
| C3 | Holdout validation before promotion | Candidate passing train but failing holdout is rejected |
| C4 | `pnpm loop` orchestrator + run bundles + `summary.md` | One command produces a full bundle |

### Phase D — Bounded Autonomy (L2)
| # | Item | Acceptance |
|---|------|-----------|
| D1 | Autonomy policy per op (allowlist + bounds) | Denied ops never auto-apply (test) |
| D2 | Auto-apply + auto-rollback guard | Injected golden failure reverts automatically |
| D3 | Ledger-driven pruning | Known-bad proposals not re-emitted |

### Phase E — Human Surfaces & Scale (deferred until they are the bottleneck)
| # | Item | Trigger |
|---|------|---------|
| E1 | Review CLI/JSON queue polish | L1 volume grows |
| E2 | `SuggestionsTab` UI | CLI review becomes painful |
| E3 | Nightly CI artifact run | Loop deterministic + cheap (needs I5 fixed) |
| E4 | Federated/community simulation | Single-relay loop stable |

---

## 13. Cuts & deferrals (efficiency)

- **Cut:** separate `UISuggester`/`OntologySuggester` → one `MutationEngine`.
- **Cut:** `ABTestRunner` + `MatrixRunner` + `TestMatrix` → one `TrialEngine` (a matrix is trials × scenarios).
- **Cut:** bespoke statistical framework → one bootstrap module.
- **Cut:** new suggestion DB → extend existing store into a ledger.
- **Cut:** new version system → reuse `OntologyVersion`/`OntologyChange`.
- **Defer:** evolutionary search, formal power analysis, review UI, nightly CI, federated sim, L3+ autonomy.
- **Trim:** 13 scenarios → curated train/holdout (6–9 discriminating).

---

## 14. State & gates (carried forward)

| Item | State |
|------|-------|
| Batches A/B/C (trust, demo, metaphor) | ✅ complete |
| W5 + W5b (CBOR/NoteID/signing, protocol testbed) | ✅ complete |
| Extensibility Phase 1 (adapters, registries, suggestion store, scenarios, `ux-evaluate`, MetricsTab) | ✅ complete (infra), ⚠️ evaluator not trustworthy |
| G0 verify | ✅ |
| G3 data durability | ✅ |
| G4 interop-first | ✅ YES |
| G6 MP4 | ✅ |
| G1 stranger Golden Path | ⏳ run now, in parallel with Phase A |
| G2 human relevance ≥70% | ⏳ after G1 — remains ground truth |
| G5 single-device limit | ⏳ after G3 |

**Tests:** core 398 · simulator 20 · agent 17 · ui per-file OK (full suite OOM — fix before E3) · optimize 0 (Phase A/B/C ship tests).

---

## 15. Risks (loop-specific)

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Optimizing a proxy, not the product | Observed-only acceptance; holdout; G2 ground truth; label priors |
| R2 | Reward hacking / metric gaming | Objective vector + hard constraints + golden corpus; no single-metric acceptance |
| R3 | Ontology drift breaks notes | Additive-first allowlist; versioned adapters; golden corpus; removals need sign-off |
| R4 | Suggestion noise drowns humans | Budgets + ledger pruning + Pareto filter; precision tracked |
| R5 | Non-determinism makes results untrustworthy | Seeds + replay-hash test (A5) |
| R6 | Cycle cost explodes | Budgets, caching, headless screening, curated corpus |
| R7 | Hidden wiring (CLI ignores config) | Config-honored tests (A4); config is the only interface |
| R8 | Auto-apply causes silent loss | Golden gate + auto-rollback + append-only ledger (D2) |
| R9 | UI test OOM blocks CI | Fix before E3 |
| R10 | Optimizer untested | Every Phase A/B/C item ships tests |

---

## 16. Sequenced next actions

1. **Phase A1–A5** (measurement honesty + determinism). Smallest slice that makes everything downstream meaningful.
2. **Start G1** in parallel (clean-profile stranger test) — real ratings will validate the objective.
3. **Phase B1–B4** (mutation grammar, ledger, golden corpus, apply/rollback).
4. **Phase C1–C4** (trial, verdict, holdout, one-command cycle).
5. **Phase D1–D3** (bounded L2 autonomy + auto-rollback), then measure the cumulative holdout curve.
6. Only then E1–E4.

**Definition of done for "self-improvement works":** over ≥10 cycles, the ledger's holdout-composite curve is non-decreasing, every accepted change passes the golden corpus, ≥70% of auto-applied changes survive review, and any injected regression auto-reverts 100% of the time.

---

*End of TODO.7.md — one bounded, measurable, reversible loop. Search is cheap; acceptance is strict; memory is append-only; humans own the ground truth.*
