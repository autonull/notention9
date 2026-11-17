# ADR 017: Dual Prompt Architecture

**Status:** Accepted
**Date:** 2026-11-14
**Related:** ADR 018 (grammar gating), W1.5, W1.6

## Context

Property extraction needs two distinct modes:

1. **Heuristic/Deterministic** — Fast, local, no model required. Uses pattern matching, ontology key lookup, and fuzzy matching. Runs in < 5 ms.
2. **LLM-based** — Higher quality, understands context, handles ambiguity. Runs in 100-500 ms (2B model) to 1-2 s (9B model).

The system must:
- Always work offline (no model required)
- Show results immediately (heuristic first)
- Refine with LLM when available
- Never block the UI waiting for LLM

## Decision

**Two-stage progressive extraction pipeline:**

```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│ Stage 1: Heuristic Extraction       │
│ - Deterministic patterns            │
│ - Ontology key matching             │
│ - Fuzzy/alias matching              │
│ - Budget: < 300 ms p95              │
└─────────────────────────────────────┘
    │ (immediate results via callback)
    ▼
┌─────────────────────────────────────┐
│ Stage 2: LLM Extraction (optional)  │
│ - llama.cpp embedded or server      │
│ - Grammar-constrained JSON          │
│ - Budget: < 800 ms p95              │
│ - Merges with heuristic results     │
└─────────────────────────────────────┘
    │
    ▼
Final Properties (merged, deduplicated)
```

**Key properties:**
- Heuristic runs synchronously in the UI thread (Web Worker in future)
- LLM runs async; UI shows "refining..." badge
- Results merge: LLM properties override heuristic on same key+operator
- If LLM fails/times out, heuristic results stand alone
- `progressiveExtract()` exported from `@notention/core/extraction/progressiveExtraction`

## Consequences

### Positive
- **Zero-latency first paint**: User sees properties instantly
- **Graceful degradation**: Works without any model downloaded
- **Quality ceiling**: LLM adds nuance heuristic misses (negation, implicit entities)
- **Measurable**: Each stage has independent latency budget and telemetry

### Negative
- **Merge complexity**: Conflicts between heuristic + LLM on same key
- **Duplicate work**: Heuristic runs even when LLM would supersede
- **State management**: UI must handle two result streams

### Neutral
- Heuristic quality ~0.45 F1, LLM adds ~0.15-0.25 F1 delta
- 90% of notes have < 5 properties; merge is trivial

## Verification

- `pnpm test` → `progressiveExtraction.test.ts` (11 tests)
- `pnpm perf:budget` → extraction p95 < 800 ms
- Friction journal: `extraction_heuristic_latency`, `extraction_llm_latency`
- Golden gate passes with heuristic-only (deterministic provider)

---

*See implementation: `core/src/extraction/progressiveExtraction.ts`*