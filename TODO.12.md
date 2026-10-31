# TODO.12 — Notention Evaluation & Improvement Program

**Supersedes:** `TODO.11.md`, `TODO.11.a.md`, and all prior drafts of this file
**Status:** Active — Phase 0 done; Phase 1 next
**Shape:** One measurement substrate, three consumers. Consolidate the existing code; do not build a parallel system.

---

## ⚡ No-Regrets Work (start immediately, survives any plan change)

These items are **structurally necessary** regardless of which architecture or pivot we end up with. They unblock all downstream work and have no downside.

| # | Item | Why it's no-regrets | Files |
|---|---|---|---|
| NR1 | Fix `createComponentStrategy` argument order bug | Params never reach the app today; nothing causal can work without this | `ui/src/hooks/strategyResolverInit.ts:214-227`, `core/src/ui/strategy.ts:170-185` |
| NR2 | Fix resolver hook contract (`SeamRole` vs seam ID) | Broken contract between hook and registry | `ui/src/hooks/useStrategyResolver.tsx:56-93` |
| NR3 | Delete `compare.ts` fabricated comparison | Actively misleading; no code depends on it | `optimize/src/loop/subcommands/compare.ts` |
| NR4 | Replace `evaluateCandidateFast` copy-baseline with real execution | Fabricated evaluation is worse than no evaluation | `optimize/src/synthesis/evaluation.ts:632-679` |
| NR5 | Fix adoption ledger corruption (append-all bug) | Ledger is unusable; 2,047 lines / 11 unique IDs | `optimize/src/synthesis/adoption.ts:67-70` |
| NR6 | Remove `main()` import side effect in `loop/index.ts` | Breaks tooling, tests, and any programmatic use | `optimize/src/loop/index.ts:1`, `loop/cli.ts:145` |
| NR7 | Fix `scripts/test-ui-batched.ts:96` recursion | `pnpm verify` and CI are unreliable | `scripts/test-ui-batched.ts` |
| NR8 | Add `pnpm test` + `pnpm verify` lane definitions | Current test commands don't run what they should | `package.json`, `scripts/verify.ts` |

**Start here.** These 8 items take ~2 days and make the codebase honest. Everything else depends on them.

---

## 🔀 Pivot Points (where the plan will likely change)

The plan is a hypothesis. These three pivots will reshape it based on Phase 1–2 reality checks.

| Pivot | Trigger | What changes if triggered |
|---|---|---|
| **Resolver Pivot** | Phase 1.3 fails: `ResolvedStrategy` params don't reach render layer, or `ProfileRegistry` has deeper bugs (e.g., experiment check `seamId !== seamRole`) | Abandon `ProfileRegistry` as resolution spine. Build `RevisionStore → renderer` direct path. Phase 3+ rewrites. |
| **Verdict Pivot** | Phase 2.4 fixtures fail: known-bad not detected, duplicate → `improved`, or real gain → `inconclusive` (underpowered) | Change statistical model (e.g., Bayesian, larger N, different primary), or add cases, or accept `inconclusive` as valid. Phase 3+ scope adjusts. |
| **Friction Pivot** | Phase 4b weekly digests are noise/trivia after 4 weeks | Redesign event taxonomy, granularity, or kill the program per kill criteria. |

**Each pivot has a concrete gate in the plan.** Do not pre-solve; execute to the gate, then decide.

---

## Progress Tracking

| Phase | Status | Target | Exit gate |
|---|---|---|---|
| **0. Integrity** | ✅ Done | 2026-10-31 | Core cases load in built runtime |
| **1. Truth & Plumbing** | 🔄 Next | 2026-11-07 | Resolver delivers params; fabricated paths deleted; fast CI lane green |
| **2. Measurement Core** | ⏳ Queued | 2026-11-14 | Verdict fixtures pass in < 10 s |
| **3. Causal Delivery Slice** | ⏳ Queued | 2026-11-21 | One real revision decision, C1–C9 demonstrated |
| **4. Benchmark + Representation** | ⏳ Queued | 2026-12-05 | 40 intent / 60 quality cases; F1 + match baselines |
| **4b. Friction Discovery** | ⏳ Parallel | 2026-12-05 | Journal + digest + ≥ 5 triaged |
| **5. Optimizer** | 🔒 Gated | 2026-12-19 | Two wins or two credible negatives |
| **6. Synthesis** | 🔒 Deferred | — | S2+ autonomy |

**WIP limit:** Phases 1–3 are serial. Phase 4 and 4b run in parallel. Phase 5 starts only after Phase 3 and Phase 4 baselines.

---

## 0. Purpose & Honest Claims

| ID | Objective | Question | Success | May claim | May not claim |
|---|---|---|---|---|---|
| **O1** | Trustworthy evaluation | "Is change X better?" | One real decision made with evidence | "X is reproducibly better on this benchmark" | "Users are better off" |
| **O2** | Representation quality | "Does the ontology represent real situations?" | F1/match baselines + one safe ontology change | "F1 rose on labeled cases" | "The ontology covers human needs" |
| **O3** | Friction discovery | "Where do users struggle?" | Weekly digest, ≥ 5 triaged, ≥ 1 fix | "This friction occurs N times/week locally" | "Fixing it will help" |

