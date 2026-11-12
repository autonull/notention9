# Human Evidence Runbook — TODO.17 P2

Use this runbook for the five comprehension sessions, the match-relevance judgments, and the friction handoff. The code path is ready; the missing input is people.

## Before the first participant

1. Build the production UI:

   ```bash
   pnpm --filter @notention/ui build
   ```

2. Read the consent text:

   > We are testing the app, not you. This session lasts about ten minutes. I will record your answers, timing, and local app events on this computer. Nothing is published. You may stop at any time. Do you consent?

3. Do not demonstrate the app or suggest an action.

## Run one participant

```bash
pnpm probe
```

The probe seeds the sample workspace and opens the app in a separate browser window.

1. Enter an anonymized participant id (`P1` … `P5`).
2. Hand the window to the participant.
3. Read both questions verbatim:

   - “What is this app for?”
   - “What would you do next?”

4. Record the answers verbatim. Do not correct or rephrase them.
5. Let the participant explore and act. Press Enter in the facilitator terminal when the session is over.
6. Classify the answers only after the session:

   - Did the participant state the purpose correctly?
   - Did they name a next action the app supports?

7. Record the match judgment: “Would you act on this match?” and “Why?”, verbatim.

The probe exports the browser friction journal through Settings → Data and merges only participant-session events into the local Node journal. Events produced while the facilitator seeds the sample workspace are excluded. A failed export or handoff stops the probe without recording the session. The probe does not create or classify a synthetic session.

## After five participants

```bash
pnpm loop latency --evidence doc/evidence/2026-11-time-to-first-match.md
pnpm loop prioritize --source friction
```

Review:

- `doc/evidence/2026-11-comprehension-probe.md` — answers, act completion, match relevance, and per-participant latency.
- `doc/evidence/2026-11-time-to-first-match.md` — the latency distribution across browser sessions.
- `.notention/journal/friction.jsonl` — the local raw event stream. It is ignored by Git.

The raw answers remain in `doc/evidence/comprehension-probe-raw.json`, which is also ignored by Git. Publish only the anonymized report.

## Thresholds from TODO.17

| Measure | Threshold |
|---|---|
| Purpose and next action understood | At least 4 of 5 participants |
| Capture → match → respond completed unaided | At least 4 of 5 participants |
| Time to first match | Median below 2 minutes |
| Presented matches judged worth acting on | At least 60% |

Report negative and incomplete results as observed. Do not edit raw answers, omit sessions, or replace human results with automation.

## Dogfood outside the probe

The same handoff works for ordinary use:

1. Open **Settings → Data Management**.
2. Select **Export Friction Journal (JSONL)**.
3. Import the downloaded file:

   ```bash
   pnpm loop import-journal ~/Downloads/friction-journal-YYYY-MM-DD.jsonl
   ```

Imports are idempotent: repeated exports do not double-count an event, while repeated legacy observations remain distinct. If the file contains malformed JSONL lines, the import fails before writing any event.

## Troubleshooting

- **The UI does not start:** run `pnpm --filter @notention/ui build`, then retry `pnpm probe`.
- **Port 4189 is occupied:** run `pnpm probe --port 4199`.
- **No participant window appears:** install the Playwright browser with `pnpm exec playwright install chromium`.
