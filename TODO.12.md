# TODO.12 — Notention Evaluation & Improvement Program (Revised)

**Supersedes:** `TODO.11.md`, `TODO.11.a.md`, and prior versions of this file
**Status:** Active — Phase 0 complete, Phase 1 in progress
**Shape:** One evaluation substrate, three consumers. Not one self-improving machine.

---

## Progress Tracking

| Phase | Status | Target | Notes |
|---|---|---|---|
| **Phase 0: Integrity** | ✅ **Done** | 2026-10-31 | ESM test-data loading fixed; core cases > 0 in built runtime |
| **Phase 1: Measurement Substrate** | 🔄 **In Progress** | 2026-11-14 | Deterministic runner, case registry, verdict engine, ledger |
| **Phase 2: Representation Lab** | ⏳ Queued | 2026-11-28 | Quality cases, extraction/match baselines, coverage matrix |
| **Phase 3: Friction Discovery** | ⏳ Queued | 2026-11-28 | Local journal, weekly digest, human triage |
| **Phase 4: Revision Delivery + Optimizer** | 🔒 Deferred | 2026-12-19 | Consent-first delivery, parameter search, two wins or two negatives |

---

## 0. Purpose & Success Criteria

Build the measurement and delivery foundation Notention needs, then use it for three objectives. Each has independent kill criteria.

| ID | Objective | Question it answers | Success Criteria |
|---|---|---|---|
| **O1** | Trustworthy evaluation | "Is change X better than what we have?" | 40 intent cases, 60 quality cases; one real release decision via harness |
| **O2** | Representation quality | "Does our ontology/matching represent real situations?" | Extraction F1 + match P@5 baselines; one ontology change with no intent regression |
| **O3** | Friction discovery | "Where do real users actually struggle?" | Weekly digest with top 5 frictions; ≥5 triaged; ≥1 shipped fix |

**Non-goals:** autonomous code generation; remote telemetry; fleet experimentation; universal coverage claims.

---

## 1. Diagnosis — Why the Current Loop Produces No Value

| # | Failure | Evidence | Fix |
|---|---|---|---|
| 1 | Adopted artifacts never read by app | `synthesis/adoption.ts:98-104`; `strategyResolverInit.ts:203-227` | Revision store with precedence |
| 2 | Candidate evaluation is non-causal | `evaluation.ts:672-690` | Distinct revisions → distinct results |
| 3 | Test data loads empty in ESM builds | `CORE_EXTRACTION_TEST_CASES.length === 0` in `dist/` | ✅ Fixed: static imports + assertions |
| 4 | Ground truth mined from own tests | `goldenCaseMiner.ts:64-71, 266-287` | Human-authored cases only |
| 5 | No usage signal feeds prioritization | `prioritize.ts:15-36` | Local journal (opt-in, aggregates) |
| 6 | Candidates are identical | `generator.ts:36-38` | ParamSpec-declared search space |
| 7 | Comparison fabricates data | `compare.ts:98-147` | Remove; paired runs only |

**Consequence:** Every downstream activity is a simulation. Fix the substrate before adding consumers.

---

## 2. Program Structure (Simplified)

```
                         ┌──────────────────────────────┐
                         │   Measurement Substrate      │
                         │  cases · runner · verdict    │
                         │  signal · revisions · ledger │
                         └───────┬──────────┬───────────┘
                                 │          │
         ┌───────────────────────┘          └──────────────────┐
         ▼                                                     ▼
┌─────────────────────┐                          ┌─────────────────────┐
│ P2 Representation   │                          │ P3 Friction         │
│ Lab (O2)            │                          │ Discovery (O3)      │
│ Fast, in-process    │                          │ Local, opt-in       │
└─────────┬───────────┘                          └─────────┬───────────┘
          │                                                │
          └───────────────────┬────────────────────────────┘
                              ▼
                   ┌─────────────────────┐
                   │ P4 Revision + Opt   │
                   │ (O1 delivery)       │
                   │ Consent-first       │
                   └─────────────────────┘
```

**WIP limit: Two active programs.** Phase 1 is serial. Phases 2 & 3 run in parallel. Phase 4 starts only after Phase 1 + baselines exist.

**Shared invariants:**
- One runner. No program adds its own measurement loop.
- One ledger. Every proposal, evaluation, decision, adoption, rollback recorded.
- Cases are protected. No program writes to a benchmark.
- Each program's kill criteria are independent.