**Non-goals:** autonomous code generation, remote telemetry, fleet experimentation, universal-coverage claims.

---

## 1. Reality Audit — What Actually Exists

The previous plan assumed greenfield. The repository already has most of the substrate; much of it is broken or fabricated. Fixing is cheaper and safer than replacing.

| Area | Current reality | Verdict |
|---|---|---|
| Strategy registration | `ui/src/hooks/strategyResolverInit.ts:214-227` calls `createComponentStrategy(id, seam, component, version, props)` with arguments in the wrong order; `params` is always `{}` (`core/src/ui/strategy.ts:170-185`) | **Load-bearing bug** |
| Strategy resolution | `ProfileRegistry.resolveStrategy` (`core/src/ui/ProfileRegistry.ts:199-213`) resolves experiments/profiles, never revisions; experiment check compares `experiment.seamId !== seamRole` (`:144`) — ID vs role | **Wrong layer** |
| Resolver hook | `ui/src/hooks/useStrategyResolver.tsx:56-62` passes a seam ID where a `SeamRole` is expected | **Broken contract** |
| Fast evaluation | `evaluateCandidateFast` copies baseline results (`optimize/src/synthesis/evaluation.ts:636-646`); `passed` is true by construction (`:659-662`) | **Fabricated** |
| Comparison | `optimize/src/loop/subcommands/compare.ts:98-147` copies baseline, injects random assignments | **Delete** |
| Candidate generation | `synthesis/generator.ts:36-38` never calls an LLM; provenance fabricated | **Template only** |
| Must-win gate | `synthesis/gates/mustWinGate.ts:4-7` returns `pass:true` | **Placeholder** |
| ESLint gate | `synthesis/gates/eslintGate.ts:10-54` uses removed `defineRule` API; lint is skipped | **Broken** |
| Adoption ledger | `synthesis/adoption.ts:67-70` appends the whole in-memory array each write; `adoption-ledger.jsonl` has 2,047 lines / 11 IDs | **Corrupt** |
| Loop CLI | `optimize/src/loop/index.ts:1` re-exports `cli.ts`, which runs `main()` on import | **Side effect** |
| Determinism | `loop/determinism.ts` unused; async constructor loads unawaited; replay append duplicates; hash mismatch | **Latent** |
| Browser harness | `ui/eval/harness.ts:39-116,192-314` already has repetitions + seed; unused by the loop | **Reuse** |
| Journeys | `optimize/src/journey.ts` + `stepExecutors/` + `ui/test/support/seed.ts` work; run IDs and clocks are random | **Reuse + freeze** |
| Friction scoring | `loop/prioritize.ts:33-47` scoring is real; no measured signal feeds it | **Reuse** |
| Tests | `optimize` 34 tests / ~8 s; `verify.ts` skips optimize unit tests and `ui/eval`; UI test script recurses (`scripts/test-ui-batched.ts:96`) | **Fix lanes** |

**Rule:** A capability is real only when a test executes it and fails when it is removed.

---

## 2. Architecture Principles

1. **Consolidate, don't fork.** Extend `ProfileRegistry`, `StrategyRegistry`, `ui/eval/harness`, `journey.ts`, `stepExecutors`, `artifactIO`. Create new modules only where none exist.
2. **One resolution path.** All delivery flows through `ResolvedStrategy`. No parallel adoption/flag/experiment readers.
3. **Revisions are the only delivery primitive.** A revision is data, not code. Rollback is a status change.
4. **Evidence or nothing.** No synthesized results, no copied baselines, no random assignments. Missing evidence yields `invalid`, never `improved`.
5. **Fast by default.** Pure and in-process checks run on every change; browser runs are gated, batched, and cached.
6. **Protected cases.** No program writes to a benchmark. Cases are content-addressed and split-enforced.
7. **Delete lies before adding features.** Every fabricated path is removed in Phase 1, not left as a fallback.

---

## 3. Target Architecture

```
                       ┌──────────────────────────────────────┐
                       │            eval/ (benchmark)         │
                       │  cases/{intent,quality} · manifest   │
                       └──────────────┬───────────────────────┘
                                      │ hash-guarded read
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│ quality runner│            │ browser runner│            │ verdict engine│
│ in-process ms │            │ Playwright s  │            │ pure, no I/O  │
│ eval/quality  │            │ ui/eval +     │            │ eval/verdict  │
│               │            │ journey.ts    │            │               │
└───────┬───────┘            └───────┬───────┘            └───────┬───────┘
        └────────────────────────────┼────────────────────────────┘
                                     ▼
                          ┌─────────────────────┐
                          │   run record +      │
                          │   ledger (JSONL)    │
                          └──────────┬──────────┘
                                     ▼
                    ┌────────────────────────────────┐
                    │ RevisionStore + ResolvedStrategy│
                    │ precedence · consent · rollback │
                    └──────────────┬─────────────────┘
                                   ▼
                    ┌────────────────────────────────┐
                    │ App render (capture / match)    │
                    │ params actually applied         │
                    └────────────────────────────────┘
```

