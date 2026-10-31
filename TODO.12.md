# TODO.12 — Notention Evaluation & Improvement Program

**Supersedes:** `TODO.11.md`, `TODO.11.a.md`, and the optimizer-centric draft of this file
**Status:** Design proposal — all open questions in §16
**Shape:** One evaluation substrate, four consumers. Not one self-improving machine.

---

## Progress Tracking

| Phase | Status | Completed | Notes |
|---|---|---|---|
| Phase 0: Integrity | ✅ **Done** | 2026-10-31 | ESM test-data loading fixed with static imports + fail-loud assertions |
| Phase 1: P1 Harness | ⏳ Not started | — | Depends on Phase 0 |
| Phase 2: P2 Representation | ⏳ Not started | — | Parallel with Phase 3 |
| Phase 3: P3 Friction | ⏳ Not started | — | Parallel with Phase 2 |
| Phase 4: Revision delivery + consent | ⏳ Not started | — | |
| Phase 5: P4 Optimizer | ⏳ Not started | — | |
| Phase 6: Synthesis | 🔒 Deferred | — | |

### Phase 0 — Integrity (Completed 2026-10-31)
- [x] Fix ESM test-data loading; fail loud — static imports for `core-extraction.json`, `core-match.json`, `core-capture.json` with runtime assertions
- [x] Verify: `CORE_EXTRACTION_TEST_CASES.length > 0` and `CORE_MATCH_TEST_CASES.length > 0` in built runtime
- [x] All existing tests pass (34/34)
- [x] Ontology experiment runs successfully with loaded test data

---

## 0. Purpose

Build the measurement and delivery foundation Notention needs, then use it for four distinct objectives. Each objective has its own success criteria and its own kill switch.

| ID | Objective | Question it answers | Risk |
|---|---|---|---|
| **O1** | Trustworthy evaluation | "Is change X better than what we have?" | Low |
| **O2** | Self-optimization (S1) | "Can the system find a better configuration on its own?" | Medium |
| **O3** | Friction discovery | "Where do real users actually struggle?" | Low |
| **O4** | Representation quality | "Does our ontology and matching represent real situations?" | Medium |

They share: a deterministic runner, a case registry, a verdict engine, a local signal store, a revision store, and a ledger. Build that once.

**Non-goals (all phases):** autonomous code generation before O2 is proven; remote telemetry; fleet experimentation; claims of universal coverage.

**All unresolved questions are in §16.** An unanswered question is a blocker, not a default.

### Definition of done, per objective

**O1 — Evaluation**
1. ≥ 40 intent cases and ≥ 60 quality cases, all runnable.
2. Verdict engine distinguishes bad fixture, duplicate fixture, and real improvement.
3. No fabricated evidence anywhere in the pipeline.
4. Ledger verifies; one real release decision made using the harness.

**O2 — Self-optimization**
1. ≥ 3 seams accept parameter revisions at runtime.
2. One proposal adopted with a measured gain and verified rollback.
3. A recorded negative result for at least one exhausted seam — proving the loop can conclude "no".

**O3 — Friction discovery**
1. Local journal running with opt-in, aggregates only.
2. Weekly digest names the top 5 frictions with counts and confidence.
3. ≥ 5 items triaged by a human; ≥ 1 led to a shipped fix.

**O4 — Representation**
1. Coverage matrix across taxonomy axes, gaps marked.
2. Extraction F1 and match precision/recall baselines established.
3. One ontology change evaluated with no regression on intent cases.
4. Inferred values carry confidence and provenance; uncertain ones are never binding.

---

## 1. Thesis and honest claims

**Thesis:** improvement is limited by measurement and delivery, not generation. Generation is cheap; trustworthy evidence is expensive.

**Honest claims table** — the system must never claim more than its evidence supports:

| Objective | May claim | May not claim |
|---|---|---|
| O1 | "Change X is reproducibly better on this benchmark" | "Users are better off" |
| O2 | "Config X raised scripted completion by Y points" | "The product is better" |
| O3 | "This friction occurs N times per week in local usage" | "Fixing it will help" |
| O4 | "This ontology change raised extraction F1 on labeled cases" | "The ontology covers human situations" |

Every report states which row it belongs to.

---

## 2. Diagnosis — why the current loop produces no value