---

## 3. Substrate (Phase 1 — Serial)

### 3.1 Case Registry — Two Families

| Family | Measures | Where | Speed | Count |
|---|---|---|---|---|
| `intent` | User task completion (UI) | Browser journeys | ~2s/case | 40 |
| `quality` | Extraction/matching correctness | In-process | ~5ms/case | 60 |

**Content-addressed:** `sha256` per case + manifest. Two readers:
- `CaseReader.intent({ split: 'search' | 'validation' })` — never returns holdout
- `CaseReader.quality()` — full access (cheap, meant for iteration)
- `HoldoutReader` — separate entry point, audit command only

**Split:** 60/20/20 (search/validation/holdout). Interface-enforced.

### 3.2 Runner

- **Fast path:** `PropertyExtractor` + `MatchEngine` from `@notention/core` — no browser
- **Browser path:** Extended `uiuxEvaluator.ts` + `stepExecutors` with `SeedSnapshot` replay
- **Determinism:** Seeded state, fixed viewport/locale/timezone/fonts, network blocked
- **Repetitions:** 3 runs; warm-up discarded; variance → `flaky` exclusion

### 3.3 Verdict Engine (Simplified)

```ts
type Verdict = 'improved' | 'no-change' | 'regressed' | 'inconclusive' | 'invalid';

interface VerdictResult {
  verdict: Verdict;
  primary: { metric: string; delta: number; p: number; ci: [number, number] };
  floors: Record<string, { value: number; floor: number; pass: boolean }>;
  excluded: { caseId: string; reason: 'flaky' | 'error' }[];
}
```

**Rules:**
- Binary primary → exact binomial test (fast, exact)
- Continuous → bootstrap CI (10k resamples, cached)
- **No composite score.** Trade-offs reported as per-metric deltas.
- Underpowered (observed N < required N from baseline + α=0.05 + power=0.8) → `inconclusive`
- Fixtures: known-bad must score below incumbent; duplicate must yield `no-change`

### 3.4 Signal Store (Local Journal)

```ts
interface FrictionEvent {
  bucket: string;           // ISO date, day granularity
  workflow: string;
  seam: string;
  kind: 'capture_started' | 'capture_abandoned' | 'correction'
      | 'match_viewed' | 'match_rejected' | 'match_accepted'
      | 'clarification_requested';
  count: number;
  durationBucket?: '<5s' | '5-15s' | '15-60s' | '>60s';
}
```

- Opt-in default **off**. No raw text, no identifiers, no egress.
- Retention: 90 days. User can export/purge immediately.
- Evidence classes: `measured > observed > hypothesized > asserted` with age decay.

### 3.5 Revision Store — Consent-First Delivery

```ts
interface Revision {
  id: string;
  scope: 'ui-config' | 'ontology' | 'prompt';
  target: string;           // seam id, ontology facet, prompt id
  version: string;
  patch: Record<string, unknown>;
  status: 'proposed' | 'active' | 'rolled_back';
  consent: 'opt-in' | 'auto-tune';  // default: opt-in
  evidence: { manifestHash: string; verdict: Verdict; runId: string };
  provenance: Provenance;
}
```

- Stored in `JsonStore`; seeded into journeys via existing `seed` step.
- **Resolution precedence (low → high):** strategy defaults → profile defaults → active revision → user override
- `ResolvedStrategy` is the single resolution return type:
```ts
interface ResolvedStrategy<P> {
  strategy: Strategy<P>;
  params: P;
  revisionId?: string;
  reason: string[];    // ordered trail, machine-readable
}
```
- Ontology revisions **always** require explicit approval + migration path.
- Rollback: `pnpm nis rollback <revision-id>` → status `rolled_back`, ledger entry. No file moves.

### 3.6 Ledger

Append-only JSONL, hash-chained. Events: `proposed | evaluated | decided | adopted | enabled | disabled | rolled_back | frozen | triaged`.

Required fields: `timestamp`, `runId`, `manifestHash`, `configHash`, `revisionId`, `verdict`, `actor`, `reason`.

`pnpm nis audit <revisionId>` verifies the chain.

---

## 4. Measurement Model

### 4.1 Intent Cases (O1, O4 delivery validation)

