# TODO.4.3 — Loop Closure: Replay Automation + Finding Lifecycle

**Derived from TODO.4.1 + strategic assessment.** This slice closes the optimization loop: the microscope works, now add the focus knob.

---

## 1. The One Thing This Slice Proves

> A finding produced by the optimization run can be **reproduced deterministically**, **fixed**, and **verified via replay** — without human intervention beyond the fix itself.

Everything in TODO.4.1 (evidence bundles, deterministic findings, trace emission, guardrails) is *infrastructure*. This slice makes it *operational*.

---

## 2. Verified Baseline (from TODO.4.1)

| Capability | Status | Location |
|------------|--------|----------|
| Journey execution (Playwright) | ✅ | `ui/test/optimize/*.journey.ts` |
| Evidence bundles | ✅ | `doc/evidence/<runId>/bundle.json` |
| Deterministic findings | ✅ | `doc/evidence/<runId>/findings.json` |
| `deriveFindings(bundle)` | ✅ | `optimize/src/finding.ts` |
| CLI: `optimize`, `findings`, `reproduce` | ✅ | `optimize/src/cli.ts`, `cli/src/commands/` |
| Report-only guardrails | ✅ | `optimize/src/policy.ts`, `agent/src/guardrails/` |
| Trace emission (prompt + action) | ✅ | `core/src/tracing/`, `ui/src/dev/bridge.ts` |
| Discovery layer | ✅ | `optimize/src/discovery/` |

**Missing (this slice):**
- `pnpm optimize --replay <runId>` — executes journey from bundle ✅
- `pnpm optimize reproduce <findingId>` — finds run, replays, asserts same failure ✅
- Finding lifecycle — `open` → `fixed` → `verified` with evidence ✅

---

## 3. Architectural Decisions

**AD-1 — Replay uses the existing Playwright runner, not a new driver.**
The bundle contains `journeyId` + `version`. Replay loads the journey from registry (same version), spawns the optimize Playwright project with that journey. Zero new infrastructure.

**AD-2 — Finding reproduction = replay at recorded version + assertion check.**
`reproduce <findingId>` → lookup finding in `index.jsonl` → get `runId` → load bundle → get `journeyId` + `version` → replay → assert same `assertionId` fails. Byte-identical reproduction.

**AD-3 — Finding lifecycle is a field in the finding, not a separate store.**
```ts
interface Finding {
  // ... existing fields
  status: 'open' | 'fixed' | 'verified';
  fixedAt?: string;      // ISO timestamp
  fixedBy?: string;      // commit SHA
  verifiedAt?: string;   // ISO timestamp
  verifiedRunId?: string; // runId that verified the fix
}
```
Status transitions: `open` (created) → `fixed` (dev marks after fix) → `verified` (replay passes).

**AD-4 — Discovery layer generates regression tests automatically.**
`journeySynthesizer.fromGoal('reproduce framework operator mismatch')` produces a JourneySpec targeting the exact assertion. No manual journey writing for regressions.

**AD-5 — No CI/github workflow in this slice.** Local-only verification. CI gate deferred to future slice when the loop is proven locally.

---

## 4. Data Contracts (Minimal Extensions)

### 4.1 Finding — add lifecycle fields
```ts
// optimize/src/finding.ts (extend existing Finding interface)
export interface Finding {
    // ... existing fields
    status: 'open' | 'fixed' | 'verified';
    fixedAt?: string;
    fixedBy?: string;
    verifiedAt?: string;
    verifiedRunId?: string;
}
```

### 4.2 Replay Request
```ts
// optimize/src/replay.ts (extend)
export interface ReplayRequest {
    runId: string;
    journeyId: string;
    version: number;
    seed: JourneySpec['seed'];
    steps: JourneySpec['steps'];
}
```

---

## 5. The Loop, End to End (Extended)

```
# Developer workflow
1. pnpm optimize optimize capture-and-edit
   │
   ├─ Fails → produces runId, bundle, findings (including a11y finding F1)
   │
2. pnpm optimize reproduce F1
   │  ├─ Loads finding F1 → gets runId → loads bundle
   │  ├─ Replays journey at recorded version
   │  └─ Asserts same assertionId fails → "REPRODUCED"
   │
3. Developer fixes the bug (e.g., correct operator in UI)
   │
4. pnpm optimize reproduce F1
   │  ├─ Replays → assertion now PASSES
   │  └─ Marks finding F1 as 'verified' with verifiedRunId
   │
# CI workflow (deferred to future slice)
5. PR pushed → GitHub Action runs optimize
   │  ├─ Collects all finding IDs from new runs
   │  └─ Fails if new finding IDs exist vs local baseline
```

---

## 6. Workstreams (Consolidated, Dependency-Ordered)

### WS-1 · Replay Automation — *unblocks everything* (Day 1) ✅
- **`optimize/src/cli.ts`**: Implemented `--replay <runId>` ✅
  - Load bundle via `loadBundle(runId)` ✅
  - Spawn Playwright with `--project=optimize --grep=replay` + env `NOTENTION_REPLAY_RUN_ID=<runId>` ✅
  - Journey test reads `NOTENTION_REPLAY_RUN_ID`, loads bundle, executes steps, asserts same results ✅
- **`ui/test/optimize/replay.journey.ts`**: New test file that runs in replay mode ✅
  - Reads `NOTENTION_REPLAY_RUN_ID` from env ✅
  - Executes journey steps from bundle ✅
  - Compares assertion results to bundle's recorded assertions ✅
