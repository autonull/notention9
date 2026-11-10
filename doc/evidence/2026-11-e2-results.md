# E2 — Capture-Flow A/B (S-UI) — 2026-11-10

**Experiment:** E2 (Capture-flow parameter A/B) — TODO.16.md §E2  
**Seam:** S-UI (capture)  
**Date:** 2026-11-10  
**Commit:** `HEAD` (filled after commit)

---

## 1. Pre-registered hypothesis

> **H-UI:** Capture-flow parameters change what a capture yields. Arm A (guidance: focused input + example placeholder) and arm B (looser default operator for extracted properties) will change the completion rate on the `capture_need` intent cases relative to the incumbent.

**Primary metric:** `completion` — the captured note carries every `requiredKeys` slot of its intent case.
**Secondary metric:** `timeToCaptureMs`.
**Guardrail:** `corrections` (a candidate that raises corrections by >5 is rejected).
**Decision rule:** powered (≥30 paired samples, `DEFAULT_MIN_SAMPLE_SIZE`), intervention verified, McNemar on completion / Wilcoxon on time.

---

## 2. What the first attempt actually measured (and why it was void)

The first E2.6 attempt (before this run) reported *"No significant difference — retain incumbent"*. That conclusion was
**false**, and the reason was not a null effect — the instrument measured nothing at all. Three independent defects:

| # | Defect | Evidence | Fix |
|---|--------|----------|-----|
| **D1** | **The arms were no-ops.** `applyPendingRevisionParams()` re-registered the strategy with the patched props, but `StrategyResolver` rendered `<Component {...props} />` — the strategy's `defaultProps` never reached the component. `QuickCapture` also hardcoded its placeholder and never read `autoFocus`/`initialOp`. The `ParamSpec` promised behaviour the code did not implement. | The patched placeholder never appeared in the DOM; captured properties never carried the patched operator. | `StrategyResolver` now merges `strategy.getDefaultProps()`; `QuickCapture` consumes `placeholder`/`autoFocus`; `DashboardView` applies `initialOp` to the created note's properties. |
| **D2** | **The completion criterion was unreachable.** Cases require request slots (`need`, `schedule`, `frequency`, `budget`, `price`, `deadline`); the ontology had no such attributes and the extractor had no such patterns. Every run scored 0% in both arms — a floor effect, not a null. | Case 020 extracted only `intent=task` and a bogus `price` (`4-6pm` read as money). | New `request` ontology domain (`need`, `schedule`, `frequency`) + `core/src/extraction/requestSlots.ts`. |
| **D3** | **The harness could not tell "no effect" from "cannot detect".** Zero discordant pairs produced `p=1.0` and the runner printed *"No significant difference — retain incumbent"* — a conclusion the data cannot support. | The 2026-11-10 pre-fix run: 0/10 completion in both arms, verdict "retain incumbent". | The runner now reports an explicit verdict: `improved` / `degraded` / `no-difference` / **`invalid`**, with `invalid` raised for: intervention not applied, underpowered, or a metric that cannot discriminate. |

The harness also verified the intervention itself (D1) — every run records whether the candidate's effect was observed in
the running app, so a no-op candidate can never again be reported as a null result.

---

## 3. Run configuration

| Setting | Value |
|---------|-------|
| Cases | 10 validation `capture_need` cases (`intent-capture-010 … 027`) |
| Repetitions | 3 (30 paired samples) |
| Arms | A: `placeholder` + `autoFocus` on `quick-capture` · B: `initialOp=contains` on `quick-capture` |
| Server | Vite dev server, `VITE_ENABLE_AGENT=false`, `VITE_LLM_SOURCE=none`, `VITE_DEV_HOOKS=true` |
| Browser | Chromium, headless, PNA bypass flags, fresh context per arm |
| Raw results | `optimize/results/e2-capture-2026-11-10.json` |

**Runtime hygiene:** the run produced **zero** browser console errors and **zero** page errors. The three pre-existing
runtime defects (`__name is not defined`, `Cannot read properties of undefined (reading 'enabled')`, Nostr relay
handshake noise) are fixed — see TODO.16.md §P2.

---

## 4. Results

**Verdict: `invalid` — metric-cannot-discriminate.** The run is clean, powered and reproducible; it simply cannot detect
an arm effect, because the completion metric does not depend on the arm.

### 4.1 Arm summary

| Metric | A — `placeholder` + `autoFocus` | B — `initialOp=contains` |
|--------|--------------------------------|--------------------------|
| Completion rate | **90.0 %** (27/30) | **90.0 %** (27/30) |
| Median `timeToCaptureMs` | 9 722 | 9 733 |
| Mean `timeToCaptureMs` | 10 086 | 10 015 |
| Total corrections | 3 | 3 |
| Total runs | 30 | 30 |
| Intervention observed in the app | ✅ all 30 runs | ✅ all 30 runs |

### 4.2 Statistical tests

| Test | Result |
|------|--------|
| McNemar (completion) | p = 1.0000, **0 discordant pairs** — not significant |
| Wilcoxon (timeToCapture) | p = 0.5440, median diff 85 ms — not significant |
| Corrections guardrail | B − A = 0 ✅ |

> **Caveat on `timeToCaptureMs`.** The metric is wall clock from navigation to capture and is dominated by the harness's own
> fixed waits (hydration settle, extraction settle) — roughly 90 % of the measured value. It is a smoke signal, not an effect
> measure: a concurrent workload on the machine moves it by hundreds of milliseconds. An earlier run of this same experiment
> produced a "significant" Wilcoxon purely because another test suite was running on the machine at the time. The verdict does
> not depend on it (the primary metric is completion), and the harness now says so in the code.