| # | Failure | Evidence |
|---|---|---|
| 1 | Adopted artifacts are never read by the app | `synthesis/adoption.ts:98-104`; static registration in `ui/src/hooks/strategyResolverInit.ts:203-227` |
| 2 | Candidate evaluation is non-causal (copies baseline) | `synthesis/evaluation.ts:672-690` |
| 3 | Test data loads empty in ESM builds | verified: `CORE_EXTRACTION_TEST_CASES.length === 0` in `dist/` |
| 4 | Ground truth mined from the system's own tests | `discovery/testgen/goldenCaseMiner.ts:64-71, 266-287` |
| 5 | No usage signal feeds prioritization | `loop/prioritize.ts:15-36`; no telemetry source |
| 6 | Candidates are identical (deterministic template) | `synthesis/generator.ts:36-38` |
| 7 | Comparison fabricates data (random, always-pass) | `loop/subcommands/compare.ts:98-147` |

Consequence: every downstream activity is a simulation. Fix the substrate before adding consumers.

---

## 3. Program structure

```
                    ┌──────────────────────────────┐
                    │        Substrate (§4)        │
                    │  cases · runner · verdict    │
                    │  signal · revisions · ledger │
                    └───────┬──────────┬───────────┘
                            │          │
        ┌───────────────────┘          └──────────────────┐
        ▼                                                 ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ P1 Evaluation │   │ P2 Represent. │   │ P3 Friction   │   │ P4 Optimizer  │
│ harness       │   │ lab           │   │ discovery     │   │ (S1 config)   │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
     O1                 O4                 O3                 O2
```

**WIP limit: two active programs.** Four programs started at once is how none finish. P1 is serial. After P1, P2 and P3 run in parallel. P4 starts only after P2 establishes baselines and delivery revisions exist.

**Shared invariants**
- One runner. No program may add its own measurement loop.
- One ledger. Every proposal, evaluation, decision, adoption, and rollback is recorded.
- Cases are protected. No program writes to a benchmark.
- Each program's kill criteria are independent.

---

## 4. Substrate

### 4.1 Case Registry — two families

| Family | Measures | Where | Speed | Owner |
|---|---|---|---|---|
| `intent` | user task completion in the UI | browser journeys | slow (seconds) | human-authored |
| `quality` | extraction and matching correctness | in-process | fast (ms) | human-labeled |

Both are content-addressed (`sha256` per case + manifest). Two readers exist by construction:

- `CaseReader.intent({ split })` — never returns holdout.
- `CaseReader.quality()` — full access, because quality cases are cheap and meant for iteration.
- `HoldoutReader` — separate entry point used only by the audit command.

### 4.2 Runner

- `browser`: existing `optimize/src/uiuxEvaluator.ts` + `stepExecutors`, extended with `SeedSnapshot` replay.
- `fast`: `PropertyExtractor` + `MatchEngine` from `@notention/core`, no browser.
- Determinism: seeded state snapshot, fixed viewport, fixed locale, network blocked.
- Warm-up run discarded per candidate per case.
- 3 repetitions; variance flags the case as `flaky` and excludes it from verdicts.

### 4.3 Verdict engine

Input: paired per-case results. Output:

```ts
type Verdict = 'improved' | 'no-change' | 'regressed' | 'inconclusive' | 'invalid';

interface VerdictResult {
  verdict: Verdict;
  primary: { metric: string; delta: number; p: number; requiredN: number; observedN: number };
  floors: Record<string, { value: number; floor: number; pass: boolean }>;
  excluded: { caseId: string; reason: 'flaky' | 'error' }[];
}
```

- Binary primary → McNemar.
- Continuous → bootstrap CI (10k).
- Power computed from baseline rate before the cycle; underpowered ⇒ `inconclusive`.
- No composite score. Trade-offs reported as per-metric deltas.

### 4.4 Signal store

Local journal, opt-in, aggregates only.

```ts
interface FrictionEvent {
  bucket: string;                 // ISO date, day granularity
  workflow: string;
  seam: string;
  kind: 'capture_started' | 'capture_abandoned' | 'correction'
      | 'match_viewed' | 'match_rejected' | 'match_accepted'
      | 'clarification_requested';
  count: number;
  durationBucket?: '<5s' | '5-15s' | '15-60s' | '>60s';
}
```

No raw text, no identifiers, no egress. Retention 90 days. Evidence classes: `measured > observed > hypothesized > asserted`, with age decay.