### 3.1 Module Map (consolidated)

| Concern | Module | Action |
|---|---|---|
| Case registry | `eval/cases/`, `optimize/src/eval/registry.ts` | New: static JSON + `manifest.json` (sha256) |
| Fast quality runner | `optimize/src/eval/quality.ts` | Extract from `synthesis/evaluation.ts`; real execution |
| Browser runner | `ui/eval/harness.ts` + `optimize/src/journey.ts` | Reuse; add clock/RNG freeze + snapshot replay |
| Verdict | `optimize/src/eval/verdict.ts` | New: pure functions |
| Run records | `optimize/src/eval/run.ts` | New: `RunContext`, hashes, artifact IO |
| Ledger | `optimize/src/eval/ledger.ts` | New: append-one-line, hash chain |
| Revision store | `core/src/ui/RevisionStore.ts` | New: `JsonStore`-backed |
| Resolution | `core/src/ui/ProfileRegistry.ts` | Extend: revision layer + `ResolvedStrategy` |
| Strategy registration | `ui/src/hooks/strategyResolverInit.ts` | Fix argument order |
| Resolver hook | `ui/src/hooks/useStrategyResolver.tsx` | Pass role; expose params + reason |
| Consent UI | `ui/src/components/settings/RevisionsTab.tsx` | New: accept/decline, sticky |
| CLI | `optimize/src/eval/cli.ts` + `pnpm eval` | New; no import side effects |
| Friction journal | `core/src/telemetry/journal.ts` | New: aggregates only |
| Prioritization | `optimize/src/loop/prioritize.ts` | Reuse; feed measured counts |
| Fabricated compare | `optimize/src/loop/subcommands/compare.ts` | Delete |
| Old adoption | `optimize/src/synthesis/adoption.ts` | Deprecate; migrate to revisions |

### 3.2 Resolution Contract

```ts
interface ResolvedStrategy<P = Record<string, unknown>> {
  strategy: Strategy<P>;
  params: P;
  revisionId?: string;
  reason: string[]; // ordered, machine-readable
}
```

Precedence, low → high:

1. strategy defaults (`getDefaultProps`)
2. profile defaults
3. active revision for `(scope, target)`
4. user override

Rules:
- A revision applies only if `status === 'active'` and consent is satisfied.
- `params` are deep-merged at each layer; the reason trail names the winner per key.
- Ontology revisions never auto-activate.

---

## 4. Substrate Specifications

### 4.1 Cases

| Family | Measures | Runner | Count | Speed |
|---|---|---|---|---|
| `intent` | task completion in UI | browser | 40 | ~2 s/case |
| `quality` | extraction / matching correctness | in-process | 60 | ~5 ms/case |

Layout:

```
eval/cases/
  manifest.json            # version, per-file sha256, split, counts
  intent/{search,validation,holdout}/*.json
  quality/extraction/*.json
  quality/match/*.json
```

- `manifest.json` is the only source of truth for membership and hashes. A mismatch refuses the run.
- Splits are enforced by directory **and** reader guard: `readIntent('search'|'validation')` cannot reach `holdout`; `readHoldout()` is audit-only.
- Quality cases: ≥ 40% non-market (care, family, community, volunteering, education, resource sharing).
- Deduplication: intent by intent + normalized prompt (cosine ≥ 0.92); quality by input hash.

Intent case:

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

Quality case:

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

### 4.2 Runner

**Fast path**
- `PropertyExtractor` + `MatchEngine` from `@notention/core`.
- Pure, deterministic, no I/O beyond case load.
- Executes the actual revision params; if a param is unsupported, the run is `invalid`.

**Browser path**
- Reuse `ui/eval/harness.ts` repetition logic and `ui/test/support/seed.ts`.
- Determinism:
  - freeze clock (Playwright clock API or init-script shim),
  - seed `Math.random`,
  - fixed viewport / locale / timezone / fonts,
  - block network and service workers,
  - derive `runId` from `(manifestHash, revisionId, caseId, rep)` — never random.
- `SeedSnapshot`: capture IndexedDB + localStorage + active revision set before the run; replay restores that snapshot, not the registry journey.
- Warm-up run discarded per candidate per case.
- 3 repetitions in verdict runs only. Variance → `flaky`, excluded with reason.

### 4.3 Verdict Engine (pure)

```ts
type Verdict = 'improved' | 'no-change' | 'regressed' | 'inconclusive' | 'invalid';

interface VerdictResult {
  verdict: Verdict;
  primary: { metric: string; delta: number; p: number; ci: [number, number]; requiredN: number; observedN: number };
  floors: Record<string, { value: number; floor: number; pass: boolean }>;
  excluded: { caseId: string; reason: 'flaky' | 'error' | 'unsupported' }[];
}
```

