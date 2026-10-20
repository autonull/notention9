# TODO

Status: active plan. Decisions from review are recorded inline.

## Progress (2026-10-20)

Landed: Phase 0 harness and scripts; Phase 1 seeding/capture/fixtures and 13 showcase scenes with generated index; B navigation/trash/help/actions; A demo workspace and offline match; E structured details through one adapter; C core journeys; D publish preview, storage-error toast, provider status; F validated export/import with key stripping; G in-memory relay with standalone and `--relay` embedded hosts; README hero/gallery.

Remaining: 10 curated scenes; extraction-review UI; LM providers still emit bracket strings internally; discovery and relay-down journeys; offline/retry banners; full `ui` typecheck has pre-existing errors outside this work.

Notes for the next pass:

- Screenshot scenes are `ui/test/showcase/*.scene.ts`; `seed()` writes IndexedDB, `snap()` writes the PNG plus a JSON sidecar, and `ui/test/scripts/build-index.mjs` turns sidecars into `doc/screenshot/README.md` and `manifest.json`. Add a scene, not a bespoke script.
- `ui/index.html` installs a small `window.process` shim. Core/node-shaped dependencies leak `process` into the Vite bundle; removing the shim blanks the app.
- `TiptapEditor` previously read `editor` in an effect dependency before declaration, crashing every editor route. Keep the effect after `useTiptapEditor`.
- The relay uses port 7000 in tests and screenshots. Seed `settings.nostr.relays = ['ws://localhost:7000']`.
- Publish always opens the disclosure preview, then the network gate marks the note public. The journey generates a key at runtime.
- Still open: extraction-review surface (heuristic suggestions with accept/reject), LM provider outputs as property objects, two-context discovery, relay-down/retry, offline banner, remaining scenes (`matching/explanation`, `network/feed`, `chat/thread`, `map/pins`, `timeline/month`, `ontology/graph`, `editor/property-inspector`, `editor/template-selector`, `editor/publish-panel`, `actions`).



## Goal

1. `pnpm run screenshots` produces a curated set of PNGs in `doc/screenshot/`
   that show others what the system can do.
2. Screenshots are a showcase generator, not a test surface. They reuse seeding
   and fixture helpers, but carry no assertions, baselines, or CI coupling.
   Surfacing them to the test system is explicitly deferred.
3. Ship the selected product work: navigation/help correctness, an opt-in sample
   workspace, note-editor ergonomics, a working basic export/import, journey-level
   E2E, failure/trust UX, and a local relay for demos.
4. First-run principle: go straight into the app. If the app needs to be
   explained, it is not simple enough. No onboarding wizard.
5. Editor principle: nobody writes or sees bracket syntax. Optimize for ergonomics
   and elegance through embedded forms, popup widgets, heuristics, and optional
   LM assistance. Syntax is a hidden serialization detail, so it can change
   without changing the UI.
6. No LM is configured by default. The system is fully usable without one:
   structured controls and deterministic heuristics do the work. An LM is an
   optional capability the user explicitly enables.

## Decisions

| Topic | Decision |
| :--- | :--- |
| Harness location | `ui/test/` (Playwright config, fixtures, journeys, showcase scenes) |
| Screenshot purpose | Demonstrate capabilities to others; documentation and README material |
| Screenshot coupling | None now: no assertions, no visual baselines, no drift gate, no CI. Seeding/fixtures may be shared later |
| Screenshot scope | Curated, ~20–25 images; presentation quality, not every state permutation |
| In scope | B navigation/help, A sample workspace, E editor ergonomics, F basic export, C journey E2E, D failure/trust UX, G local relay |
| Next plan | IA simplification audit, mobile polish, richer export formats |
| Out of scope | Onboarding wizard, accessibility sweep, performance budgets, protocol work (README2 §4–§15) |
| First run | Straight into the app, local-only identity, no explainer. Sample data is opt-in from empty states |
| Editing | Syntax is hidden. Primary gesture: inline "add detail" plus a popover; slash command as a later alias |
| Serialization | The bracket format is an internal/import format only. Changing it must not require UI changes |
| LM | Unconfigured by default. Deterministic heuristics and forms work without it. Enabling local or remote LM is explicit and optional |
| Export | Basic working JSON export/import now; formats, signing, and canonicalization are deferred |
| Relay | One implementation, standalone or embedded in the agent. In-memory only; embedded host is opt-in via `--relay` |
| Screenshot docs | README hero plus a small gallery; full index under `doc/screenshot/` |
| Demo data | Local community, ~10 notes, stable IDs, frozen timestamps for photography |
| Trash | Manual permanent delete only. No automatic expiry |
| Publish preview | Human summary plus a collapsed raw event, for private and public notes alike |