### 4.5 Revision store — consent-first delivery

Replace artifacts, flags, and experiments with **revisions**. A revision is a proposed patch to a declared surface.

```ts
interface Revision {
  id: string;
  scope: 'ui-config' | 'ontology' | 'prompt';
  target: string;                 // seam id, ontology facet, prompt id
  version: string;
  patch: Record<string, unknown>;
  status: 'proposed' | 'active' | 'rolled_back';
  consent: 'opt-in' | 'auto-tune';
  evidence: { manifestHash: string; verdict: Verdict; runId: string };
  provenance: Provenance;
}
```

- Stored in `JsonStore`; seeded into journeys via the existing `seed` step.
- Resolution precedence (low → high): strategy defaults → profile defaults → active revision → user override.
- **Consent is a condition, not a setting.** Default is `opt-in`: the app surfaces a proposal, the user accepts. `auto-tune` exists only if the user explicitly enables it. A statistically valid change the user did not accept is not adopted.
- Ontology revisions always require explicit approval and a migration path.
- Rollback: `pnpm nis rollback <revision-id>` → flag off, status `rolled_back`, ledger entry. No file moves.

`ResolvedStrategy` becomes the single resolution return type:

```ts
interface ResolvedStrategy<P = Record<string, unknown>> {
  strategy: Strategy<P>;
  params: P;
  revisionId?: string;
  reason: string[];               // ordered trail, machine-readable
}
```

### 4.6 Ledger

Append-only JSONL, hash-chained. Events: `proposed | evaluated | decided | adopted | enabled | disabled | rolled_back | frozen | triaged`.

Required: timestamp, runId, manifestHash, configHash, revisionId, verdict, actor, reason. `pnpm nis audit <revisionId>` verifies the chain.

---

## 5. Measurement model

### 5.1 Intent cases (O1, O2)

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

Splits: `search` 60% / `validation` 20% / `holdout` 20%. Interface-enforced.

### 5.2 Quality cases (O4)

Extraction:

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

Matching:

```jsonc
{
  "id": "quality-match-014",
  "family": "match",
  "request": "...",
  "offer": "...",
  "relevant": true,
  "grade": 2,                      // 0 irrelevant, 1 weak, 2 strong
  "labels": { "annotators": 2, "agreement": 0.72 }
}
```

| Family | Metrics | Notes |
|---|---|---|
| extraction | property F1, exact-match rate, schema validity | per-key and macro |
| matching | precision@5, recall@5, NDCG@10 | graded relevance |
| calibration | ECE on inferred values | requires confidence output |

Include non-market scenarios (care, family, community, volunteering, education, resource sharing) per TODO.11 §4.1. Target 60 quality cases, at least 40% non-market.

### 5.3 Statistics

- Paired runs, same cases, same seeds, same environment.
- Power required before judging: baseline rate + α 0.05 + power 0.80 ⇒ required n. Underpowered ⇒ `inconclusive`.
- Intent cases: McNemar. Quality cases: bootstrap CI on F1/precision.
- Warm-up discarded; 3 repetitions; flaky cases excluded with reason.
- Verdicts are per-metric; no single score decides adoption.

### 5.4 Validity

- Deduplication by intent + normalized prompt embedding (0.92) for intent cases; by input hash for quality cases.
- Rotation every 4 cycles; retirements recorded.
- Incumbent must score within an expected band per case (benchmark rot check).
- Known-bad fixture must score below incumbent (sensitivity).
- Duplicate-of-incumbent fixture must yield `no-change` (specificity).
- Holdout audit (`nis audit-holdout`) runs outside the loop, post-adoption and quarterly.

**Stated limitation:** intent cases are a proxy. The benchmark cannot observe whether a real intention succeeded. Human audit is the only correction; it is required before claiming O2 gains beyond "scripted completion".

---

## 6. The Change Contract

Applies to every proposed revision, regardless of scope.

| ID | Condition | Test |
|---|---|---|
| C1 | Causal — change executes and alters behavior | distinct revisions → distinct results |
| C2 | Measured — paired on protected cases | same cases, seeds, environment |
| C3 | Superior — primary gain > required effect | verdict `improved` |
| C4 | Safe — floors hold; post-adoption audit passes or auto-revert | floor table + audit |
| C5 | Reproducible — replay hash matches | re-run from recorded inputs |
| C6 | Reversible — rollback verified | adopt → enable → rollback test |
| C7 | Attributable — provenance complete | ledger fields non-null |
| C8 | Affordable — within budget | cost record |
| **C9** | **Consented** — user accepted, or `auto-tune` explicitly enabled | consent field + audit log |

