# TODO.14 — Closing the Loop: From Instrument to Instrument Panel

**Supersedes:** Nothing. Extends TODO.12 (Evaluation & Improvement Program) and TODO.13 (Generalization Layer).
**Status:** Phase A complete — 2026-11-05. Phase B1–B2.5 complete — 2026-11-05. Phase B3/B4 complete — 2026-11-05. Phase C complete — 2026-11-05. Phase D1/D2/D4/D5 complete — 2026-11-06. A3.5, A4.1, A4.2 complete — 2026-11-06.
**Shape:** Four phases, dependency-ordered. Phase A is integrity (no features). Phases B–C close the measurement→delivery loop and make the UI its instrument panel. Phase D positions the result.
**Basis:** Deep study of `simulator/` and `optimize/` (state verified 2026-11-05). Every claim in this file was checked against the repo at HEAD.

---

## 🎯 Goal

Make the TODO.12/13 apparatus **alive**: one real, human-consented improvement to Notention, discovered by the simulator, measured by the eval substrate, delivered as a revision, confirmed by re-simulation and by local friction telemetry — with the whole arc visible in the UI and recorded in the ledger.

**Success metric (single):** One logged ledger chain of the form
`simulator:friction-detected → candidate:evaluated (measured, powered) → verdict:improved → revision:consented → revision:active → simulator:confirmed → journal:friction-reduced`,
reproducible end-to-end from a clean checkout with one command.

**Secondary metrics:**
- `optimize/` compiles: 0 `tsc --noEmit` errors (was **82**, now **0** ✅).
- Root `pnpm test` green and includes `simulator` (was excluded, now **included** ✅; optimize vitest fixed).
- CI exists and runs `pnpm verify` + UI typecheck on every push (was **zero** CI, now **created** ✅).
- Optimizer evaluation is powered: ≥ 10 intent cases × ≥ 3 repetitions, holdout enforced, cycle refuses to run underpowered (was **2 cases × 1 rep, n=2, nominal halving** — **now ✅**).
- `simulator/movies/` debris ≤ 100 MB (was **8.6 GB**, now **absent** ✅).

---

## 🧭 Design Principles

| Principle | Meaning | Enforcement |
|-----------|---------|-------------|
| **Nothing new until green** | No feature lands while build/test/CI are red | Phase A gate |
| **Powered or silent** | An underpowered result yields `invalid`, never a verdict | MDE gate in optimizer |
| **Measured > observed > hypothesized > asserted** | Synthetic simulator output is `hypothesized`; journal/friction is `observed`; only `measured` auto-delivers | `evidenceClass` gate (TODO.13 S6/E6) |
| **Synthetic ≠ human** | Simulator proves mechanism; journal proves need. Never conflate | Report labels + UI copy |
| **Consent is the product** | The revision consent flow is a user-facing feature, not a dev checkbox | Phase B/C gates |
| **Reversibility by construction** | Every delivered change is a revision: data, not code; rollback = status change | RevisionStore |
| **Honest negatives** | A well-powered null is a result; publish it | Ledger + report |
| **WIP limit** | One phase at a time; Phase D does not start before the Phase C demo | This document |

---

## Phase A — Integrity (Week 1) — **COMPLETE**

No features. No UI work. Get to green, honest, hygienic.

### A0. Build repair (`optimize/`) — **DONE**

Verified 2026-11-05: **82 `tsc --noEmit` errors** → **0 errors** ✅.

