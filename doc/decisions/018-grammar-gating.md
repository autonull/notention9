# ADR 018: Grammar Gating with Auto-Probe

**Status:** Accepted
**Date:** 2026-11-14
**Related:** ADR 017 (dual prompt), W1.5

## Context

LLM JSON output is unreliable:
- Missing brackets, trailing commas, wrong types
- Hallucinated keys/operators not in ontology
- Inconsistent across runs even at temperature 0

`llama.cpp` supports **GBNF grammars** to constrain output to valid JSON matching a schema. But:
- Not all models/chat wrappers support grammar
- Grammar compilation adds ~50-100 ms startup
- Some models fail to generate valid JSON even with grammar (empty output, timeout)

We need: **grammar when it works, fallback when it doesn't, automatic**.

## Decision

**Auto-probe with persisted mode per model:**

```
Model Load
    │
    ▼
┌─────────────────────────────────────┐
│ Check chat wrapper supports grammar │
│ (Qwen, Llama, Gemma → yes)          │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Load persisted mode from localStorage│
│ Key: `notention:grammar-mode:<model>`│
│ Values: "grammar" | "fallback"       │
└─────────────────────────────────────┘
    │
    ├─ "grammar" ──▶ Try grammar generation
    │                   │
    │                   ├─ Success → recordGrammarSuccess()
    │                   │
    │                   └─ Parse fail/empty → recordGrammarFailure()
    │                                         │
    │                                         ▼
    │                              ┌─────────────────────────┐
    │                              │ 3 consecutive failures? │
    │                              └─────────────────────────┘
    │                                   │           │
    │                                  Yes          No
    │                                   ▼           ▼
    │                         Switch to      Retry with
    │                         fallback       grammar
    │                                   │
    │                                   ▼
    │                         Persist "fallback"
    │
    └─ "fallback" ──▶ Unconstrained + JSON repair
```

**Fallback strategy:**
- Temperature 0, unconstrained generation
- Post-process: extract JSON array from response, validate against ontology
- Repair: fix common issues (trailing commas, single quotes, missing brackets)

**API (in `@notention/optimize/llm/llamaCppBridge`):**
- `getGrammarMode(modelId)` — current mode
- `recordGrammarSuccess(modelId)` / `recordGrammarFailure(modelId)`
- `getGrammarModeStats()` — all models' modes and failure counts

## Consequences

### Positive
- **Self-healing**: Models that can't do grammar silently fall back
- **No user config**: Works out of the box
- **Observable**: `pnpm optimize llm:telemetry` shows mode per call
- **Persisted**: Survives restarts; no repeated probing

### Negative
- **First 3 runs slower**: Grammar attempts that fail add latency
- **localStorage dependency**: Browser-only; Node CLI uses in-memory map
- **False negatives**: Transient error (OOM) could trigger permanent fallback

### Neutral
- ~5% of models need fallback (mostly quantized edge cases)
- Fallback quality within 2-3% F1 of grammar mode

## Verification

- `chatWrapper.test.ts` — 5 tests: default mode, success/failure recording, fallback switching, persistence, unsupported model
- `pnpm optimize llm:telemetry` — shows `mode: "grammar" | "fallback"` per call
- Golden gate: 10/10 passes with both modes
- Manual test: corrupt grammar file → observe fallback

---

*See implementation: `optimize/src/llm/llamaCppBridge.ts` (extractWithLlamaCpp, grammar mode tracking)*