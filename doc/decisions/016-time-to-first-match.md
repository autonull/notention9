# ADR 016: Time-to-First-Match — Definition and Instrument

**Status:** Accepted
**Date:** 2026-11-11
**Related:** P2c.4, P2b (dogfood telemetry), P3.2, ADR 014 (golden path), ADR 015 (telemetry handoff)

## Context

The plan has a number with no instrument behind it:

> **Time-to-first-match** | median < 2 min across real sessions | P2c.4

The friction journal could not produce that number. It stored one bucket per
event (`YYYY-MM-DD`) and no correlation id, so two facts were impossible to
establish: *when* an event happened, and *which need* an event was about. The
journal counted kinds; it could not order them.

Two other defects sat next to it, found while wiring the metric:

- The browser→file export (Settings → Data) read the IndexedDB value as an
  array. `JsonStore` stores a JSON **string**, so `events.map` threw and the
  export never produced a file. The bridge between the browser journal and
  `pnpm loop` was dead.
- `match_accepted` and `response_created` were recorded when the user *opened*
  a note, not when a response was created. The act step was counted twice for
  one act, and counted for acts that never happened.

## Decision

### The metric

**Time-to-first-match** is the number of seconds between two events of one
user session:

| Anchor | Event | Meaning |
|--------|-------|---------|
| **t0** | `need_expressed` | a note carrying `intent: request` was persisted — the need is in the app |
| **t1** | `match_explained` | a match explanation was opened — the match is understood |

`t1` is the first explanation **after** `t0`. An explanation opened before the
need was expressed is not a time-to-first-match; it belongs to whatever the
user was doing earlier.

**The unit of observation is a session.** A browser session (one page load) is
one user's turn, which is what the plan means by "per user". Every journal
event therefore carries a `sessionId`.

**The report is a distribution, never a mean.** `n`, `p50` (the median, the
number the threshold is written against), `p90`, `min`, `max`. A mean hides the
slow half; the median does not.

### The instrument

| Piece | Where | What it does |
|-------|-------|--------------|
| Event shape | `core/src/telemetry/frictionUtils.ts` | `FrictionEvent` gains `timestamp`, `sessionId`, `noteId` |
| Stamping | `core/src/telemetry/journal.ts`, `journal.browser.ts` | every event gets an exact timestamp and the session id |
| Need anchor | `ui/src/hooks/data/useNotesData.ts` | `need_expressed` when a note first carries `intent: request` |
| Match anchor | `ui/src/components/dashboard/DashboardView.tsx` | `match_explained` carries the request note id |
| Metric | `optimize/src/loop/timeToMatch.ts` | pairs the anchors per session, summarizes the distribution |
| Report | `pnpm loop latency [--evidence <file>]` | prints the distribution, writes the evidence document |
| Probe | `scripts/comprehension-probe.ts` | the same metric, per participant, from the same journal |

### What is excluded, and why

| Case | Treatment | Reason |
|------|-----------|--------|
| A need was expressed, no explanation followed | counted as *expressed, never understood*; not a sample | there is no duration to report |
| An explanation with no need before it | counted as *understood without a recorded need*; not a sample | the start of the interval is unknown |
| A negative delta | rejected and counted | clock skew, not a duration |
| Events without a session id or timestamp | counted as *unattributed*; not sampled | they cannot be ordered |
| The explanation was about a different request | sampled, and flagged (`same note: no`) | the duration is real; the match was not about that need |

### The act step

`match_accepted` is recorded when the user responds to a match.
`response_created` is recorded when the response note is created. Neither is
recorded when the user merely opens a note.

## Consequences

- The plan's threshold (median < 2 min) is now measurable, but only by real
  sessions. The instrument is live; the journal is still empty.
- The journal grows: one event per request note, one per explanation opened,
  each with a timestamp and a session id. The retention policy (90 days) still
  applies.
- Old journal files stay readable. Events written before this ADR have no
  timestamp and no session id, so they are counted as unattributed instead of
  being paired by accident.
- `pnpm loop latency` reads the same file the browser exports to
  (`.notention/journal/friction.jsonl`), so the browser and the node journal
  are measured by one implementation.

## Verification

- `optimize/src/tests/loop/timeToMatch.test.ts` — pairing, exclusions, distribution.
- `ui/test/journeys/compose-match.spec.ts` — the journey records both anchors,
  with the same note id and the same session id.
- `pnpm loop latency` — prints the distribution from the real journal.

---

*This document is the definition. If the code contradicts it, the code is wrong.*