- **`cli/src/commands/ReproduceCommand.ts`**: Implement finding reproduction ✅
  - Parse finding ID → scan `index.jsonl` for matching finding → get `runId` ✅
  - Call `loadBundle(runId)` → extract `journeyId`, `version` ✅
  - Spawn `pnpm optimize --replay <runId>` ✅

**Done when:** `pnpm optimize --replay <runId>` passes for a passing run ✅; `pnpm optimize reproduce <findingId>` prints "REPRODUCED" for a failing finding ✅.

### WS-2 · Finding Lifecycle (Day 2) ✅
- **`optimize/src/finding.ts`**: Extend `Finding` interface + `FindingSchema` ✅
  - Add `status`, `fixedAt`, `fixedBy`, `verifiedAt`, `verifiedRunId` ✅
  - Add `markFixed(commitSha)`, `markVerified(runId)` methods ✅
- **`optimize/src/reporter.ts`**: On bundle write, set `status: 'open'` for new findings ✅
- **`cli/src/commands/FindingsCommand.ts`**: Add `--status` filter, show lifecycle ✅
- **`optimize/src/replay.ts`**: On successful replay of a previously-failing finding, auto-mark `verified` ✅

**Done when:** Finding created → `status: 'open'` ✅; after fix + replay → `status: 'verified'` with `verifiedRunId` ✅; CLI shows lifecycle ✅.

### WS-3 · Regression Test Generation (Day 3, stretch) ✅
- **`optimize/src/discovery/journeySynthesizer.ts`**: Add `generateRegressionTest(finding)` ✅
  - Input: finding with `location` (state path), `journey`, `version` ✅
  - Output: JourneySpec with `assertState` on the exact path + expected value from bundle ✅
  - Uses `StatePathRegistry` for typed paths ✅
- **`optimize/src/cli.ts`**: Add `generate-test <findingId>` subcommand ✅
  - Writes generated journey to `ui/test/optimize/regressions/<findingId>.journey.ts` ✅
  - Marks journey `status: 'ready'` (regression tests are always ready) ✅

**Done when:** `pnpm optimize generate-test <findingId>` produces a valid journey that fails before fix, passes after ✅.

---

## 7. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Replay executes journey from bundle | `pnpm optimize --replay <runId>` exits 0 for passing run ✅ |
| 2 | Reproduce finds and replays failing finding | `pnpm optimize reproduce <findingId>` prints "REPRODUCED" ✅ |
| 3 | Finding lifecycle tracked | Finding goes `open` → `fixed` → `verified` with timestamps ✅ |
| 4 | Zero regressions | All existing tests + optimize tests still pass ✅ |

---

## 8. File Impact (Minimal)

```
optimize/src/
├── cli.ts                      + --replay, generate-test
├── replay.ts                   + loadBundle, replay execution logic
├── finding.ts                  + lifecycle fields, markFixed, markVerified
├── reporter.ts                 + set status: 'open' on new findings
├── journeys.ts                 (no change — replay loads from registry)
└── discovery/
    └── journeySynthesizer.ts   + generateRegressionTest(finding)

ui/test/optimize/
└── replay.journey.ts           NEW — replay-mode test

cli/src/commands/
├── ReproduceCommand.ts         + implement finding → runId → replay
└── FindingsCommand.ts          + --status filter, lifecycle display
```

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Replay flakes due to timing | Replay uses same `settle()` + `waitForReady` as original; deterministic seed |
| Finding ID collision across journeys | IDs derive from `journeyId:version:assertionId` — unique by design |
| Replay can't reproduce flaky failures | Flaky = non-deterministic; slice only handles deterministic findings (AD-5 from TODO.4.1) |

---

## 10. What This Unlocks Next

| Next step | Enabled by |
|-----------|------------|
| CI gate on findings | Local replay + finding lifecycle proven |
| Audit Agent (LLM-based finding generation) | Deterministic `deriveFindings` as reference; replay for verification |
| Implementation Agent (auto-fix) | Replay verifies fix; CI gate prevents regressions |
| In-app evidence UI | `index.jsonl` + finding lifecycle are queryable |
| Speech control | `OptimizeIntent` already structured; replay works headless |
| Simulator evidence | `ScenarioRunner.onEvent` → `EvidenceBundle` → same pipeline |

---

## 11. Definition of Done

- [x] `pnpm optimize --replay <runId>` executes journey from bundle, passes
- [x] `pnpm optimize reproduce <findingId>` reproduces failure, prints "REPRODUCED"
- [x] Finding lifecycle: `open` → `fixed` → `verified` with evidence
- [x] `pnpm optimize generate-test <findingId>` produces valid regression journey (stretch)
- [x] All existing tests + optimize E2E tests pass
- [x] `pnpm optimize:check` passes; `pnpm run build` passes

---

## 12. Schedule

| Day | Work | Note |
|-----|------|------|
| 1 (am) | WS-1: Replay automation (`--replay`, replay.journey.ts) | Core loop closure |
| 1 (pm) | WS-1: ReproduceCommand finding → runId → replay | End-to-end reproduce |
| 2 | WS-2: Finding lifecycle + CLI | Closes the loop |
| 3 | WS-3: Regression test generation (stretch) | Leverages discovery layer |
| **3 (buffer)** | Local stabilization | Fix waits, not sleeps |

---

*This slice adds the focus knob to the microscope. The sample stage (evidence), optics (traces), and stage lock (replay) are done. Now you can actually look at what you find — locally, without CI bloat.*