```jsonc
{
  "id": "intent-capture-014",
  "family": "intent",
  "intent": "capture_need",
  "prompt": "My mother needs a wheelchair ramp installed before Friday",
  "seed": { "notes": [], "settings": {}, "revisions": ["incumbent"] },
  "expected": { "minProperties": 2, "requiredKeys": ["need", "deadline"], "outcome": "captured" },
  "metrics": ["completion", "steps", "corrections"],
  "tags": ["care", "non-market", "deadline"],
  "provenance": { "author": "human", "source": "interview-03" }
}
```

### 4.2 Quality Cases (O2)

**Extraction:**
```jsonc
{
  "id": "quality-extract-021",
  "family": "extraction",
  "input": "Need a ramp installed before Friday, budget 900",
  "expected": [{ "key": "budget", "operator": "less than", "values": ["900 USD"] }],
  "forbidden": [{ "key": "budget", "operator": "greater than" }],
  "labels": { "annotators": 2, "agreement": 0.87 },
  "tags": ["care", "non-market"]
}
```

**Matching:**
```jsonc
{
  "id": "quality-match-014",
  "family": "match",
  "request": "...",
  "offer": "...",
  "relevant": true,
  "grade": 2,
  "labels": { "annotators": 2, "agreement": 0.72 }
}
```

| Family | Metrics | Target |
|---|---|---|
| extraction | property F1 (per-key + macro), exact-match rate, schema validity | baseline recorded |
| matching | precision@5, recall@5, NDCG@10 (graded) | baseline recorded |
| calibration | ECE on inferred values | confidence emitted per property |

**Non-market share:** ≥40% of quality cases (care, family, community, volunteering, education, resource sharing).

### 4.3 Statistics (Decided Defaults)

- Paired runs, same cases, same seeds, same environment.
- Binary → exact binomial; Continuous → bootstrap CI (10k, cached).
- Power: α=0.05, 1-β=0.8, baseline rate from incumbent.
- Warm-up discarded; 3 reps; flaky → excluded with reason.
- Verdicts per-metric; no single score decides adoption.

### 4.4 Validity (Decided Defaults)

- Deduplication: intent + normalized prompt embedding (0.92); quality by input hash.
- Rotation: every 4 cycles; retirements recorded.
- Incumbent band check: must score within expected range per case.
- Sensitivity: known-bad fixture scores below incumbent.
- Specificity: duplicate-of-incumbent yields `no-change`.
- Holdout audit: post-adoption + quarterly; directional only (n≥8 underpowered).

**Stated limitation:** Intent cases are a proxy. Human audit required before claiming O2 gains beyond "scripted completion".

---

## 5. Change Contract (Applies to Every Revision)

| ID | Condition | Test |
|---|---|---|
| C1 | **Causal** — change executes and alters behavior | Distinct revisions → distinct results |
| C2 | **Measured** — paired on protected cases | Same cases, seeds, environment |
| C3 | **Superior** — primary gain > required effect | Verdict `improved` |
| C4 | **Safe** — floors hold; audit passes or auto-revert | Floor table + audit |
| C5 | **Reproducible** — replay hash matches | Re-run from recorded inputs |
| C6 | **Reversible** — rollback verified | Adopt → enable → rollback test |
| C7 | **Attributable** — provenance complete | Ledger fields non-null |
| C8 | **Affordable** — within budget | Cost record |
| C9 | **Consented** — user accepted or `auto-tune` explicit | Consent field + audit log |

Ontology revisions additionally require: migration plan, rollback plan, human approval.

---

## 6. Phase 1 — Measurement Substrate (In Progress)

**Serial. Nothing else starts until this exits.**

| # | Deliverable | Size | Exit Criterion |
|---|---|---|---|
| 1.1 | Causal candidate execution | M | Distinct revisions → distinct results |
| 1.2 | Strict must-win + noise margin | S | No-op rejected |
| 1.3 | `RunContext` + replay hashes | S | Re-run hash matches |
| 1.4 | Case Registry + manifest + hash guard | M | Mismatch refused |
| 1.5 | `SeedSnapshot` + deterministic runner | M | Replay → identical DOM hash |
| 1.6 | Flake detector (3 reps, warm-up) | S | Variance excluded |
| 1.7 | Verdict engine + power calculator | M | Fixtures yield expected verdicts |
| 1.8 | Leak fix: benchmark excludes holdout | S | Holdout read attempt fails test |
| 1.9 | 40 intent cases authored | L | All run; incumbent band holds |
| 1.10 | Ledger + audit | M | Chain verifies; tamper detected |
| 1.11 | Revision store + `ResolvedStrategy` | M | 5-layer precedence test passes |
| 1.12 | Consent UI (Settings → Revisions) | M | Accept/decline recorded; decline sticky |