- Paired binary primary → **exact McNemar**.
- Continuous primary → **bootstrap CI** (10k resamples, seeded).
- `requiredN` from baseline rate + MDE + α 0.05 + power 0.80.
- `observedN < requiredN` → `inconclusive`.
- Any floor breach → `regressed`, even if primary improved.
- Unsupported params, missing case, hash mismatch → `invalid`.
- No composite score. Trade-offs are per-metric deltas.
- Fixtures: known-bad < incumbent; duplicate-of-incumbent → `no-change`; no-op revision → `no-change`.

### 4.4 Revision Store

```ts
interface Revision {
  id: string;
  scope: 'ui-config' | 'ontology' | 'prompt';
  target: string;                 // seam id, facet, prompt id
  version: string;
  patch: Record<string, unknown>;
  status: 'proposed' | 'active' | 'rolled_back';
  consent: 'opt-in' | 'auto-tune';
  evidence: { manifestHash: string; verdict: Verdict; runId: string };
  provenance: Provenance;
}
```

- Runtime store: `~/.notention/revisions/` via `JsonStore`; benchmark revisions are fixtures, not user data.
- Consent is a condition, not a setting. Default `opt-in`; `auto-tune` requires explicit enable and is revocable.
- Decline is sticky until the benchmark version changes.
- Ontology revisions require human approval + forward/reverse migration.
- Rollback: `pnpm eval rollback <id>` → `status: rolled_back`, ledger event. No file moves.

### 4.5 Ledger

- Append-only JSONL, hash-chained, **one event per line**.
- Events: `proposed | evaluated | decided | adopted | enabled | disabled | rolled_back | frozen | triaged`.
- Required: `timestamp`, `runId`, `manifestHash`, `configHash`, `revisionId`, `verdict`, `actor`, `reason`, `prevHash`, `hash`.
- `pnpm eval audit <revisionId>` recomputes the chain and exits non-zero on tamper.

### 4.6 Signal Store

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

- Local only, opt-in default **off**, aggregates only, 90-day retention, immediate purge.
- Evidence classes: `measured > observed > hypothesized > asserted`, with age decay.
- Feeds `loop/prioritize.ts`; no separate prioritization system.

---

## 5. Test Strategy — Minimize Execution Time

### 5.1 Lanes

| Lane | Contents | Budget | When |
|---|---|---|---|
| **L0 pure** | verdict math, hashing, precedence, revision validation | < 2 s | every save / `pnpm test` |
| **L1 fast quality** | extraction + match cases, both variants | < 10 s | every save / `pnpm test` |
| **L2 browser smoke** | 1 intent case × 1 rep × 2 variants | < 60 s | `pnpm verify`, pre-commit |
| **L3 browser full** | 40 intent cases × 3 reps, warm-up | < 10 min | nightly, pre-release |

- `pnpm test` = L0 + L1. Browser lanes never run by default.
- `pnpm verify` = build + typecheck + L0 + L1 + L2.
- `pnpm test:nightly` = L3.
- Fix `scripts/test-ui-batched.ts:96` recursion before relying on it.

### 5.2 Time controls

- **Baseline cache** keyed by `(manifestHash, configHash, caseSetHash)`. Reuse across candidates in a cycle.
- **Candidate cache** keyed by `(target, patchHash)`.
- **Successive halving**: evaluate all candidates on a 25% slice, promote the top half.
- **Parallelism**: L1 across worker threads; L2/L3 one browser, one worker, contexts reused per case.
- **Repetitions** only where the verdict needs them (L3 / verdict runs), never in unit tests.
- **Changed-only**: `--tag` / `--intent` filters for local iteration; full manifest only in CI.
- **No sleep-based waits**: use `waitForState` / `expect.poll`; no fixed `setTimeout` in steps.

### 5.3 Test debt to fix in Phase 1

- `optimize/src/tests/synthesis/strategyComparison.test.ts:4` imports a removed module (type-only, passes by accident).
- `optimize/vitest.config.ts` uses `passWithNoTests`; remove once suites exist.
- `scripts/verify.ts:26-36` omits optimize unit tests and `ui/eval`.
- Add a CI check that fails when a fabricated path is reintroduced (grep guard for `Math.random` in eval, copied baseline, `pass: true` gates).

---

## 6. Phases

### Phase 0 — Integrity ✅ (2026-10-31)

- [x] Static ESM imports for core test data; fail-loud assertions.
- [x] `CORE_EXTRACTION_TEST_CASES.length > 0`, `CORE_MATCH_TEST_CASES.length > 0` in `dist/`.
- [x] All existing tests pass; build passes.

---

### Phase 1 — Truth & Plumbing (serial, ~1 week)

**Goal:** make the existing architecture honest and make params reach the app.

