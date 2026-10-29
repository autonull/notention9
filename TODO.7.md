# Notention Development Plan (TODO.7.md)

Supersedes TODO.6.md. Gates, completed batches, and shipped infrastructure carry forward. The improvement loop is rearchitected so that "self-improvement" means **measured, bounded, reversible, holdout-validated change** over a **measurable use-case space** — not a queue of suggestions judged by a static estimator.

---

## 0. Why TODO.6's loop cannot self-improve (verified)

| Defect | Evidence | Consequence |
|--------|----------|-------------|
| **It estimates, it does not measure** | `optimize/src/uiuxEvaluator.ts` computes every metric from `Scenario` *config* (`estimate*` methods read `agents`/`events`). It never consumes simulation output. | Optimizing it improves nothing real. It is a static heuristic, not a measurement of the product. |
| **The score is mathematically broken** | `uiuxEvaluator.ts:426` — when only `max` is set, `1 - (value - max)/max` is uncapped, so values below `max` score **>1**. Observed overall scores of 108–113%. | A "score" over 100% cannot rank candidates or gate anything. |
| **CLI flags are silently ignored** | `cliHandlers/uxEvaluate.ts:23-37` builds a `config`, then calls `uxEvaluator.evaluateAll()` on the module singleton. `--scenarios freelance-marketplace` reported "Scenarios Evaluated: 13". | No reproducible, configurable evaluation. Trust is impossible. |
| **The corpus is one quadrant** | All 13 scenarios are N:M marketplace, market-pricing, economic/vocational stakes, one-shot, shared-vocabulary — differing only in domain skin. | The loop can only improve a marketplace, and cannot see the rest of the use-case space at all. |
| **No holdout, ledger, or regression oracle** | Those components do not exist yet. | Search overfits the proxy; nothing accumulates; change #7 silently breaks change #3. |

**The shift:** separate **search** (cheap, biased, exploratory) from **acceptance** (strict, observed, holdout-validated, reversible), tie it to an append-only **ledger**, and drive breadth from a **measurable taxonomy of use cases** rather than a hand-written list of domains.

---

## 1. What "true self-improvement" must mean — and its honest ceiling

A change counts as improvement only if all hold:

1. **Observed** — metrics come from an actual run (real `MatchEngine`, real UI or headless), not from config.
2. **Attributable** — a controlled trial isolates the change from noise.
3. **Holdout-validated** — gains reproduce on instances the search never saw.
4. **Constraint-safe** — no hard metric, golden case, or covered cell regresses.
5. **Reversible** — the change is a versioned artifact, swapped back atomically.
6. **Accumulated** — recorded in a ledger; the holdout curve is non-decreasing.

**Viability ceiling (honest):**

| Level | Achievable | Notes |
|-------|-----------|-------|
| Analyze only | ✅ now | Today's state |
| Propose, human applies (L1) | ✅ soon | Good value, low risk |
| **Auto-apply reversible low-risk changes (L2)** | ✅ **target** | Realistic ceiling for "self-improvement" now |
| Auto-apply medium-risk with canary (L3) | 🟡 later | Needs real users + higher fidelity |
| Unbounded code self-rewrite (L4) | ❌ not viable | Unverifiable, unsafe; stays a human PR |

Self-improvement here = **the loop reliably finds and keeps small, real, reversible gains across a measured slice of the use-case space.** It is not an autonomous programmer, and it cannot cover "all of civilization" — but it can *measurably* expand and improve its slice (§7).

---

## 2. Invariants (enforced in code and tests)

1. **Search never decides acceptance.** Proposers may use cheap proxies; acceptance may not.
2. **Acceptance requires observed metrics + holdout + golden corpus + constraints + coverage ratchet.**
3. **Every applied change is a versioned artifact.** Apply = swap; rollback = swap back.
4. **Same config + same seed ⇒ identical run-bundle hash.**
5. **The ledger is append-only.** Failed proposals are remembered, never silently retried.
6. **No auto-apply outside the allowlist and declared bounds.**
7. **Proxy estimates are labelled.** Never reported as user truth.
8. **Human ratings (G2) are ground truth.** The loop proposes; it cannot override.
9. **The corpus is versioned and tagged.** Every scenario declares its taxonomy cell, and generated scenarios are checked in.
10. **Coverage is not theater.** A scenario must be *live* (produce ≥1 match and ≥1 non-match, exercise its declared facet) or it doesn't count as coverage.