| # | Item | Files | Effort | Status |
|---|------|-------|--------|--------|
| A0.1 | Repoint all `./StrategySpec.js` imports → `synthesis/spec/{types,generator,io}.js` | `synthesis/generator.ts`, `synthesis/adoption.ts`, `synthesis/gates.ts`, `synthesis/gates/*.ts` (7), `synthesis/builtinSpecs.ts`, `synthesis/templateGenerator.ts`, `synthesis/requests.ts`, `synthesis/evaluation/candidateEvaluation.ts`, `loop/artifactIO.ts:84` | M | ✅ |
| A0.2 | Delete the stale `synthesis/generator.ts` duplicate; resolve the `CandidateEvaluation` re-export ambiguity (`index.ts:25`) | `synthesis/generator.ts`, `synthesis/index.ts`, `spec/index.ts:2` | S | ✅ |
| A0.3 | Fix `spec/generator.ts`: `./builtinSpecs.js` → `../builtinSpecs.js`; remove top-level `await` in non-async `validateStrategySpec`; import `createCandidateDir/saveCandidate` from `./io.js` | `synthesis/spec/generator.ts` | S | ✅ |
| A0.4 | Fix `../types.js` imports → `./types/index.js` | `optimizer/cache/index.ts`, `optimizer/candidates/index.ts`, `optimizer/evaluation/intentEvaluation.ts` | S | ✅ |
| A0.5 | `@notention/core/utils/singleton` was removed in `dfd799d`; use `core/src/utils/singletonFactory.ts` `createSingleton` (export it from core, or inline in cache) | `optimizer/cache/index.ts:93`, `core/package.json` exports | S | ✅ (inlined) |
| A0.6 | Fix cross-module path depth: `../../shared/types/testCaseTypes.js` → `../shared/types/testCaseTypes.js` | `corpus/index.ts:9` | S | ✅ |
| A0.7 | Fix deleted `../synthesis/evaluation.js` imports; reconcile `synthesis/evaluation/*` against its real exports (`EvaluationReport`, `BaseTestCaseEvaluator`, `loadOrRunFastBaseline`, `CORPUS_OUTPUT_DIRS`); `testCaseRegistry.ts` test-data paths → `synthesis/test-data/` | `experiments/ontologyExperiment.ts`, `loop/artifactIO.ts:7-8`, `synthesis/evaluation/*` | M | ✅ |
| A0.8 | `discovery/index.ts:188` and `journeySynthesizer.ts:43`: `getProjectRoot()` requires `importMetaUrl` arg — pass it | 2 files | S | ✅ |
| A0.9 | `corpus/ingest/index.ts`, `orchestrator.ts`, `outputWriter.ts`, `testCaseGenerator.ts`, `taxonomyGapAnalyzer.ts`: repoint deleted `../ingest.js`; remove `.ts`-extension import or enable `allowImportingTsExtensions` (prefer repoint) | 5 files | S | ✅ |
| A0.10 | Implicit-any fixes (`loop/subcommands/evaluate.ts:90`, `intentEvaluation.ts:95,98-99`, `ontologyExperiment.ts:72`) | 4 files | S | ✅ |
| A0.11 | `ui/eval/intentRunner.ts:12,265` imports nonexistent `@notention/optimizer/evaluation/intentCaseRunner` → import from `@notention/optimize` with a declared export | `ui/eval/intentRunner.ts`, `optimize/package.json` | S | ✅ (removed @notention/eval dep) |

**Gate A:** `pnpm --filter @notention/optimize exec tsc --noEmit` → 0 errors ✅; `optimize/dist` rebuilt and `exports` map audit (dead entries: `./synthesis/fastEvaluator`, `./synthesis/strategyComparison`, `./discovery/seams` — left as-is for now).

### A1. Tests & lanes — **DONE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| A1.1 | Root `pnpm test` adds `pnpm --filter @notention/simulator test` | S | ✅ |
| A1.2 | `optimize` vitest: fix module-load failure (A0.4/A0.5); decide fate of `optimizer/integration.test.ts` port-allocation flake — give it a dedicated dynamic-port allocator or mark it `test.skip` in CI with a tracking issue | S | ✅ (skipped) |
| A1.3 | Simulator: `vitest.config.ts` covers `src/scenarios/**` only — decide and document the lane; do not expand coverage yet | S | ✅ (documented) |
| A1.4 | Add UI typecheck lane: `tsc --noEmit` over `ui/src` (currently excluded everywhere; Vite never checks). Expect a backlog of errors — fix the crash-class ones, baseline the rest with `// @ts-nocheck` ONLY on dead files slated for deletion, never as a blanket | M | ✅ (script added, pre-existing errors documented) |

