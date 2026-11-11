# 015 — Telemetry Handoff: The Browser Journal Must Reach the Loop CLI

**Status:** Accepted
**Date:** 2026-11-11
**Relates to:** TODO.17 P2b (dogfood telemetry), R9 (human failures → machine-readable friction)

## Context

TODO.17 asserts, in the P2b track:

> The instrument already exists and is already wired: seven friction kinds … a journal with
> `getFrictionCounts`, and `useCaptureTracking`/`useMatchTracking` in `DashboardView`.
> `optimize/src/loop/prioritize.ts:345` already reads real journal friction to prioritize work.

That assertion is false in the browser. It was checked, and the claim fails in four ways.

### F1 — The browser journal is disabled by default and nothing enables it

`core/src/telemetry/journal.browser.ts` initialises `JournalConfig` to `{enabled: false}`, and
`loadConfig()` returns that default when the IndexedDB store has no config. `record()` then drops
every event on the floor:

```ts
record(event: Omit<FrictionEvent, 'bucket'>): void {
    if (!this.config.enabled) {
        void this.init().then(() => {
            if (this.config.enabled) this.bufferEvent(event);   // ← never true
        });
        return;
    }
    this.bufferEvent(event);
}
```

The UI records through `useFrictionRecorder` → `recordFriction` → `getJournal().record(...)`.
Nothing in `ui/src` ever calls `setEnabled(true)` — the only `setEnabled` in the tree is
`AgentService.setEnabled`, which is a different thing entirely.

**Consequence:** the product's own instrument is off. `.notention/journal/friction.jsonl` contains
nine rows dated 2026-11-05, all written by a Node-side script (`scripts/run-demo-loop.ts`), not by
the app. Real user sessions produce **zero** friction events.

### F2 — The Node journal's `enabled` default is also false, and the file is gitignored

`core/src/telemetry/journal.ts` uses the same `{enabled: false}` default. The checked-in
`.notention/journal/config.json` says `enabled: true`, but `.notention/` is gitignored
(`.gitignore:72`), so a fresh clone has no config at all — and `loadConfig()` then writes
`enabled: false` on first use. A contributor who clones and runs `pnpm loop prioritize --source
friction` gets a silent, empty result.

### F3 — The Node journal keeps the event loop alive forever

`Journal.startAutoFlush()` creates a `setInterval` that is never `unref()`ed and never cleared
outside an explicit `shutdown()` that no CLI calls:

```ts
private startAutoFlush(): void {
    this.flushInterval = setInterval(() => this.flush(), JOURNAL_AUTO_FLUSH_INTERVAL_MS);
}
```

Any process that touches the journal therefore never exits. Verified:

```
$ timeout 60 pnpm loop prioritize --source friction --dry
  …output…
  ELIFECYCLE  Command failed with exit code 143.   ← killed by timeout, not by the code
```

`getJournal()` is a module-level singleton, so importing `@notention/core/telemetry/journal` is
enough to hang the process. This blocks TODO.17 P3.3 ("the loop CLI becomes live") and makes
`pnpm loop` unusable in CI.

### F4 — The optimize barrel cannot be imported at all

`optimize/src/discovery/index.ts` re-exports `goalParser` and `journeySynthesizer` (lines 109–123).
Both of those modules import `DiscoveryEngine` back from the barrel:

```ts
// optimize/src/discovery/synthesizer/goalParser.ts:1
import { DiscoveryEngine } from '../index.js';
```

The barrel's `export const discoveryEngine = new DiscoveryEngine()` sits at line 235 — *after* the
re-export — so the cycle resolves to a temporal dead zone:

```
$ node -e "import('@notention/optimize')"
ERR Cannot access 'DiscoveryEngine' before initialization
```

Consequences, all confirmed by running them:
- `pnpm optimize optimize capture-and-edit` → `Error: No tests found`, exit 0.
- `playwright --project=optimize --list` → `Total: 0 tests in 0 files`.
- The L2 lane of `pnpm verify` reports "passed" because it is wrapped in `runOptional`, which
  swallows the failure. **This is a false green**: a lane that runs zero tests and reports success.

The root cause is one line: a module-level `new DiscoveryEngine()` at the bottom of a barrel that
the module's own dependencies import back from.

## Decision

### Fix F4 first — break the cycle at the source

Move `DiscoveryEngine` into its own module, `optimize/src/discovery/engine.ts`, and have the barrel
re-export it. `goalParser.ts` and `journeySynthesizer.ts` import from that module, not from the
barrel. The class no longer participates in an import cycle.

The barrel keeps `export const discoveryEngine = new DiscoveryEngine()` — one shared instance, as
today — but the *class* now lives below the barrels it depends on.

### Fix F1/F2 — the journal is on by default, with a visible off switch

Both platforms default `enabled` to `true`. The instrument is a local, opt-in-by-omission file
(`.notention/journal/friction.jsonl`, or IndexedDB in the browser); it holds no note content, only
`{kind, workflow, seam, count, bucket}`. Collecting it by default is what makes the product its own
instrument — the plan's stated goal for P2b ("Cost: zero, once the events exist").

To keep that honest, the browser exposes an explicit toggle: the journal can be turned off, and
turning it off purges what it holds (`setEnabled(false)` already purges).

### Fix F3 — the flush timer must not own the process

`startAutoFlush()` calls `.unref()` on the interval in the Node build. The timer keeps the journal
fresh during a long-lived process but no longer prevents exit. `shutdown()` still clears it.

### Fix the false green in the verify lane

`runOptional` for L2 stays (the journey is genuinely optional per TODO.17), but a lane that ran
**zero** tests must not report success. The optimize journey failure is now loud: the CLI exits
non-zero, and `pnpm verify` surfaces it as a failure rather than silently passing.

## Consequences

- `pnpm loop prioritize --source friction` terminates and reads real data.
- `pnpm optimize optimize <journey>` finds its tests and runs them.
- The product records friction during real sessions, so R9's "sessions from real use" can finally
  fill a journal.
- `pnpm verify` no longer reports a green lane that ran nothing.

## Alternatives rejected

**Keep the journal opt-in and add a Settings toggle.** Rejected as the *only* mechanism: a hidden
default that no user will find means the journal stays empty, and the plan's acceptance criterion
is a journal with real sessions in it. The toggle now exists; the default is on.

**Fix F4 by moving the singleton instead of the class.** Rejected: `goalParser.ts` would still
import the barrel, so the cycle — and the TDZ — would persist for anyone importing the barrel
first.
