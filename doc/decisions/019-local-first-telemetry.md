# ADR 019: Local-First Telemetry

**Status:** Accepted
**Date:** 2026-11-14
**Related:** ADR 015 (telemetry handoff), ADR 016 (time-to-first-match), W7.4, W8.1, W8.3

## Context

Telemetry must:
1. **Work offline** — no network required
2. **Respect privacy** — no PII leaves device unless explicit opt-in
3. **Be useful** — answer real questions (friction, quality, latency)
4. **Be auditable** — user can inspect, export, delete all data

Existing systems (Google Analytics, Mixpanel, etc.) fail #1, #2, #4.

## Decision

**Three-layer local-first telemetry stack:**

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Friction Journal (core/src/telemetry/journal.ts)  │
│ - Append-only JSONL in IndexedDB (browser) / file (Node)   │
│ - Events: capture_started, correction, match_accepted, etc.│
│ - Schema: { kind, timestamp, sessionId, noteId, ... }      │
│ - Retention: 90 days, auto-prune                            │
│ - Export: Settings → Data → Export JSON                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Digest Pipeline (core/src/telemetry/digestPipeline)│
│ - Half-life decay (default 14 days)                         │
│ - Groups by workflow (capture, match, elicit, ...)          │
│ - Evidence classes: Measured / Observed / Hypothesized      │
│ - CLI: `pnpm friction:digest --days 30 --top 5`             │
│ - UI: Settings → Metrics → Friction Digest                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Specialized Telemetry                              │
│ - LLM Call Telemetry (core/src/telemetry/llmTelemetry.ts)  │
│   - Records: model, tokens, latency, mode (grammar/fallback)│
│   - Aggregates: p50, p95 per model/mode                     │
│   - CLI: `pnpm optimize llm:telemetry --days 7`             │
│ - Time-to-Match (optimize/src/loop/timeToMatch.ts)          │
│   - Pairs need_expressed → match_explained per session      │
│   - CLI: `pnpm loop latency`                                │
└─────────────────────────────────────────────────────────────┘
```

**Privacy guarantees:**
- **No remote endpoints** in core telemetry code
- **PII redaction** (W7.4): `redactPII()` strips emails, phones, SSNs before any remote AI call
- **Opt-in only**: Remote AI provider sends redacted prompts only if user enables "Redact PII before sending" (default ON) and doesn't enable "Allow sending unredacted" (default OFF)
- **User controls**: Export all data, delete journal, disable collection per-event-kind

**Storage:**
- Browser: IndexedDB (`JsonStore` wrapper, single key `notention:journal`)
- Node: `data/telemetry/journal.jsonl` (append-only)
- Both implement same `Journal` interface

## Consequences

### Positive
- **Complete offline operation**: All telemetry works air-gapped
- **GDPR/CCPA trivial**: Data never leaves device; export = data portability
- **Self-documenting**: Journal schema in code; digest output explains itself
- **Composable**: New event kinds add to journal; digest pipeline auto-adapts

### Negative
- **No centralized analytics**: Can't aggregate across users (by design)
- **Storage growth**: 90-day retention = ~1-5 MB typical; user must manage
- **No real-time dashboard**: Digest is on-demand, not streaming

### Neutral
- ~50 event kinds defined; extensible via `FrictionEventKind` type
- Half-life decay means old friction fades but doesn't disappear

## Verification

- `pnpm friction:digest` — deterministic output on fixture journal
- `pnpm optimize llm:telemetry` — shows p50/p95 per model
- `pnpm loop latency` — prints distribution from real journal
- Settings → Metrics → Friction Digest — reads live browser journal
- W7.4 tests: `piiRedaction.test.ts` (26 tests) — PII never leaves in prompts

---

*See implementation: `core/src/telemetry/`, `optimize/src/cli/commands/frictionDigest.ts`, `optimize/src/cli/commands/llmTelemetry.ts`*