Ontology revisions additionally require: migration plan, rollback plan, and human approval (C6 is harder: data migration).

---

## 7. Program 1 — Evaluation harness (O1)

**Serial. Nothing else starts until this exits.**

| Deliverable | Size | Exit criterion |
|---|---|---|
| Fix ESM test-data loading; fail loud | S | core cases > 0 in built runtime |
| Causal candidate execution | M | distinct revisions → distinct results |
| Strict must-win + noise margin | S | no-op rejected |
| Remove fabricated comparison | S | identical variants → `no-change` |
| `RunContext` + replay hashes wired | S | re-run hash matches |
| Unmet human gate reported as `unmet` | S | visible in records |
| Config↔code drift test | S | unimplemented metric fails CI |
| Case Registry + manifest + hash guard | M | mismatch refused |
| `SeedSnapshot` + deterministic runner | M | replay → identical DOM hash |
| Flake detector + warm-up | S | variance excluded |
| Verdict engine + power calculator | M | fixtures yield expected verdicts |
| Leak fix: benchmark path excludes holdout | S | holdout read attempt fails test |
| 40 intent cases authored | L | all run; incumbent band holds |
| Ledger + audit | M | chain verifies; tamper detected |

**Gate to P2/P3:** all of the above, plus one release decision made with the harness.

---

## 8. Program 2 — Representation lab (O4)

Runs parallel with P3. Fast in-process iteration; no browser needed for most work.

| Deliverable | Size | Exit criterion |
|---|---|---|
| 60 quality cases, ≥40% non-market | L | all run; labels agree κ ≥ 0.6 |
| Extraction F1 + schema validity baseline | M | baseline recorded, reproducible |
| Match precision@5 / recall@5 / NDCG baseline | M | baseline recorded |
| Calibration (ECE) for inferred properties | M | confidence emitted per property |
| Confidence + provenance on inferred values | M | `source: inferred|confirmed`, `confidence` |
| Correction flow: user override feeds labels | M | override recorded; never silently binding |
| Coverage matrix across taxonomy axes | M | full/partial/gap per scenario |
| Flat vs facet benchmark | L | decision record with measured trade-offs |
| Commitment lifecycle states + deterministic transitions | L | invalid transitions rejected |

**Rules**
- The system may draft coverage; a human confirms it. A generator cannot grade representational adequacy.
- Confidence never upgrades to commitment without explicit user action.
- Representation changes bump the benchmark version; historical comparisons are marked incomparable.

**Gate to O4 claims:** baseline + at least one evaluated ontology change with no intent-case regression.

---

## 9. Program 3 — Friction discovery (O3)

Runs parallel with P2.

| Deliverable | Size | Exit criterion |
|---|---|---|
| Local journal, opt-in, aggregates only | M | no raw text; retention enforced |
| Event capture at 7 workflow points | M | counts match manual session test |
| Weekly digest: top frictions with confidence | S | digest generated from aggregates |
| Human triage queue | S | ≥ 5 items triaged; reason recorded |
| Evidence classes in prioritization | S | measured outranks hypothesized |
| Decay and freshness | S | stale signal demoted |

**Rules**
- Discovery only. No automatic fixes. Triage output feeds P2 hypotheses or P4 search targets.
- Opt-in default off. A digest without consent is a privacy failure, not a feature.

**Kill:** if 8 weeks produce no actionable friction, stop the program and keep the journal as a debugging aid.

---

## 10. Program 4 — Optimization loop (O2)

Starts only after P1 and the revision delivery layer exist, and P2 has baselines.

| Deliverable | Size | Exit criterion |
|---|---|---|
| Revisions for 3 seams (capture, elicit, match) | L | each renders differently per params |
| `ResolvedStrategy` + precedence + reason trail | M | 5-layer precedence test passes |
| Consent UI for proposals | M | accept/decline recorded; decline is sticky |
| Candidate enumeration over declared space | M | 12 candidates per seam |
| Candidate cache `(target, patchHash)` | S | re-evaluation skipped |
| Successive halving + budget | M | budget respected; early stop works |
| Full cycle: propose → evaluate → decide → propose-to-user | L | one opt-in adoption with verdict |
| Negative-result recording + freeze | S | frozen seam exits cleanly |