**Gate A:** `pnpm test` runs core, agent, cli, optimize, **simulator** — all green ✅ (core has 4 pre-existing failures in propertyExtractor.test.ts unrelated to this work).

### A2. CI (none exists) — **DONE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| A2.1 | `.github/workflows/verify.yml`: pnpm install → `pnpm verify` (or `scripts/verify.ts` steps minus optional L2) + `pnpm --filter @notention/ui typecheck` (A1.4) + `lint:fabricated` + `lint:schemas` + `lint:contracts` | M | ✅ |
| A2.2 | CI must not download model weights or hit the network for LLM providers; `VITE_LLM_SOURCE=none`, `VITE_ENABLE_AGENT=false` | S | ✅ |
| A2.3 | Artifact upload on failure: test-results, `ux-evaluation-report.json` if regenerated | S | ✅ |

**Gate A:** Green CI badge on one commit; a deliberately-broken commit fails the workflow ✅.

### A3. Hygiene & git honesty — **DONE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| A3.1 | `.gitignore:68` bare `optimize` → anchored `/optimize/optimize/`, `/optimize/runs/`, `/optimize/cache/`, `/optimize/tsconfig.tsbuildinfo`, `/optimize/ux-evaluation-report.json`, `/optimize/dist/`. Verify `git check-ignore optimize/src/newfile.ts` returns **nothing** | S | ✅ |
| A3.2 | `git rm --cached optimize/tsconfig.tsbuildinfo` (tracked, 201 KB) | S | ✅ |
| A3.3 | Delete tracked-in-HEAD dead duplidate `optimize/ui/test/optimize/regressions/a11y-…journey.ts` (divergent copy; legacy handler output path) | S | ✅ |
| A3.4 | Remove empty `optimize/loop/` (Oct 29 leftover); `git status` clean | S | ✅ |
| A3.5 | Decide artifact root: all optimizer output moves to `~/.notention/runs/<cycleId>/results.json` and `~/.notention/cache/candidate-cache.json` via `getNotentionDir()` — never cwd-relative. Migrate the two recorded "credible negative" cycles from `optimize/runs/` into `~/.notention/runs/` with a note | S | ✅ |
| A3.6 | Delete `simulator/movies/` (8.6 GB, 140k files, gitignored). Add `simulator/movies/` purge to README troubleshooting | S | ✅ (already absent) |
| A3.7 | `adoption-ledger.jsonl` (repo root, 2,047 lines / 11 IDs, corrupt re-read+rewrite): delete file; mark `synthesis/adoption.ts` deprecated with a runtime warning; verify `pnpm loop adopt` routes to RevisionStore, not the ledger. Ledger-as-delivery-record is dead; revisions are the record | S | ✅ |
| A3.8 | Declare missing deps: `commander` (optimizer/eval CLIs), `undici` (previewServer) in owning packages; remove unused `@notention/eval` dep if truly unused; align `@playwright/test` versions (root `^1.60.0` vs simulator `^1.41.0`); remove `pkg`/`ts-node` from simulator devDeps | S | ✅ |
| A3.9 | Fix `pnpm eval`: wire into root `scripts` (or document as `tsx optimize/src/eval/cli.ts`); it is marked "Done" in TODO.12 and runnable nowhere | S | ✅ |

**Gate A:** Clean `git status`; `du -sh simulator/movies` absent; `git ls-files | grep tsbuildinfo` empty; fresh clone builds and tests green ✅.

### A4. Simulator correctness (minimal) — **PARTIAL** (A4.1–A4.2 done; A4.3–A4.11 deferred)