| # | Task | Files | Exit | No-regrets |
|---|---|---|---|---|
| 1.1 | Fix strategy registration argument order | `ui/src/hooks/strategyResolverInit.ts:214-227` | Registered strategy IDs match profile selections | ✅ NR1 |
| 1.2 | Fix resolver hook to pass `SeamRole`, not seam ID | `ui/src/hooks/useStrategyResolver.tsx:56-93` | Unit test resolves `capture` role | ✅ NR2 |
| 1.3 | Plumb `params` + `reason` through `ResolvedStrategy` | `core/src/ui/ProfileRegistry.ts:129-213` | 5-layer precedence test passes | |
| 1.4 | Delete fabricated comparison | `optimize/src/loop/subcommands/compare.ts` | File gone; no references | ✅ NR3 |
| 1.5 | Replace copy-baseline evaluation with real execution | `optimize/src/synthesis/evaluation.ts:632-679` | Distinct params → distinct results | ✅ NR4 |
| 1.6 | Fix adoption ledger append + migrate old ledger | `optimize/src/synthesis/adoption.ts:67-70` | One line per event; chain valid | ✅ NR5 |
| 1.7 | Remove `main()` import side effect | `optimize/src/loop/index.ts:1`, `loop/cli.ts:145` | Import does not run CLI | ✅ NR6 |
| 1.8 | Implement or delete must-win gate | `synthesis/gates/mustWinGate.ts` | No placeholder `pass:true` | |
| 1.9 | Fix or remove ESLint gate | `synthesis/gates/eslintGate.ts` | Gate actually lints | |
| 1.10 | Repair or delete `determinism.ts` | `optimize/src/loop/determinism.ts` | No unused latent module | |
| 1.11 | Fix UI test recursion + verify lanes | `scripts/test-ui-batched.ts`, `scripts/verify.ts` | `pnpm verify` runs L0+L1+L2 | ✅ NR7, NR8 |
| 1.12 | Add fabricated-path grep guard | CI script | Reintroduction fails CI | |

**Gate:** `pnpm verify` green; one revision param visibly changes a capture render; no fabricated evaluation path remains.

**Resolver Pivot check:** If 1.3 + L2 smoke fail → abandon `ProfileRegistry` spine, build direct `RevisionStore → renderer` path.

---

### Phase 2 — Measurement Core (serial, ~1 week)

**Goal:** a verdict you can trust, in milliseconds.

| # | Task | Exit |
|---|---|---|
| 2.1 | `eval/cases/manifest.json` + hash guard + readers | Mismatch refused |
| 2.2 | Move/author 20 quality cases (extraction + match) | All run in L1 |
| 2.3 | `optimize/src/eval/verdict.ts` pure engine | Fixture suite passes |
| 2.4 | Fixtures: no-op, duplicate, known-bad, real-improvement | Expected verdicts, < 10 s |
| 2.5 | `optimize/src/eval/quality.ts` real runner + baseline cache | Cache hit < 1 ms |
| 2.6 | `RunContext` + replay hash | Re-run hash matches |
| 2.7 | `optimize/src/eval/ledger.ts` + audit | Tamper detected |
| 2.8 | `pnpm eval` CLI (no side effects) | `eval run`, `eval audit`, `eval report` |

**Gate:** L0+L1 < 10 s; all four fixture classes yield the expected verdict; ledger audit passes.

**Verdict Pivot check:** If known-bad not detected, duplicate → `improved`, or real gain → `inconclusive` (underpowered) → change statistical model, add cases, or accept `inconclusive` as valid.

---

### Phase 3 — Causal Delivery Slice (serial, ~1 week)

**Goal:** prove the full loop on one seam before scaling.

| # | Task | Exit |
|---|---|---|
| 3.1 | `RevisionStore` + schema + validation | Invalid patch rejected |
| 3.2 | Revision layer in `ProfileRegistry` precedence | 5-layer test passes |
| 3.3 | One capture revision (`autoFocus`, `placeholder`, `submitOnEnter`) | Render differs per params |
| 3.4 | Consent UI: Settings → Revisions (accept/decline) | Decline sticky |
| 3.5 | One intent case + `SeedSnapshot` + clock/RNG freeze | Replay DOM hash identical |
| 3.6 | End-to-end: propose → evaluate → verdict → consent → active → rollback | C1–C9 demonstrated |
| 3.7 | Ledger records every transition | Audit verifies |
| 3.8 | Human gate reported as `unmet` when absent | Visible in report |

**Gate:** one real release decision made with the harness; rollback restores prior behavior; L2 < 60 s.

**Resolver Pivot re-check:** If revision params don't reach render → implement direct `RevisionStore → renderer` injection, bypass `ProfileRegistry`.

---

### Phase 4 — Benchmark + Representation (parallel, ~2 weeks)

#### 4a. Representation (O2)