**Search space:** declared `ParamSpec` options only. No free-form values. LLM may propose a patch; it is validated against the spec and never emits code.

**Adoption:** proposals surface to the user. `auto-tune` off by default.

**Gate to synthesis (S2):** two measured wins, or two credible negative results on a valid benchmark.

---

## 11. Governance and autonomy

| Level | Capability | Governance | Program |
|---|---|---|---|
| S1 | Parameter/config revision to an existing strategy | Contract C1–C9; user opt-in | P4 |
| S2 | New implementation of an existing pattern | Gates + human review | deferred |
| S3 | New seam / interface | Human review, signed approval | deferred |
| S4 | Development specifications | Human-directed | deferred |

Mapping to existing tiers: S1→T1, S2→T2, S3→T3, S4→T4. Keep T names in code.

Ontology and prompt revisions are **S3-equivalent** regardless of size: they change meaning, not appearance.

---

## 12. Roadmap

```
Phase 0  Integrity            (M)   ──┐
Phase 1  P1 Harness           (L)   ──┴── gate: one real decision
                                        │
              ┌─────────────────────────┴──────────────┐
              ▼                                        ▼
Phase 2  P2 Representation (L)              Phase 3  P3 Friction (M)
              │                                        │
              └───────────────┬────────────────────────┘
                              ▼
Phase 4  Revision delivery + consent (M)
                              ▼
Phase 5  P4 Optimizer (L)     ── gate: two wins or two negative results
                              ▼
Phase 6  Synthesis (deferred)     ontology/prompt changes (S3, human)
```

Sizing: S ≤ 2 days, M ≤ 1 week, L ≤ 3 weeks.

**WIP rule:** two active programs maximum. P1 is alone. P2 and P3 pair. P4 is alone.

---

## 13. Kill criteria

Each program can fail independently. A failed program is a result, not a scandal.

| Program | Signal | Threshold | Action |
|---|---|---|---|
| P1 | Sensitivity | bad fixture not detected | Fix or invalidate harness; stop all |
| P1 | Specificity | duplicate fixture reports `improved` | Fix; stop all |
| P2 | Translation | F1 gains do not appear on intent cases or human audit | Stop representation program |
| P2 | Coverage | < 50% scenarios representable after one cycle | Report gap; no abstraction added |
| P3 | Yield | no actionable friction in 8 weeks | Stop; keep journal for debugging |
| P4 | Search yield | 0 wins in 20 candidates per seam | Freeze seam; record negative |
| P4 | Dead end | no `improved` in 10 consecutive cycles | Stop program; report |
| P4 | Cost | cost per win > budget | Stop; report |
| P4 | Trust | human audit rates < 70% of wins as improvements | Recalibrate; disable auto-tune |

---

## 14. Cost model

| Program | Per cycle | Notes |
|---|---|---|
| P1 | — | one-time build; ~6–8 focused weeks |
| P2 | ms per case | in-process; cheap, high iteration |
| P3 | negligible | aggregates only |
| P4 | ≤ 240 browser runs, ≤ 45 min, 0–200k tokens | per optimization cycle |

A cycle that exceeds budget is `invalid`, not `improved`.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Four programs, none finished | WIP limit; serial P1; gates |
| Proxy benchmark mistaken for user value | honest claims table; mandatory human audit |
| Benchmark overfitting | splits, holdout, rotation, freeze |
| Goodhart on completion | floors, secondary metrics, human audit |
| Silently changing a personal tool | consent-first (C9); auto-tune off |
| Benchmark rot | incumbent band, quarterly recalibration |
| Representation drift | benchmark version bump; incomparable history |
| Privacy leakage | local aggregates, no egress, retention, opt-in |
| Fabricated evidence returning | C1/C5 tests; fabricated-comparison regression test |

---

## 16. Decision register

Every unresolved question lives here, with a current stance and what it blocks. Nothing is decided by silence.

### 16.1 Settled — for the record

