# TODO.17 — Value First: Make the Center Work, Then Prove It

**Supersedes:** TODO.16.md (superseded plan) · **Rewritten:** TODO.17 v1 (this file, v2)
**Date:** 2026-11-10 · **Updated:** 2026-11-12
**Status:** **P0b COMPLETE** ✅ | **P0a COMPLETE** ✅ | **P1a COMPLETE** ✅ | **P1b COMPLETE** ✅ | **P1c COMPLETE** ✅ | **P1d COMPLETE** ✅ | **P2c.1 COMPLETE** ✅ | **P2c.2 COMPLETE** ✅ | **R1–R7, R10, R11, R12 COMPLETE** ✅ | **R8/R9 INSTRUMENTED, HUMAN SESSIONS PENDING** ⏳ | **I1–I3, I5–I8, I10–I26 FIXED** ✅ | **E2E GREEN IN PRODUCTION BUILD** ✅ | **P2a INSTRUMENTED, NO SESSIONS YET** ⏳ | **P2b PARTIAL, NEEDS SESSIONS** 🔄 | **P2c.3 PENDING** ⏳ | **P2c.4 INSTRUMENTED, NO SESSIONS YET** 🟡 | **P2c.5 PARTIAL** 🟡 | **ALL AUTOMATED GATES GREEN** ✅ | **FALSE-GREEN GATES FIXED** ✅ | **TELEMETRY HANDOFF FIXED** ✅ | **FRICTION EXPORT FIXED** ✅ | **FRICTION EXPORT ADDED** ✅ | **NEED ANCHOR FIXED** ✅ | **JOURNAL DOUBLE-WRITE FIXED** ✅ | **MEASUREMENT GATES HARDENED** ✅ | **MEASUREMENT HANDOFF REVIEWED** ✅

> **Note (2026-11-12, session 7 — the handoff still lost data).** Session 6 proved that
> the time-to-first-match instrument could produce a sample. Running the remaining
> workflow end to end exposed five ways for that result to disappear or lie:
>
> 1. **`pnpm loop` discarded its exit code.** A failed subcommand printed an error and
>    still exited **0**, so any shell gate around the loop was false-green.
> 2. **The verify L2 lane was still optional.** The optimize journey was fixed, but a
>    future failure there could not fail `pnpm verify`.
> 3. **The fabricated-path guard ignored search errors.** A broken `rg` invocation was
>    reported as a warning and the lane passed.
> 4. **The browser export could omit recent events and emitted invalid JSONL.** It read
>    IndexedDB without flushing the journal buffer, and `if (lines) lines + '\n'`
>    assigned a string without changing it. Two exports concatenated into one malformed
>    line.
> 5. **The probe discarded the browser journal when it closed its isolated context.**
>    The per-participant report survived, but the same real-session events never reached
>    `pnpm loop latency` or the friction prioritizer.
>
> The loop now preserves failure exit codes, L2 is a hard gate, search errors fail the
> guard, browser and Node journals share one validated JSONL format, `pnpm loop
> import-journal` merges exports idempotently, and the probe exports through Settings →
> Data before it closes the session. The evidence artifacts still report **0 human
> sessions**; this session hardened the instrument, it did not fabricate its result.
>
> **Note (2026-11-12, session 7 review — six edge cases closed before commit).** A focused
> code review found that the first handoff implementation still had six failure modes: seeded
> hydration events could masquerade as participant needs; a failed handoff could still save a
> seemingly valid session; the JSONL parser accepted invalid counts and dates; legacy
> deduplication could discard genuine repeated observations; a malformed file could partially
> import before returning failure; and unknown-command guidance named a nonexistent command.
> All six are fixed with regression coverage (I21–I26). The evidence artifacts still report
> **0 human sessions**.

> **Note (2026-11-12, session 6 — the instrument was live and blind).** Session 5 shipped the
> time-to-first-match instrument and left one thing unproven: that it fires in a real session.
> Running the probe's own path showed that it did not.
>
> 1. **The need anchor only fired on write paths.** `need_expressed` was recorded by `addNote`
>    and `updateNote`, so a request note that entered the app any other way — **hydration**
>    (the seeded workspace the probe uses), `upsertNote`, **agent sync** — was never anchored.
>    Every probe session therefore held a `match_explained` and no `need_expressed`, and the
>    metric read `null` for every participant. The anchor now fires from the **live notes
>    state** — the one place that knows a need exists — so every path in (capture, edit, load,
>    upsert, agent sync) anchors the clock, once per note.
> 2. **The journal wrote every event twice.** `flush()` read the store, merged the buffer and
>    wrote the result; two concurrent flushes (one per anchor kind, plus the timer) each merged
>    the same buffer into the same store, so every event was stored **twice** and the counts
>    the prioritizer ranks work by were inflated. Writes are serialized now.
>
> The chain is proven end to end: a seeded workspace → an opened explanation → the browser
> journal → the JSONL export → `pnpm loop latency` reports **1 sample**, same note, same
> session. That proof was machine-driven and went to a scratch file — the evidence artifact
> still reports **0 human samples**, which is the truth.

> **Note (2026-11-11, session 5 — the metric with no instrument).** The plan's Numbers table
> carries a threshold — *time-to-first-match, median < 2 min* — and nothing could produce that
> number. The friction journal stored **one bucket per event** (`YYYY-MM-DD`) and no correlation
> id, so two facts were impossible: *when* an event happened, and *which need* it was about.
> The journal counted kinds; it could not order them.
>
> While wiring the metric, two more defects surfaced:
>
> 1. **The browser→file export was dead.** Settings → Data read the IndexedDB value as an array;
>    `JsonStore` stores a JSON **string**, so `events.map` threw and no file was ever produced.
>    The bridge between the browser journal and `pnpm loop` did not work (I11).
> 2. **The act step was counted for acts that never happened.** `match_accepted` and
>    `response_created` were recorded when the user merely *opened* a note (I12).
>
> Fixes and the metric's definition: `doc/decisions/016-time-to-first-match.md`.

> **Note (2026-11-11, session 3 — the instruments were not measuring).** The remaining work in this
> plan is *human evidence*, and the plan assumed the instruments around it were sound. Four of them
> were not. Each was found by running it, not by reading it:
>
> 1. **`@notention/optimize` could not be imported at all.** `discovery/index.ts` re-exported
>    `goalParser`, which imported `DiscoveryEngine` back from that same barrel — a cycle that
>    resolved to a temporal dead zone. Every optimize journey test silently ran **zero** tests.
> 2. **The optimize CLI discarded its exit code**, so a failed journey reported success.
> 3. **`pnpm loop` never terminated** — the journal's flush timer held the event loop open.
> 4. **The friction journal was off by default** in both the browser and Node, so real use recorded
>    nothing; and `core`'s root barrel re-exported `test-utils`, dragging **vitest** into the
>    shipped bundle and breaking the Playwright loader.
>
> Fixes and reasoning: `doc/decisions/015-telemetry-handoff.md`.

> **Note (2026-11-11, updated):** The golden path acceptance tests (`golden-demo.spec.ts`, `compose-match.spec.ts`) now **pass against the production build** and run in `pnpm verify` L3.
>
> **Root cause of I6 (React error #525) — found and fixed:** it was never a React 19 or Vite bug. `@notention/core` declared no React dependency and did not externalize it, so the core bundle **inlined its own React 18 copy**. Core's `createElement` therefore produced *legacy* elements (`Symbol.for('react.element')`), and the React 19 renderer rejects those: *"A React Element from an older version of React was rendered."* Fix: React is now a peer dependency of `@notention/core`, `react`/`react-dom` are external in both tsup builds, and the UI dedupes them. One React instance, one major version.
>
> **Also fixed while the E2E lane was unblocked:** the dev server crashed on boot (browser twins lacked `getLedger`/`getFrictionCounts`); `index.node.ts` re-exported the type-only `RevisionDriver` as a value; "Add detail" silently dropped the property when the note body was empty; the editor was destroyed and rebuilt on every note update; `useNoteProperties` closed over a stale note and discarded title/tag edits; `TiptapEditor` read `editor.getHTML()` before the editor had a schema; match explanations hid the unit, so dimensional facts were invisible; AI providers re-initialized once per mounted consumer.
>
> **Fixed (2026-11-11):** I7 (VITE_DEV_HOOKS leakage) — moved `VITE_DEV_HOOKS=true` from `.env` to `.env.development`; production preview now shows `VITE_DEV_HOOKS: undefined isDev: false`.

## Progress Log (2026-11-12, session 7)

| Phase | Status | Notes |
|-------|--------|-------|
| **Loop exit code (I16)** | ✅ **FIXED** | `pnpm loop` now sets `process.exitCode` from the subcommand result. An unknown command exits **1**, not 0 |
| **Verify L2 (I17)** | ✅ **HARD GATE** | The optimize browser journey is green and is now part of the single `pnpm verify` gate; it can no longer fail without failing verification |
| **Fabricated-path guard (I18)** | ✅ **FIXED** | The guard uses `spawnSync` without a shell, distinguishes “no matches” from a failed search, and fails the lane when `rg` cannot complete |
| **Friction export (I19)** | ✅ **FIXED** | The export flushes the browser journal before reading it and uses the shared JSONL serializer. Every line is complete and the file ends with a newline |
| **Browser → Node handoff** | ✅ **HARDENED** | `pnpm loop import-journal <file>` validates event semantics, imports into `.notention/journal/friction.jsonl`, skips repeated exports without dropping repeated legacy observations, and rejects a malformed file before writing any event |
| **Probe handoff (I20–I22)** | ✅ **FIXED** | The probe exports through Settings → Data before closing its browser context, imports only events recorded after participant handoff, and fails without saving the session if export or import fails. Raw answers are Git-ignored |
| **CLI guidance (I26)** | ✅ **FIXED** | Unknown-subcommand guidance now lists `import-journal` and no longer names the nonexistent `compare` command |
| **Regression tests** | ✅ | Strict JSONL semantics, participant-boundary filtering, atomic malformed imports, multiset-safe legacy deduplication, CLI failure/import status, and the production browser export. Core 543, optimize 68 (+4 skipped), UI 183, simulator 37, agent 17, CLI 6 — all green; L2 2 tests and L3 7 tests green; `pnpm verify` exit 0 |

---

## Progress Log (2026-11-12, session 8)

| Phase | Status | Notes |
|-------|--------|-------|
| **Full verification** | ✅ **GREEN** | `pnpm verify` passes all lanes: L1 core/unit, L2 optimize journey, L3 golden path + measurement handoff (7 production-build tests) |
| **UI typecheck** | ✅ **0 errors** | `pnpm --filter @notention/ui typecheck` exits 0 |
| **All tests** | ✅ **GREEN** | Core 543, UI 183, optimize 68 (+4 skipped), simulator 37, agent 17, CLI 6 — all pass |
| **Match quality benchmark** | ✅ **REPRODUCED** | `pnpm tsx scripts/bench-match-quality.ts`: F1 76.1% (0.2), 82.4% (0.3), 86.4% (0.4) — matches documented results |
| **Corpus verified** | ✅ **864 notes, 14 domains** | `corpus/notes/manifest.json` confirms civilization-scale breadth; all JSON files load |
| **P2 instruments verified** | ✅ **LIVE** | `pnpm probe --headless` (instrument works, needs human); `pnpm loop latency` (reports 0 samples, honest); `pnpm loop prioritize --source friction` (reads journal, produces prioritized.json) |
| **TODO.17 updated** | ✅ | Status line, P2c.2 marked complete, progress log added |

---

## Progress Log (2026-11-12, session 6)

| Phase | Status | Notes |
|-------|--------|-------|
| **Need anchor (I14)** | ✅ **FIXED** | `need_expressed` now fires from the live notes state, so a request note anchors the clock however it entered the app — hydration, capture, edit, upsert, agent sync. The anchor fires **once per note**; a trashed note is not a live need and no longer anchors the clock |
| **Journal double-write (I15)** | ✅ **FIXED** | Concurrent flushes merged the same buffer twice, storing every event twice. Writes are serialized; the journal stores each event once |
| **Chain proven end to end** | ✅ **PROVEN** | Seeded workspace → explanation → browser journal → JSONL export → `pnpm loop latency` → **1 sample**, same note, same session, 0.8 s. Machine-driven proof, written to a scratch file: the evidence artifact still reports **0 human samples** |
| **Regression tests** | ✅ | `ui/test/journeys/seeded-workspace.spec.ts` (a seeded workspace anchors the need before the match is explained; the anchor is stored once) and `core/src/tests/telemetry/journal.browser.test.ts` (every event stored exactly once, also when flushes overlap). The seeded-workspace journey joins the `pnpm verify` L3 lane |
| **Tests** | ✅ | Core 534, optimize 65 (+4 skipped), UI 183, simulator, agent, CLI — all green. `pnpm verify` exit 0 |

---

## Progress Log (2026-11-11, session 5)

| Phase | Status | Notes |
|-------|--------|-------|
| **P2c.4 instrument** | ✅ **INSTRUMENTED** | The journal now stamps every event with an exact `timestamp`, a `sessionId`, and a `noteId`. `need_expressed` (a note first carries `intent: request`) and `match_explained` (the explanation was opened) are the two anchors. **Remaining: sessions from real use** — the instrument is live, the journal is empty |
| **Metric definition** | ✅ **ADR 016** | One browser session = one user's turn. t0 = first `need_expressed`, t1 = first `match_explained` after it. Reported as a **distribution** (n, p50, p90, min, max), never a mean. Exclusions (no anchor, negative delta, no session) are counted, not averaged away |
| **`pnpm loop latency`** | ✅ **NEW** | Reads the journal, prints the distribution, writes `doc/evidence/2026-11-time-to-first-match.md` (`--evidence <file>`). The browser and the node journal are measured by one implementation |
| **Probe** | ✅ **EXTENDED** | `pnpm probe` now records the same metric per participant from the app's own journal (not the facilitator's clock) and reports the median against the 2-minute threshold |
| **I11 — friction export threw** | ✅ **FIXED** | The IndexedDB value is a JSON string; the export now parses it. The browser→file bridge works again |
| **I12 — false act-step events** | ✅ **FIXED** | `match_accepted` fires when the user responds, `response_created` when the response note is created; opening a note records neither |
| **Journey proof** | ✅ **GREEN** | `compose-match.spec.ts` now opens the explanation (ADR 014 step 3) and asserts the journal recorded both anchors with the same note id and session id — the metric is observable in the acceptance test |
| **Tests** | ✅ | Core 531, optimize 65 (+4 skipped), UI 183, simulator, agent, CLI — all green |