### 4.3 Per-case completion (both arms identical)

| Case | Required slots | A | B | Note |
|------|----------------|---|---|------|
| intent-capture-010 | need, deadline | 3/3 | 3/3 | |
| intent-capture-011 | need, deadline | **0/3** | **0/3** | prompt carries no temporal cue — see caveat below |
| intent-capture-016 | need, schedule, budget | 3/3 | 3/3 | |
| intent-capture-017 | need, schedule, budget | 3/3 | 3/3 | |
| intent-capture-018 | need, budget | 3/3 | 3/3 | |
| intent-capture-019 | need, budget | 3/3 | 3/3 | |
| intent-capture-020 | need, schedule, price | 3/3 | 3/3 | |
| intent-capture-021 | need, budget | 3/3 | 3/3 | |
| intent-capture-026 | need, schedule, price | 3/3 | 3/3 | |
| intent-capture-027 | need, frequency, budget | 3/3 | 3/3 | |

Property keys observed across all runs: `need`, `schedule`, `frequency`, `budget`, `price`, `deadline` (plus the pre-existing
`intent` / `role` / fuzzy `lastName`).

**Case caveat (not edited):** `intent-capture-011` ("Need to organize a meal train for the new parents on Maple Street")
requires a `deadline` although its prompt contains no temporal cue, so no text-only extractor can satisfy it. It fails
identically in both arms and therefore does not bias the comparison; it caps completion at 90 %. The case file is
ground truth and was left untouched.

### 4.4 Runtime hygiene

| Check | Result |
|-------|--------|
| Browser console errors | **0** |
| Uncaught page errors | **0** |
| Relay handshake noise | **0** (outbound relays are opt-in) |
| `__name` ReferenceErrors | **0** |
| `reading 'enabled'` TypeErrors | **0** |
| Candidate interventions observed | **60/60** |

---

## 5. Ledger chain

The harness writes the chain as the run proceeds (`optimize/src/optimizer/e2CaptureTest.ts` → `logEvent`):

```
optimizer:cycle:started        {config: {targetSeams: ["capture"], maxIntentCases: 10, ...}, manifestHash}
optimizer:candidate:evaluated  {candidateId: "A-autoFocus-placeholder", seamRole: "capture", verdict: "invalid", primaryDelta: 0}
optimizer:candidate:evaluated  {candidateId: "B-initialOp-enumHint",    seamRole: "capture", verdict: "invalid", primaryDelta: 0}
optimizer:cycle:completed      {candidatesEvaluated: 2, winners: 0, losers: 0, inconclusive: 2, totalCost: {browserRuns: 60, ...}}
```

Ledger file: `.notention/ledger/ledger.jsonl` (local, gitignored). Raw run: `optimize/results/e2-capture-2026-11-10.json`.
The void pre-fix run is kept as `optimize/results/e2-capture-2026-11-10-void.json` (0/10 completion in both arms, and a
verdict of *"no significant difference"* that the data did not support).

**Chain integrity:** complete for an `invalid` outcome — every candidate carries its own measured verdict, and no revision
was created because no candidate won.

---

## 6. Interpretation

### 6.1 What this tells us

1. **The capture pipeline now works.** Before the fixes, the harness scored 0/10 in both arms because the extractor could not
   express a stated need. It now produces the requested slots for 9 of 10 validation cases (90 % completion, reproducible
   across 3 repetitions).

2. **The candidate patches now reach the app.** `StrategyResolver` merges the strategy's default props into the rendered
   component, so `placeholder`, `autoFocus` and `initialOp` are real, observable behaviour — verified in 60/60 runs. Before
   this, *no* capture-flow candidate could ever have had an effect.

3. **This experiment cannot decide the question it asks.** `placeholder`, `autoFocus` and `initialOp` change guidance, focus
   and operator defaults. With an automated driver, the capture outcome is identical in both arms — hence 0 discordant pairs.
   The harness now says so (`invalid: metric-cannot-discriminate`) instead of the earlier, unsupported "no significant
   difference — retain incumbent".

4. **The measurement apparatus is trustworthy.** 0 console errors, 0 page errors, interventions verified, power gate enforced,
   explicit verdict, ledger chain emitted.

### 6.2 What this does NOT tell us

- Whether either parameter helps a **human** capturer (the actual hypothesis).
- Anything about match quality downstream of `initialOp=contains` — that needs a corpus to match against.
- Population validity: synthetic intent cases, one local workspace, headless Chromium.

### 6.3 Next steps

1. Pick an arm whose effect is **machine-observable in the outcome** (e.g. an extraction-affecting parameter such as
   `maxProperties` or `fuzzyThreshold`), or run the capture-UX comparison with human raters.
2. Re-run the ontology drift audit — the new `request` domain changed the key counts that E7's orphan/drift numbers assume.
3. Wire the `property-form` strategy's `initialOp`/`isAdding` the same way `quick-capture` now is (same defect class as D1).

---

## 7. Reproducibility

```bash
pnpm build                                    # all workspaces
pnpm --filter @notention/core test            # 522/522
cd optimize
pnpm optimizer e2-capture --repetitions 3 --headless true \
    -o results/e2-capture-2026-11-10.json
```

The run is deterministic in outcome (extraction is rule-based); `timeToCapture` varies with machine load and is dominated by
the harness's fixed waits, which is precisely why it cannot discriminate between the arms.