## Current state (evidence)

- No Playwright config for the UI. Orphans: `ui/verify_ui.spec.ts` (hardcoded
  `5174`, writes PNGs to CWD), `ui/src/tests/visual/nostr-matching.spec.ts`
  (hardcoded `5173`, two pages in one context, needs live public relays),
  `ui/src/tests/visual/dashboard.spec.ts` (no config, writes to CWD).
  `simulator/src/tests/e2e/playwright.config.ts` is the only working setup;
  `ui/src/tests/tools/verify_simulator.py` is a third path.
- Root `package.json` lists a nonexistent `e2e` workspace; `pnpm-workspace.yaml`
  omits it. `.last-run.json` and an error-context directory are committed under
  `test-results/`.
- Persistence keys: `notention-notes` (`ui/src/hooks/data/useNotesData.ts:35`),
  `notention-settings-v2` (`ui/src/components/contexts/SettingsContext.tsx:20`);
  localforage defaults (`localforage` / `keyvaluepairs`).
- Export/import is close but broken:
  `ui/src/components/settings/ImportExportSection.tsx:159` restores settings to
  `notention-settings`, not `notention-settings-v2`, so a restore silently keeps
  old settings. Backup export includes the full settings object, including
  `nostr.privkey`, in a plaintext download. There is no single-note export.
- The app opens empty. `OnboardingModal`, `SetupWizard`, and
  `core/src/onboarding/OnboardingService.ts` are unreferenced. Kept for later;
  not part of this plan.
- `actions` and `trash` are valid `View` values and appear in
  `ui/src/utils/navigation.ts` / `useCommands.tsx`, but `MainView.tsx` handles
  neither, so both render blank. `ActionsView.tsx` exists but is unused; soft
  delete/restore exists in `useNotesData` but no trash surface is reachable.
- `isHelpOpen` is tracked and reset on `Esc`, but nothing renders it.
- Editing still exposes syntax:
  `ui/src/components/editor/GhostTextExtension.ts` rewrites natural-language
  input into visible `[key:value]` text, and `PropertyExtension` input rules
  parse bracketed text. `PropertyChip` already renders structured chips;
  `PropertyForm`, `InsertPropertyModal`, and `PropertyInspector` provide
  form/extraction pieces, but insertion remains text-driven.
- Publishing depends on public relays (`core/src/config/nostr.ts`), so it cannot
  be evaluated or photographed offline. `README.md` advertises `NOSTR_RELAYS` as
  a UI override, but only the agent reads it; the UI uses `settings.nostr.relays`.
- No CI configuration.

## Phase 0 — Consolidate test entry points

- [x] Create `ui/test/playwright.config.ts`, `ui/test/fixtures/`,
      `ui/test/support/`, `ui/test/journeys/`, `ui/test/showcase/`.
- [x] Add `ui/test/tsconfig.json` (extends `../tsconfig.json`, types
      `@playwright/test`, includes `test`) and an `ui` script `typecheck:test`.
- [x] Exclude `test/**` from Vitest discovery in `ui/vite.config.ts`
      (`configDefaults.exclude` currently does not, so Playwright files would be
      collected as unit tests).
- [x] Delete `ui/verify_ui.spec.ts`, `ui/src/tests/visual/nostr-matching.spec.ts`,
      `ui/src/tests/tools/verify_simulator.py`; fold anything useful into
      `ui/test/journeys/`.
- [x] Untrack `test-results/` and `simulator/src/tests/e2e/test-results/`; add
      both to `.gitignore`.
- [x] Add `ui/src/config/storageKeys.ts` with the persistence keys and consume it
      from `useNotesData`, `SettingsContext`, `ViewContext`, and the seeder.
- [x] Add scripts: root and `ui` `screenshots` + `test:e2e`; `relay` and
      `dev:demo` arrive with G.
