# Comprehension Probe — 2026-11

**Instrument:** `pnpm probe` (sample workspace, seeded; facilitator reads the questions aloud)
**Question:** does a stranger understand what this is and what to do next?
**Sessions:** 3

## Results

| Participant | Understood purpose | Named next action | Time to first explanation | Time to first match | Acted | Time to first action |
|---|---|---|---|---|---|---|
P1 | no | no | — | — | no | —
P2 | no | no | — | — | no | —
P3 | no | no | — | — | no | —

- **Comprehension rate:** 0% (0/3) stated the purpose correctly
- **Next-action rate:** 0% (0/3) named an action the app supports
- **Act completion:** 0/3
- **Time to first explanation:** median —
- **Time to first match (P2c.4):** median — — threshold: median < 2 min
- **Time to first action:** median —

## Match relevance (P2c.3)

| Participant | Would act on the match | Why |
|---|---|---|
P1 | — | —
P2 | — | —
P3 | — | —

- **Relevance rate:** 0% (0/0)

## Verbatim answers

### P1

- **What is this app for?** _(no answer)_
- **What would you do next?** _(no answer)_
- Understood the purpose: no
- Named a next action: no
- Opened the match explanation after —
- Time to first match: —
- Journal events preserved: 0
- Completed the act step: no
- Would act on the match: —

### P2

- **What is this app for?** _(no answer)_
- **What would you do next?** _(no answer)_
- Understood the purpose: no
- Named a next action: no
- Opened the match explanation after —
- Time to first match: —
- Journal events preserved: 0
- Completed the act step: no
- Would act on the match: —

### P3

- **What is this app for?** _(no answer)_
- **What would you do next?** _(no answer)_
- Understood the purpose: no
- Named a next action: no
- Opened the match explanation after —
- Time to first match: —
- Journal events preserved: 0
- Completed the act step: no
- Would act on the match: —


## Method

- 5 participants, 10 minutes each, no instruction beyond the two questions.
- The participant sees the sample workspace only; the facilitator does not demonstrate.
- Answers are recorded verbatim. The facilitator classifies each answer after the
  session: *understood the purpose* and *named a next action the app supports*.
- The match the product shows is judged in the same session: *would you act on
  this?* and *why not?* (P2c.3).
- The clock starts when the app reports ready and stops when the participant opens
  the match explanation or completes the act step.
- Time to first match (P2c.4) is measured by the app's own journal, not by the
  facilitator: from the first need the participant expressed to the first match
  explanation they opened after it (ADR 016).
- The browser journal is exported through Settings → Data. Only events recorded
  after participant handoff are merged into the local Node journal; seeded
  workspace hydration events are excluded. The same participant-session events
  therefore feed `pnpm loop latency` and `pnpm loop prioritize --source friction`.
- Sessions are stored locally in `doc/evidence/comprehension-probe-raw.json`;
  this report is anonymized (participants are `P1`, `P2`, …).