**Gate to Phase 2/3:** All above + one release decision made with the harness.

---

## 7. Phase 2 — Representation Lab (O2)

**Parallel with Phase 3. Fast in-process iteration; no browser needed.**

| # | Deliverable | Size | Exit Criterion |
|---|---|---|---|
| 2.1 | 60 quality cases, ≥40% non-market | L | All run; labels agree κ ≥ 0.6 |
| 2.2 | Extraction F1 + schema validity baseline | M | Baseline recorded, reproducible |
| 2.3 | Match precision@5 / recall@5 / NDCG baseline | M | Baseline recorded |
| 2.4 | Calibration (ECE) for inferred properties | M | Confidence emitted per property |
| 2.5 | Confidence + provenance on inferred values | M | `source: inferred|confirmed`, `confidence` |
| 2.6 | Correction flow: user override feeds labels | M | Override recorded; never silently binding |
| 2.7 | Coverage matrix across taxonomy axes | M | Full/partial/gap per scenario |
| 2.8 | Flat vs facet benchmark | L | Decision record with measured trade-offs |
| 2.9 | Commitment lifecycle states + transitions | L | Invalid transitions rejected |

**Rules:**
- System drafts coverage; human confirms. Generator cannot grade adequacy.
- Confidence never upgrades to commitment without explicit user action.
- Representation changes bump benchmark version; historical comparisons marked incomparable.

**Gate to O2 claims:** Baseline + at least one evaluated ontology change with no intent-case regression.

---

## 8. Phase 3 — Friction Discovery (O3)

**Parallel with Phase 2.**

| # | Deliverable | Size | Exit Criterion |
|---|---|---|---|
| 3.1 | Local journal, opt-in, aggregates only | M | No raw text; retention enforced |
| 3.2 | Event capture at 7 workflow points | M | Counts match manual session test |
| 3.3 | Weekly digest: top frictions with confidence | S | Digest generated from aggregates |
| 3.4 | Human triage queue | S | ≥5 items triaged; reason recorded |
| 3.5 | Evidence classes in prioritization | S | Measured outranks hypothesized |
| 3.6 | Decay and freshness | S | Stale signal demoted |

**Rules:**
- Discovery only. No automatic fixes. Triage output feeds Phase 2 hypotheses or Phase 4 search targets.
- Opt-in default off. A digest without consent is a privacy failure, not a feature.

**Kill:** If 8 weeks produce no actionable friction, stop program and keep journal as debugging aid.

---

## 9. Phase 4 — Revision Delivery + Optimizer (O1 Delivery)

**Starts only after Phase 1 + Phase 2 baselines exist.**

| # | Deliverable | Size | Exit Criterion |
|---|---|---|---|
| 4.1 | Revisions for 2 seams (capture, match) | L | Each renders differently per params |
| 4.2 | `ResolvedStrategy` + precedence + reason trail | M | 5-layer precedence test passes |
| 4.3 | Consent UI for proposals | M | Accept/decline recorded; decline sticky |
| 4.4 | Candidate enumeration over declared space | M | 8 candidates per seam |
| 4.5 | Candidate cache `(target, patchHash)` | S | Re-evaluation skipped |
| 4.6 | Successive halving + budget | M | Budget respected; early stop works |
| 4.7 | Full cycle: propose → evaluate → decide → propose-to-user | L | One opt-in adoption with verdict |
| 4.8 | Negative-result recording + freeze | S | Frozen seam exits cleanly |

**Search space:** Declared `ParamSpec` options only. No free-form values. LLM may propose patch; validated against spec; never emits code.

**Adoption:** Proposals surface to user. `auto-tune` off by default.

**Gate to synthesis (deferred):** Two measured wins, or two credible negative results on valid benchmark.

---

## 10. Governance

| Level | Capability | Governance | Phase |
|---|---|---|---|
| **Config** | Parameter/config revision to existing strategy | Contract C1–C9; user opt-in | 4 |
| **Structure** | New implementation of existing pattern | Gates + human review | Deferred |
| **Interface** | New seam / interface | Human review, signed approval | Deferred |
| **Spec** | Development specifications | Human-directed | Deferred |

**Ontology and prompt revisions are Structure-equivalent** regardless of size: they change meaning, not appearance.

---