- [ ] Add dependencies only as the editor work proves them (not needed for the delivered popup; Radix and chrono remain deferred): Radix popover/dialog
      for the add-detail and help surfaces; `chrono-node` behind a dynamic
      import. Do not add `cmdk` until `CommandPalette` is replaced.
- [x] Remove the phantom `e2e` entry from root `workspaces`.

## Phase 1 — Harness

```
ui/test/
  playwright.config.ts        # projects: journeys | showcase; webServer on fixed port
  tsconfig.json
  support/
    seed.ts                   # IndexedDB seeding via storageKeys
    settle.ts                 # wait for shell/fonts/frames; animation off; masks
    capture.ts                # snap(): viewport, path, manifest entry
    selectors.ts              # test ids and role/text fallbacks
  fixtures/
    workspace.ts              # notes/settings fixture builder
    routes.ts                 # abort external hosts; relay traffic goes to the local relay or a stub
  journeys/
    create-match.spec.ts
    publish.spec.ts
    chat.spec.ts
    persistence.spec.ts
    navigation.spec.ts
  showcase/
    states/                   # stage*() helpers: drive the UI to a named state
    dashboard.scene.ts        # stage + snap; no assertions
    notes.scene.ts
    editor.scene.ts
    matching.scene.ts
    network.scene.ts
    chat.scene.ts
    map-timeline.scene.ts
    ontology.scene.ts
    settings.scene.ts
    modals.scene.ts
    mobile.scene.ts
  scripts/
    build-index.mjs           # doc/screenshot/README.md + manifest.json
```

- `webServer` is an array: the UI build/preview on 4199 with
  `VITE_ENABLE_AGENT=false`, `VITE_LLM_SOURCE=none`, plus the standalone relay on
  7000. Network/chat scenes seed `settings.nostr.relays` with
  `ws://localhost:7000`. Preview is used because `VitePWA.devOptions.enabled`
  installs a service worker in dev.
- `use`: `serviceWorkers: 'block'`, `deviceScaleFactor: 1`,
  `colorScheme: 'dark'`, `reducedMotion: 'reduce'`. Desktop `1440x900`; mobile
  `390x844`. `trace` only for journeys. Use 1x PNGs to keep the repository
  reasonable; 2x is available on demand.
- `journeys` project: `testMatch: journeys/**/*.spec.ts`, assertions.
- `showcase` project: `testMatch: showcase/**/*.scene.ts`, no assertions beyond
  readiness; each scene drives the UI and calls `snap()`.
- The two projects share fixtures, seed helpers, and selectors. They do not share
  test bodies; screenshot scenes may stage the UI more deliberately than a
  journey.
- Test-system seam for later: each showcase scene is a `stage*()` state helper
  plus a capture call. When screenshots are wired into tests, assertions can wrap
  the same state helpers without changing the scenes or the fixtures.
- Photography determinism: fixed fixture IDs and timestamps, injected CSS
  disables animation/transition/caret, external requests aborted,
  `VITE_ENABLE_AGENT=false`, `VITE_LLM_SOURCE=none`. No LM is configured, so
  extraction scenes show deterministic heuristics rather than a model. Freezing
  `Date` is for readable timestamps, not for byte-identical output.
- Seeding writes IndexedDB before app load; no production test hooks. Settings
  seeded with `DEFAULT_ONTOLOGY`, `developerMode`, `theme`, `nostr.privkey: null`.
- `snap()` waits for `[data-ready]` on the shell, `document.fonts.ready`, and two
  animation frames. Use fixed fixture timestamps for readable relative times;
  mask only live indicators that carry no story (agent dot, relay latency).
- Directory hygiene: the showcase script empties `doc/screenshot/` before
  generating so renamed or retired scenes do not leave orphans.
- Naming: `doc/screenshot/<area>/<state>.png`; `manifest.json` records area,
  state, viewport, and description. `doc/screenshot/README.md` is generated from
  it. There is no baseline comparison and no required regeneration policy.

Commands:

```
pnpm run screenshots       # showcase project → doc/screenshot/**
pnpm run test:e2e          # journeys project
pnpm run test:e2e -- --ui  # debugging
```

## Phase 2 — Curated capture set

