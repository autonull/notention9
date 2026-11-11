# Match Benchmark Rebuild — Plan & Progress

**Status:** In progress
**Date:** 2026-11-10
**Related:** P1d, P2c, P3.1

## Problem

The current benchmark (`scripts/bench-plugins.ts`) measures plugin performance (ops/sec) but does NOT measure match quality. A green benchmark that the product cannot reproduce is worse than a red one.

## Goal

Rebuild the benchmark on product semantics using the 22 annotated match cases as ground truth.

## Benchmark Requirements

| Requirement | Current State | Target |
|-------------|---------------|--------|
| **Ground truth** | None (synthetic) | 22 cases from `eval/cases/quality/match/` with 2 annotators, 0.85 agreement |
| **Metric** | ops/sec (performance) | Precision/Recall/F1 at minScore thresholds |
| **Dimensions** | Ignored | Units enforced (rate vs total) |
| **Corpus** | Hand-built | Real notes from sample workspace + annotated cases |
| **Output** | Console table | JSON + Markdown report for evidence |

## Results (2026-11-11T00:37:49.696Z)

| minScore | Precision | Recall | F1 |
|----------|-----------|--------|-----|
| 0.2 | 0.0% | 0.0% | 0.0% |
| 0.3 | 0.0% | 0.0% | 0.0% |
| 0.4 | 0.0% | 0.0% | 0.0% |

**Note:** Results are 0% because the benchmark script needs the candidate notes for each case. Currently only `quality-match-001` has sample notes defined in the evaluation CLI.

## Gaps to Close

| Gap | Description | Effort |
|-----|-------------|--------|
| **Missing case notes** | 21 of 22 quality cases lack candidate notes | Medium - need to define notes for each case |
| **Extraction pipeline** | Benchmark should test full pipeline (extract → match) | Medium |
| **Dimensional enforcement** | Verify units block cross-dimension matches | Low (already implemented in matcher) |
| **React error #525** | Blocks E2E browser benchmark | High - pre-existing issue |

## Implementation Plan

1. **Define candidate notes for all 22 cases** — Create a fixture file with notes for each quality case, aligned with the expected note IDs and minScores.
2. **Build Node.js benchmark harness** — Load cases + notes, run `MatchingService.match()`, compute Precision/Recall/F1.
3. **Add dimensional test cases** — Verify rate vs total, USD vs EUR, etc. are correctly blocked.
4. **Generate evidence report** — JSON + Markdown with per-case breakdown.

## Current Blocker

React error #525 prevents running the matcher in browser context for E2E benchmark. The matcher works in Node.js (core tests pass).

**Workaround:** Run benchmark in Node.js using core matcher directly once case notes are defined.

## Next Steps

1. Define candidate notes for all 22 quality cases (extend `createSampleNotes` or create new fixture)
2. Complete Node.js benchmark script (`scripts/bench-match-quality.ts`)
3. Run benchmark and populate results table
4. Generate final evidence document

---

*This benchmark replaces the synthetic plugin benchmark. The plugin benchmark (`bench-plugins.ts`) is retained for performance regression detection.*