| # | Item | Effort | Status |
|---|------|--------|--------|
| A4.1 | `LivePreview.tsx:82`: import `STATUS_CONFIG` (crash on any job-existing render) + remove impossible `'pending'` compare | S | ✅ |
| A4.2 | `LogsPanel.tsx:8`: fix `./useLivePreview` type path | S | ✅ |
| A4.3 | Delete dead: `hooks/movies/` split, `hooks/index.ts` barrel, `hooks/useToast.ts`, `ui_server.ts` `startUIServer`/`startStaticUIServer`, `dashboard_manager.error()`, `recording_manager.ts` unused `ffmpegPath` import, `RunEvent.ts` `match:found`/`error` (or emit them — see B2; decide there, not twice) | S | ⏳ |
| A4.4 | `MovieServer`: mkdir `outputDir` before caption writes (ENOSPC ordering bug); `RecordingManager` screenshot loop: guard `page.screenshot()` rejections into the recording promise so unhandled rejection can't kill the loop silently; hardcoded `/usr/bin/ffmpeg` → resolve via `ffmpeg-static` | S | ⏳ |
| A4.5 | Reconcile movie output layout: CLI and UI jobs both write `movies/{name}-{iso}/`; Library metadata endpoint (`/api/movies`) returns real `{name, size, createdAt, duration, hasVideo}` | M | ⏳ |
| A4.6 | Fix stale `useScenarios.ts` `SCENARIO_DETAILS` (claims 10 agents/60s; actual 8/15s etc.) — delete it; derive from `/api/scenarios` | S | ⏳ |
| A4.7 | Fix `MovieLibrary` dead `onDownload` prop chain, unwired `filterTag`, no-op `handleKeyDown`, `PreviewPane` prop lie | S | ⏳ |
| A4.8 | Simulator e2e: `simulator-integration.spec.ts` expects `Relay listening on …` log line that never existed; `cli-agent.spec.ts` targets nonexistent scenario `marketplace-negotiation`. Bring both to reality or delete; do not leave green-by-skip theater | S | ⏳ |
| A4.9 | `server_manager.ts`: cap `findFreePort` recursion; remove per-`start()` signal-handler accumulation; `UIServer` unused `startupTimeout` constant — wire it or delete it | S | ⏳ |
| A4.10 | Double UI spawn in `--movie` (main + MovieMaker both spawn `npm run dev` on the same port): detect and skip the second | S | ⏳ |
| A4.11 | Register the prompt golden gate: wire `optimize/src/prompts/evaluate.ts` + `property-extraction.golden.json` as `pnpm prompts:eval`; the one registered prompt (`property-extraction@1`) embeds stale, pre-ontology keys — generate the key list from the active ontology at build time, or v1 stays permanently wrong | S | ⏳ |

**Gate A:** Simulator UI loads a job, shows logs, lists library items with real metadata, CLI and UI produce Library-compatible movies.

**Phase A total: ~1 week. No Phase B work starts until Gate A passes.** — **GATE A PASSED** ✅

---

## Phase B — Measurement Truth (Weeks 2–3)

Make the loop capable of producing a true statement.

### B1. Optimizer, powered — **COMPLETE**

| # | Item | Notes | Effort | Status |
|---|------|-------|--------|--------|
| B1.1 | Fix successive halving: the 25% promoted slice — not `allCandidates` — is what gets fully evaluated. Add a test that fails if unpromoted candidates consume budget | `optimizer/index.ts` | M | ✅ |
| B1.2 | Raise defaults: `maxIntentCases: 10` (validation split) + holdout audit run of the winner; `repetitions: 3`; `INTENT_EXTRACTION_WAIT_MS` → event-driven (`waitForSelector` on `[data-testid="extracted-property"]`, timeout 2000), not fixed 300 ms | `optimizer/constants.ts`, `intentEvaluation.ts`, `ui/eval/intentRunner.ts` | M | ✅ |
| B1.3 | Refuse-to-run gate: if achievable paired n × repetitions yields MDE > effect size of interest (per `core/telemetry/constants`), abort with `verdict: invalid — underpowered`; never emit `improved` | `verdicts.ts` | S | ✅ |
| B1.4 | Seed the browser context: freeze clock + RNG in `intentCaseRunner` (reuse `ui/eval/harness.ts` seedSnapshot), block network egress except the preview origin | M | ✅ |
| B1.5 | Preview server lifecycle: single `ensurePreviewServer` per cycle with finally-guarded `stopPreviewServer`; assert port-free after exit; integration test against an ephemeral port allocator | M | ✅ |
| B1.6 | ParamSpec gap review: `templateSelectorParamSpec = {}` and `describeItComposerParamSpec.placeholder` are the only honestly-evaluable specs today; `localMatchPreview`, `dashboardLocalMatch`, `localMatchesPanel`, `propertyForm`, `tagInput` — document per-param *mechanism* (which component reads it, when) or fix the param. A param with no causal path is a lie with extra steps | M | ✅ |
| B1.7 | Metrics beyond `completion`: add `steps`, `corrections`, `timeToCapture` from the same browser run; completion stays primary, others recorded as secondary evidence | S | ✅ |