| # | File | State |
| :-- | :--- | :--- |
| 1 | `dashboard/populated.png` | stats, activity, recent notes, timeline widget |
| 2 | `dashboard/empty.png` | first run, sample-workspace affordance |
| 3 | `notes/list-selected.png` | list mode with editor open |
| 4 | `notes/grid.png` | grid mode, tag filter active |
| 5 | `notes/trash.png` | trash with restore affordance (after B) |
| 6 | `editor/property-chips.png` | prose with structured property chips, no visible syntax |
| 7 | `editor/add-detail.png` | popup widget for adding a typed property |
| 8 | `editor/extraction-review.png` | heuristic suggestions with accept/reject review, no LM configured |
| 9 | `editor/property-inspector.png` | inspector, validation, ontology hints |
| 10 | `editor/template-selector.png` | ontology-derived templates |
| 11 | `editor/publish-panel.png` | privacy choice, publish preview |
| 12 | `matching/results.png` | match list with scores |
| 13 | `matching/explanation.png` | satisfied/conflicting constraints |
| 14 | `network/feed.png` | public feed with events |
| 15 | `network/connect-identity.png` | no-key state |
| 16 | `chat/thread.png` | conversation with encrypted-message notice |
| 17 | `map/pins.png` | geographic notes + selected popup |
| 18 | `timeline/month.png` | calendar with events |
| 19 | `ontology/graph.png` | graph with selected node |
| 20 | `settings/networks.png` | provider status and relay management |
| 21 | `modals/command-palette.png` | palette with query |
| 22 | `modals/help.png` | shortcut and concept reference (after B) |
| 23 | `mobile/notes.png` | mobile list + navigation |

Optional if cheap: `network/local-relay.png` (after G).

Delivered now: `dashboard/empty`, `dashboard/populated`, `notes/list-selected`, `notes/grid`, `notes/trash`, `editor/property-chips`, `editor/add-detail`, `matching/results`, `network/connect-identity`, `settings/networks`, `modals/command-palette`, `modals/help`, `mobile/notes`.


Excluded from v1: simulator dashboard/movie frames, CLI TUI, agent MCP output.

## Sequencing

The showcase depends on UI work, so land it in this order:

1. Phase 0 plus the harness, with three pilot scenes (dashboard, notes, editor
   chips) to prove `pnpm run screenshots` end to end.
2. B: navigation, trash, help. Blank routes would otherwise be photographed.
3. E: editor ergonomics. The strongest images (`add-detail`,
   `extraction-review`, `property-chips`) depend on this; pilot scenes get
   re-staged afterwards.
4. A + F + G + the publish preview from D: sample workspace, working export,
   local relay, and the publish flow give the showcase a coherent story.
5. Complete the capture set, generate the index, and add the README hero plus a
   four-image gallery linking to the full index.

Risks and guardrails:

- Popover details remain design-uncertain: placement, keyboard flow, and how
  chips and prose stay legible together. Timebox variants; the inline gesture is
  fixed, the presentation is not.
- Scenes must stage real UI. No composited images, fabricated panels, or states
  the app cannot reach; if a state is not implemented yet, omit the capture.
- If E slips, publish the showcase with current chip/form states and mark it
  provisional. Screenshots are showcase material, not a release gate.
- Keep `stage*()` helpers free of assertions so later test wiring stays cheap.

## Dependency leverage

Already installed and underused:

| Package | Use it for | Avoids |
| :--- | :--- | :--- |
| `nostr-tools` (`verifyEvent`, `matchFilters`) | Relay validation/filtering; event verification | Hand-written NIP-01 checks |
| `@tiptap/suggestion`, `@tiptap/extension-floating-menu` | Property picker, slash alias, selection toolbar | Custom positioning and key handling (declare `suggestion` explicitly before use) |
| `zod` | Validating exports, imports, and extraction output | Manual guards |
| `date-fns`, `localforage`, `dompurify` | Formatting, persistence, sanitizing imported HTML | New storage/render dependencies |

Worth adding:

| Package | Why | Cost / condition |
| :--- | :--- | :--- |
| `@radix-ui/react-popover` + `@radix-ui/react-dialog` | Accessible anchoring, dismissal, focus trap for add-detail, chip editing, help | Adopt for new surfaces; migrate the custom `Modal` incrementally |
| `chrono-node` | Natural-language dates in "describe it" and quick capture | ~48 KB gzip; dynamic import only on the extraction path |
| `match-sorter` | Deterministic ranking for palette and note search | ~3 KB gzip; only if search quality is in scope |
| `cmdk` | Command/property picker keyboard and filtering behavior | ~15 KB gzip; only as a replacement for `CommandPalette`, not alongside it |

