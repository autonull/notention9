# Time-to-First-Match — 2026-11

**Metric:** seconds from "I expressed a need" to "I understood a match" (TODO.17 P2c.4).
**Definition:** ADR 016 — one browser session is one user's turn; t0 is the first
`need_expressed` event of the session, t1 is the first `match_explained` event
that follows it.
**Source:** `friction journal`

## Result

- **Samples:** 0
- **Median (p50):** —
- **p90:** —
- **Fastest:** —
- **Slowest:** —
- **Threshold (plan §Numbers):** median < 2 min — not measurable yet

## Coverage

- **Sessions observed:** 0
- **Sessions that expressed a need:** 0
- **Sessions that opened an explanation:** 0
- **Expressed, never understood:** 0
- **Understood without a recorded need:** 0
- **The match was about that need:** 0/0
- **Events without a session id or timestamp:** 8
- **Rejected pairs (negative delta):** 0

## Samples

| Session | Expressed at | Understood at | Seconds | Same need |
|---|---|---|---|---|
| — | — | — | — | — |

## Method

- The metric is a **distribution**, not a mean: a mean hides the slow half.
- A session counts once: the first `need_expressed` and the first
  `match_explained` that follows it.
- Pairs with a negative delta (clock skew) are rejected and counted, not averaged in.
- Events without a session id cannot be attributed to a session and are not sampled.