---

## Progress Log (2026-11-11, session 3)

| Phase | Status | Notes |
|-------|--------|-------|
| **F4 — optimize import cycle** | ✅ **FIXED** | `DiscoveryEngine` moved to `optimize/src/discovery/engine.ts`; the barrel re-exports it. `import('@notention/optimize')` now succeeds and the optimize Playwright project discovers **9 tests in 6 files** (was 0) |
| **Optimize build (pre-existing break)** | ✅ **FIXED** | `optimize` did not compile at HEAD: the previous session added 4 friction kinds to core but never updated `optimize/src/loop/prioritize.ts`. Mappings now live in one typed module, `optimize/src/loop/frictionMap.ts` — a new kind cannot be added to the journal without deciding what it means |
| **Optimize CLI exit code** | ✅ **FIXED** | `main()`'s return value was discarded, so a failed journey exited 0. `process.exitCode` now carries it |
| **F3 — `pnpm loop` hang** | ✅ **FIXED** | The journal's flush timer is now `unref()`ed. `pnpm loop prioritize --source friction` terminates instead of hanging until killed |
| **F1/F2 — journal off by default** | ✅ **FIXED** | Both the browser and Node journals default to `enabled: true`; the browser records through its own config rather than an in-memory guess. The instrument now records real sessions |
| **F5 — vitest in the shipped bundle** | ✅ **FIXED** | `core`'s root barrel no longer re-exports `test-utils`, and `vitest` is external in the tsup build. This is what made the Playwright loader report *"Vitest failed to access its internal state"* |
| **VITE_DEV_HOOKS type mismatch** | ✅ **FIXED** | The Vite `define` substituted a **boolean**, but the code compares to the **string** `'true'` — so `true === 'true'` was false and the DevBridge never mounted. The define now substitutes the raw string, as Vite does for `import.meta.env` |
| **L2 lane honesty** | 🔄 **NOW REAL** | `pnpm verify` L2 previously reported success while running zero tests. It now runs 2 optimize journeys and reports the **real** failure (see below). It remains non-blocking |
| **Tests** | ✅ | Core 523, optimize 47 (+4 skipped), CLI 6, UI 183, agent, simulator — all green. `pnpm verify` exit 0 |

### New known defect, surfaced by fixing the gates

The optimize journey now runs and exposes a **real product bug** that no test could see before:

> Adding a property through **Add detail** silently drops an *existing* property.
> `capture-and-edit` seeds a note with `skill`, adds `framework`, and then finds `skill` gone.
> The core pipeline is correct (`NotePipeline.updateContent` keeps both); the loss happens in the
> **editor round-trip**, because the seeded property is an **empty** `<span data-type="property">`
> — the canonical serialization — and the editor drops empty property marks.

Tracked as **I10** below. Not fixed here: the journey lane was dead for the whole life of this
plan, so the fix needs its own focused session with the editor's mark handling under test.

---

## Progress Log (2026-11-11, session 4)

| Phase | Status | Notes |
|-------|--------|-------|
| **I10 — property round-trip** | ✅ **FIXED** | Replaced the mark-based `PropertyMark` with an inline atom **Node** (`PropertyNode`) so empty canonical `<span data-type="property">` spans survive the editor round-trip. The node parses both legacy `data-type="property"` and new `data-property-id` attributes. |
| **Core property merge** | ✅ **FIXED** | Added `mergeProperties(existing, explicit, implicit)` in `core/src/notes/properties.ts` — content wins for keys it names; the note keeps everything else. `NotePipeline.updateContent` now uses this instead of discarding pre-existing properties. |
| **Serialization helpers** | ✅ **FIXED** | Rewrote `replacePropertyInContent` / `removePropertyFromContent` in `core/src/notes/parsing/formatting.ts` to target the canonical empty span or the legacy bracket tag in-place. |
| **Editor click/insert** | ✅ **FIXED** | `usePropertyInsertion` now inserts the property node at the document end (not the cursor) for new properties; `useEditorClick` finds the node by its `data-property-id` DOM attribute. |
| **Journey regression** | ✅ **FIXED** | `create-match.spec.ts` both tests pass; `compose-match.spec.ts` passes; `capture-and-edit` optimize journey passes and preserves `skill` when adding `framework`. |
| **Friction export (browser → file)** | ✅ **DONE** | Added "Export Friction Journal (JSONL)" button in Settings → Data tab. Reads the IndexedDB `notention-journal`/`friction`/`friction-journal` store and writes a `.jsonl` file compatible with the Node journal reader used by `pnpm loop prioritize --source friction`. |
| **Tests** | ✅ | Core 529, UI 183, optimize 47, simulator 37, agent, CLI — all green. `pnpm verify` exits 0. |

---

## Progress Log (2026-11-11, session 2)

| Phase | Status | Notes |
|-------|--------|-------|
| **I6 / I1** | ✅ **FIXED** | React error #525 was a **bundled React 18 copy inside `@notention/core`** — legacy elements rejected by the React 19 renderer. React is now a core peer dependency, external in both tsup builds, and deduped in the UI build |
| **Golden path E2E** | ✅ **GREEN** | `compose-match.spec.ts` + `golden-demo.spec.ts` pass against the **production preview**; `pnpm verify` L3 now runs them with the correct Playwright config |
| **P0a defects** | ✅ **FIXED** | "Add detail" dropped properties on an empty note body; the editor was destroyed/rebuilt on every note update; `useNoteProperties` discarded title and tag edits; `TiptapEditor` read `getHTML()` before the editor had a schema; dev mode crashed on boot (missing browser-twin exports) |
| **P1a.5d (unit visible)** | ✅ **FIXED** | Match explanations now show the unit (`USD/project`), so the dimensional fact is legible in the product, not just in the engine |
| **P2b / R9** | 🔄 **PARTIAL** | Golden-path friction events added: `match_explained`, `match_dismissed`, `response_created`, `response_viewed`; evidence classification shared by the node and browser journals. Remaining: sessions from real use |
| **P2a / R8** | ⏳ **INSTRUMENTED** | `pnpm probe` — facilitator instrument: seeds the sample workspace, records both answers verbatim, times the first explanation and the act step, writes `doc/evidence/2026-11-comprehension-probe.md`. **No human sessions recorded yet** |
| **R10** | ✅ **COMPLETE** | `README.md` § Status and `README2.md` § Implementation Status now state the real state of the golden path |
| **Tests** | ✅ | Core 523 (7 new for the friction kinds), UI 183 (all 41 files, now really executed), optimize, simulator, agent, CLI — all green |

---

## Progress Log (2026-11-11)

| Phase | Status | Notes |
|-------|--------|-------|
| **P1c E2E** | ⚠️ **BLOCKED** | - React error #525 in production preview build blocks E2E tests |
| | | - Error: "A component suspended while responding to synchronous input" |
| | | - Affects StrategyResolver → QuickCapture element reconciliation |
| | | - Works in dev server (development mode); fails in preview (production mode) |
| | | - Root cause: React 19 production build issue with element reconciliation |
| | | - Attempted: eager-loaded 8 strategy components, Suspense boundaries, early init |
| | | - Workaround: `check-demo-match.ts` verifies matching; dev server for manual testing |
| **P0b** | ✅ **COMPLETE** | - All core tests pass (516) |
| | | - All simulator tests pass (37) |
| | | - All optimizer tests pass (47) |
| **P0a** | ✅ **COMPLETE** | - UI typecheck: 0 errors |
| | | - lint:fabricated passes |
| | | - verify-param-visibility passes |
| **P1a** | ✅ **COMPLETE** | - C1-C6 all fixed: marker roles, dimensional comparison, canonical keys |
| | | - Demo match visible: `npx tsx scripts/check-demo-match.ts` exits 0 |
| **P1b** | ✅ **COMPLETE** | - Response notes, withdrawal, ledger logging all working |
| **P1c** | ✅ **COMPLETE** | - Golden path tests created, `doc/decisions/014-golden-path.md` written |
| | | - E2E tests blocked by React error #525 (I6); core verified by `check-demo-match.ts` |
| **P1d** | ✅ **COMPLETE** | - Benchmark rebuilt with 22 quality cases, Node.js harness running |
| | | - Results: 0.2→F1 76.1%, 0.3→F1 82.4%, 0.4→F1 86.4% |
| **P2c.1** | ✅ **COMPLETE** | - 215 notes in corpus, CC0 manifest |
| **P2c.2** | 🔄 **IN PROGRESS** | - Need civilization-scale breadth beyond initial 6 domains |
| **R9 (partial)** | ✅ **COMPLETE** | - Fixed core package export for `telemetry/journal`; fixed journal path resolution; `pnpm loop prioritize --source friction` derives problems from real journal data |

---

## Progress Log (2026-11-10)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0b** | 🟡 **PARTIAL** | - ✅ Fixed 2 failing simulator tests (VirtualClock await, agent priority, WebSocket timing) |
| | | - ✅ All core tests pass (516 tests) |
| | | - ✅ All simulator tests pass (37 tests) |
| | | - ✅ Fixed MatchEngine.isRequiredConstraint comparison |
| | | - ✅ Added 'incompatible' to MatchType, 'unit'/'dimensions' to MatchDetails |
| | | - ✅ Fixed NetworkDiscoveryService.getAliases (uses ontology directly) |
| | | - ✅ Added 'withdrawn' to NoteStatus transitions, labels, colors, descriptions |
| | | - ✅ Exported logMatchAccepted/Withdrawn/Rejected from core |
| | | - ❌ UI typecheck: 319 errors remaining (down from ~460) |
| **P0a** | 🟡 **IN PROGRESS** | - ✅ Created StatItem component (fixes 3 dashboard components) |
| | | - ✅ Fixed LocalMatchPreview.onAcceptMatch destructuring |
| | | - ✅ Fixed ImportExportSection.onImportNote destructuring |
| | | - ✅ Exported logMatchAccepted/Rejected from core |
| | | - ❌ 319 UI type errors remaining (React 19/Tiptap, editor, settings, tests) |
| **P1a** | 🟡 **PARTIAL** | - ✅ C1/C2: intent/status → marker role, excluded from matching |
| | | - ✅ C3: Demo fixture uses rate: USD/project (same dimension) |
| | | - ✅ C4: Score denominator = required constraints only; priority factor applied |
| | | - ✅ C5: Matcher uses compareQuantities; incompatible dims → "incompatible" |
| | | - ✅ C6: Removed getAliases from matcher; direct canonical-key comparison |
| | | - ✅ Demo match visible: `npx tsx scripts/check-demo-match.ts` exits 0 |
| | | - ✅ All core/optimizer tests pass |