Do not add:

- A third-party relay (`@nostr-relay/core`, `nostrmini`, `memorelay`): 5–56
  downloads/week, 0.0.x or abandoned. A ~200-line relay on `ws` plus
  `nostr-tools` is smaller than the integration and audit surface.
- `msw`: Playwright's `page.routeWebSocket` covers stub/failure cases, and the
  local relay covers real protocol behavior.
- `dexie`: migration risk for no current query need. Keep localforage and add an
  explicit schema version when persistence changes.
- An AI SDK upgrade or a second AI stack: the agent already carries `ai` v3, the
  latest is v7, and property extraction needs a small prompt, not a framework.
  Keep one internal interface; no provider is configured by default.
- `compromise` / `wink-nlp`: size and accuracy do not beat deterministic
  heuristics plus an optional LM; `chrono-node` covers the date case.
- `react-day-picker`, `sharp`, `sonner`, icon-library migrations: real, but not
  code-reduction wins for this plan.

Future: `canonicalize` when signed export formats are designed,
`marked`/`turndown`/`juice` for Markdown/HTML import/export, and
`@axe-core/playwright` when accessibility enters scope.

## Phase 3 — Product work

### B. Navigation and help correctness

- [x] Add `trash` to `MainView` rendering `NotesView` with trash-sorted notes; expose
  entry from `DataTab ("Recently deleted")` and the command palette. Restore is
  one action; permanent delete is explicit and confirmed. No automatic expiry.
- [x] Wire `ActionsView` into `MainView` for `actions`; make "+ New Task" create a
  note through the same structured property path as the editor. If that is not
  wanted, remove `actions` from `navigation.ts` and `useCommands` rather than
  leaving a blank screen.
- [x] Implement a help surface driven by `isHelpOpen`: shortcuts, concepts, and a
  pointer that opens the "add detail" UI. Do not teach bracket syntax. Close on
  `Esc`; do not leave focus orphaned.
- Audit `ARCHITECTURE.md` drift (`SimulatorView.tsx`, `ui/plugins/`) and correct
  or implement.

### A. Sample workspace

- [x] `core/src/fixtures/demoWorkspace.ts`: `buildDemoWorkspace(now)` returning ~10
  notes with stable IDs and relative timestamps (requests, offers, event, tasks,
  person, marketplace item), geo coordinates, tags, mixed privacy. The same
  builder feeds Settings import, the empty-state CTA, and the showcase fixture.
- [x] `useDemoWorkspace()` in UI: merge demo notes into storage idempotently (by
  fixed ID), never overwrite user notes; expose "Load sample workspace" and
  "Remove sample data" from Settings → Data.
- [x] Empty states across Dashboard/Notes/Network link to "Load sample workspace".
  Do not preload sample data and do not add an onboarding wizard.
- [x] Showcase scenes use the demo builder, not hand-written notes.

### E. Note-editor ergonomics (no syntax exposure)

Direction, not a fixed design. Any interaction may win; the invariant is that the
user never authors or sees bracket syntax.

- [x] **Property insertion without text syntax.** The primary gesture is an inline
  "add detail" affordance next to the note (and a keyboard alias) opening a
  type-aware popover. A slash command can mirror it later. The popover offers
  ontology-backed key suggestions, comparison chosen from "is / at most / at
  least / between" rather than typed, and controls per value type (enum select,
  date/time picker, number + comparison, location picker, person picker, free
  text fallback).
- [x] **Structured chips as the primary representation.** Clicking a chip opens the
  same popup for editing; removal is a chip action, not text surgery. Raw
  bracket text is never rendered. Note previews, cards, and lists render prose
  and chips, never raw syntax.
- [x] **Serialization boundary.** Editor components operate on property objects and
  emit structured operations. One adapter turns those into the internal wire
  format and back on load/paste. No component constructs bracket strings, so the
  serialization format can change without touching the UI.
- [ ] **Optional LM assistance, off by default.** (forms and heuristics work; LM providers still emit bracket strings internally) No LM is configured on first run.
  Forms, chips, and deterministic heuristics must cover the full workflow. When
  the user explicitly enables a local (WebLLM) or remote provider, a "describe
  it" composer can propose properties. Show confidence and a per-property
  accept/reject diff; never mutate the note silently. Remote calls require
  one-time consent. LM output is structured property data, never bracket syntax.
  With no LM configured, nothing should initialize a model or call a provider.