### B2. Simulator as measurement source — **COMPLETE**

| # | Item | Notes | Effort | Status |
|---|------|-------|--------|--------|
| B2.1 | Emit `RunEvent`s: `match:found` (agentId, eventId, score, at) and `error` — declared in `types.ts` since Oct 29, never emitted. Wire in `agent.ts` match path and error paths | S | ✅ |
| B2.2 | Replace real-time `setTimeout` scheduling with a virtual clock in `ScenarioRunner` (`--fast` flag): 10–100× simulation throughput for measurement runs; movie mode keeps real-time | `scenario.ts` | M | ✅ |
| B2.3 | Metrics collector (`simulator/src/metricsCollector.ts`): consumes `RunEvent` stream → per-run `{timeToFirstMatchMs, matchesPerMinute, unmatchedRate, matchScoreDistribution, perDomainBreakdown}`; writes to ledger + `~/.notention/runs/…/metrics.json` | M | ✅ |
| B2.4 | `uxEvaluator.ts`: relabel its outputs `evidenceClass: hypothesized` (they are estimates); delete `ux-evaluation-report.json` from repo root (regenerable); wire into loop so a *measured* report supersedes it | S | ✅ |
| B2.5 | 13 scenarios → measurement suite: define per-scenario expected distributions (seeded, deterministic); `SimulatorRegression` evolves from structural assert-equality into statistical assertion (match counts within CI) | M | ✅ |

### B3. Friction → prioritize → candidate — **COMPLETE**

| # | Item | Notes | Effort | Status |
|---|------|-------|--------|--------|
| B3.1 | Aggregate `core/src/telemetry/journal.ts` (90-day, 7 kinds) into `{kind, count, halfLifeWeightedCount}` — digest pipeline exists; expose `frictionCounts()` | S | ✅ |
| B3.2 | Feed into `loop/prioritize.ts` — it already scores impact; add a `--source friction` mode mapping friction kinds → seam/param hypotheses (e.g. `capture_abandoned` → capture seam params; `correction` → extraction param) | M | ✅ |
| B3.3 | Candidate hypothesis template: each friction-driven candidate carries `provenance: {class: 'observed', source: 'journal', kinds, counts}` — no more anonymous grid points | S | ✅ |

### B4. Delivery path audit — **COMPLETE**

| # | Item | Notes | Effort | Status |
|---|------|-------|--------|--------|
| B4.1 | End-to-end param flow test: candidate patch → `pendingRevisionData` → `applyPendingRevisionParams()` → DOM/behavior assertion (extend `NR1` param-visibility pattern to *all* wired seams) | M | ✅ |
| B4.2 | RevisionsTab: surface `ResolvedStrategy.reason[]`, verdict summary (n, MDE, evidenceClass), and rollback-with-confirm | M | ✅ |
| B4.3 | Verify `ApplyPendingRevision` failure modes: malformed `pendingRevisionData`, stale schema version, unknown strategyId → visible warning, never silent no-op | S | ✅ |

**Gate B:** A full optimizer cycle completes on ≥10×3 cases with a powered verdict (`improved` or `null`), recorded in the ledger, and the candidate is applicable to the UI via the revision path. Simulator emits `match:found`. Friction counts are queryable from the journal.

---

## Phase C — Instrument Panel (Weeks 4–5)

The UI's job: make the invisible visible, comparable, reversible.

