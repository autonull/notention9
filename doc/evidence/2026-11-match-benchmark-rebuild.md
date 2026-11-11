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
| **Missing case notes** | 21 of 22 quality cases now have candidate notes defined | ✅ Done |
| **Extraction pipeline** | Benchmark tests full pipeline (extract → match) | ✅ Done |
| **Dimensional enforcement** | Verify units block cross-dimension matches | Low (already implemented in matcher) |
| **React error #525** | Blocks E2E browser benchmark | High - pre-existing issue |

## Implementation Plan
### minScore >= 0.2

| Case | Precision | Recall | F1 | Expected | Actual |
|------|-----------|--------|-----|----------|--------|
| quality-match-001 | 0% | 0% | 0% | note-ramp-001, note-ramp-002 |  |
| quality-match-002 | 100% | 50% | 67% | note-dog-001, note-dog-002 | note-dog-001 |
| quality-match-003 | 100% | 50% | 67% | note-piano-001, note-piano-002 | note-piano-001 |
| quality-match-004 | 100% | 50% | 67% | note-ride-001, note-ride-002 | note-ride-001 |
| quality-match-005 | 100% | 50% | 67% | note-move-001, note-move-002 | note-move-001 |
| quality-match-006 | 100% | 50% | 67% | note-meal-001, note-meal-002 | note-meal-001 |
| quality-match-007 | 100% | 67% | 80% | note-donate-001, note-donate-002 | note-donate-001, note-donate-001 |
| quality-match-008 | 100% | 100% | 100% | note-spanish-001, note-spanish-002 | note-spanish-001, note-spanish-002 |
| quality-match-009 | 100% | 100% | 100% | note-sitter-001, note-sitter-002 | note-sitter-001, note-sitter-002 |
| quality-match-010 | 100% | 67% | 80% | note-mentor-001, note-mentor-002 | note-mentor-001, note-mentor-001 |
| quality-match-011 | 100% | 67% | 80% | note-photo-001, note-photo-002 | note-photo-001, note-photo-001 |
| quality-match-012 | 100% | 100% | 100% | note-drive-001, note-drive-002 | note-drive-001, note-drive-002, note-drive-001, note-drive-002 |
| quality-match-013 | 100% | 67% | 80% | note-tech-001, note-tech-002 | note-tech-001, note-tech-001 |
| quality-match-014 | 100% | 67% | 80% | note-mentor-001, note-mentor-002 | note-mentor-001, note-mentor-001 |
| quality-match-015 | 100% | 67% | 80% | note-photo-001, note-photo-002 | note-photo-001, note-photo-001 |
| quality-match-016 | 100% | 100% | 100% | note-drive-001, note-drive-002 | note-drive-001, note-drive-002, note-drive-001, note-drive-002 |
| quality-match-017 | 100% | 67% | 80% | note-tech-001, note-tech-002 | note-tech-001, note-tech-001 |
| quality-match-018 | 100% | 67% | 80% | note-donate-001, note-donate-002 | note-donate-001, note-donate-001 |
| quality-match-019 | 100% | 50% | 67% | note-clean-001, note-clean-002 | note-clean-001 |
| quality-match-020 | 100% | 50% | 67% | note-resume-001, note-resume-002 | note-resume-001 |
| quality-match-021 | 100% | 50% | 67% | note-grocery-001, note-grocery-002 | note-grocery-001 |
| quality-match-022 | 100% | 100% | 100% | note-legal-001, note-legal-002 | note-legal-001, note-legal-002 |


### minScore >= 0.3