- [x] **Replace syntax-producing input rules.** `GhostTextExtension` currently
  rewrites input into visible brackets, and `HybridEditor` inserts
  `[key:is:]` strings. Both must emit structured property nodes through the
  adapter. Keep bracket parsing for import/paste, but treat it as compatibility.
- [x] **Progressive disclosure.** Minimal default surface; ontology hints,
  validation, confidence, and explanations appear on demand.
- [ ] **Prove it.** (detail composition is covered; full request+offer via popover is not) Journeys must compose a request and an offer entirely through the
  inline add-detail popover, with a matching result, without entering bracket
  property syntax.
- Later experiments: slash command as a keyboard alias, embedded form blocks,
  selection toolbar, a right-hand detail panel, LM-first composition, and
  keyboard-only flows. Choose by usability, not doctrine.

### C. Journey E2E

- [ ] Compose a note through structured controls → match (detail composition covered; full request↔offer and no-LM assertion pending) against a sample offer →
  explanation contains satisfied/conflicting constraints. Repeat with no LM
  configured; assert no model or provider call occurs.
- [x] Basic export → clear storage → import → notes/settings/ontology/theme restored.
- [ ] Publish against the local relay: privacy gate (published state covered; discovery and relay-down pending), published state, discovery.
  Simulate relay-down/timeout separately to assert the failure path.
- [x] Chat identity/thread happy path and empty state.
- [x] Settings changes persist and take effect (theme, developer mode, relays).
- [x] Navigation: every `NAV_ITEMS` entry and palette destination renders content.

### D. Failure and trust UX

- [ ] Offline and relay-down banners with retry; (provider status landed in Network; banners not built) per-provider status in Network, not
  only the agent dot in `ConnectionStatus`.
- [x] Publish confirmation shows exactly what leaves the device: body, tags, hashed
  tags, with a summary and a collapsed raw event. Same disclosure for private and
  public notes. Distinguish "private" from "not transmitted".
- [x] Storage/quota errors and agent sync failures surface as actionable toasts.
- [x] Reconcile privacy claims by documenting reality: local storage is not encrypted
  at rest today, while README2 marks encryption as a normative target. README,
  README2, and UI copy must say this the same way.

### F. Basic export/import

Ship a basic working export; formats later. Keep the existing JSON shape unless a
bug forces a change.

- [x] Extract one `buildExportEnvelope()` / `readExportEnvelope()` helper so the UI
  and tests share validation. Include `version`, `notes`, and settings without
  secrets.
- [x] **Never export `nostr.privkey` by default.** Strip it from backups; if key
  backup is ever offered, make it a separate, explicit action with a warning.
- [x] Fix restore to write `notention-settings-v2` via `storageKeys.ts`; validate the
  envelope with `zod`; reject unknown or malformed input without overwriting.
- [x] Add single-note export from the editor menu using the already-supported
  `{id, content, ...}` import shape.
- [x] Keep CSV export as is.
- [x] Cover with a journey: export → clear storage → import → notes, settings,
  ontology, and theme restored; assert no private key appears in the file.

Signing, canonicalization, and alternative formats stay out of this plan.

### G. Local relay: standalone + embedded

One implementation, two hosts. A browser cannot accept WebSocket connections, so
the UI stays a client; the relay lives in Node.

- [x] **Shared core** (`agent/src/relay/NostrRelay.ts`): in-memory event store, NIP-01
  `REQ`/`EVENT`/`EOSE`/`CLOSE`, `OK`/`NOTICE`, generic `#<tag>` filters (including
  `#t` and `#property-secret`), `ids`, `authors`, `kinds`, `since`, `until`,
  `limit`; event size and subscription limits.
- [x] **Standalone host** (`agent/src/relay/start.ts`, exposed as
  `pnpm run relay -- --port 7000`): deterministic backend for tests and demos.
- [x] **Embedded host** (optional `--relay` in `agent/src/Server.ts`): a second
  `WebSocketServer` at `/relay` on the existing agent HTTP port. No extra
  process or port, and the URL is simply `ws://localhost:<agent-port>/relay`.
  Opt-in per run only; no settings toggle, no silent enable.