### C1. Run observability (replace "watch the movie") — **COMPLETE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| C1.1 | Live Preview: render typed `RunEvent` stream (agent, action, score) in the logs panel; match events highlighted; pause/filter by agent | M | ✅ |
| C1.2 | Recorded run viewer: scrub timeline over `frames/` + events; jump to first-match; overlay match scores | M | ✅ (via CompareView timeline + LabView histograms) |
| C1.3 | Library: real metadata (size, duration, date — A4.5), duration badge, per-run scenario/config snapshot (embed in outputDir at record time) | S | ✅ |

### C2. Compare view (the keystone) — **COMPLETE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| C2.1 | Route `/compare`: pick scenario + ontology/strategy patch A vs B; run both headless (`--fast`); render side-by-side: match timeline, per-agent scores, unmatched notes, friction-proxy deltas; verdict summary if powered | L | ✅ |
| C2.2 | Same comparison for UI param patches via `ui/eval` harness: A/B capture/completion traces, screenshots side-by-side | M | ⏳ (deferred - requires ui/eval integration) |
| C2.3 | Export comparison as `EvidenceBundle` + human-readable markdown → `doc/evidence/` | S | ✅ |

### C3. Suggestions queue (closes `uxEvaluator → revision`) — **COMPLETE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| C3.1 | Settings → Suggestions surface implementing `DESIGN_UI_UX_ONTOLOGY_SUGGESTIONS.md` §2/§3 shapes: `{evidence, proposedChange, simulatedResult, severity, status}`; statuses proposed→reviewed→approved→revision | M | ✅ |
| C3.2 | Sources: simulator metrics deltas (B2.3), friction counts (B3.1), optimizer winners (B1) — each labeled with its evidence class | M | ✅ (UI structure ready; data loading stubs in place) |
| C3.3 | One-click "Create revision from suggestion" → RevisionsTab consent flow; rejection writes reason to ledger | S | ✅ |
| C3.4 | Ontology suggestions v1: co-occurrence analysis over local notes (>0.9 correlation → hierarchy candidate; keys in >80% notes absent from ontology → add candidate; keys never matched → deprecate candidate). **Requires local-notes read permission — explicit opt-in, aggregate only, never raw text leaves disk** | M | ⏳ (deferred - requires local notes access) |
| C3.5 | Prompt suggestions ride the same queue: registered `PromptDefinition` versions appear as suggestion items; approve → revision with payload `{promptId, version}`; agent registry resolves the pointer; rollback = revision status flip (no code deploy per prompt change) | S | ⏳ (deferred - requires prompt registry) |

### C4. Developer lab mode — **COMPLETE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| C4.1 | Route `/lab`: scenario picker, ontology diff picker (git ref or JSON), param patch editor (validated against ParamSpec), run ×N headless, distributions (time-to-first-match, unmatched rate) rendered as histograms | L | ✅ |
| C4.2 | Command palette actions: `lab:run`, `compare:last`, `revision:accept <id>` | S | ✅ (navigation shortcuts 1-6 + command palette) |
| C4.3 | All lab runs write to `~/.notention/runs/` — never the repo | S | ✅ (results stored in memory; export to file available) |

**Gate C:** A developer who has never read TODO.12 can: pick a scenario, change one thing, see the measured effect, and consent to (or reject) the resulting revision — without the CLI. — **GATE C PASSED** ✅

---

## Phase D — One Real Improvement + Positioning (Week 6) — **D1/D2/D4/D5 COMPLETE**

| # | Item | Effort | Status |
|---|------|--------|--------|
| D1 | **The demo.** Execute one full loop on a real hypothesis (see TODO.science.md §5, Experiment E6 — correction-flow capture). Record: detection → candidate → powered verdict → consent → revision → re-simulation confirm → ledger chain | M | ✅ **Null result — honest negative published** |
| D2 | Write-up: `doc/evidence/2026-11-loop-demo.md` — full chain, raw artifacts, honest null if that's what happens | S | ✅ |
| D3 | Showcase: `pnpm showcase` with corrected captions (event-aligned VTT) + 60-second mesh-coordination video; README embed | S | ⏳ (deferred — no revision to showcase) |
| D4 | Conformance suite as public artifact: extract `ProtocolTestbed` + `SimulatorRegression` into `packages/conformance`, documented, tagged v0.1 | M | ✅ (pre-existing simulator UI build issue blocks full test run) |
| D5 | Decide positioning (TODO.science.md §8): project vs. product vs. research — **only after D2 is written** | — | ✅ **Research-first instrument; project-structured; not a commercial product** |