| # | Task | Exit |
|---|---|---|
| 4a.1 | 60 quality cases, ≥ 40% non-market, κ ≥ 0.6 | All run |
| 4a.2 | Extraction F1 + schema-validity baseline | Reproducible |
| 4a.3 | Match P@5 / R@5 / NDCG@10 baseline | Reproducible |
| 4a.4 | Confidence + provenance on inferred values | `source: inferred|confirmed`, `confidence` |
| 4a.5 | ECE calibration | ECE ≤ 0.1 on labeled subset |
| 4a.6 | Correction flow feeds labels | Override recorded, never silently binding |
| 4a.7 | Coverage matrix | Full/partial/gap per axis |
| 4a.8 | Flat vs facet benchmark | Decision record |
| 4a.9 | Commitment lifecycle states | Invalid transitions rejected |
| 4a.10 | 40 intent cases authored | All run; incumbent band holds |

#### 4b. Friction (O3)

| # | Task | Exit |
|---|---|---|
| 4b.1 | Local journal, opt-in, aggregates | No raw text; retention enforced |
| 4b.2 | 7 workflow capture points | Counts match manual session |
| 4b.3 | Weekly digest with confidence | Generated from aggregates |
| 4b.4 | Human triage queue | ≥ 5 triaged, reason recorded |
| 4b.5 | Evidence classes + decay | Measured outranks hypothesized |

**Gate to O2 claims:** baseline + one ontology change with no intent regression.
**Gate to O3 claims:** ≥ 5 triaged, ≥ 1 shipped fix.

**Friction Pivot check:** After 4 weekly digests, if output is noise/trivia → redesign event taxonomy/granularity or kill per kill criteria.

---

### Phase 5 — Optimizer (serial, ~2 weeks)

| # | Task | Exit |
|---|---|---|
| 5.1 | Second seam revision set (match) | Renders differently per params |
| 5.2 | Candidate enumeration over `ParamSpec` | 8 candidates/seam |
| 5.3 | Candidate cache `(target, patchHash)` | Re-evaluation skipped |
| 5.4 | Successive halving + budget | Budget respected, early stop |
| 5.5 | Full cycle: propose → evaluate → decide → propose-to-user | One opt-in adoption |
| 5.6 | Negative-result recording + freeze | Frozen seam exits cleanly |
| 5.7 | Cost accounting | Report includes runs/tokens/minutes |

**Search space:** declared `ParamSpec` only. No free-form values. LLM may propose a patch; it is validated and never emits code.
**Gate to synthesis:** two measured wins, or two credible negatives on a valid benchmark.

---

### Phase 6 — Synthesis (deferred)

New implementations (S2), new seams (S3), specs (S4). Human review required. Not started until Phase 5 gate passes.

---

## 7. Change Contract (C1–C9)

| ID | Condition | Test |
|---|---|---|
| C1 | **Causal** — change executes and alters behavior | Distinct revisions → distinct results |
| C2 | **Measured** — paired on protected cases | Same cases, seeds, environment |
| C3 | **Superior** — primary gain > required effect | Verdict `improved` |
| C4 | **Safe** — floors hold; audit passes or auto-revert | Floor table + audit |
| C5 | **Reproducible** — replay hash matches | Re-run from recorded inputs |
| C6 | **Reversible** — rollback verified | Adopt → enable → rollback |
| C7 | **Attributable** — provenance complete | Ledger fields non-null |
| C8 | **Affordable** — within budget | Cost record |
| C9 | **Consented** — user accepted or `auto-tune` explicit | Consent field + audit |

Ontology revisions additionally require migration, reverse migration, and human approval.

---

## 8. Governance

| Level | Capability | Governance | Phase |
|---|---|---|---|
| **Config** | Param revision to an existing strategy | C1–C9; user opt-in | 3–5 |
| **Structure** | New implementation of an existing pattern | Gates + human review | 6 |
| **Interface** | New seam / interface | Human review, signed approval | 6 |
| **Spec** | Development specifications | Human-directed | 6 |

Ontology and prompt revisions are **Structure-equivalent**: they change meaning, not appearance.

---

## 9. Roadmap

```
Phase 0  Integrity                ✅ 2026-10-31
Phase 1  Truth & Plumbing          ──┐ 2026-11-07
Phase 2  Measurement Core          ──┤ 2026-11-14
Phase 3  Causal Delivery Slice     ──┘ 2026-11-21
                                      Gate: one real decision
Phase 4a Representation (O2)       ──┐
Phase 4b Friction (O3)             ──┘ 2026-12-05 (parallel)
Phase 5  Optimizer (O1 delivery)   ──  2026-12-19
                                      Gate: two wins or two negatives
Phase 6  Synthesis                 🔒 deferred
```

Sizing: S ≤ 2 days, M ≤ 1 week, L ≤ 3 weeks.

---

## 10. Kill Criteria