---

## 3. Architecture: the Loop

```
                    ┌───────────────────────────┐
                    │ 0 COVERAGE PLANNER        │  taxonomy → t-wise gaps
                    │ loop/taxonomy.json        │  → "generate this cell next"
                    └─────────────┬─────────────┘
                                  ▼
 config ─┐            ┌───────────────────────────┐
         └───────────►│ 1 RUNNER  corpus (train/  │  RunBundle
                      │ holdout) → events.jsonl   │──────────┐
                      └───────────────────────────┘          │
                                  ▲                          ▼
                      ┌───────────┴───────────┐   ┌──────────────────┐
                      │ 2 ANALYZER (observed) │◄──│ telemetry        │
                      └───────────┬───────────┘   └──────────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 3 SCORER  vector+constraints│  per-cell + maximin
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 4 PROPOSER (mutation      │◄── ledger.read()
                      │ grammar, config-driven)   │
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 5 TRIAL  control vs cand. │  train only
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 6 VERIFY holdout + golden │
                      │ + constraints + cross-cell│
                      │ ratchet                   │
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 7 POLICY  autonomy ladder │
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 8 LEDGER  append-only     │  per-cell curves
                      └───────────┬───────────────┘
                                  ▼
                      ┌───────────────────────────┐
                      │ 9 GUARD  auto-rollback    │
                      └───────────────────────────┘
```

One cycle = one `pnpm loop` invocation = one immutable `loop/runs/<runId>/` bundle.

---

## 4. Honest measurement — Phase A

The single highest-leverage change: **the analyzer must consume observed telemetry.**

- **Runner telemetry:** `ScenarioRunner`/`Agent` currently `console.log` matches. Add a structured `RunEvent` sink (`agent.publish`, `match`, `match.explain`, `latency`) → `events.jsonl`. `Agent` already runs the real `MatchEngine` (`simulator/src/agent.ts:67`), so observed matching is free.
- **Analyzer:** derive metrics from events. Keep static estimators only as `priors`, labelled, used by search — never by acceptance.
- **Scorer:** objective **vector** of 3–4 core metrics + hard constraints for the rest. Fix `uiuxEvaluator.ts:426`; assert `0 ≤ score ≤ 1`.
- **CLI honesty:** pass config into the evaluator (kill the singleton call at `uxEvaluate.ts:37`); test that `--scenarios`/`--threshold-*` change output.
- **Determinism:** seed agents/relays/timers; `loop:replay <runId>` reproduces the bundle hash.

**Acceptance:** identical config+seed ⇒ identical `events.jsonl` hash; `--scenarios X` evaluates only X; every score ∈ [0,1]; metrics derive from events.

---

## 5. Objective: constraints + Pareto, with a coverage ratchet

- **Objective vector** (small, tractable): `match-relevance`, `time-to-first-match`, `match-acceptance-rate`.
- **Hard constraints** (everything else): `export-success-rate == 1.0`, `confirmation-clarity >= 0.8`, golden corpus intact, per-scenario drop ≤ 0.03.
- **Ranking:** drop constraint violators → Pareto-nondominance on the vector → declared priority tie-break. (No arbitrary global weights in acceptance; weights are a search prior only.)
- **Breadth objective:** **maximin over cells** — raise the *worst* cell, not the mean. Otherwise whole use cases are silently sacrificed.
- **Ratchet:** each cell records its best score; a candidate may not lower any covered cell below `best − δ`. Gains become monotonic per cell and cannot be traded away.

---

## 6. Change space: one typed grammar, config-driven

Replace `UISuggester` + `OntologySuggester` (duplicated rule tables) with **one `MutationEngine`** reading `mutations` config. Proposals are typed deltas over existing artifacts:

| Class | Example | Risk | Autonomy |
|-------|---------|------|----------|
| `ontology.alias.add` | add synonym | low | L2 |
| `ontology.operator.default` | change default operator | low | L2 |
| `ontology.property.add` | add missing property | medium | L1 |
| `ontology.property.remove` | remove property | high | L1 + sign-off |
| `ontology.hierarchy.add` | group co-occurring keys | medium | L1 |
| `template.add` / `template.promote` | new/boosted template | low | L2 |
| `match.weight.tune` | bounded numeric tuning | low | L2 |
| `ui.component.prop` / `ui.variant` | adapter config delta | medium | L1 |
| `core.code` | source rewrite | — | ❌ denied |

Search strategy: **deterministic rule proposals** from evidence + **bounded coordinate ascent** on numeric knobs. Evolutionary search is deferred until rule search plateaus.

---

## 7. Scenario Space & Coverage — targeting and completeness

### 7.1 Structure vs skin (the load-bearing idea)

Domains are skins. What actually stresses the system is **structure**: who relates to whom, what is exchanged, under what reciprocity, at what stakes, over what time, with how much shared meaning. A "mentorship network" that is modelled as a price market is *the same test* as a freelance marketplace.

So: **a scenario is a point in a structural space, decorated with a domain skin.** Coverage is measured over structure; skins supply realism and face validity. This is what makes "civilizational space" tractable: cultures are unbounded, but the *elementary forms of human coordination* are few.

### 7.2 The taxonomy (grounded, not invented)

Anchored in canonical, minimal, roughly orthogonal frameworks rather than ad-hoc categories:

| Axis | Levels | Source |
|------|--------|--------|
| **Social form** | communal sharing · authority ranking · equality matching · market pricing | Fiske, *relational models theory* |
| **Topology** | 1:1 · 1:N broadcast · N:M marketplace · chain/relay · coalition (N:1) · hierarchy (tree) · mesh/community | matching-market & network structure |
| **Exchange substrate** | goods · labor/service · knowledge · capital · care · space/shelter · access/permission · commitment/promise · status/reputation · identity | Polanyi (reciprocity/redistribution/market) + needs (subsistence→self-actualization) |
| **Stakes** | informational · social/reputational · economic · legal/contractual · safety/health · existential/irreversible | consequence severity |
| **Temporality** | one-shot · recurring · open-ended · deadline-driven · ephemeral/decaying · generational/inherited | time structure |
| **Semantic heterogeneity** | shared jargon · cross-domain · multilingual · tacit/implicit · contested/disputed | Hall (high/low context), ontology distance |