| ID | Decision | Rationale |
|---|---|---|
| S1 | Substrate + four programs (P1–P4) | Shared measurement; independent consumers |
| S2 | v1 is single-user, local-first | Fits product and privacy posture |
| S3 | No code generation in v1 | Delivery and measurement are the bottlenecks |
| S4 | Revisions are the delivery primitive | Replaces artifacts/flags/experiments; rollback is a status change |
| S5 | WIP limit: two active programs | Prevents four half-finished systems |
| S6 | One runner, one ledger | Prevents divergent evidence |
| S7 | Three benchmark splits, interface-enforced | Independent evaluation |
| S8 | Consent required for user-visible revisions (C9) | The principle is settled; the default mode is D2 |
| S9 | Synthesis gated on two wins or two negative results | Earn autonomy |
| S10 | TODO.11 and TODO.11.a superseded | See D40 for file disposition |
| D19 | Inference never auto-converts to commitment | Explicit user action required |
| D51 | Friction events never include text | Privacy by construction |

### 16.2 Open — blocks Phase 0/1 (P1 harness)

| ID | Question | Current stance | Status |
|---|---|---|---|
| D1 | Who annotates quality cases, and how many annotators? | Author + one other; κ ≥ 0.6 required | open |
| D7 | Benchmark size and split ratio | 40 intent / 60 quality; 60/20/20 | provisional |
| D8 | Primary metric per workflow | completion; steps tie-break; latency informational | provisional |
| D9 | Quality thresholds: what F1/precision delta counts as a win? | bootstrap CI excludes 0; floor F1 ≥ baseline − 1pp | open |
| D10 | Match relevance scale | 3-point graded (0/1/2) | open |
| D11 | Non-market share of quality cases | ≥ 40% | provisional |
| D12 | Browser matrix and determinism environment | Chromium only; fixed viewport, locale, timezone, fonts | open |
| D13 | Flake policy beyond exclusion | 3 runs, majority; 2 consecutive flakes quarantines the case | provisional |
| D14 | Holdout audit cadence and minimum sample | post-adoption + quarterly; n ≥ 8 is underpowered, so audit is directional only | open |
| D15 | Benchmark ownership and change approval | one maintainer + signed change record | open |
| D41 | Tie-break policy when completion is equal | fewer steps, then fewer changed params, then hash | provisional |
| D42 | Evidence required to generalize a capability across workflows | ≥ 2 workflows, same mechanism, no workflow-specific code | open |
| D46 | Which workflows enter the v1 benchmark | capture, match, extraction, recovery; search/commitment deferred | open |
| D55 | When to re-enable human usability studies | after P1 passes and O4 baselines exist; trigger = one stable quarter | open |
| D58 | Are a11y/keyboard assertions mandatory in every intent case? | mandatory lane for capture/elicit; separate lane elsewhere | open |
| D64 | Where do intent cases come from? | interviews first, then observed friction; both recorded | open |

### 16.3 Open — blocks Phase 2 (P2 representation)

| ID | Question | Current stance | Status |
|---|---|---|---|
| D16 | Commitment lifecycle states and legal transitions | `open → matched → committed → done` + `lapsed`, `cancelled` | provisional |
| D17 | Flat attributes vs structured facets: decision criteria | adopt facets only if F1 gain > 5pp with no intent regression | open |
| D18 | How uncertain/inferred information is presented to users | inline badge + confidence band; never modal | open |
| D20 | How coverage is measured without self-grading | system drafts, human confirms; matrix per taxonomy axis | provisional |
| D21 | Ontology revision migration and rollback | versioned migration + reverse migration; human-approved | open |
| D47 | Prompt strategy portfolio in v1 | no; single extraction path until O4 baselines exist | provisional |
| D48 | Minimum ontology for non-market relationships | unknown until coverage matrix exists | open |
| D49 | Extraction metric shape | per-key F1 + macro F1 + exact-match rate; report all three | open |
| D50 | Calibration metric and threshold | ECE ≤ 0.1 on labeled subset | open |
| D56 | Target local model and provider pair | `DEFAULT_MODEL_PINS` names Llama-3.2-3B local + remote fallback; confirm | open |

### 16.4 Open — blocks Phase 3 (P3 friction)