| Phase | Signal | Threshold | Action |
|---|---|---|---|
| 1 | Plumbing | Params do not change render | Stop; fix resolver before anything else |
| 2 | Sensitivity | Known-bad not detected | Fix or invalidate harness; stop all |
| 2 | Specificity | Duplicate reports `improved` | Fix; stop all |
| 2 | Speed | L0+L1 > 30 s | Cut cases or cache before proceeding |
| 3 | Causality | Two revisions produce identical results | Stop; C1 failed |
| 3 | Reversibility | Rollback does not restore behavior | Stop; C6 failed |
| 4a | Translation | F1 gains do not appear on intent/human audit | Stop representation program |
| 4a | Coverage | < 50% scenarios representable after one cycle | Report gap; add no abstraction |
| 4b | Yield | No actionable friction in 8 weeks | Stop; keep journal for debugging |
| 5 | Search | 0 wins in 20 candidates/seam | Freeze seam; record negative |
| 5 | Dead end | No `improved` in 10 cycles | Stop; report |
| 5 | Trust | Human audit rates < 70% of wins | Recalibrate; disable auto-tune |

---

## 11. Cost Model

| Phase | Per cycle | Notes |
|---|---|---|
| 1–3 | — | One-time build; ~3 focused weeks |
| 4a | ~5 ms/case | In-process; cheap iteration |
| 4b | negligible | Aggregates only |
| 5 | ≤ 160 browser runs, ≤ 30 min, ≤ 150k tokens | 8 candidates/seam, successive halving |

A cycle over budget is `invalid`, not `improved`.

---

## 12. Decisions

### 12.1 Settled

| ID | Decision | Rationale |
|---|---|---|
| S1 | Consolidate existing substrate; no parallel `nis` system | Less code, fewer divergent paths |
| S2 | Single-user, local-first v1 | Product and privacy posture |
| S3 | No code generation in v1 | Delivery and measurement are the bottlenecks |
| S4 | Revisions are the delivery primitive | Replaces artifacts/flags/experiments |
| S5 | WIP limit: two active programs | Finish before expanding |
| S6 | One runner, one ledger | Prevent divergent evidence |
| S7 | Three splits, interface-enforced | Independent evaluation |
| S8 | Consent required for user-visible revisions | Default opt-in; auto-tune explicit |
| S9 | Synthesis gated on two wins or two negatives | Earn autonomy |
| S10 | Exact McNemar (binary) + bootstrap (continuous) | Correct paired statistics |
| S11 | Two seams for Phase 5 (capture, match) | Prove the loop before widening |
| S12 | Tiered test lanes; browser gated | Minimize cycle time |
| S13 | `eval/` benchmark, `~/.notention/revisions/` runtime | Benchmark is code; revisions are user data |
| S14 | Extend `pnpm loop` / add `pnpm eval`; no `nis` namespace | One CLI surface |

### 12.2 Open — blocks Phase 1/2

| ID | Question | Default stance | Decide by |
|---|---|---|---|
| D1 | Quality annotators & agreement | Author + 1; κ ≥ 0.6 | 2.2 |
| D7 | Benchmark size & split | 40 intent / 60 quality; 60/20/20 | 2.1 |
| D8 | Primary metric per workflow | Completion; steps tie-break; latency informational | 2.3 |
| D12 | Browser determinism | Chromium; frozen clock/RNG; fixed viewport/locale/timezone/fonts | 3.5 |
| D15 | Benchmark ownership | Single maintainer + signed change record | 2.1 |
| D46 | v1 workflows | Capture, match, extraction, recovery | 2.2 |

### 12.3 Open — decide when the phase starts

| ID | Question | Default stance |
|---|---|---|
| D16 | Commitment lifecycle | `open → matched → committed → done` + `lapsed`, `cancelled` |
| D17 | Flat vs facets | Facets only if F1 gain > 5 pp with no intent regression |
| D18 | Uncertain info UI | Inline badge + confidence band; never modal |
| D21 | Ontology migration | Versioned forward + reverse; human-approved |
| D50 | Calibration threshold | ECE ≤ 0.1 |
| D5 | Journal default | Off; opt-in |
| D22 | Journal storage | IndexedDB via `JsonStore`, local only |
| D23 | Retention | 90 days; export/purge immediate |
| D27 | Phase 5 seams | Capture, match |
| D28 | Param space | Declared `ParamSpec` only |
| D30 | Cycle budget | 8 candidates/seam, 160 runs, 30 min, ≤ 150k tokens |
| D31 | Auto-rollback | Floor breach or holdout audit fail |

---

## 13. Risks & Pivot Triggers

| Risk | Mitigation | Pivot trigger |
|---|---|---|
| Resolver stays broken; nothing is causal | Phase 1 gate; L2 smoke asserts a param changes render | **Resolver Pivot** — if Phase 1.3 + L2 smoke fail |
| Fabricated paths return | Grep guard; C1/C5 tests; delete, don't flag | — |
| Benchmark overfitting | Splits, holdout, rotation, freeze | — |
| Goodhart on completion | Floors, secondary metrics, human audit | — |
| Silently changing a personal tool | Consent-first (C9); auto-tune off | — |
| Benchmark rot | Incumbent band; quarterly recalibration | — |
| Representation drift | Version bump; incomparable history | — |
| Privacy leakage | Local aggregates, no egress, retention, opt-in | — |
| Test suite too slow | Tiered lanes, caches, changed-only, nightly browser | — |
| Stale `dist` masking source | Rebuild in verify; remove stale exports | — |
| Verdict underpowered on 40 intent cases | Fixture suite validates sensitivity; `inconclusive` is valid | **Verdict Pivot** — if Phase 2.4 fixtures fail |
| Friction events don't capture real struggle | 4-week digest review; redesign taxonomy if noise | **Friction Pivot** — if Phase 4b yields no actionable signal |