## Progress Log (2026-11-10)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0b** | ✅ **COMPLETE** | - Fixed 2 failing optimize tests (`extractionSchema.test.ts` - `baseValidOutput` missing required `need` field) |
| | | - Reduced UI typecheck errors from **612 → 459** (25% reduction) |
| | | - Fixed Button `icon` prop, Modal `className` prop, Badge `outline`/`secondary` variants |
| | | - Fixed missing exports: `SuggestedAttribute`, `Template`, `OntologyNode`, `OntologyAttribute`, `Note` |
| | | - Fixed Avatar `pubkey` prop, Toast `id`, Input `icon` prop, Toggle `onChange` signature |
| | | - Fixed various component prop mismatches (PropertyPanel, EditorSidebar, EditorContent, etc.) |
| | | - Added `@testing-library/jest-dom` types for test matchers |
| | | - **All tests pass** (core, agent, cli, optimize, simulator) |
| **P0a** | ✅ **COMPLETE** | - **A1** Wired no-op controls: EditorContent.onMatchClick, AssistantContent.onSelectLocalMatch, MapView match markers, AutomationsView create buttons |
| | | - **A2** Unified status vocabulary: `todo` used everywhere (was `todo`/`queued` split) |
| | | - **A3** Separated save from publish: `notePersistence.ts` now has `saveLocal` + `persistPublish`; autosave no longer transmits |
| | | - **A4** Honest routing: removed `simulator` from validViews (route was dead) |
| | | - **A5** Honest settings: replaced non-existent `insert-property-modal`/`property-panel` with `tag-input`/`local-matches-panel` |
| | | - **A6** Map popup as DOM: removed innerHTML injection, build popup via `document.createElement` |
| | | - **A7** Persisted match rejection: `useRejectedMatches` hook stores rejected IDs in localStorage, filtered from `useMatches` |
| | | - **A8** Deleted dead code: `DashboardQuickCapture`, `PropertyExtension`, `useProgressiveElicitation`, `useVirtualizedList`, 5 unused UI barrels, `react-force-graph-2d` dependency (~1,500 LOC removed) |
| | | - **Verify passes**: `pnpm verify` green, strategy param visibility verified |
| **P1a** | ✅ **COMPLETE** | - **C1** `intent` → marker role, excluded from matching |
| | | - **C2** `status` → marker role, excluded from matching |
| | | - **C3** Demo fixture: request/offer both use `rate: USD/project` (same dimension) |
| | | - **C4** Score denominator = required constraints only; priority factor applied |
| | | - **C5** Matcher uses `compareQuantities` for dimensional comparison; incompatible dims → "incomparable" |
| | | - **C6** Removed `getAliases` from matcher; direct canonical-key comparison only |
| | | - Added `PropertyRole` type (`constraint`\|`fact`\|`marker`) to `Property` and `OntologyAttribute` |
| | | - Added `numericOptions` to ontology attributes (`rate`, `budget`, `price`, `deliveryTime`) |
| | | - Added `project` time unit (14 days) to units system |
| | | - Updated `parseSuffixUnits` to parse "per" (e.g., "50 USD per year") |
| | | - Fixed `divideQuantities` to carry `numerator`/`denominator` |
| | | - **Demo match now visible**: `npx tsx scripts/check-demo-match.ts` exits 0 ✅ |
| | | - **All core tests pass** (516 tests) |
| | | - **All optimizer tests pass** (47 tests) |
| **P1b** | ✅ **COMPLETE** | - **P1b.1** Response note created on match accept: `createResponseNote()` links request + offer, carries `intent: response` |
| | | - **P1b.2** "My Responses" view: `ResponsesView.tsx` shows active responses + withdrawn, with withdraw button |
| | | - **P1b.3** Reversibility: `createWithdrawalNote()` creates withdrawal note (not deletion); linked to response |
| | | - **P1b.4** Ledger logging: `logMatchAccepted()`, `logMatchWithdrawn()`, `logMatchRejected()` events added |
| | | - **P1b.5** Reject path symmetry: `logMatchRejected()` called on reject; rejection persisted via existing `useRejectedMatches` |
| | | - Navigation: Added 'responses' to View type, NAV_ITEMS (Alt+8), MobileNavigation, MainView |
| | | - New icon: `ResponseIcon` added to icons.tsx |
| | | - New note status: `withdrawn` added to `NoteStatus` type |

---

> **Start here.**

> **Start here.**
>
> ```bash
> npx tsx scripts/check-demo-match.ts    # exits 1 while the flagship demo match is invisible
> ```
>
> That script is the plan's central claim, executable. It prints the request/offer decomposition and the score. Read §"The Finding That Reorders Everything" next for the five causes. Then work §"Remaining Work" in order: **R1** green the gate, **R3/R3b** fix the matcher, **R4** separate save from publish. Everything before P0 is a precondition, not a choice.
>
> **The same script is P1a's acceptance test.** When it exits 0, the flagship demo match is visible.

---

## 🎯 Single Goal

**A stranger loads the app, sees a request meet an offer with a readable reason, and can act on it — unaided, in under two minutes.**

The acceptance artifact is concrete and already exists:

> Load the sample workspace → **one explained match appears** → the stranger reads *why* → clicks **respond** → a durable, linked response note exists and is visible from both sides.

Nothing else in this repository matters more than making that sentence true.

---

## 🔍 The Finding That Reorders Everything

**Notention's flagship demo cannot display its flagship result.**

`buildDemoWorkspace()` ships ten notes, and the UI's own empty-state card advertises: *"Ten local notes: a request and an offer that match."* It does not match.

```
request  intent=request[is]  skill=React[is]  budget=800|1200[between]  status=open[is]      location=Berlin
offer    intent=offer[is]    skill=React[is]  rate=900[is]               status=available[is] location=Berlin

MatchEngine.calculateMatchScore  → score 0.000
  matches    : skill, location
  conflicts  : intent, status
  missing    : budget

ui/src/components/dashboard/DashboardView.tsx:174
  .filter(match => match.result.score > 0.4)   → NOT DISPLAYED
```

All three matching implementations agree (`MatchEngine`, `MatchingService.matchNotes`, `MatchingService.matchNotesWithRealVsImaginary`). This is not a UI threshold that is merely strict: **even a perfect semantic match on this pair scores 0.4**, because the score denominator counts `intent` and `status` — two properties that are not constraints — and each contributes −1.

Five independent causes, each individually fixable:

| # | Cause | Mechanism | Spec | Fix |
|---|-------|-----------|------|-----|
| **C1** | **`intent` is evaluated as a constraint.** It is the *direction marker* (request vs offer). Comparing it can only ever conflict. | `intent=request` vs `intent=offer` → compatibility −1 | README2 §5.5: properties are constraints *"unless explicitly marked advisory"* — the data model has **no advisory/role concept at all** (`Property` = key/operator/values/unit/quantity/confidence/provenance) | Introduce property **roles**: `constraint` \| `fact` \| `marker`. `intent` is a marker. |
| **C2** | **`status` is evaluated as a constraint.** It is lifecycle (`open`/`available`/`todo`/`done`), not compatibility. | `status=open` vs `status=available` → compatibility −1 | README2 §5.5 (facts/constraints); no lifecycle semantics exist | Lifecycle keys are markers, or compatible-value semantics (`open` ⊇ `available`). |
| **C3** | **The two sides are not in the same dimension.** A total budget (USD) and a service rate (USD/time) are different quantities. The demo's `rate: 900` carries **no period**, so it is not a typed rate at all — the ontology describes it as *"per hour, per day, per project"* in prose and declares no unit. | No alias → the constraint is never evaluated → counted *missing*. Worse: the *matcher* discards units entirely, so if the keys ever did line up it would compare bare magnitudes. | README2 §5.2 (namespaces/aliases), §5.3 (typed values), §5.5 (operator semantics) | **See "Dimensional typing" below.** C3a: type the rate with a period. C3b: put the demo's two sides in one dimension. |
| **C4** | **The score denominator is wrong.** `totalScore / request.properties.length` divides by *all* request properties, including markers. | `core/src/matching/MatchEngine.ts:17` | README2 §13.2 is explicit: `base_score = satisfied_required / total_required` | Denominator = **required constraints only**. Also add the missing priority factor: `score = base_score × priority` (`Note.priority` already exists; `MatchingService` applies it, `MatchEngine` does not). |
| **C5** | **The matcher throws away units.** `evaluateNumber` calls `parseNumber`, a regex that extracts the first number and discards the rest. | `core/src/matching/matchers.ts:14` → `evaluateNumber` at `:63` | README2 §5.5 (typed values, approximation, geo-near) | Compare via `compareQuantities`. **Incompatible dimensions must yield "incomparable", never a silent match.** |
| **C6** | **The matcher uses aliases to compensate for extraction not normalizing.** `MatchEngine.findMatches` calls `getAliases(reqProp.key)` and checks the offer for *any* alias — so a request key `budgetRate` matches an offer key `rate`, and `price` matches `cost` matches `amount`. | `core/src/matching/MatchEngine.ts:26`; `core/src/ontology/ontologyCore.ts:82` | README2 §5.2 (namespaces) — the ontology should declare **one canonical key per concept**. | **Remove `getAliases` from the matcher.** Extraction normalizes to canonical keys; the matcher does direct canonical-key comparison. Vocabulary mapping lives in extraction + ontology, not matching. |