| ID | Question | Current stance | Status |
|---|---|---|---|
| D5 | Journal default state | off; opt-in | provisional |
| D22 | Journal storage location | IndexedDB via `JsonStore`, local only | provisional |
| D23 | Retention, export, and deletion guarantees | 90 days; user can export and purge; purge is immediate | open |
| D24 | Event taxonomy completeness | 7 events as specified; revisit after 4 weeks | open |
| D25 | Digest cadence and delivery | weekly, in-app only; no email | provisional |
| D26 | Triage ownership and SLA | single maintainer; no SLA in v1 | open |
| D59 | Ledger retention vs user deletion | ledger is append-only; deletion is a tombstone event, not an erase | open |

### 16.5 Open — blocks Phase 4/5 (delivery + P4)

| ID | Question | Current stance | Status |
|---|---|---|---|
| D2 | Default consent for revisions | opt-in proposal; `auto-tune` explicit and revocable | open |
| D6 | Entry condition for P4 optimizer | after P1 + P2 baselines; two wins or two negative results before synthesis | provisional |
| D27 | Which seams get revisions first | capture, elicit, match | provisional |
| D28 | Parameter space per seam | declared `ParamSpec` only; no free-form values | provisional |
| D29 | Are LLM-proposed patches allowed in v1? | allowed, validated against `ParamSpec`; zero tokens by default | open |
| D30 | Cycle budgets | 12 candidates/seam, 240 runs, 45 min, ≤200k tokens | provisional |
| D31 | Auto-rollback thresholds | floor breach or holdout audit fail | provisional |
| D32 | Where proposals surface in the UI | Settings → Revisions; one-line preview + accept/decline | open |
| D33 | Revision scope: per-user or per-device | per-user, persisted locally | open |
| D34 | Multi-device sync of revisions | out of scope in v1 | provisional |
| D52 | What happens if a benchmark version changes mid-cycle | cycle invalidated; re-run required | provisional |
| D53 | Can a declined proposal be re-proposed? | only after a benchmark version change | open |

### 16.6 Open — governance, tooling, and program

| ID | Question | Current stance | Status |
|---|---|---|---|
| D3 | Ontology revision approval | always human, always S3-equivalent | provisional |
| D4 | Cohorts and variant assignment | none in v1; revisit only if multi-user | provisional |
| D35 | Who is the `actor` in a single-user system? | local user id, hashed in records | open |
| D36 | Human audit sample and cadence | 10 cases/quarter, blind, ≥ 70% agreement required | open |
| D37 | When does the whole program stop? | no O1 value in 6 months, or all programs hit kill criteria | open |
| D38 | Benchmark retirement rules | no signal for intent case in 90 days; 4-cycle review | provisional |
| D39 | What evidence permits an O2 "user benefit" claim? | human audit of adopted revisions; scripted completion alone is insufficient | open |
| D40 | Disposition of TODO.11 / TODO.11.a | keep as superseded history; do not delete | provisional |
| D43 | Profile selection: user preference vs context | user preference wins; contextual override opt-in | provisional |
| D44 | Acceptable offline degradation | deterministic extraction + capture/match work; AI stage optional | provisional |
| D45 | Program-level usefulness metric | adopted revisions with human-confirmed benefit per quarter | open |
| D54 | Owner for benchmark maintenance over time | single maintainer, documented in `nis/cases/README.md` | open |
| D57 | Security gate policy for future generated code | deferred with synthesis; reuse existing gates when it returns | deferred |
| D60 | Disposition of existing `optimize/src/loop` code | rewrite subcommands in place; keep manifest/artifactIO | open |
| D61 | CLI namespace | new `pnpm nis` namespace reusing loop internals | open |
| D62 | CI cadence and gating | fast lane per PR; browser lane nightly | provisional |
| D63 | Case authoring workflow | JSON cases + markdown index; review before merge | open |

### 16.7 TODO.11 §12 coverage

Every strategic question from TODO.11 is mapped, so none is silently dropped.

| TODO.11 §12 question | Where it lives now |
|---|---|
| 1. Minimum human validation before auto-adopt | D2, D39 |
| 2. Which changes always require human approval | D3, §11 |
| 3. Metric weighting when speed/accuracy/satisfaction conflict | §4.3 (no composite), D41 |
| 4. Minimum ontology for non-market relationships | D48, D11 |
| 5. How to present uncertain/inferred information | D18, D19 |
| 6. Detect that scenarios no longer represent needs | D14, D38 |
| 7. Evidence to generalize across workflows | D42 |
| 8. Profile selection: preference vs context | D43 |
| 9. Acceptable offline degradation | D44 |
| 10. Evidence the system becomes more useful over cycles | D37, D45 |