---

## 🏗️ Open Architectural Questions (explicitly undecided)

These are not "decisions pending" — they are **known unknowns** that will be resolved by executing to the relevant gate. Do not assume answers.

| Area | Question | Will be decided at |
|---|---|---|
| Resolution spine | Does `ProfileRegistry` + `ResolvedStrategy` work, or do we need direct `RevisionStore → renderer`? | Phase 1.3 + L2 smoke (Resolver Pivot) |
| Statistical model | Is exact McNemar + bootstrap CI adequate for 40 intent cases, or do we need Bayesian / larger N / different primary? | Phase 2.4 fixture suite (Verdict Pivot) |
| Benchmark scope | Are 40 intent / 60 quality cases the right split? Should recovery/elicitation be in v1? | Phase 2.1 manifest creation (D46, D7) |
| Friction taxonomy | Do the 7 event kinds capture real struggle, or are they too coarse/fine? | Phase 4b after 4 weekly digests (Friction Pivot) |
| Optimizer search | Is `ParamSpec`-only search sufficient, or do we need structural candidates? | Phase 5.2 candidate enumeration |
| Consent model | Is binary `opt-in` vs `auto-tune` enough, or do we need per-revision consent? | Phase 3.4 consent UI |
| Multi-device | Will revisions ever sync? | Deferred (D34) — out of scope v1 |

---

## Appendix A — File Naming

- Intent cases: `eval/cases/intent/<split>/<intent>-<NNN>.json`
- Quality cases: `eval/cases/quality/<family>/<NNN>.json`
- Manifest: `eval/cases/manifest.json`
- Runs: `eval/runs/run-<iso>/`
- Ledger: `~/.notention/ledger/nis.jsonl`
- Runtime revisions: `~/.notention/revisions/<id>.json`

## Appendix B — Report Envelope

```jsonc
{
  "runId": "run-<manifestHash>-<revisionId>-<caseId>-<rep>",
  "program": "P1|P2|P3|P5",
  "manifest": { "version": "1.2.0", "hash": "..." },
  "verdict": {
    "verdict": "improved",
    "primary": { "metric": "completion", "delta": 0.12, "p": 0.02, "ci": [0.03, 0.21], "requiredN": 58, "observedN": 60 },
    "floors": { "schemaValidity": { "value": 1.0, "floor": 1.0, "pass": true } },
    "excluded": [{ "caseId": "...", "reason": "flaky" }]
  },
  "claim": "O1|O2|O3",
  "cost": { "runs": 160, "tokens": 0, "minutes": 28 }
}
```

## Appendix C — First Actions (No-Regrets First)

### Week 1: No-Regrets (survives any pivot)
1. **NR1** Fix `strategyResolverInit.ts:214-227` argument order; unit test resolves `capture` role
2. **NR2** Fix `useStrategyResolver.tsx:56-93` to pass `SeamRole`, not seam ID
3. **NR3** Delete `optimize/src/loop/subcommands/compare.ts`
4. **NR4** Replace `evaluateCandidateFast` copy-baseline with real execution (`evaluation.ts:632-679`)
5. **NR5** Fix adoption ledger append bug + migrate old ledger (`adoption.ts:67-70`)
6. **NR6** Remove `main()` import side effect (`loop/index.ts:1`, `loop/cli.ts:145`)
7. **NR7** Fix `scripts/test-ui-batched.ts:96` recursion
8. **NR8** Define `pnpm test` (L0+L1) and `pnpm verify` (build+typecheck+L0+L1+L2) lanes

### Week 2: Truth & Plumbing
9. Add `ResolvedStrategy` + revision layer in `ProfileRegistry`; 5-layer precedence test
10. Implement or delete must-win gate; fix or remove ESLint gate; repair/delete `determinism.ts`
11. Add fabricated-path grep guard to CI
12. **Gate:** `pnpm verify` green; one revision param visibly changes capture render

### Week 3+: Measurement Core → Causal Slice
13. `eval/cases/manifest.json` + hash guard + readers
14. `verdict.ts` pure engine + four fixtures (no-op, duplicate, known-bad, real-improvement)
15. `quality.ts` real runner + baseline cache
16. `RunContext` + replay hash + `ledger.ts` + `pnpm eval` CLI
17. `RevisionStore` + schema + consent UI (Settings → Revisions)
18. One capture revision + intent case + SeedSnapshot + clock/RNG freeze
19. End-to-end: propose → evaluate → verdict → consent → active → rollback (C1–C9)
20. **Gate:** one real release decision; rollback works; L2 < 60 s