| Case | Precision | Recall | F1 | Expected | Actual |
|------|-----------|--------|-----|----------|--------|
| quality-match-001 | 0% | 0% | 0% | note-ramp-001 |  |
| quality-match-002 | 100% | 100% | 100% | note-dog-001 | note-dog-001 |
| quality-match-003 | 100% | 50% | 67% | note-piano-001, note-piano-002 | note-piano-001 |
| quality-match-004 | 100% | 100% | 100% | note-ride-001 | note-ride-001 |
| quality-match-005 | 100% | 50% | 67% | note-move-001, note-move-002 | note-move-001 |
| quality-match-006 | 100% | 100% | 100% | note-meal-001 | note-meal-001 |
| quality-match-007 | 100% | 67% | 80% | note-donate-001, note-donate-002 | note-donate-001, note-donate-001 |
| quality-match-008 | 100% | 100% | 100% | note-spanish-001 | note-spanish-001 |
| quality-match-009 | 100% | 50% | 67% | note-sitter-001, note-sitter-002 | note-sitter-001 |
| quality-match-010 | 100% | 67% | 80% | note-mentor-001, note-mentor-002 | note-mentor-001, note-mentor-001 |
| quality-match-011 | 100% | 100% | 100% | note-photo-001 | note-photo-001, note-photo-001 |
| quality-match-012 | 100% | 67% | 80% | note-drive-001, note-drive-002 | note-drive-001, note-drive-001 |
| quality-match-013 | 100% | 100% | 100% | note-tech-001 | note-tech-001, note-tech-001 |
| quality-match-014 | 100% | 67% | 80% | note-mentor-001, note-mentor-002 | note-mentor-001, note-mentor-001 |
| quality-match-015 | 100% | 100% | 100% | note-photo-001 | note-photo-001, note-photo-001 |
| quality-match-016 | 100% | 67% | 80% | note-drive-001, note-drive-002 | note-drive-001, note-drive-001 |
| quality-match-017 | 100% | 100% | 100% | note-tech-001 | note-tech-001, note-tech-001 |
| quality-match-018 | 100% | 67% | 80% | note-donate-001, note-donate-002 | note-donate-001, note-donate-001 |
| quality-match-019 | 100% | 50% | 67% | note-clean-001, note-clean-002 | note-clean-001 |
| quality-match-020 | 100% | 50% | 67% | note-resume-001, note-resume-002 | note-resume-001 |
| quality-match-021 | 100% | 100% | 100% | note-grocery-001 | note-grocery-001 |
| quality-match-022 | 100% | 100% | 100% | note-legal-001, note-legal-002 | note-legal-001, note-legal-002 |


### minScore >= 0.4

| Case | Precision | Recall | F1 | Expected | Actual |
|------|-----------|--------|-----|----------|--------|
| quality-match-001 | 0% | 0% | 0% |  |  |
| quality-match-002 | 0% | 0% | 0% |  | note-dog-001 |
| quality-match-003 | 100% | 100% | 100% | note-piano-001 | note-piano-001 |
| quality-match-004 | 100% | 100% | 100% | note-ride-001 | note-ride-001 |
| quality-match-005 | 100% | 100% | 100% | note-move-001 | note-move-001 |
| quality-match-006 | 100% | 100% | 100% | note-meal-001 | note-meal-001 |
| quality-match-007 | 100% | 100% | 100% | note-donate-001 | note-donate-001, note-donate-001 |
| quality-match-008 | 100% | 100% | 100% | note-spanish-001 | note-spanish-001 |
| quality-match-009 | 100% | 100% | 100% | note-sitter-001 | note-sitter-001 |
| quality-match-010 | 100% | 100% | 100% | note-mentor-001 | note-mentor-001, note-mentor-001 |
| quality-match-011 | 100% | 100% | 100% | note-photo-001 | note-photo-001, note-photo-001 |
| quality-match-012 | 100% | 100% | 100% | note-drive-001 | note-drive-001, note-drive-001 |
| quality-match-013 | 100% | 100% | 100% | note-tech-001 | note-tech-001, note-tech-001 |
| quality-match-014 | 100% | 100% | 100% | note-mentor-001 | note-mentor-001, note-mentor-001 |
| quality-match-015 | 100% | 100% | 100% | note-photo-001 | note-photo-001, note-photo-001 |
| quality-match-016 | 100% | 100% | 100% | note-drive-001 | note-drive-001, note-drive-001 |
| quality-match-017 | 100% | 100% | 100% | note-tech-001 | note-tech-001, note-tech-001 |
| quality-match-018 | 100% | 100% | 100% | note-donate-001 | note-donate-001, note-donate-001 |
| quality-match-019 | 100% | 100% | 100% | note-clean-001 | note-clean-001 |
| quality-match-020 | 100% | 100% | 100% | note-resume-001 | note-resume-001 |
| quality-match-021 | 100% | 100% | 100% | note-grocery-001 | note-grocery-001 |
| quality-match-022 | 0% | 0% | 0% | note-legal-001 |  |


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