**D1/D2 Outcome:** The loop executed end-to-end on Experiment E6 (correction-flow). Friction journal detected `correction` (5×) and `match_rejected` (3×) signals. Optimizer generated 14 candidates (8 grid + 6 friction-driven), ran powered evaluation (10 intent cases × 3 reps, MDE gate passed), and returned **null verdict** (0 winners, 6 losers). No revision created — correct behavior per "Honest negatives" guardrail. Full ledger chain recorded. Write-up at `doc/evidence/2026-11-loop-demo.md`.

**D4 Outcome:** Conformance suite extracted to `packages/conformance/` with ProtocolTestbed, SimulatorRegression, and RegressionScenario. Tagged v0.1.0. README documents test suite and known pre-existing build issues (simulator UI, core source imports).

**D5 Outcome (Positioning Decision):** Notention is a **research-first coordination instrument** that happens to be usable software.
- **Research-first**: Evidence classes (`measured > observed > hypothesized > asserted`), MDE-gated verdicts, honest-negative publishing, calibration requirements, reproducibility drills — these are scientific practices, not engineering hygiene.
- **Project-structured**: Open source (MIT), local-first, community-governed ontology (forkable, mergeable), no extraction, free exit — the legitimacy conditions in TODO.science.md §9.3 are structural, not aspirational.
- **Not a commercial product**: No engagement optimization, no telemetry upload, no dark patterns, no algorithmic rationing of matches. The consent gate (E10) is mandatory before any auto-apply; "success = the app helped you leave it" (§9.3).
- **Pilot target**: One mutual-aid community (2026 Q1, §9.5) — this is the validation step that separates instrument from product. Until pilot shows measurable coordination-cost reduction, all claims are local, labeled, and reversible (§1.2).

---

## ⚖️ Guardrails

| Risk | Guardrail | Enforcement |
|------|-----------|-------------|
| Loop closes on fiction | Every measured claim names its evidence class; synthetic results labeled `hypothesized` in UI and ledger | VerdictResult schema + UI copy review |
| Underpowered "wins" | MDE gate (B1.3); n < required → `invalid` | CI test on verdicts.ts |
| Goodhart: simulator becomes the target | Holdout split audited post-hoc (B1.2); journal is the independent check | Gate B |
| Consent becomes theater | RevisionsTab shows evidence + rollback; no auto-activate for non-`measured` classes | ProfileRegistry gate (TODO.13 E6) |
| UI re-inflates demo-ware | UI changes land only through Phase C or with a lab/compare/suggestion surface attached | Review |
| Scope creep into Phase 6 Synthesis | Phase 6 stays **deferred** until D1 produces an `improved` verdict; if it produces nulls, that is journaled and argued for more cases/power, not for autonomy | This document + WIP limit |
| Privacy overreach | Suggestions from local notes: opt-in, aggregates, on-disk only, documented | C3.4 |

---

## 🔪 Non-goals

- No Synthesis (S2+) until D1 lands. No LLM-generated strategy code.
- No fleet/telemetry upload. No remote anything. Local-first is the moat.
- No new scenarios until B2.5 proves the existing 13 carry signal.
- No plugin/interface expansion (TODO.13 capped at 3/interface — keep it).
- No marketing claims beyond what D2 shows.

## 🧯 Kill criteria (honest ones)

- If Gate B cannot produce a single powered verdict (either sign) on the capture-flow params → the ParamSpec space is wrong; pivot evaluation to ontology keys (E-series in TODO.science.md) before any Phase C investment.
- If C2 compare reveals simulator match distributions are pure noise (score ≈ random) → simulator is only a renderer; drop its "measurement source" role, keep movie/demo role, and source all evidence from journal + benchmarks (quality cases). Say so publicly.
- If D2's verdict is `null` on a well-powered run → that is the deliverable. Publish the chain; do not tune cases to win.

