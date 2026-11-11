# ADR 014: Golden Path — The Five Steps

**Status:** Accepted
**Date:** 2026-11-10
**Related:** P1c, P1b, P1a

## The Golden Path

The golden path is the canonical end-to-end user journey that proves the product works. It is the acceptance test. If this path breaks, the product does not do its headline thing.

### The Five Steps

| Step | User Action | System Response | "Done" Means |
|------|-------------|-----------------|--------------|
| **1. Capture** | User opens capture flow, describes a need (request) or capability (offer) | Extraction produces canonical properties with roles (constraint/fact/marker) and units | Note exists with `intent: request|offer`, at least one `constraint`, units on dimensional properties |
| **2. Match** | User navigates to Dashboard | Local matcher finds the best offer for the request (or vice versa) | Match card appears with score ≥ 0.4, "X satisfied · Y conflicting · Z missing" |
| **3. Explain** | User clicks "Show details" on match card | Match engine explains every satisfied constraint, conflict, and missing detail with match type and reason | Details panel shows: property key, operator, values, match type (exact/range/fuzzy/geo/date), reason, units |
| **4. Respond** | User clicks "Respond" on match card | System creates a durable response note linking request + offer, logs `match:accepted` to ledger, navigates to response | Response note exists with `intent: response`, `requestId`, `offerId`, `matchScore`, `status: open` |
| **5. Revisit** | User reloads page, opens Responses view | Response persists, is listed under "Active Responses" with link back to request and offer | Response visible in Responses view after reload; withdrawal creates `match:withdrawn` note (not deletion) |

## Test Coverage

| Test File | Steps Covered | Run Via |
|-----------|---------------|---------|
| `ui/test/journeys/compose-match.spec.ts` | 1–5 (hand-built notes) | `pnpm verify` (L3) |
| `ui/test/journeys/golden-demo.spec.ts` | 1–3 (sample workspace) | `pnpm verify` (L3) |

## Contract Invariants

1. **No cross-dimension matches** — A rate (USD/project) never satisfies a total (USD), and vice versa. Units must be compatible.
2. **Every comparison reports units** — The explanation says *how* two values were compared, not just whether they matched.
3. **Explanation is mandatory** — A match without an explanation is a bug, not a feature.
4. **Response is durable** — Reload does not lose the response. Withdrawal is a note, not a deletion.
5. **Ledger is complete** — `match:accepted` and `match:withdrawn` events exist and carry the note IDs.

## Failure Modes (What "Red" Looks Like)

| Symptom | Root Cause | Gate |
|---------|------------|------|
| No match appears | Matcher broken, extraction not canonical, roles missing | P1a |
| Match appears but no explanation | `MatchDetails` not propagated, UI not rendering details | P1a, P1c |
| Rate matches total (8,766× error) | Units discarded at compare time | P1a Track B |
| Response not created | `createResponseNote` not called, `addNote` failed | P1b |
| Response lost on reload | Not persisted to IndexedDB, or hydration race | P1b |
| Withdrawal deletes note | `createWithdrawalNote` not used, direct deletion | P1b.3 |

## Running the Golden Path

```bash
# Full verification (all lanes)
pnpm verify

# Just the golden path (L3)
pnpm exec playwright test ui/test/journeys/compose-match.spec.ts ui/test/journeys/golden-demo.spec.ts
```

## Evolution

- **P1c** (this ADR): Steps 1–5 defined, tested, documented.
- **P1d**: Benchmark rebuilt on product semantics — the 22 quality cases become the regression corpus.
- **P2**: Comprehension probe — strangers complete steps 1–5 unaided.
- **P3**: Optimize — powered experiments against the golden path as baseline.

---

*This document is the contract. If the code contradicts it, the code is wrong.*