## 11. Roadmap (Timeboxed)

```
Phase 0  Integrity              (S)  ✅ Done
Phase 1  Measurement Substrate   (L)  ──┐  Target: 2026-11-14
                                      │  Gate: one real decision
Phase 2  Representation Lab       (L)  ──┤  Target: 2026-11-28
Phase 3  Friction Discovery       (M)  ──┤  Target: 2026-11-28 (parallel)
                                      │
Phase 4  Revision + Optimizer      (L)  ──┘  Target: 2026-12-19
                                      Gate: two wins or two negatives
Synthesis (Structure/Interface)    (🔒)  Deferred
```

**Sizing:** S ≤ 2 days, M ≤ 1 week, L ≤ 3 weeks.
**WIP rule:** Two active programs max. Phase 1 alone. Phases 2+3 pair. Phase 4 alone.

---

## 12. Kill Criteria

| Program | Signal | Threshold | Action |
|---|---|---|---|
| Phase 1 | Sensitivity | Bad fixture not detected | Fix or invalidate; stop all |
| Phase 1 | Specificity | Duplicate fixture reports `improved` | Fix; stop all |
| Phase 2 | Translation | F1 gains don't appear on intent/human audit | Stop representation program |
| Phase 2 | Coverage | <50% scenarios representable after one cycle | Report gap; no abstraction added |
| Phase 3 | Yield | No actionable friction in 8 weeks | Stop; keep journal for debugging |
| Phase 4 | Search yield | 0 wins in 20 candidates per seam | Freeze seam; record negative |
| Phase 4 | Dead end | No `improved` in 10 consecutive cycles | Stop program; report |
| Phase 4 | Cost | Cost per win > budget | Stop; report |
| Phase 4 | Trust | Human audit rates <70% of wins as improvements | Recalibrate; disable auto-tune |

---

## 13. Cost Model

| Program | Per Cycle | Notes |
|---|---|---|
| Phase 1 | — | One-time build; ~2–3 focused weeks |
| Phase 2 | ~5ms/case | In-process; cheap, high iteration |
| Phase 3 | Negligible | Aggregates only |
| Phase 4 | ≤160 browser runs, ≤30 min, ≤150k tokens | Per optimization cycle |

A cycle exceeding budget is `invalid`, not `improved`.

---

## 14. Key Architectural Decisions (Settled)

| ID | Decision | Rationale |
|---|---|---|
| S1 | Substrate + three programs (P1→P2/P3→P4) | Shared measurement; independent consumers |
| S2 | v1 is single-user, local-first | Fits product and privacy posture |
| S3 | No code generation in v1 | Delivery and measurement are bottlenecks |
| S4 | Revisions are the delivery primitive | Replaces artifacts/flags/experiments; rollback = status change |
| S5 | WIP limit: two active programs | Prevents four half-finished systems |
| S6 | One runner, one ledger | Prevents divergent evidence |
| S7 | Three benchmark splits, interface-enforced | Independent evaluation |
| S8 | Consent required for user-visible revisions (C9) | Default: opt-in; `auto-tune` explicit and revocable |
| S9 | Synthesis gated on two wins or two negatives | Earn autonomy |
| S10 | Simplified verdict engine | Exact binomial + bootstrap CI; no composite scores |
| S11 | Two seams for Phase 4 (capture, match) | Reduce scope; prove loop works first |
| S12 | Fast path prioritized | Quality cases run in ms; intent cases only for delivery validation |

---

## 15. Open Decisions (Only What Blocks Current Phase)

### Phase 1 (Current) — Must Decide

| ID | Question | Default Stance | Decide By |
|---|---|---|---|
| D1 | Quality case annotators & agreement | Author + 1 other; κ ≥ 0.6 | Before 2.1 |
| D7 | Benchmark size & split | 40 intent / 60 quality; 60/20/20 | Before 1.9 |
| D8 | Primary metric per workflow | Completion; steps tie-break; latency informational | Before 1.7 |
| D12 | Browser determinism env | Chromium; fixed viewport, locale, timezone, fonts | Before 1.5 |
| D15 | Benchmark ownership | Single maintainer + signed change record | Before 1.10 |
| D46 | v1 benchmark workflows | Capture, match, extraction, recovery | Before 1.9 |

### Phase 2 — Decide When Starting