**Modifiers** (tags sampled for realism, not enumerated into the lattice): scale (dyad → Dunbar ~150 → organization → market), trust/verification, governance regime (Ostrom's commons principles), power asymmetry (peer/hierarchical/fiduciary/exploitative), locality, formality, information asymmetry, cultural emotion regime (dignity/face/honor), failure-mode target, resource scarcity.

**Universals audit** (completeness check, not a test axis). Every item must map to ≥1 lattice cell, otherwise the taxonomy has a hole: kinship · gift/reciprocity · redistribution · market exchange · division of labor · property · contract · conflict resolution · adjudication/law · ritual/ceremony · status/hierarchy · alliance/coalition · family formation · apprenticeship/teaching · caregiving/dependency · mourning/inheritance · hospitality · taboo/sanction · commons management · debt/credit · reputation/gossip · oath/witness · sanctuary/asylum · tribute/taxation. (After Brown's human universals; Mauss on the gift; Graeber on debt.)

### 7.3 Coverage as a covering array (how "complete" becomes engineering)

The lattice is ~10⁴–10⁵ cells — testing all is impossible and unnecessary. Use **t-wise combinatorial coverage** (Lei et al.'s IPOG, or a greedy fallback):

- **Strength 2 (pairwise):** every *pair* of levels across different axes appears in ≥1 live scenario. Typically tens of scenarios cover a large fraction.
- **Strength 3 for high-risk axes** (`stakes`, `topology`): the interactions that actually break systems get deeper coverage.
- **Coverage % is a number**, computed from `taxonomy × corpus tags`. Gaps are a ranked list, not a feeling.
- **Targeting is then trivial:** take the highest-priority uncovered pair/cell → generate there → measure.

Priority of a gap = `weight(levels) × risk(stakes) × novelty × (1 − coverage)`.

### 7.4 Generator: from cell to scenario

`Scenario` gains additive fields (`simulator/src/types.ts` is currently `{name, description, agents, events, duration}`):

```ts
interface ScenarioSpec {
  cell: { socialForm; topology; exchange; stakes; temporality; heterogeneity };
  skin: { domain: string; vocabulary: string[]; locale?: string; roles: string[] };
  params: { agentCounts: Record<string, number>; propertySchema: Property[]; schedule: EventConfig[]; seed: number };
  requires: SemanticRequirement[];   // e.g. { facet: 'obligation', operator: 'owed-to' }
  stress?: StressVector;             // adversarial arm
  difficulty: 'baseline' | 'edge' | 'adversarial';
}
```

- `instantiate(spec, seed) → Scenario` — deterministic, seeded, checked in under `loop/corpus/<cell>/<name>.json` with its tags.
- **`requires` is the tightest coupling to improvement:** the scenario declares semantic features it needs. If the `OntologyAdapter` cannot express them, that is *not* a test failure — it is a **typed ontology-gap proposal** with evidence. Coverage thereby drives ontology evolution instead of waiting for humans to notice.
- **Validity gates (anti-theater):** a generated scenario must (a) produce ≥1 match and ≥1 non-match, (b) exercise its declared facet, (c) be deterministic on replay. Invalid scenarios are rejected, not counted.
- **LLM-assisted skins** are optional and human-reviewed; structure stays deterministic so results are reproducible.

### 7.5 Targeted improvement (the actual mechanism)

```
gap cell ──► generate N train + N holdout instances (different skins/params)
         ──► run loop; per-cell metrics
         ──► if cell violates constraints: propose changes aimed at that cell
         ──► trial on train, verify on holdout *within the same cell family*
         ──► accept only if target improves AND no covered cell drops below its ratchet
```

Holdout for a targeted cell must be **same-cell, different-instance** — otherwise a "fix" is just overfitting to one skin. This is the discipline that makes targeted improvement real rather than cosmetic.

### 7.6 Honest audit of the current corpus

By inspection, all 13 scenarios sit in essentially **one cell variant**: N:M · market pricing · economic/vocational stakes · one-shot · shared tech vocabulary · dyadic exchange. Mentorship, investment, research, and open-source are all *skinned as markets*. Consequences:

- Pairwise coverage of the taxonomy is **single-digit percent**.
- The system has never been tested on communal sharing, authority ranking, equality matching (in-kind reciprocity), care, obligation, inheritance, taboo, or contested definitions.
- **Prediction:** care/kinship/gift scenarios will expose that the core model assumes *explicit, priced, simultaneous, dyadic* exchange. Some of the resulting proposals will not be ontology tweaks — they will demand different interaction semantics. That is the loop working correctly: coverage reveals model bias.

### 7.7 Sufficiency — what "complete" can honestly mean

"Complete" is a regulative ideal. Define **coverage sufficiency** instead:

1. Every axis level appears in ≥1 live scenario.
2. Every **high-risk** cell (stakes ≥ legal) is covered.
3. Every **universals-audit** item maps to ≥1 covered cell.
4. Pairwise coverage ≥ target (start 80%, raise over time).
5. Marginal value has flattened: new cells yield < ε improvement.

Then switch from **breadth to depth**, in this order:

| Pass | Focus | Why |
|------|-------|-----|
| 1 Breadth | t=2 over the lattice | find the structural blind spots cheaply |
| 2 Adversarial | mutate covered cells: spam/sybil, free-riding, defection, coercion, exclusion, privacy leak, contested ontology | robustness matters more than more domains |
| 3 Depth | high-risk cells, edge params, stress vectors | failure at high stakes is what actually hurts |
| 4 Real corpora | ingest real postings/boards/CFPs to derive vocabulary and ontology | face validity + real ontology distance |
| 5 Longitudinal | multi-cycle, multi-relay, community dynamics | the "community simulation" endgame |

### 7.8 Limits (stated plainly)

- Culture is unbounded; only *structure* is enumerable. Coverage claims are about structure, never about "all cultures."
- Synthetic agents obey scripted rules; they cannot fully proxy real users. G2 human ratings remain ground truth.
- Some cells may be inexpressible in the current model. That is a finding to record, not a failure to hide.
- Coverage can be gamed by trivial scenarios; the validity gates (§7.4) and difficulty labels exist to prevent it.

---

## 8. Ledger: the memory that makes it "self"

Extend `core/src/suggestions/SuggestionStore.ts` (no new database): each entry gains `change`, `evidence`, `trialDeltas`, `holdoutVerdict`, `outcome` (`applied|rejected|rolled-back`), `runId`, `artifactVersion`, `targetCell`.

The ledger provides:
- **Dedupe/pruning** — never re-propose a known failure (invariant 5).
- **Audit** — every current behavior traces to a change + evidence.
- **Per-cell curves + ratchet floors** — the north-star artifact.
- **North-star metric:** the **maximin holdout curve over cells**. If it isn't non-decreasing, the loop isn't self-improving.

---

## 9. Verifier: golden corpus + coverage ratchet

- `loop/golden/corpus.jsonl` — curated behaviors that must never regress (specific match pairs, note round-trips, capability decisions, a11y snapshots).
- `loop/corpus/coverage.json` — per-cell best scores (ratchet floors).
- Any candidate must pass **all** golden cases **and** not lower any covered cell below its floor. Promotion failure ⇒ block; post-apply failure ⇒ **auto-rollback**.

---

## 10. Autonomy ladder

| Level | Applies | Gate |
|-------|---------|------|
| L0 | nothing | report only |
| L1 | nothing (queue) | human applies |
| **L2** | allowlisted low-risk ops within bounds | observed + holdout + golden + constraints + ratchet + auto-rollback armed |
| L3 (deferred) | medium-risk with canary | L2 + higher-fidelity measurement |

Default L2 set: `{alias.add, operator.default, template.add/promote, match.weight.tune}`. Everything else L1. `core.code` denied.

---

## 11. Configurability — the whole interface is config

```jsonc
// loop.config.json
{
  "seed": 42,
  "autonomy": "L2",
  "taxonomy": "./loop/taxonomy.json",
  "coverage": {
    "strength": 2,
    "highRiskAxes": ["stakes", "topology"],
    "highRiskStrength": 3,
    "minPairWeight": 0.3
  },
  "objective": {
    "vector": ["match-relevance", "time-to-first-match", "match-acceptance-rate"],
    "priority": ["match-relevance", "match-acceptance-rate", "time-to-first-match"],
    "primary": "maximin",
    "constraints": [
      { "metric": "export-success-rate", "op": "==", "value": 1.0 },
      { "metric": "confirmation-clarity", "op": ">=", "value": 0.8 }
    ],
    "noRegression": { "perScenarioMaxDrop": 0.03, "ratchetDelta": 0.0 }
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
  coverage.json  applied.json  ledger.diff  summary.md
```

Commands (one entry point):

```
pnpm loop                     # one cycle: coverage→run→score→propose→trial→verify→policy→ledger
pnpm loop --dry               # analyze + propose only (L0/L1)
pnpm loop coverage            # matrix, % covered, ranked gaps, universals audit
pnpm loop gen --gap <id|top>  # instantiate scenario(s) for a coverage gap, check in
pnpm loop target --cell <c>   # bias this cycle's search toward a cell
pnpm loop:replay <runId>      # deterministic reproduction
pnpm loop:diff <a> <b>        # cycle comparison
pnpm loop:apply <id>          # human apply (L1 queue)
pnpm loop:rollback <id>
```

---

## 12. Determinism & execution efficiency

- **Seeds everywhere** (agents, timer jitter, shuffle, scenario instantiation). Same config ⇒ byte-identical bundle.
- **Fidelity ladder:** search screens at headless-observed (no browser); only promoted candidates run the real UI (Playwright).
- **Budgeted cycles:** `maxProposals/maxTrials/wallClockMs/parallelism`; stop on budget, not on a mood.
- **Covering-array planning** means no wasted scenarios: every added scenario closes a named gap.
- **Caching** keyed by `(artifact version, scenario, seed)`; reuse unchanged control runs.
- **Ledger pruning** skips spaces already proven bad.

---

## 13. Consolidated work items (reprioritized)

Order: **audit → measurement → change space → closed loop → autonomy → surfaces.** Each phase ships independently.

### Phase A — Taxonomy & Corpus Audit (cheapest, highest leverage)
| # | Item | Acceptance |
|---|------|-----------|
| A0.1 | `loop/taxonomy.json` (6 axes, levels, weights, risk, universals map) | Loads; universals audit has no unmapped item |
| A0.2 | Tag all 13 scenarios with cells | 13/13 tagged |
| A0.3 | `pnpm loop coverage` — pairwise %, ranked gaps, audit | Reports single-digit coverage; ranked gap list |
| A0.4 | Scenario validity gates (`live` check) | A non-matching scenario is rejected |

**Deliverable:** the brutal, quantified "we have built a marketplace simulator" finding + the ranked roadmap of cells.

### Phase A' — Honest Measurement
| # | Item | Acceptance |
|---|------|-----------|
| A1 | `RunEvent` telemetry → `events.jsonl` | Events from real `MatchEngine` |
| A2 | Analyzer from events; estimators → labelled priors | Metrics observed, not config-derived |
| A3 | Scorer: vector + constraints + Pareto; fix `:426`; cap [0,1] | `score ∈ [0,1]` asserted |
| A4 | Config plumbed in; kill singleton call | `--scenarios`/thresholds change output (test) |
| A5 | Seeded determinism + `loop:replay` | Identical hash on replay |

### Phase B — Scenario Generator + Change Space + Oracle
| # | Item | Acceptance |
|---|------|-----------|
| B1 | `instantiate(spec, seed)` + check-in + tags | Deterministic; gap → scenario |
| B2 | `requires` → ontology-gap proposals | Missing facet yields typed suggestion |
| B3 | `MutationEngine` from config | Config drives proposals |
| B4 | Extend store → ledger fields | Outcomes recorded; failures deduped |
| B5 | Golden corpus loader + ratchet check | Injected regression blocks promotion |
| B6 | Artifact apply/rollback via adapter versioning | Byte-identical restore |

### Phase C — Closed Loop (L1)
| # | Item | Acceptance |
|---|------|-----------|
| C1 | `TrialEngine` (control vs candidate, train-only) | Deltas reproducible |
| C2 | Verdict: effect size + bootstrap CI + constraints | No-effect rejected |
| C3 | Per-cell + maximin scoring; ratchet enforcement | Cannot trade one cell for another |
| C4 | Holdout within cell family | Train-pass/holdout-fail rejected |
| C5 | `pnpm loop` orchestrator + bundles + `summary.md` | One command, full bundle |

### Phase D — Bounded Autonomy (L2)
| # | Item | Acceptance |
|---|------|-----------|
| D1 | Policy per op (allowlist + bounds) | Denied ops never auto-apply |
| D2 | Auto-apply + auto-rollback guard | Injected failure reverts automatically |
| D3 | Ledger pruning | Known-bad proposals not re-emitted |

### Phase E — Depth & Scale (deferred until it is the bottleneck)
| # | Item | Trigger |
|---|------|---------|
| E1 | Adversarial pass (spam/sybil/defection/coercion/exclusion) | Pairwise saturates |
| E2 | Real-corpus ingestion (postings, boards, CFPs) | Face validity questioned |
| E3 | Review UI (`SuggestionsTab`) | CLI review painful |
| E4 | Nightly CI artifact run | Loop deterministic + cheap (needs UI OOM fix) |
| E5 | Longitudinal / multi-relay community sim | Single-relay loop stable |

---

## 14. Cuts & deferrals (efficiency)

- **Cut:** `UISuggester`/`OntologySuggester` → one `MutationEngine`.
- **Cut:** `ABTestRunner` + `MatrixRunner` + `TestMatrix` → one `TrialEngine`.
- **Cut:** bespoke stats framework → one bootstrap module.
- **Cut:** new suggestion DB → extend existing store into a ledger.
- **Cut:** new version system → reuse `OntologyVersion`/`OntologyChange`.
- **Cut:** hand-writing scenarios → generator from covering-array gaps.
- **Defer:** evolutionary search, formal power analysis, review UI, nightly CI, federated sim, L3+.

---

## 15. State & gates (carried forward)

| Item | State |
|------|-------|
| Batches A/B/C (trust, demo, metaphor) | ✅ complete |
| W5 + W5b (CBOR/NoteID/signing, protocol testbed) | ✅ complete |
| Extensibility Phase 1 (adapters, registries, store, 13 scenarios, `ux-evaluate`, MetricsTab) | ✅ infra; ⚠️ evaluator untrustworthy; ⚠️ corpus one-quadrant |
| G0 verify · G3 durability · G4 interop-first · G6 MP4 | ✅ |
| G1 stranger Golden Path | ⏳ run now, parallel with Phase A |
| G2 human relevance ≥70% | ⏳ after G1 — ground truth |
| G5 single-device limit | ⏳ after G3 |

**Tests:** core 398 · simulator 20 · agent 17 · ui per-file OK (full suite OOM) · optimize 0.

---

## 16. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Optimizing a proxy, not the product | Observed-only acceptance; holdout; G2 truth; label priors |
| R2 | Reward hacking | Vector + constraints + golden + ratchet; no single-metric acceptance |
| R3 | Ontology drift breaks notes | Additive-first allowlist; versioned adapters; golden; sign-off for removals |
| R4 | Suggestion noise | Budgets + ledger pruning + Pareto; precision tracked |
| R5 | Non-determinism | Seeds + replay-hash test |
| R6 | Cycle cost explodes | Budgets, caching, headless screening, covering-array planning |
| R7 | Hidden wiring (CLI ignores config) | Config-honored tests |
| R8 | Auto-apply causes silent loss | Golden + ratchet + auto-rollback + append-only ledger |
| R9 | UI suite OOM blocks CI | Fix before E4 |
| R10 | Optimizer untested | Every A/B/C item ships tests |
| R11 | **Coverage theater** (trivial scenarios inflate %) | Validity gates; difficulty labels; adoption requires a match |
| R12 | **Overfitting a targeted cell** | Same-cell different-instance holdout; ratchet across all cells |
| R13 | **Corpus leakage** (gap scenarios become test set) | Generated train/holdout split per cell; holdout never fed to proposer |
| R14 | **Market-model bias is structural, not cosmetic** | Record inexpressible cells as findings; may require matcher semantics change (L1, explicit) |
| R15 | **Taxonomy itself is biased** | Universals audit + real-corpus ingestion as external check |

---

## 17. Sequenced next actions

1. **A0.1–A0.4 (taxonomy + audit)** — ~a day; yields the quantified corpus-bias finding and ranked gaps. Do this before more loop machinery.
2. **A1–A5 (measurement honesty + determinism)** — makes every downstream number meaningful.
3. **Start G1** in parallel (clean-profile stranger test).
4. **B1–B6 (generator, `requires`→ontology gaps, mutation engine, ledger, oracle, apply/rollback)**.
5. **C1–C5 (trial, verdict, maximin+ratchet, holdout, one-command cycle)**.
6. **D1–D3 (L2 autonomy + auto-rollback)**, then read the maximin holdout curve.
7. Then **E1 (adversarial)** → E2 (real corpora) → E4/E5.

**Definition of done for "self-improvement works":** over ≥10 cycles, pairwise coverage rises along the ranked gap list, the **maximin** holdout curve over cells is non-decreasing, every accepted change passes golden + ratchet, ≥70% of auto-applied changes survive review, and any injected regression auto-reverts 100% of the time.

---

*End of TODO.7.md — one bounded, measurable, reversible loop over a measurable use-case space. Search is cheap; acceptance is strict; coverage is quantified; memory is append-only; humans own the ground truth.*