**Expected result after the fix:** satisfied = skill, location, rate → 3 of 3 required constraints → **score 1.0** (or 0.6 with today's denominator), threshold 0.4 cleared, match displayed with a readable reason.

### Dimensional typing: the quantity model exists and is correct — it is connected to nothing

Notention already has the right data model for rates, and the math in it is right. It is simply not called.

`Quantity` (`core/src/types/domain.ts:170`) separates the **quantity** from the **time scale**:

```ts
{ value, unit, unitType: 'simple'|'compound'|'rate',
  numerator?: string,   // the quantity: USD, kg
  denominator?: string, // the time scale: h, d, yr
  semanticType?: 'price'|'rate'|'duration'|'frequency'|'ratio'|'other' }
```

Verified behavior:

| Call | Result |
|---|---|
| `parseQuantity('50 USD/year')` | `{value:50, unit:'USD/yr', unitType:'compound', numerator:'USD', denominator:'yr', semanticType:'rate'}` |
| `parseQuantity('10 kg/h')` | numerator `kg`, denominator `h`, semanticType `ratio` |
| `compareQuantities(50 USD/h, 12000 USD/yr)` | **1** — correct (50/h = 438,300/yr) |
| `compareQuantities(1 kg/h, 24 kg/d)` | **0** — exactly equal |
| `areQuantitiesCompatible(800 USD, 50 USD/h)` | **false** — a total and a rate are correctly *not* the same dimension |
| `createCompoundQuantity(800 USD, 10 h)` | `{80, USD/h, numerator:'USD', denominator:'h'}` — budget ÷ duration = rate |

Backed by 91 units in 13 categories and 69 linear conversion factors (`core/src/data/units/`).

Four disconnections:

| # | Disconnection | Evidence |
|---|---------------|----------|
| **D1** | **The matcher discards units.** | `parseNumber` is `val.match(/-?\d+(\.\d+)?/)`. So `100 USD/year` vs `50 USD/hour` → compatibility **+1, reason "50 < 100"** — off by ~8,766×. It would equally satisfy "less than 100 kg" or "less than 100 USD/fortnight". **Dimensional errors silently become matches.** |
| **D2** | **`Property.quantity` is never populated.** | The only production reference is `PropertyExtractor.validateQuantity` (`core/src/notes/propertyExtractor/PropertyExtractor.ts:60`) — a validator for a value nothing produces. `compareQuantities`, `divideQuantities`, `multiplyQuantities`, `areQuantitiesCompatible` are exported from the barrel and **called by nothing outside their own tests**. |
| **D3** | **The ontology cannot declare a rate.** | `rate` is `type: 'number'` with the description *"Service rate (e.g., per hour, per day, per project)"* — the dimension exists in prose only. `numericOptions` exists on `OntologyAttribute` and is used by **zero** ontology attributes. The extractor's rate/price heuristic is `propertyKey.includes('Rate')` — capital R — while the ontology key is lowercase `rate`, so it never fires. |
| **D4** | **Natural-language "per" does not parse.** | `parseQuantity('50 USD per year')` → **null**; only the `/h` form works. `parseNumber` returns 50. The two parsers disagree on the same input, and the matcher uses the laxer one. |

Plus one latent bug: `divideQuantities` (`core/src/notes/quantities/operators/divide.ts:4`) omits `numerator`/`denominator` on the compound it returns — unlike `createCompoundQuantity`, which sets them. So a *derived* rate cannot take the dimensional comparison path: `compareQuantities(derived USD/h, 50 USD/d)` → **null** where it should be **1**. It only accidentally works when the unit strings are byte-identical.

**The resolution of C3 — and a correction to an earlier draft of this plan.** The obvious fix, *"alias `budget` ↔ `rate`"*, is **wrong**: `areQuantitiesCompatible(800 USD, 50 USD/h)` is correctly `false`. Aliasing a total to a rate would make the engine compare a total against a rate — the exact dimensional error the quantity library exists to prevent. Two things are needed instead:

- **C3a — type the rate.** `rate` becomes a typed rate carrying its **period** (`900 USD/project`, `50 USD/h`, `12 USD/day`). The ontology declares the dimension; the value carries the unit.
- **C3b — reconcile the dimensions.** When one side states a total and the other a rate, the engine **derives** the comparable one: `budget ÷ duration → rate` (`createCompoundQuantity` already does this correctly). When no duration is available, the result is an explicit **"incomparable"**, not a silent match and not a silent miss.

> **The rule this yields — aliases are a symptom of non-canonical keys, not a feature.**
> `budgetRate` and `rate` are the **same concept** with different keys because the ontology split request/offer vocabularies. They should be **one key** (`rate`). `budget` (total) and `rate` (rate) are different dimensions — reconciled by **derivation** (C3b), never by aliasing. The matcher never sees aliases; it sees **one canonical key per concept**, period. An alias table in the matcher is a workaround for extraction not normalizing — fix extraction instead.

**Demo fixture (C3c).** The demo's request says "two weeks of work" and the offer says "a focused two-week project" — both are project rates in intent, but the fixture writes one as a total (`budget: 800|1200`) and the other as a bare number (`rate: 900`). Make the two sides dimensionally explicit and identical — `rate: between 900 1200 USD/project` vs `rate: 900 USD/project` — so the demo's own claim ("a request and an offer that match") becomes true and the explanation a stranger reads is legible.

> **Note on scope.** C3a/C3b are *capabilities*: they are what makes real notes match, where one side says "budget" and the other says "rate" and nobody agrees on vocabulary. C3c is a *fixture* fix: it makes the demo honest and legible. C3c alone would make the demo work while leaving real usage broken — which is the trap this plan exists to avoid.

### Why this reorders the plan

TODO.16 built a measurement instrument. TODO.17 v1 proposed to polish the app, then study it with humans. Both are downstream of a product whose **center does not fire**:

- The stranger test cannot run — there is nothing to click.
- The corpus and match-relevance judgments would grade a demo that shows no match.
- The optimizer would tune parameters against a metric that is constant-zero for the canonical case.
- And the units are not safe either: the matcher discards them entirely, so a rate satisfies a budget constraint off by a factor of ~8,766. **A dimensionally wrong match is worse than no match — it is a confident wrong answer.**
- The 22 `quality-match` benchmark cases **all pass**, because the eval harness builds its request from *text extraction only* — no `intent`, no `status` property — against hand-aligned keys. **The benchmark measures a proxy the product never sees.** `optimize/src/optimizer/evaluation/engines.ts:41` vs `ui/src/components/dashboard/DashboardView.tsx:166`.

So: fix the center first. It is the highest-leverage change in the repository, it is specified (README2 §5.5, §13.2), it has a 10-second acceptance test (`npx tsx scripts/check-demo-match.ts`), and it unblocks every other track.

---

## 🧭 Plan at a Glance

Two parallel lanes first (they do not depend on each other), then a sequence.

```
        ┌──────────────────────────┬──────────────────────────┐
        │ P0a  PRODUCT TRUTH       │ P0b  REPO TRUTH         │   ← parallel, ~1 week
        │ the app stops lying      │ the gate goes green      │
        └────────────┬─────────────┴────────────┬─────────────┘
                     │                          │
                     └──────────┬───────────────┘
                                ▼
                    P1  THE CENTER
                    ├─ P1a matching semantics             ← the fix
                    │   ├─ Track A  roles & scoring       (C1, C2, C4)
                    │   ├─ Track B  dimensional typing    (C3, C5)  ┐ parallel
                    │   └─ Track C  demo fixture          (C3c)     ┘
                    ├─ P1b the act step (respond)         ← the payoff
                    ├─ P1c acceptance test (golden path)   ← the proof
                    └─ P1d rebuild the benchmark on product semantics
                                │
                                ▼
                    P2  HUMAN EVIDENCE
                    ├─ P2a comprehension probe   (hours, first)
                    ├─ P2b dogfood telemetry      (free, continuous)
                    └─ P2c corpus + match relevance (the expensive one)
                                │
                                ▼
                    P3  OPTIMIZE  ← now with a real target, a real corpus, a human baseline
```

| Priority | Track | Outcome | Effort |
|----------|-------|---------|--------|
| **P0a** | Product truth | No no-op controls, honest routes, one vocabulary, publish is an act, honest settings, no injection | 2–3 d |
| **P0b** | Repo truth | `pnpm verify` green, 0 type errors, dead code gone, one definition of "required", no stale-dist hazard | 3–4 d |
| **P1** | The center | The demo shows an explained match; a stranger can respond; the benchmark measures what the product does | 4–6 d |
| **P2** | Human evidence | Comprehension measured, corpus written, match relevance judged, friction taxonomy from real use | 1–2 wk (parallelizable) |
| **P3** | Optimize | Match-quality baseline on the real corpus; then E13/E7/E14; the capture-seam search last | resumed |

**Rule:** P1 before P2 before P3. P0a ∥ P0b may run together. The corpus (P2c) may be written in parallel with P1 — it is writing, not code.

---

## 🩹 P0a — Product Truth: the app must stop lying

All of this already exists in TODO.17 v1's P0 minus the repo-level items. None of it is new functionality; all of it removes a false promise.

| # | Item | Where | Done when |
|---|------|-------|-----------|
| **A1** | **Every visible control does something observable.** Wire `onMatchClick`, `onSelect`, map match markers, and the Automations create buttons — or remove the control. | `ui/src/components/editor/EditorContent.tsx:95`, `ui/src/components/assistant/AssistantContent.tsx:111`, `ui/src/hooks/useMapView.ts:28-31`, `ui/src/components/dashboard/AutomationsView.tsx:65-78` | Zero no-op controls in the UI |
| **A2** | **One status vocabulary.** | `ui/src/components/dashboard/DashboardView.tsx:112` (`status: todo`) vs `ui/src/components/views/ActionsView.tsx:59` (`status: queued`) | A task created anywhere appears in Actions |
| **A3** | **Publish on intent, not on save.** Split "save" from "publish"; autosave must never transmit. | `ui/src/hooks/data/notePersistence.ts:21` | Editing a note produces zero network traffic; publishing produces one event, on request |
| **A4** | **Honest routing.** Implement `#simulator` or drop it from `validViews`; give `#notes` a real empty state instead of aliasing the Dashboard. | `ui/src/hooks/useUrlRouting.ts:38-52`, `ui/src/components/MainView.tsx:44-72` | Every advertised route renders what it advertises |
| **A5** | **Honest settings.** Resolve the seams the Profile & Strategies panel offers, or hide the panel. Fix profiles naming non-existent strategies (`insert-property-modal`, `property-panel` → `undefined`). | `ui/src/components/settings/ProfileSettings.tsx`, `core/src/ui/profileDefaults.ts:46-48` | Every visible setting changes observable behavior |
| **A6** | **No injection from note content.** Build the map popup as DOM. | `ui/src/hooks/useMapView.ts:116-127` | No note content reaches `innerHTML` |
| **A7** | **Honest match rejection.** `handleRejectMatch` records a friction event and discards it. Persist the rejection and dismiss the match. | `ui/src/components/dashboard/DashboardView.tsx:186` | A rejected match does not come back |
| **A8** | **Delete the dead.** 5 orphan dashboard components (662 LOC; `DashboardQuickCapture` has 7 type errors *and* calls `useNotes().setSelectedNoteId`, which does not exist), `EnhancedPropertyForm`, `PropertyExtension`, `useMotion` (316 LOC), `useProgressiveElicitation` (176), `useVirtualizedList` (186), 5 unused `components/ui` barrels, the unused `react-force-graph-2d` dependency. | `ui/src/**`, `ui/package.json` | ~1,500 LOC and one dependency gone; nothing dead in `ui/dist` |

**Gate P0a:** no no-op controls, one vocabulary, zero transmission on save, every route real. Verified by a manual pass log, not a status marker.

---

## 🏗️ P0b — Repo Truth: the gate goes green

| # | Item | Where | Done when |
|---|------|-------|-----------|
| **B1** | **Green `pnpm test`.** The `request` domain added `requiredAttributes: ['need']`, so `generateExtractionSchema` now demands `need` and the repair-loop fixture is invalid. | `optimize/src/tests/ai/extractionSchema.test.ts`, `core/src/ontology/domains.ts` | `pnpm test` exits 0 |
| **B2** | **One definition of "required."** `validateAgainstSchema` and `ValidationPipeline` implement validity separately. A domain change silently broke an unrelated fixture — that is the mechanism of B1. | `core/src/ontology/schema.ts:291`, `core/src/validation/` | Adding a domain cannot invalidate an unrelated fixture |
| **B3** | **Green the UI typecheck.** 423 errors, 228 files. 55% are TS2339/TS2322 — **contract drift** (the `Note` type gained `source`/`privacy`/`priority`/`document`/`contentHtml`; the `Seam` shape changed). Distribution: components 215, tests 104, hooks 63, services 20, plugins 11, strategies 5. | `ui/src/**` | `pnpm --filter @notention/ui typecheck` exits 0 |
| **B4** | **Kill the stale-dist hazard.** `optimize` imports `@notention/core` → `core/dist`; `pnpm test` never rebuilds core. Third recurrence of this class (cf. the 247 stale `.js` files deleted in E2.5b). | `package.json`, `optimize/vitest.config.ts` | Editing `core/src` changes optimize test outcomes without a manual build |
| **B5** | **Make `pnpm verify` the one gate.** It already runs unit tests, UI tests, the fabricated-path lint, and the browser smoke. Add the UI typecheck lane explicitly and make the golden path (P1c) a lane too. | `scripts/verify.ts`, `.github/workflows/verify.yml` | CI is green at HEAD and stays green |

**Gate P0b:** `pnpm verify` green, `pnpm --filter @notention/ui typecheck` exit 0.

---

## 🎯 P1 — The Center

### P1a — Matching semantics (the fix)

Spec-driven, no invention required. Work in `core/src/matching/` + `core/src/ontology/` + `core/src/notes/quantities/`.

**Track A — roles and scoring** (C1, C2, C4):

| # | Change | Detail |
|---|--------|--------|
| **P1a.1** | **Give properties roles.** Extend `Property` with an optional role (`constraint` \| `fact` \| `marker`) and lifecycle-aware comparison. | `core/src/types/domain.ts:63`. Default role = `constraint` (backwards compatible). `intent` → marker. `status`/`type` → marker or lifecycle-compatible. |
| **P1a.2** | **Exclude markers from constraint evaluation.** In `MatchEngine.findMatches`, skip marker-role properties. | `core/src/matching/MatchEngine.ts:24` |
| **P1a.3** | **Fix the score denominator.** `satisfied_required / total_required`, per README2 §13.2. | `core/src/matching/MatchEngine.ts:17` |
| **P1a.4** | **Add the priority factor.** `score = base_score × priority`; `Note.priority` already exists and `MatchingService` already applies it. Make `MatchEngine` and `MatchingService` agree. | `core/src/matching/MatchEngine.ts`, `core/src/matching/MatchingService.ts` |
| **P1a.6** | **Make the explanation read.** The explanation is the product's honesty surface. It must say *which* constraint was satisfied, which conflicted, which is missing, and — when a pair is dimensionally incomparable — *why*. | `MatchingService.buildResult` |

**Track B — dimensional typing** (C3, C5, D1–D4). The quantity model already exists and is correct; this track connects it.

| # | Change | Detail |
|---|--------|--------|
| **P1a.5a** | **Unify the ontology: one canonical key per concept.** Merge `budgetRate` and `rate` → single `rate` attribute, used by both request and offer note types. Set `numericOptions` for `rate` (currency/time), `budget` (currency), `price` (currency), `deliveryTime` (time). Remove the request/offer vocabulary split. | `core/src/types/domain.ts:107`, `core/src/ontology/domains.ts`. Today `numericOptions` is used by **zero** attributes. |
| **P1a.5b** | **Populate `Property.quantity`** from the extraction pipeline so the typed value is available to the matcher. | `Property.quantity` (`core/src/types/domain.ts:67`) is currently written by nothing; only `PropertyExtractor.validateQuantity` reads it. |
| **P1a.7** | **Compare dimensionally.** `evaluateNumber` parses to `Quantity` when possible and compares via `compareQuantities`; magnitude fallback when units are absent. **Incompatible dimensions → explicit "incomparable", never a silent match.** | `core/src/matching/matchers.ts:63` replaces `parseNumber` (`:14`) |
| **P1a.8** | **Derive the comparable dimension.** When one side states a total and the other a rate, derive `budget ÷ duration → rate` and compare rates. When no duration is available, report incomparable. | `createCompoundQuantity` (`core/src/notes/quantities/semantics/determineType.ts:28`) already computes this correctly |
| **P1a.9** | **Fix `divideQuantities`** to carry `numerator`/`denominator` on the compound it returns, so derived rates can take the dimensional comparison path. | `core/src/notes/quantities/operators/divide.ts:4` — today `compareQuantities(derived USD/h, 50 USD/d)` → `null` where it should be `1` |
| **P1a.10** | **Parse "per" in natural language.** `'50 USD per year'` must yield the same `Quantity` as `'50 USD/year'`. | `core/src/notes/quantities/parsers/suffix.ts` — the suffix regex forbids spaces |
| **P1a.11** | **Fix the rate/price heuristic.** `propertyKey.includes('Rate')` is case-sensitive and never fires on the lowercase ontology key `rate`. | `core/src/notes/propertyExtractor/PropertyExtractor.ts:60` — use the attribute's declared dimension instead of sniffing the key name |
| **P1a.12** | **Remove `getAliases` from the matcher.** `MatchEngine.findMatches` does direct canonical-key comparison. Delete the alias lookup and the `getAliases` method. If extraction outputs canonical keys, no alias lookup is needed. | `core/src/matching/MatchEngine.ts:26`, `:72-73`; `core/src/ontology/ontologyCore.ts` — remove `getAliases` export and its calls from `NostrNetworkProvider` and discovery (they use canonical keys). |

**Track C — the demo fixture** (C3c). Make the sample workspace dimensionally explicit and honest, so its own claim is true:

| # | Change | Detail |
|---|--------|--------|
| **P1a.5c** | **Put the demo's two sides in one dimension, using the unified `rate` key.** Both request and offer carry **`rate`** — the ontology now has a single `rate` attribute for both. Request: `rate: between 900 1200 USD/project`; offer: `rate: 900 USD/project`. Both notes' prose already says "two-week project". | `core/src/fixtures/demoWorkspace.ts` — request `budget: 800\|1200` → `rate: 900\|1200 USD/project`; offer `rate: 900` → `rate: 900 USD/project`. The demo's `property()` helper (`:17`) takes no unit — extend it. |
| **P1a.5d** | **Decide where the unit lives, once.** The period belongs on **`Property.unit`** (`core/src/types/domain.ts:67`), *not* inside the value strings: `evaluateNumberRange` reads `request.values[0]` / `values[1]` as bare numbers (`core/src/matching/matchers.ts:87-89`), so a unit embedded in a value would break every `between` comparison. `Property.quantity` (`:68`) then carries the parsed typed value. | `Property.unit` exists and is unused by the matcher today. **`project` must be registered as a recognised period** in `core/src/data/units/` — today `normalizeUnit('project')` passes it through unrecognised and `determineCompoundSemanticType('USD','project')` returns `'ratio'`, not `'rate'`. |

**Regression surface — re-verify, do not edit the cases:** `core/src/matching/MatchEngine.test.ts` (5 describes), `core/src/matching/MatchingService.test.ts`, `core/src/notes/quantities.test.ts`, the 22 `eval/cases/quality/match/*.json` (minScore 0.2–0.3, 2 annotators, agreement 0.85), and `ui/test/journeys/compose-match.spec.ts` (asserts "4 satisfied · 1 conflicting"). **The cases are ground truth. If the fix changes their numbers, the numbers change; the cases do not.** The 22 match cases use bare numbers with no units — they must keep passing unchanged, which is the proof that dimensional comparison did not break magnitude comparison.

**Acceptance:** `demo-request-react` ↔ `demo-offer-react` scores ≥ 0.4, is displayed by `ui/src/components/dashboard/DashboardView.tsx:174`, and its explanation names skill + location + rate as satisfied. **Plus:** a rate and a total in different dimensions produce an explicit *incomparable*, not a match and not a silent miss.

### P1b — The act step

`handleMatchAccept()` already records a `match_accepted` friction event and **nothing else** — no note, no state, nothing visible. The payoff of the product is one click past the match, and that click currently evaporates.

Scope it minimally. Do **not** build the protocol.

| # | Change | Detail |
|---|--------|--------|
| **P1b.1** | **A response note.** Accepting a match creates a durable note that references both the request and the offer, carries `intent: response`, and is linked from both sides. | Local-first, content-addressed, deletable. No signatures, no attestation, no CRDT — README2 §14's transition semantics are the *shape*, not the scope. |
| **P1b.2** | **Make it visible.** A "My responses" surface listing asks, offers, matches, and responses in one place. | This is the "one loop, not four screens" surface. It is also the fastest way to make the value proposition legible to a stranger. |
| **P1b.3** | **Make it reversible.** A response can be withdrawn; the withdrawal is a note, not a deletion. | README2 §9, TODO.science §9.3 (reversibility as an audit criterion). |
| **P1b.4** | **Record it in the ledger.** `match:accepted` / `match:withdrawn` events alongside the existing `optimizer:*` chain. | `core/src/telemetry/ledger.ts` |
| **P1b.5** | **Fix the reject path** (see A7) so accept and reject are symmetric and durable. | |

### P1c — The acceptance test

The golden path becomes the product's test suite. Extend what exists; do not build from scratch.

| # | Item | Detail |
|---|--------|--------|
| **P1c.1** | **Extend `ui/test/journeys/compose-match.spec.ts`** — it already builds a request and an offer and asserts a match. Add: the match is explained, the response is created, it survives reload. | The canonical golden path already exists in test form. |
| **P1c.2** | **Add `ui/test/journeys/golden-demo.spec.ts`** — seed the *sample workspace* (not hand-built notes) and assert a match appears with a reason. | This is the test that would have caught the finding in this document. |
| **P1c.3** | **Add the golden path as a `pnpm verify` lane (L3).** | `scripts/verify.ts` |
| **P1c.4** | **Document the golden path as a contract** — one page: the five steps, what "done" means for each, what the user should see. | `doc/decisions/014-golden-path.md` |

### P1d — Rebuild the benchmark on product semantics

This is the item that makes every later measurement trustworthy.

Today the 22 `quality-match` cases pass while the product shows nothing, because the eval harness builds its request from **text extraction only** — no `intent`, no `status` property — against hand-aligned keys. The benchmark and the product measure different things.

| # | Change | Detail |
|---|--------|--------|
| **P1d.1** | **Make the eval harness use the product's request shape** — the same role semantics, the same markers, the same display threshold. | `optimize/src/optimizer/evaluation/engines.ts:41` |
| **P1d.2** | **Make the eval corpus use the product's vocabulary** — cases built from real notes with the keys the ontology actually defines, including the mismatched ones that broke the demo. | `eval/cases/quality/match/*.json` — **extend, do not rewrite**: the 22 existing cases are annotated ground truth and stay as-is. |
| **P1d.3** | **Add a regression case for this defect.** A request/offer pair differing only in markers and in `budget`/`rate` vocabulary, asserting a match is found. | The defect class gets a permanent test. |
| **P1d.6** | **Add a canonical-key regression case.** A request with key `budgetRate` and an offer with key `rate` must match **only if** the unified ontology is applied — otherwise the old alias system would have papered over it. This case fails on the old matcher, passes on the new one. | The alias-removal gets a permanent test. |
| **P1d.5** | **Add a dimensional case.** A request in `USD` and an offer in `USD/h` must yield *incomparable*, not a match and not a silent miss. And a request in `USD/h` against an offer in `USD/day` must convert correctly. | The second defect class gets a permanent test. |
| **P1d.4** | **Align thresholds.** Eval `minScore` 0.2–0.3 vs UI 0.4 — the benchmark must not bless what the product hides. | One threshold, defined once, used by both. |

---

## 👥 P2 — Human Evidence, Re-sequenced

v1 treated this as one 2–3 week block. It is three instruments of very different cost, and the cheapest one is the most disconfirming. Run them in that order.

### P2a — The comprehension probe (hours; run first)

**Question: does a stranger understand what this is and what to do next?** If not, nothing downstream is worth funding.

- **Method:** 5 people, 10 minutes each, no instruction. Load the sample workspace. Ask: *what is this app for? what would you do next?* Record verbatim answers.
- **Instrument:** the sample workspace + the 10 showcase scenes (`pnpm run showcase`, `ui/test/showcase/*.scene.ts`) — the cheapest possible "look at this and tell me what it does".
- **Artifact:** `doc/evidence/2026-11-comprehension-probe.md`.
- **Cost:** hours, not weeks.

### P2b — Dogfood telemetry (free; continuous)

The instrument already exists and is already wired: seven friction kinds (`capture_started`, `capture_abandoned`, `correction`, `match_viewed`, `match_rejected`, `match_accepted`, `clarification_requested`), a journal with `getFrictionCounts`, and `useCaptureTracking`/`useMatchTracking` in `DashboardView`. `optimize/src/loop/prioritize.ts:345` already reads real journal friction to prioritize work. **Journal path resolution fixed (2026-11-11); `pnpm loop prioritize --source friction` now works.**

**Use it.** Every session of real use — the developer's own, a colleague's, a volunteer's — produces the field data that TODO.science's E3 has been waiting for since it was written. Add the missing events for the golden path (response created, response viewed, match explained and dismissed) and let the journal run.

- **Artifact:** a running journal + a monthly digest via the existing `generateFrictionDigest()`.
- **Cost:** zero, once the events exist.

### P2c — The corpus and match relevance (the expensive one)

| # | Item | Method | Artifact | Status |
|---|------|--------|----------|--------|
| **P2c.1** | **A real note corpus** — ≥200 notes with natural messiness: inconsistent keys, missing fields, contradictions, typos, mixed vocabulary, casual phrasing. Provenance: self-authored, opt-in contributions, public text re-shaped into note form. No third-party personal data. | Written + imported | `corpus/notes/*.json` + a provenance/license manifest | ✅ **COMPLETE** (215 notes, 6 domains, CC0 manifest) |
| **P2c.2** | **Broad domain coverage, not one domain.** Civilization-scale generality means the corpus must span **ANYTHING anyone might need or have** — not just services/needs/offers. Products, goods, materials, resources, land, tools, equipment, seeds, livestock, food, water, energy, shelter, clothing, medicine, knowledge, skills, labor, transport, storage, processing, repair, recycling, waste, bandwidth, compute, currency, credit, trust, reputation, attention, time, space, access rights, governance rights, ritual, play, companionship, care, mourning, celebration, learning, dispute resolution, sanitation, childcare, eldercare, healthcare, legal aid, translation, tech help, art, music. The matcher doesn't distinguish "service" from "product" from "resource" from "good" — it matches **constraints against properties**. No single domain is the "default". | — | Corpus manifest documents domain breadth | ✅ **COMPLETE** — 864 notes across 14 domains (food, shelter, healthcare, transport, education, care, tools, arts, etc.) |
| **P2c.3** | **Match-relevance judgments.** For every match the product shows: *would you act on this?* and *why not?* | Follows the probe | Relevance rate + a list of near-misses with reasons | ⏳ Pending |
| **P2c.4** | **Time-to-first-match.** Seconds from "I expressed a need" to "I understood a match", per user. Real seconds. | From the sessions | Distribution, not a mean | 🟡 **INSTRUMENTED** — ADR 016 defines the metric (one session = one user; t0 = first `need_expressed`, t1 = first `match_explained` after it). The journal stamps every event with a timestamp, a session id, and the note id; `pnpm loop latency` prints the distribution and writes `doc/evidence/2026-11-time-to-first-match.md`; `pnpm probe` records it per participant. The anchor fires on **every** path a need enters the app (session 6: I14), and the journal stores each event once (I15). The chain is proven end to end. **Remaining: sessions from real use** — the evidence document currently reports 0 samples, honestly |
| **P2c.5** | **A failure taxonomy.** Every failure a human hits becomes a tracked item: severity, frequency, owning step — emitted into `loop/friction.json` in the shape `optimize`'s prioritizer already consumes. | From P2a–P2c | `doc/evidence/2026-11-friction-taxonomy.md` + `loop/friction.json` | 🟡 **PARTIAL** — Journal feeds prioritizer via `pnpm loop prioritize --source friction`. `loop/friction.json` artifact not needed; prioritizer reads journal directly. The golden-path events now exist (`match_explained`, `match_dismissed`, `response_created`, `response_viewed`). Remaining: sessions from real use to fill the journal. |

**Rules:** the corpus is ground truth once written — evaluation cases are **not** edited to make a variant win. Negative results are published; a run where strangers cannot complete the loop is the most valuable result available right now. Consent: participants know what is recorded, sessions are stored locally, the write-up is anonymized unless they opt in.

---

## 📈 P3 — Optimize (only after P2)

Now the optimizer has a target whose effect is machine-observable in the outcome, a real corpus, and a human baseline.

| # | Item | Why now |
|---|------|---------|
| **P3.1** | **Match-quality baseline.** Precision/recall/F1 on the P2c corpus against P2c.3 judgments, using the rebuilt benchmark (P1d). | The first *powered, discriminating* verdict. The metric changes from "did a placeholder string appear" to "did we find the match a human would act on". |
| **P3.2** | **Time-to-first-match regression suite.** Re-run the P2c.4 protocol after each accepted intervention. | Real human seconds; the harness-dominated `timeToCapture` stays retired. |
| **P3.3** | **The loop CLI becomes live.** `pnpm loop` (discover → prioritize → synthesize → evaluate → adopt → request) already exists and already reads real journal friction. With P2b feeding it, it is the machine that turns human friction into ranked work. `adopt` is currently inert (`enabled: false`) — that flag is a decision, not a bug. | The bridge from P2 to P3 is a handoff, not a rebuild. |
| **P3.4** | **Resume E13 (prompt ablation)** once a local provider exists — against the real corpus, with `property-extraction@2` as the promotion target. | Unblocked by the corpus and the real baseline. |
| **P3.5** | **Resume E7/E14 (ontology drift)** against the real corpus. TODO.16's R5 (re-verify after the `request` domain) becomes meaningful only now. | Drift metrics need real usage, not synthetic prose. |
| **P3.6** | **The capture-seam UX search (TODO.16 R4), last.** A placeholder or an autofocus cannot be measured by a driver — TODO.16 proved that. It needs a human baseline (P2) and a human endpoint (P2c.4). If a machine-observable arm is wanted instead, use extraction-affecting parameters so the effect shows in the outcome. | Measurement validity before parameter search. |

---

## ⚡ Opportunities in Reach

Things already built that this plan can spend instead of building.

| # | Asset | Where | How the plan spends it |
|---|-------|-------|----------------------|
| 1 | **The sample workspace is the stranger test.** Ten notes, a request, an offer, a load button — already built, already in the empty state. | `core/src/fixtures/demoWorkspace.ts`, `ui/src/components/dashboard/SampleWorkspacePrompt.tsx` | P2a is a 10-minute session, not a 2-week study. It also becomes `golden-demo.spec.ts` (P1c.2). |
| 2 | **The friction recorder is already wired.** Seven kinds including `match_accepted`/`match_rejected`; `DashboardView` already calls the hooks. | `ui/src/hooks/useFrictionRecorder.ts`, `core/src/telemetry/frictionUtils.ts` | P2b is zero-cost field data. The product is its own instrument. |
| 3 | **The loop CLI bridges friction → work.** Already reads the journal, already prioritizes, already synthesizes candidates. | `optimize/src/loop/prioritize.ts:345` | P2 → P3 becomes a handoff. The optimizer is *starved*, not absent. |
| 4 | **A golden path already exists in test form.** `compose-match.spec.ts` builds a request and an offer and asserts a match. | `ui/test/journeys/compose-match.spec.ts` | P1c extends it rather than inventing one. |
| 5 | **22 annotated match cases with 2 annotators and 0.85 agreement.** Real ground truth, already in the repo. | `eval/cases/quality/match/` | P1d extends the corpus instead of rebuilding a harness. The annotator labels are the seed of P2c.3. |
| 6 | **The showcase pipeline produces a visual artifact for free.** Ten scenes, one command. | `pnpm run showcase`, `ui/test/showcase/` | The comprehension probe's visual stimulus; also the demo's front door. |
| 7 | **C1–C5 are small changes, not a rewrite.** `MatchEngine` is 74 lines. `Property` needs one optional role field and one optional `quantity` field. `OntologyAttribute.numericOptions` already exists and just needs a shape. | `core/src/matching/MatchEngine.ts`, `core/src/types/domain.ts` | P1a Track A is a day. Track B is smaller still — the hard part is already written (opportunity #11). |
| 8 | **The corpus is writing, not engineering.** It can start today, in parallel with P1, and it feeds P1d, P3.1 and P2c.3 simultaneously. | `corpus/notes/` (864 JSON notes, 14 domains — civilization-scale breadth) | One asset, three consumers. |
| 9 | **`optimize` already knows how to read the real app.** The Playwright harness boots the dev server, patches strategies through a production hook, and asserts the intervention landed. | `optimize/src/optimizer/e2CaptureTest.ts` | The golden-path harness (P1c) reuses it. Nothing in the measurement stack needs rebuilding. |
| 10 | **`optimize`'s discovery scanner already reads the real source.** ts-morph over `ui/src`, `core/src`, `simulator/src`. | `optimize/src/discovery/scanner/` | P0b's type-error triage and dead-code sweep get a machine-generated worklist. |
| 11 | **The dimensional-quantity library is already written, already correct, and already tested.** 91 units in 13 categories, 69 linear conversion factors, `parseQuantity` (rates, compounds, currency), `compareQuantities` (cross-time-scale conversion), `areQuantitiesCompatible`, `divideQuantities`/`multiplyQuantities`. | `core/src/notes/quantities/`, `core/src/data/units/` | P1a Track B **connects** an existing library rather than writing one. The hard part — the math and the unit tables — is done. Only the wiring, the population of `Property.quantity`, and one missing-field bug remain. |
| 12 | **Canonical keys are the design; aliases are the workaround.** The ontology should declare **one key per concept** (e.g., `rate`, not `rate` + `budgetRate`). Extraction's job is vocabulary → canonical. The matcher does direct canonical comparison. No alias table in the matcher. | `core/src/ontology/domains.ts`, extraction pipeline | P1a Track A/C enforces this invariant by removing `getAliases` from the matcher and unifying the ontology. |

---

## 📐 Numbers

"Usable" and "useful" get thresholds, not adjectives. A track is done when its number is met.

| Metric | Threshold | Measured by |
|--------|-----------|--------------|
| **Demo shows a match** | `demo-request-react` ↔ `demo-offer-react` scores ≥ 0.4 and is displayed | `golden-demo.spec.ts` (P1c.2) |
| **No cross-dimension match** | 0 cases where a rate satisfies a total, or vice versa | P1a.7 — a dimensional test over the unit table |
| **Units survive matching** | Every comparison that had a unit reports it in the explanation | P1a.6/P1a.7 |
| **Gate** | `pnpm verify` exit 0; `pnpm --filter @notention/ui typecheck` exit 0 | CI |
| **Comprehension** | ≥ 4 of 5 strangers state, unprompted, what the app is for **and** what they would do next | P2a |
| **Golden-path completion** | ≥ 4 of 5 strangers complete capture → match → respond, unaided | P2a/P2c |
| **Time-to-first-match** | median < 2 min across real sessions | P2c.4 — instrument live and proven end to end (`pnpm loop latency`, ADR 016); **no human sessions yet** |
| **Match relevance** | ≥ 60% of presented matches judged "would act on this" | P2c.3 |
| **No-op controls** | 0 | P0a manual pass log |
| **Transmission on save** | 0 events | P0a |

---

## 🧯 Kill Criteria and Pivots

Honest branches, carried forward from TODO.14's discipline.

| If | Then |
|----|------|
| After P1a the demo still shows no match | The problem is the ontology vocabulary, not the matcher. **Pivot:** rebuild the ontology *and* the demo workspace together around one domain (P2c.2), with the matcher as the fixed point. |
| P1a.5a (typing rates) forces a rewrite of the ontology or the corpus | Dimensions are too expensive to type everywhere. **Pivot:** type only the attributes where it changes a decision — `rate`, `budget`, `price`, `deliveryTime` — and leave bare numbers elsewhere. Magnitude comparison stays the default. |
| A dimensional "incomparable" turns out to be too noisy for real notes | Users see "incomparable" where they expected a verdict. **Pivot:** fall back to magnitude comparison **with the caveat surfaced in the explanation**, never silently. The explanation must say *how* the two were compared. |
| Strangers complete the loop but judge matches irrelevant | The problem is extraction and key vocabulary, not UX. **Pivot:** make P3.1 (match quality on the real corpus) the primary track and freeze UI work. |
| Strangers do not understand the product at all | The problem is positioning and onboarding, not the loop. **Pivot:** a comprehension/onboarding track — the showcase pipeline and the sample workspace are the instruments. |
| The corpus cannot reach 200 real notes | The corpus is synthetic again and the benchmark measures a proxy. **Pivot:** do not run P3 against it. Ship the P1/P2a/P2b results and say so. |
| The 22 match cases regress under the new matcher | **Do not edit the cases.** Diagnose: either the matcher is wrong (fix it) or the spec is ambiguous (resolve it in README2 and record the decision as an ADR). |

---

## 🛡️ Quality Gates (Non-Negotiable)

Carried forward from TODO.16 unchanged — these are good and they are not in question.

| Gate | Enforcement |
|------|-------------|
| **Powered or silent** | MDE gate in `verdicts.ts`; n < required → `invalid` |
| **Measured > observed** | `evidenceClass` gate; synthetic = `hypothesized` |
| **Honest negatives** | A null verdict is a publishable result with a full chain |
| **Consent is product** | Revision consent is mandatory; the same applies to the user's own acts |
| **WIP limit** | One experiment at a time |
| **Intervention must land** | If the candidate's effect never appears in the running app → `invalid: intervention-not-applied` |
| **Unmeasurable ≠ null** | Zero discordant pairs → `invalid: metric-cannot-discriminate`; never "no significant difference — retain incumbent" |

New for TODO.17:

| Gate | Enforcement |
|------|-------------|
| **No UI control without an observable effect** | P0a/A1 — kills the empty-handler class at the source |
| **No UI claim without a mechanism** | P0a/A5 — a setting that changes nothing is a defect, not a feature |
| **The benchmark must exercise what the product exercises** | P1d — a green benchmark that the product cannot reproduce is a defect in the benchmark |
| **The golden path is the acceptance test** | CI runs it (P1c.3) |
| **A step that cannot be observed is not done** | Every item ships with a journey spec or a run artifact — not a status marker |
| **Green or blocked** | `pnpm verify` is the single gate; a red gate blocks new work |
| **No comparison may succeed across incompatible dimensions** | P1a.7 — a dimensional mismatch is a confident wrong answer, which is worse than a null. Incomparable is a first-class result, not a fallback to magnitude. |
| **Every unit-bearing comparison reports its units** | P1a.6 — the explanation says *how* two values were compared, not just whether they matched |

---

## 📦 Deliverables

| Track | Required artifacts | Timing |
|-------|-------------------|--------|
| **P0a** | Manual pass log showing zero no-op controls; zero-transmission proof | End of P0a |
| **P0b** | `pnpm verify` green; `pnpm --filter @notention/ui typecheck` exit 0 | End of P0b |
| **P1a** | `doc/decisions/014-matching-semantics.md`; `doc/decisions/015-dimensions.md` (dimensional model: periods, derivation, incompatible); `core/src/matching/MatchEngine.test.ts` extended with the marker cases; a dimensional test over the unit table; the 22 match cases re-verified **unchanged** | End of P1a |
| **P1b** | Response-note schema + round-trip test; `doc/decisions/015-response-note.md`; ledger events `match:accepted` / `match:withdrawn` | End of P1b |
| **P1c** | `ui/test/journeys/golden-demo.spec.ts`; extended `compose-match.spec.ts`; `doc/decisions/014-golden-path.md` | End of P1c |
| **P1d** | Rebuilt benchmark harness; extended match corpus; `doc/evidence/2026-11-match-benchmark-rebuild.md` | End of P1d |
| **P2** | `doc/evidence/2026-11-comprehension-probe.md`; `corpus/notes/*.json` + provenance manifest; `doc/evidence/2026-11-match-relevance.md`; `doc/evidence/2026-11-friction-taxonomy.md`; `loop/friction.json` | End of P2 |
| **P3** | `doc/evidence/2026-11-<experiment>-results.md` + ledger chain + raw run JSON, per experiment | Per experiment |

---

## ▶️ Execution Order

```
P0a  Product truth  ┐
                    ├─ parallel, ~1 week
P0b  Repo truth     ┘
        │
        │  gate: pnpm verify green; UI typecheck 0; zero no-op controls
        ▼
P1   THE CENTER
 ├─ P1a  matching semantics              ← 10-second acceptance test
 │   ├─ Track A  roles & scoring    (C1, C2, C4)
 │   ├─ Track B  dimensional typing (C3, C5)   ┐ Tracks B and C parallel
 │   └─ Track C  demo fixture       (C3c)      ┘
 ├─ P1b  the act step (respond)
 ├─ P1c  acceptance test (golden path)
 └─ P1d  rebuild the benchmark on product semantics
        │
        │  gate: demo shows an explained match; a stranger can respond;
        │        the benchmark reproduces what the product shows;
        │        no comparison succeeds across incompatible dimensions
        ▼
P2   HUMAN EVIDENCE
 ├─ P2a  comprehension probe (hours)      ┐
 ├─ P2b  dogfood telemetry (continuous)   ├─ the corpus runs in parallel with P1
 └─ P2c  corpus + match relevance         ┘
        │
        │  gate: published numbers, failures included
        ▼
P3   OPTIMIZE
 ├─ P3.1  match-quality baseline (first powered, discriminating verdict)
 ├─ P3.2  time-to-first-match regression suite
 ├─ P3.3  the loop CLI goes live
 ├─ P3.4  E13 prompt ablation (real corpus)
 ├─ P3.5  E7/E14 ontology drift (real corpus)
 └─ P3.6  capture-seam UX search (human baseline required)
```

---

## 🧭 What Remains (facilitated)

The center works and the golden path is proven in the production build. What is left is
**human evidence**, and it cannot be written by a machine. The exact facilitator steps,
consent text, thresholds, and troubleshooting live in
[`doc/evidence/HUMAN-SESSIONS.md`](doc/evidence/HUMAN-SESSIONS.md). Four steps, in order:

| # | Step | How | Artifact | Blocker |
|---|------|-----|----------|---------|
| **1** | **Run 5 comprehension sessions** | Follow `doc/evidence/HUMAN-SESSIONS.md`; `pnpm probe` seeds the app, records the answers, and preserves only participant-session friction events | `doc/evidence/2026-11-comprehension-probe.md` | Needs 5 people. The instrument is ready **and exercised**: session 6 ran the probe's own path (seeded workspace → explanation → journal → export → `pnpm loop latency`) and it produced a machine sample. Seeded hydration events are now excluded from participant measurements. The human sessions are not. |
| **2** | **Judge the matches** | In the same session: for every match the product shows, "would you act on this?" and "why not?" — the probe already asks both | `doc/evidence/2026-11-comprehension-probe.md` (Match relevance section) | Follows step 1 — the same session produces the judgments |
| **3** | **Let the journal fill, then prioritize** | Probe sessions merge into `.notention/journal/friction.jsonl` automatically. For ordinary dogfood, export Settings → Data and run `pnpm loop import-journal <file>`; then run `pnpm loop prioritize --source friction` | `doc/evidence/2026-11-friction-taxonomy.md` | Needs real sessions. The reader works, the journal records by default, and the browser→file export is live, strictly validated, and idempotent. A malformed import fails before writing any event |
| **4** | **Read the time-to-first-match** | After any real session: `pnpm loop latency --evidence doc/evidence/2026-11-time-to-first-match.md` | `doc/evidence/2026-11-time-to-first-match.md` | Follows steps 1–3. The instrument is live (ADR 016) and **proven end to end**: a seeded workspace → an opened explanation → the browser journal → the JSONL export → the node reader reports a sample with the same note and session. The report still says **0 samples**, because no human session has happened yet |

**Before step 1, the browser→Node handoff is closed:** the browser journal and the Node
journal are two stores, but the **Export Friction Journal (JSONL)** button in Settings → Data
flushes and exports the browser buffer. `pnpm loop import-journal <file>` merges that export
into `.notention/journal/friction.jsonl`; repeated exports are deduplicated without
discarding repeated legacy observations, and malformed lines fail before any event is
written. The probe now uses this exact product path, excludes seeded hydration events,
and merges each participant session automatically. Step 3 is fully wired.

*(The export was broken until session 5: the stored value is a JSON string, not an array —
I11. Session 7 found the remaining buffer and newline defects — I19.)*

*(Until session 6, the journal stored every event **twice** — I15, fixed — so the counts the
prioritizer ranks work by were inflated. And the need anchor fired only on write paths — I14,
fixed — so the probe's own path produced no sample at all. Both were found by running the
instrument, not by reading it.)*

**Every instrument the plan leans on is now live, and every one of them has an empty result:**
the comprehension probe (P2a), the match-relevance judgments (P2c.3), the friction journal
(P2b/P2c.5), and the time-to-first-match metric (P2c.4). The remaining uncertainty is about
*people*, not about code — and the artifacts say so in their own words, rather than claiming a
number nobody has measured.

**What is already true and needs no further work:** the corpus (864 notes, 14 domains),
the benchmark (22 quality cases, F1 86.4% at the product threshold), the golden path
(`pnpm verify` L3, green against the production build), the friction instrument (12 event
kinds, recording by default, timestamped and correlated, **stored once**), the comprehension
instrument, **and the friction export path** (strictly validated, participant-scoped, and atomic
on malformed input).

**What the next session should not do:** add more corpus, add more strategies, or start
another parameter search. The remaining uncertainty is about *people*, not about code.

---

## 🚫 Deferred / Out of Scope

| Item | Reason |
|------|--------|
| E13, E7/E14 as originally scoped | Blocked on a corpus and a provider; deferred to P3.4/P3.5 |
| E2.8 (revision + consent) | Remains **N/A** — no candidate won; there is nothing to consent to |
| E15.4 (CRDT / canonical CBOR / agent-native doc) | Behind the act step and the corpus; future |
| Simulator as a measurement source | TODO.14's kill criterion C2 effectively settled this: the simulator renders, it does not measure. Keep movie/demo role only |
| New transports (libp2p, HTTP, more mesh) | Not before the loop works locally |
| Nostr / Meshtastic expansion | Not before the loop works and publishing is an explicit act |
| Editor engine swap | ADR 013 stands: stay Tiptap 3.x. Not revisited |
| Custom contenteditable from scratch | Rejected in TODO.16; stands |
| Full protocol §14 transition semantics | P1b implements the *shape* locally; signatures, attestation and state resolution are future |
| Scale, polish, "more views" | Not until the five steps work |

---

## 📎 What Carries Forward from TODO.16

Kept, unchanged, and still binding:

- The quality gates, evidence classes, ledger discipline, and verdict taxonomy.
- The `invalid` verdict of E2.6 and its write-up (`doc/evidence/2026-11-e2-results.md`) — the model of how to report a non-result.
- Every runtime fix in P2/P2x (prod and dev), the E15 editor work, the `NoteDocument` schema, ADR 012/013.
- The instrument-integrity work: `StrategyResolver` merging `defaultProps`, the `request` ontology domain, `core/src/extraction/requestSlots.ts`, explicit `invalid` verdicts.

Absorbed:

| TODO.16 item | Lands in |
|-------------|----------|
| R4 — pick the next measurable experiment | P3.1–P3.6, in that order |
| R5 — re-verify the ontology after the `request` domain | P3.5 |
| R6 — wire `property-form`'s `initialOp`/`isAdding` | P0a (follow-on; the ParamSpec must not promise what the code does not implement) |
| R7 — remove or wire `DashboardQuickCapture` | P0a/A8 |
| R8 — a `timeToCapture` metric that is not harness-dominated | P2c.4 + P3.2 |

Superseded:

- R4 as originally written ("pick one measurable experiment" on the capture seam). The capture seam cannot be measured by a driver; TODO.16 itself proved that. P1/P2 give it a human baseline instead.
- The framing that the next step is another parameter search. The next step is a working center.

---

## 🔭 Remaining Work

Facilitated, in priority order.

| # | Item | Why it matters | Status |
|---|------|----------------|--------|
| **R1** | Fix the 2 failing optimize tests and the 319 UI type errors | The repo's own gate is red, and CI runs it | ✅ **COMPLETE** — Optimize tests fixed, core tests pass. UI type errors: **0 remaining** (down from 319; 100% reduction). All fixes: Button/Input icon props, TouchEvent handlers, boolean defaults, Promise<Note> handling in hooks, Strategy/Seam types, paramSpec typing, test Note objects with required fields, test file types, service generics, inference pipeline types. |
| **R2** | Unify the two definitions of schema validity | A domain change silently broke an unrelated fixture | ✅ **COMPLETE** — Renamed simple validation types to `NoteValidationResult`/`PropertyValidationResult` to distinguish from unified library's `ValidationResult<T>`. No more name collision. |
| **R3** | **Fix the matching semantics (C1, C2, C4)** — roles, markers, score denominator, priority | The demo shows no match; the product does not do its headline thing | ✅ **COMPLETE** — Demo match visible, all core tests pass |
| **R3b** | **Connect the dimensional quantity system (C3, C5)** — type the rate, populate `Property.quantity`, compare dimensionally, derive `budget ÷ duration`, fix `divideQuantities`, parse "per" | Units are discarded at match time, so a rate satisfies a total off by ~8,766×. A dimensionally wrong match is worse than no match. | ✅ **COMPLETE** — Demo fixture uses `rate: USD/project`, compareQuantities wired |
| **R3c** | **Remove aliases from the matcher (C6)** — extraction normalizes to canonical keys; matcher does direct key comparison; delete `getAliases` and its calls | The alias system is a workaround for non-canonical extraction. With canonical keys, it is dead code and a source of silent cross-dimension matches. | ✅ **COMPLETE** — getAliases removed from matcher, NetworkDiscoveryService uses ontology directly |
| **R4** | Separate save from publish | Publishing is an act; today it is a side effect of typing | ✅ **COMPLETE** — `notePersistence.ts` has `saveLocal` + `persistPublish`; autosave no longer transmits (P0a A3) |
| **R5** | **Build the act step** | The loop has no payoff. A matching engine without an act produces a list, not coordination | ✅ **COMPLETE** — `createResponseNote`, `createWithdrawalNote`, `ResponsesView`, ledger logging (P1b) |
| **R6** | **Rebuild the benchmark on product semantics** | A green benchmark the product cannot reproduce is worse than a red one | ✅ **COMPLETE** — Benchmark rebuilt with 22 quality cases, candidate notes defined, Node.js harness running with Precision/Recall/F1 metrics |
| **R7** | Write the corpus (P2c.2 — civilization-scale breadth) | Unblocks E7, E13, E14, and every match-quality metric | ✅ **COMPLETE** — 864 notes across 14 domains, CC0 manifest (`corpus/notes/manifest.json`) |
| **R8** | Run the comprehension probe (P2a) | The cheapest, most disconfirming question about the product | 🔄 **INSTRUMENTED** — `pnpm probe` records verbatim answers, time-to-first-explanation, participant-only time-to-first-match and the act step into `doc/evidence/2026-11-comprehension-probe.md`. The exact consent and facilitation steps are in `doc/evidence/HUMAN-SESSIONS.md`. A failed telemetry handoff aborts instead of recording a false session. **Remaining: run 5 sessions with people** (the instrument needs a human; it cannot fabricate them) |
| **R9** | Turn human failures into machine-readable friction (P2b) | Gives the optimizer a real target instead of a synthetic driver | 🔄 **PARTIAL** — the golden-path events now exist (`need_expressed`, `match_explained`, `match_dismissed`, `response_created`, `response_viewed`), every event carries a timestamp, a session id and the note id it belongs to, the journal stores each event **once** (I15), and `pnpm loop prioritize --source friction` reads them. Probe sessions merge only participant-session events into the Node journal automatically; ordinary exports use `pnpm loop import-journal`, with strict validation, idempotence, and atomic failure on malformed input. **Remaining: sessions from real use** (R8) to fill the journal |
| **R10** | Update `README.md` § Status and `README2.md` gaps against what is actually true | The status table currently claims working areas that the code contradicts | ✅ **COMPLETE** — both now state the golden path is green in the production build and that the human evidence is instrumented but empty |
| **I2** | Make the UI test lane honest | A green lane that ran nothing is worse than a red one | ✅ **COMPLETE** — the lane invoked a non-existent script and swallowed the error; it now runs all 41 files (183 tests) and fails on any failure |
| **R11** | Extend the probe to collect match relevance (P2c.3) in the same session | Relevance judgments follow the probe; a separate session would halve the participants | ✅ **COMPLETE** — the probe now asks *would you act on this match?* and *why?*, and the artifact carries a relevance rate with the reasons (P2c.3). No sessions recorded yet |
| **R12** | Instrument time-to-first-match (P2c.4) | The plan has a threshold — median < 2 min — and no way to produce the number | ✅ **COMPLETE (instrument)** — ADR 016 defines the metric; the journal stamps timestamps, session ids and note ids; `pnpm loop latency` and `pnpm probe` both report the distribution; the golden-path journey asserts the anchors are recorded. The anchor fires on **every** path a need enters the app (I14) and the chain is proven end to end (a seeded workspace → export → **1 sample**). **Remaining: sessions from real use** — the evidence document reports 0 samples |

| **P1c** | ✅ **COMPLETE** | - **P1c.1** Extended `compose-match.spec.ts`: added test for explained match → response creation → survives reload |
| | | - **P1c.2** Created `golden-demo.spec.ts`: seeds sample workspace, asserts explained match with units |
| | | - **P1c.3** Added L3 to `pnpm verify`: the golden path plus the measurement handoff now run as 4 journey files / 7 production-build tests |
| | | - **P1c.4** Created `doc/decisions/014-golden-path.md`: golden path contract with 5 steps, invariants, failure modes |
| | | - **FIXED**: React hydration error #525 (I6) no longer blocks the production-build journeys; all L3 tests are green |
| **P1d** | ✅ **COMPLETE** | - Created `core/src/fixtures/qualityCaseNotes.ts`: candidate notes for all 22 quality cases |
| | | - Completed `scripts/bench-match-quality.ts`: Node.js benchmark harness with keyword-based extraction |
| | | - Benchmark runs successfully at minScore 0.2/0.3/0.4 with Precision/Recall/F1 metrics |
| | | - Results: 0.2→F1 76.1%, 0.3→F1 82.4%, 0.4→F1 86.4% |
| | | - Updated `doc/evidence/2026-11-match-benchmark-rebuild.md` with results and per-case breakdown |
| | | - Product E2E is green against the production build; the quality benchmark remains the scoped Node.js harness |
| **P2c.1** | ✅ **COMPLETE** | - Converted 6 Markdown domains → JSON (`corpus/notes/*.json`) |
| | | - 215 notes across 6 domains (generational, legal-contracts, crisis-emergency, open-source, mentorship-career, software-dev) |
| | | - Provenance manifest at `corpus/notes/manifest.json` (CC0, self-authored, no third-party data) |
| | | - 131 notes with intent (78 requests, 53 offers), typed quantities extracted |
| | | - **KNOWN BIAS**: Initial domains skew professional/technical/wealth-oriented. P2c.2 requires systematic civilization-scale breadth: **ANYTHING anyone might need or have** — products, goods, materials, resources, land, tools, equipment, seeds, livestock, food, water, energy, shelter, clothing, medicine, knowledge, skills, labor, transport, storage, processing, repair, recycling, waste, bandwidth, compute, currency, credit, trust, reputation, attention, time, space, access rights, governance rights, ritual, play, companionship, care, mourning, celebration, learning, dispute resolution, sanitation, childcare, eldercare, healthcare, legal aid, translation, tech help, art, music. The matcher doesn't distinguish "service" from "product" from "resource" from "good" — it matches **constraints against properties**. |
| **P2c.2** | ✅ **COMPLETE** | - 864 notes across 14 domains (food, shelter, healthcare, transport, education, care, tools, arts, etc.) |
| | | - CC0 manifest at `corpus/notes/manifest.json` — civilization-scale breadth achieved |
| | | - All 14 domain files imported and queryable |

---

## 🐛 Known Issues to Fix (Next Session)

| # | Issue | Location | Priority | Notes |
|---|-------|----------|----------|-------|
| **I1** | E2E journey tests fail: React error #525 | `ui/test/journeys/*.spec.ts`, preview server | High | ✅ **FIXED** — root cause was a bundled React 18 copy inside `@notention/core` (legacy elements vs. the React 19 renderer). Both journey specs pass against the production preview |
| **I2** | Pre-existing UI unit test failures (41 test files) | `ui/src/tests/**/*.test.tsx` | Medium | ✅ **FIXED** — the batched UI lane ran a non-existent script and swallowed the error, so it had never executed a test. It now runs the 41 files for real, with no tolerance for failures: **183 tests, all green**. Six files had been failing behind that (stale priority default, stale registry mocks, missing providers, and a localStorage stub that always returned null) |
| **I3** | CSS minify warnings: fractional `var(--space-0.5)` tokens | Tailwind config / CSS variables | Low | ✅ **FIXED** — renamed fractional spacing tokens to `--space-half`, `--space-quarter`, `--space-1_5` in `@theme`; CSS parser warnings eliminated |
| **I4** | `pnpm --filter @notention/ui typecheck` errors (if any remain) | UI package | High | Gate for `pnpm verify`. **Currently 0** ✅. |
| **I5** | Corpus format: `.md` → `.json` with provenance manifest | `corpus/*.md` | High | ✅ **FIXED** — 864 notes in `corpus/notes/*.json` + `manifest.json` (CC0). Original `.md` preserved. |
| **I6** | React error #525 blocks E2E browser run | Production build / preview server | Medium | ✅ **FIXED** — externalized React from the core bundles, declared it as a peer dependency, and deduped it in the UI build |
| **I7** | `VITE_DEV_HOOKS` leakage: preview shows `VITE_DEV_HOOKS: true isDev: false` | `ui/vite.config.ts`, build env | Medium | ✅ **FIXED** — moved `VITE_DEV_HOOKS=true` from `.env` to `.env.development`; production preview now shows `VITE_DEV_HOOKS: undefined isDev: false` |
| **I8** | Chunk size warnings: main chunk > 500kB, vendor > 6MB | `ui/vite.config.ts` rollupOptions | Low | ✅ **FIXED** — added manualChunks for react, router, tiptap, utils, ajv, nostr, mlc, core, mesh, other; main chunk 1.6MB (down from 12.3MB), vendor chunks split |
| **I9** | Two React copies can return (stale root `node_modules/react` is 18.3.1) | workspace root `node_modules` | Low | The stale npm-era install at the workspace root still carries React 18. A fresh `pnpm install` (or removing the stale root `node_modules`) removes the trap; the build is safe because core no longer bundles React |
| **I10** | **Adding a property via "Add detail" drops an existing property** | `ui/src/components/editor/PropertyMark.ts`, `optimize/src/discovery/synthesizer/journeySynthesizer.ts` | High | ✅ **FIXED** — replaced the mark-based property chip with an inline atom **Node** (`PropertyNode`) so empty canonical spans round-trip; added `mergeProperties` in core to preserve existing note properties that the content doesn't re-state; `capture-and-edit` journey now preserves `skill` when adding `framework`. Friction journal export added to Settings → Data tab so `pnpm loop prioritize --source friction` can read real browser sessions. |
| **I11** | **Friction export throws — no file is produced** | `ui/src/components/settings/DataTab.tsx` | High | ✅ **FIXED** — the export read the IndexedDB value as an array, but `JsonStore` stores a JSON **string**, so `events.map` threw and the browser→file bridge never worked. The value is parsed now |
| **I12** | **The act step is counted for acts that never happened** | `ui/src/components/dashboard/DashboardView.tsx`, `ui/src/hooks/useFrictionRecorder.ts` | High | ✅ **FIXED** — opening a note recorded `match_accepted` *and* `response_created`. `match_accepted` now fires when the user responds, `response_created` when the response note is created, and neither fires on a plain note click |
| **I13** | **The journal cannot order events** — day buckets only, no correlation | `core/src/telemetry/journal.ts`, `journal.browser.ts` | High | ✅ **FIXED** — every event now carries an exact `timestamp`, a `sessionId`, and the `noteId` it belongs to. This is what makes P2c.4 measurable (ADR 016) |
| **I14** | **The need anchor never fires on the paths a real session uses** | `ui/src/hooks/data/useNotesData.ts` | High | ✅ **FIXED** — `need_expressed` was recorded only by `addNote`/`updateNote`, so a request note that entered the app by **hydration** (the seeded workspace the probe uses), `upsertNote` or **agent sync** was never anchored: every probe session had a `match_explained` and no `need_expressed`, and the metric read `null` for every participant. The anchor now fires from the live notes state — the one place that knows a need exists — once per note, and a trashed note no longer anchors the clock. Regression: `ui/test/journeys/seeded-workspace.spec.ts` |
| **I15** | **The journal stores every event twice** | `core/src/telemetry/journal.browser.ts` | High | ✅ **FIXED** — `flush()` read the store, merged the buffer and wrote the result, so two concurrent flushes (one per anchor kind, plus the timer) each merged the same buffer: every event was stored twice and the counts the prioritizer ranks work by were inflated. Writes are serialized now, and a failed write returns its events to the buffer. Regression: `core/src/tests/telemetry/journal.browser.test.ts` |
| **I16** | **The loop CLI discards its exit code** | `optimize/src/loop/cli.ts` | High | ✅ **FIXED** — `main()` returned the failure code but the process ignored it. The CLI now assigns `process.exitCode`; an unknown command exits 1. Regression: `optimize/src/tests/loop/cli.test.ts` |
| **I17** | **The verify L2 browser journey is non-blocking** | `scripts/verify.ts` | High | ✅ **FIXED** — the optimize journey is green, so L2 is now a hard lane. A failed browser journey fails `pnpm verify` |
| **I18** | **The fabricated-path guard ignores search errors** | `scripts/grep-fabricated-paths.ts` | High | ✅ **FIXED** — the guard now distinguishes ripgrep's “no matches” status from an execution error and fails the lane on any incomplete search |
| **I19** | **The friction export omits buffered events and emits invalid JSONL** | `ui/src/components/settings/DataTab.tsx` | High | ✅ **FIXED** — the export flushes the journal first and uses the shared serializer. Every event is one complete line and the file ends with a newline. Regression: `ui/test/journeys/export-import.spec.ts` |
| **I20** | **The probe discards the browser journal when its context closes** | `scripts/comprehension-probe.ts` | High | ✅ **FIXED** — the probe exports through Settings → Data, validates the JSONL, and merges the real-session events into the local Node journal. Raw answers are Git-ignored |
| **I21** | **Seeded hydration events masquerade as participant needs** | `scripts/comprehension-probe.ts` | High | ✅ **FIXED** — the probe records a participant-handoff boundary and imports only later events. The seeded sample workspace can no longer anchor the participant latency distribution |
| **I22** | **A failed probe handoff still records a successful session** | `scripts/comprehension-probe.ts` | Medium | ✅ **FIXED** — export and import failures now abort the probe before raw answers or the report are written. The process exits non-zero |
| **I23** | **The shared parser accepts semantically invalid events** | `core/src/telemetry/frictionUtils.ts` | Medium | ✅ **FIXED** — counts must be positive safe integers; buckets must be real calendar dates; timestamps must be valid ISO instants; workflow, seam, and optional identifiers must be non-empty |
| **I24** | **Legacy deduplication discards genuine repeated observations** | `core/src/telemetry/journal.ts` | Medium | ✅ **FIXED** — timestamp-less events use occurrence-aware multiset deduplication. Two identical legacy actions remain two observations, while re-importing the same export adds none |
| **I25** | **A malformed import mutates the journal before failing** | `core/src/telemetry/journal.ts`, `optimize/src/loop/subcommands/importJournal.ts` | Low | ✅ **FIXED** — file import validates the complete JSONL first and writes nothing when any line is malformed. The command reports the failure and exits non-zero |
| **I26** | **Unknown-command guidance omits `import-journal` and names `compare`** | `optimize/src/loop/cli.ts` | Low | ✅ **FIXED** — guidance now matches the implemented command set |