- [x] **Boundary:** bind `127.0.0.1` by default; `--host 0.0.0.0` must be explicit.
  In-memory only: no persistence, no NIP-42 auth. Document as a development,
  testing, and demo facility, not an internet relay.

Does this help testing? Yes, for a small integration layer:

- Real signing, filtering, discovery, and encrypted DM behavior across two
  browser contexts, instead of mocking WebSockets.
- Deterministic publish/failure/retry journeys against a known port.
- Keep unit tests on stubs. Only a few journeys should depend on the relay; it is
  slower than a stub and must not gate every test.

New use cases:

- One command (`dev:demo`) runs UI plus an agent-hosted local relay: a complete
  network with no public infrastructure.
- A "home relay" for your own devices on the same LAN, carrying notes between
  laptop, phone, and desktop. Deferred: in-memory only means events vanish on
  restart, so this use case waits for a persistence decision.
- Interop: other Nostr clients can publish to your local relay; a possible import
  channel for outside notes.
- Agent skills can target a known local relay, making automation deterministic
  and inspectable.
- Screenshots and demos have a believable feed without touching public relays.

Implementation notes:

- Prefer the embedded host for `dev:demo` (one agent process, one port) and the
  standalone host for Playwright `webServer`, where agent bootstrap is noise.
- `NOSTR_RELAYS=ws://localhost:7000` (or the agent `/relay` path) is seeded into
  `settings.nostr.relays` for the UI; the env var itself is agent-only today.
  Correct the README env table accordingly.
- Capture `network/local-relay.png`; document both hosts in README Quick start.

## Phase 4 — Next plan candidates

Selected during review; not implemented in TODO.1, but scoped so the next plan
starts from a concrete shape.

### H. IA simplification audit

- Apply the first-run principle: fewer top-level views, Notes as home, hide
  Network/Chat/Ontology until relevant or enabled.
- Reduce editor toolbar density; one primary action per surface.
- Remove or merge dead/duplicated navigation (`actions`, `trash`, `simulator`
  references) rather than adding more.

### I. Export formats (deferred)

- Basic JSON backup and single-note export ship in F. Do not design signing,
  canonicalization, HTML, or Markdown formats in this plan.
- If signed export returns: pin the envelope, canonicalization, key, and a
  recipient verification path before calling it a format.
- If HTML export returns: reuse the signed/JSON envelope and render it, rather
  than maintaining a second source of truth.

### J. Mobile polish

- Touch targets, bottom navigation, editor keyboard behaviour, safe areas.
- Verify the curated mobile screenshots alongside the desktop set.
- Remove desktop-only interactions that have no mobile equivalent.

## Acceptance criteria

- `pnpm install && pnpm run screenshots` produces the curated set in
  `doc/screenshot/` with an index, and the README hero/gallery references it. No
  public network, agent, external AI provider, or manual clicks. Nothing about
  tests, baselines, or CI is required.
- `pnpm run test:e2e` covers the journeys and fails on breakage.
- `pnpm test` (Vitest) does not collect Playwright files.
- No route in `NAV_ITEMS` or the command palette renders a blank view.
- First launch lands in the app with no wizard; an empty-state action loads the
  sample workspace and produces a visible match offline.
- A user can create, edit, validate, and remove properties entirely through the
  UI. No user-facing flow renders bracket syntax; parsing it remains for import
  and compatibility.
- Property objects cross one serialization adapter. No UI component constructs
  the internal syntax, so changing the format requires no UI changes.
- With no LM configured, the app is fully usable: no model loads, no provider
  calls, and structured controls plus deterministic heuristics cover the flow.
- Basic export/import works: JSON backup excludes the private key, restore uses
  the correct settings key, and a single note can be exported and re-imported.
- Publish flow is demonstrable against the local relay.

## Open decisions

Resolved: inline add-detail is the primary gesture; relay is in-memory and
embedded only via `--relay`; trash is manual-delete only; raw publish events are
collapsed but available for all privacy levels; README gets a hero plus a small
gallery; export is a basic working JSON path, with formats deferred; no LM is
configured by default.

Still open:

1. Home relay: accept demo-only for now, or schedule persistence and LAN use
   immediately after TODO.1?
2. Permanent delete safety: confirmation only, or a short undo buffer before the
   note is actually removed?
3. README gallery: which four images carry the story best?
4. Raw publish view: should copied/exported event JSON include the note body by
   default?