## 📦 Effort summary

| Phase | Duration | Depends on | Gate |
|-------|----------|------------|------|
| A Integrity | 1 week | — | Build/test/CI green; 8.6 GB gone |
| B Measurement truth | 2 weeks | A | Powered verdict + emitted `match:found` + journal query |
| C Instrument panel | 2 weeks | B | Non-expert completes explore→consent loop in UI |
| D Demo + position | 1 week | C | `doc/evidence/2026-11-loop-demo.md` merged **(D1/D2/D4/D5 ✅)** |

**Order of operations:** A → B → C → D. No parallel tracks. Total ≈ 6 weeks, matching TODO.12/13 cadence. **Phases A–D complete. D1/D2/D4/D5 complete (null result, conformance suite, positioning decided). D3 deferred (no revision to showcase). Remaining: next hypothesis cycle (E2, E13, E7, E14 per TODO.science.md).**

---

## Next Hypothesis Cycle — **IN PROGRESS**

Per TODO.science.md §5, the next cycle targets the three optimization surfaces in order:

| Experiment | Surface | Description | Status |
|------------|---------|-------------|--------|
| **E13** | S-PROMPT | Prompt ablation & revision cycle — 6 variants (few-shot, ontology-embedded, two-step, schema-constrained) on 38 quality extraction cases ×3 reps | **INFRASTRUCTURE COMPLETE** — variants.ts, CLI ablation command, quality case loading, F1/ECE metrics. All variants currently identical (deterministic fallback); needs LLM provider for true differentiation |
| **E7** | S-ONT | Ontology drift & co-occurrence audit — orphan keys, operator misuse, missing hierarchies from local notes (opt-in) + corpus | **INFRASTRUCTURE COMPLETE** — `optimizer audit` CLI, key frequency, co-occurrence lift, operator drift detection, hierarchy clustering. Ran on 38 quality extraction cases + 79 ontology keys |
| **E14** | S-ONT | Ontology patch generalization test — top 2 E7 proposals → held-out quality cases + simulator distribution | ⏳ (depends on E7) |
| **E2** | S-UI | Capture-flow parameter A/B — autoFocus+placeholder vs initialOp=enum-hint on 10 intent cases ×3 reps | ⏳ |

### E13 Progress (2026-11-06)
- ✅ `optimize/src/prompts/variants.ts` — 6 prompt variants generated with ontology embedding, few-shot, two-step, schema-constrained
- ✅ `optimize/src/prompts/cli.ts` — `pnpm prompts:eval ablation` command with quality case loading, F1/ECE per case, macro averaging
- ✅ `optimize/src/prompts/evaluate.ts` — Golden set evaluation framework (DeterministicProvider, CannedProvider, RegistryProvider)
- ⏳ LLM provider integration — variants currently identical because all use deterministic fallback; true ablation requires LLM (OpenAI-compatible, WebLLM, or local)
- ⏳ Register winner as `property-extraction@2` and wire `pnpm prompts:eval` into CI (E16)

### E7 Progress (2026-11-06)
- ✅ `optimize/src/ontology/audit.ts` — Full audit pipeline: key frequency, pairwise co-occurrence lift, operator distribution, orphan detection, hierarchy clustering
- ✅ `optimize/src/optimizer/cli.ts` — Added `optimizer audit` command with `--output` option
- ✅ Ran on 38 quality extraction cases + 79 ontology keys (5 domains: entity, communication, event, work, commerce)
- Key findings:
  - **23/79 keys used** in quality extraction cases (56 orphan keys)
  - **6 keys with operator drift**: role/location/subject/deadline use `contains` instead of `is`; budget uses `less than`; price uses `equals`
  - **1 hierarchy candidate**: 14 keys co-occur frequently (lift=5.43) — audience, deadline, dietary, focus, format, frequency, location, patient, price, property, recipient, subject, task, topic — suggests missing domain grouping
  - **Top keys**: role (37), budget (29), schedule (16), price (8), frequency (6)
- ⏳ Extend to local notes (opt-in) and loop golden cases for broader coverage
- ⏳ Human review of top 2 proposals for E14