| ID | Question | Default Stance |
|---|---|---|
| D16 | Commitment lifecycle states | `open → matched → committed → done` + `lapsed`, `cancelled` |
| D17 | Flat vs facets criteria | Adopt facets only if F1 gain > 5pp with no intent regression |
| D18 | Uncertain info presentation | Inline badge + confidence band; never modal |
| D21 | Ontology revision migration | Versioned + reverse migration; human-approved |
| D50 | Calibration threshold | ECE ≤ 0.1 on labeled subset |

### Phase 3 — Decide When Starting

| ID | Question | Default Stance |
|---|---|---|
| D5 | Journal default state | Off; opt-in |
| D22 | Journal storage | IndexedDB via `JsonStore`, local only |
| D23 | Retention/export/deletion | 90 days; user can export and purge; purge immediate |
| D24 | Event taxonomy | 7 events as specified; revisit after 4 weeks |

### Phase 4 — Decide When Starting

| ID | Question | Default Stance |
|---|---|---|
| D27 | Seams for revisions | Capture, match (elicitation deferred) |
| D28 | Parameter space per seam | Declared `ParamSpec` only; no free-form |
| D30 | Cycle budgets | 8 candidates/seam, 160 runs, 30 min, ≤150k tokens |
| D31 | Auto-rollback thresholds | Floor breach or holdout audit fail |

---

## 16. Component Map

| Concern | Location |
|---|---|
| Case registry | `nis/cases/` (new), manifest + hashes |
| Intent cases | `nis/cases/intent/`, seeded from `ui/test/optimize/*.journey.ts` |
| Quality cases | `nis/cases/quality/`, seeded from `optimize/src/synthesis/test-data/` |
| Runner | `optimize/src/runner/` (new), wraps `uiuxEvaluator` + fast path |
| Verdict | `optimize/src/evaluation/verdict.ts` (new) |
| Signal store | `core/src/telemetry/journal.ts` (new, local only) |
| Revision store | `core/src/ui/RevisionStore.ts` (new) |
| Resolution | `core/src/ui/ProfileRegistry.ts` (extend) |
| Params | `ui/src/strategies/*` (2 seams for Phase 4) |
| Consent UI | `ui/src/components/settings/RevisionsTab.tsx` (new) |
| Runtime bridge | `ui/src/dev/DevBridge.tsx` (extend) |
| Ledger | `optimize/src/ledger.ts` (new) |
| Loop subcommands | `optimize/src/loop/subcommands/*` (rewrite evaluate/compare/adopt) |

---

## 17. Report Envelope

```jsonc
{
  "runId": "run-...",
  "program": "P1|P2|P3|P4",
  "manifest": { "version": "1.2.0", "hash": "..." },
  "verdict": {
    "verdict": "improved",
    "primary": { "metric": "completion", "delta": 0.12, "p": 0.02, "ci": [0.03, 0.21] },
    "floors": { "schemaValidity": { "value": 1.0, "floor": 1.0, "pass": true } },
    "excluded": [{ "caseId": "...", "reason": "flaky" }]
  },
  "claim": "O1|O2|O3",
  "cost": { "runs": 180, "tokens": 0, "minutes": 31 }
}
```

---

## 18. File Naming

- Intent cases: `nis/cases/intent/<intent>-<NNN>.json`
- Quality cases: `nis/cases/quality/<family>-<NNN>.json`
- Manifest: `nis/cases/manifest.json`
- Revisions: `loop/revisions/<revision-id>.json`
- Ledger: `loop/ledger/nis.jsonl`
- Runs: `loop/runs/run-<iso>/`

---

## Appendix — What Changed from Previous Version

| Area | Before | After |
|---|---|---|
| Phases | 6 (0-5 + deferred) | 4 (0-3 + deferred synthesis) |
| Programs | 4 (P1-P4) | 3 (P1 substrate, P2/P3 parallel, P4 delivery) |
| P1 deliverables | 14 | 12 (consolidated) |
| P4 seams | 3 | 2 (capture, match) |
| Verdict engine | McNemar + bootstrap + power | Exact binomial + bootstrap; no composite |
| Statistics | Multiple tests per type | One test per type (decided defaults) |
| Consent model | Complex state machine | Boolean `opt-in` vs `auto-tune` |
| Governance levels | S1-S4 | Config/Structure/Interface/Spec |
| Open questions | 60+ | ~15 (only what blocks current phase) |
| Roadmap | Unclear gates | Timeboxed with explicit gates |
| Kill criteria | Per-program | Per-program + shared substrate kills |