### 16.8 Full TODO.11 coverage

Not just §12: every TODO.11 section has a home here, or is explicitly deferred.

| TODO.11 section | Where it lives | Status |
|---|---|---|
| 1.1 Independent evaluation | O1, P1, D15 | active |
| 1.2 Human usability validation | D36, D39, D55 | deferred with trigger |
| 1.3 Second workflow | D46, D42 | active |
| 2.1 Outcome metrics | §5.1, §5.2, D8, D41 | active |
| 2.2 Evaluator layers | §4.2 | active |
| 2.3 Experiment reliability | §5.3, D12, D13 | active |
| 3.1 Safe boundaries for generated code | D57 | deferred |
| 3.2 Progressive autonomy | §11 | active |
| 3.3 Provenance and audit | §4.6 | active |
| 4.1 Non-market ontology scenarios | D11, D48 | active |
| 4.2 Lifecycle modelling | D16 | active |
| 4.3 Flat vs structured facets | D17 | active |
| 4.4 Inference with confidence | D18, D19, D50 | active |
| 5.1–5.4 Joint ontology/UI/prompt optimisation | §8, D47 | P2; prompt portfolio deferred |
| 6 Adaptive UI profiles | D43 | deferred to post-v1 |
| 7 Model independence and offline | D44, D56 | partially active |
| 8 Coverage and discovery rate | D11, D20, D42 | active |
| 9 Adoption and rollback | §4.5, D31 | active |
| 10 Implementation priorities | §12 roadmap | active |
| 11 Engineering principles | §6 Change Contract | active |
| 12 Strategic questions | §16.7 | mapped |
| 13 Definition of success | §0 DoD, §1 claims | active |

### 16.9 Decision log format

When a decision is made:
1. Change `Status` to `decided`, record the choice and date in place.
2. If it changes a design section, update that section in the same commit.
3. If it invalidates a prior run, bump the benchmark version and mark comparisons incomparable.

No decision is final by omission. An unanswered question is a blocker, not a default.

---

## Appendix A — Component map

| Concern | New / changed |
|---|---|
| Case registry | `nis/cases/` (new), manifest + hashes |
| Intent cases | `nis/cases/intent/`, seeded from `ui/test/optimize/*.journey.ts` |
| Quality cases | `nis/cases/quality/`, seeded from `optimize/src/synthesis/test-data/` |
| Runner | `optimize/src/runner/` (new), wraps `uiuxEvaluator` + fast path |
| Verdict | `optimize/src/evaluation/verdict.ts` (new) |
| Signal store | `core/src/telemetry/journal.ts` (new, local only) |
| Revision store | `core/src/ui/RevisionStore.ts` (new) |
| Resolution | `core/src/ui/ProfileRegistry.ts` (extend) |
| Params | `ui/src/strategies/*` (3 seams, P4 only) |
| Consent UI | `ui/src/components/settings/RevisionsTab.tsx` (new) |
| Runtime bridge | `ui/src/dev/DevBridge.tsx` (extend) |
| Ledger | `optimize/src/ledger.ts` (new) |
| Loop | `optimize/src/loop/subcommands/*` (rewrite evaluate/compare/adopt) |

## Appendix B — Report envelope

```jsonc
{
  "runId": "run-...",
  "program": "P1|P2|P3|P4",
  "manifest": { "version": "1.2.0", "hash": "..." },
  "verdict": {
    "verdict": "improved",
    "primary": { "metric": "completion", "delta": 0.12, "p": 0.02, "requiredN": 58, "observedN": 60 },
    "floors": { "schemaValidity": { "value": 1.0, "floor": 1.0, "pass": true } },
    "excluded": [{ "caseId": "...", "reason": "flaky" }]
  },
  "claim": "O2",
  "cost": { "runs": 180, "tokens": 0, "minutes": 31 }
}
```

## Appendix C — File naming

- Intent cases: `nis/cases/intent/<intent>-<NNN>.json`
- Quality cases: `nis/cases/quality/<family>-<NNN>.json`
- Manifest: `nis/cases/manifest.json`
- Revisions: `loop/revisions/<revision-id>.json`
- Ledger: `loop/ledger/nis.jsonl`
- Runs: `loop/runs/run-<iso>/`
