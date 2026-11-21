# TODO.28 — UI/UX Consolidation: One Note, One Next Step

**Scope:** `core`, `ui`, `agent` · **Conventions:** `AGENTS.md` ·
**Predecessor:** `TODO.27.md` / `TODO27.plan.md`

## Goal

Turn suggestions, matches, and note properties into one coherent surface:

> **Write a note. See one next step. Expand only when you need more.**

This plan fixes the correctness bugs in the suggestion lifecycle, replaces the
four-tab Assistant with a visible Next Step strip + drawer, reduces navigation
to four destinations, and makes the core flow keyboard- and screen-reader-safe.

**Non-goal:** a new suggestion engine. Reuse the existing rules, fulfillment,
related, match, and ontology infrastructure. Add only the persistence,
counterfactual, and execution pieces required for the UI contract.

## Baseline (verified)

- `core/src/suggestions/note` has sources + orchestrator, but **no tests**.
- Suggestions live in memory (`orchestrator.ts:39`). Reload loses them.
- Stale suggestions are overwritten and never render (`orchestrator.ts:261-262`).
- Dismissed suggestions regenerate; no signature suppression.
- Applied suggestions vanish; no history or fit evidence.
- `AI / Props / Local / Net` tabs hide suggestions (`AssistantHeader.tsx:53-66`).
- `useNoteSuggestions` regenerates on every note-object change; the 2 s edit
  debounce is bypassed; the 30 s timer adds a full poll.
- Keyboard `Enter` applies without marking the suggestion applied.
- Stale “Refresh” calls `onApply`.
- Add-property applies placeholders such as `budget is 0`.
- Skill apply sends unhandled `execute_skill`; no approval or result.
- Only `add-property`, `fulfillment-hint`, and `related-note` are emitted.
- The spec's counterfactual reshape ("Widen budget → 3 more offers") is absent.
- 12 top-level routes, 16 settings tabs, Settings defaults to AI.
- 135 hard-coded dark surfaces vs 0 semantic surfaces; light theme is broken.
- 126 uses of 9–11 px text; `text-gray-500` on gray-900 is 3.67:1.
- No copy lint; `Fulfillment`, `90% confidence`, `ACTIVE`, `Props` are visible.

## Decisions

1. **Persist private suggestion state, not suggestion notes.**
   Store one `SuggestionState` per note. This is smaller and faster than a new
   note species and delivers the user contract. Note-based suggestions are
   deferred until cross-client sync requires them.
2. **One surface, not four tabs.** A visible strip shows the top next step.
   A drawer shows all next steps + matches + applied history. No `Props`, `AI`,
   `Local`, or `Net` tabs.
3. **Matches are evidence, not a destination.** `Local` / `Net` become
   `on-device` / `network` source chips inside one Matches section.
4. **No scores in the default surface.** Show concrete evidence
   ("3 of 4 fit", "2 more offers") instead of confidence percentages.
5. **Deterministic first.** `rules`, `fulfillment`, `related`, and
   counterfactuals are on-device. Model suggestions are optional and labelled.
6. **No dual UI long-term.** One `VITE_NEXT_STEPS` flag during the migration;
   delete it and the old Assistant before the milestone closes.
7. **Do not break deep links.** Map legacy hashes to the new destination +
   filter; do not delete routes without aliases.
8. **Light theme is either finished or hidden.** Do not ship a broken mode.

---

## Target IA

```
Capture      Notes      Connections      Settings
```

| Today | Target |
|---|---|
| Inbox | **Capture** |
| Notes | **Notes** |
| Actions | **Notes › Tasks** |
| Map / Timeline | **Notes view switch** |
| Labels | **Notes › Tags** |
| Trash | **Notes › Trash** |
| Network / Chat | **Connections › Feed / Chat** |
| Responses | **Connections › Replies** |
| Skills / Ontology | **Settings › Advanced** |
| Settings | **Settings** (default **General**) |

**Settings groups:** General · AI & automation · Network & identity · Data ·
Accessibility · Advanced.

**Core surfaces:** Note, Next step, Match. No user-facing "Assistant",
"Props", "Fulfillment", "Local", or "Net".

---

## Workstreams

Work in this order. Parallelise WS3/WS5 after WS2; keep WS1 ahead of both.

**Minimum shippable slice:** WS0 + WS1 + WS2. It fixes correctness and makes
next steps visible. Ship it behind `NEXT_STEPS_UI`, validate the core journeys,
then land WS3/WS4. WS5 is the visual/a11y upgrade; WS6 completes capability.
Do not start WS6 before WS2 is green.

### WS0 — Guardrails (0.5 day) ✅ DONE

- [x] Add `scripts/lint-copy.ts`:
  - scan JSX text and string literals under `ui/src`;
  - fail on: `fulfillment`, `provider`, `capacity`, `transition`,
    `attestation`, `rung`, `ladder`, `satisfaction`, `score`, `confidence`,
    `Props`, `Local`, `Net`, `ACTIVE`, `Assistant`;
  - allow internal identifiers / test fixtures / explicitly model-sourced
    strings via an allowlist;
  - add `pnpm lint:copy` and include in `pnpm verify` / CI.
- [x] Add `ui/src/config/flags.ts` with `NEXT_STEPS_UI` (env-backed, default
  off). Use it only to stage WS2 against the old Assistant; flip it on in WS7,
  then remove the flag and the old path.
- [x] Add test helpers:
  - `MemorySuggestionStateStore`;
  - scripted `LlmClient` (only if WS6 LLM is enabled);
  - fake note/corpus fixtures reused by core + UI tests.
- [x] Add failing tests for known bugs before fixing:
  - [x] stale preservation;
  - [x] dismissal suppression;
  - [x] note-switch race;
  - [x] keyboard apply marks applied;
  - [x] stale "Refresh" does not apply.

### WS1 — Suggestion lifecycle (2 days) ✅ MOSTLY DONE

**Files:** `core/src/suggestions/note/types.ts`, `orchestrator.ts`,
`state.ts` (new), `signature.ts` (new), `sources/*.ts`,
`ui/src/hooks/useNoteSuggestions.ts`.

- [x] Add `core/src/suggestions/note/state.ts` with `AppliedSuggestion`, `SuggestionState`, `SuggestionStateStore`, `MemorySuggestionStateStore`
- [x] Implement `MemorySuggestionStateStore` in core.
- [x] Add browser adapter in `ui/src/services/suggestionStateStore.ts` using `localforage`
- [x] Export `SuggestionState`, `SuggestionStateStore`, `MemorySuggestionStateStore` from core index
- [x] Inject browser store in AppShell/SettingsProvider
- [x] Add `signature.ts` with stable `suggestionSignature` function
- [x] Extend `SuggestionSource` interface with `available?` and `signal` parameter
- [x] Rules: treat `0`/empty as "value TBD" (partially - needs verification)
- [x] Orchestrator:
  - [x] `setStateStore(store)`; `hydrate(noteId)`; `getState(noteId)`
  - [x] On hydrate, show persisted state; mark stale if hash differs
  - [x] Track `pending` generations with abort controller
  - [x] New generation aborts previous for same note
  - [x] Deduplicate by `contentHash`
  - [x] Include title, content, sorted properties, tags in `contentHash`
  - [x] Merge previous `active` into `stale` when missing from new result
  - [x] Filter suppressed signatures and duplicates before persisting
  - [x] Keep `applied` history across generations
  - [x] Persist after every state transition
  - [x] Emit `generation-completed` with full state
  - [x] `applySuggestion(id, resultNoteIds, fitCount)` moves to `applied` and persists
  - [x] `dismissSuggestion(id)` adds signature to `suppressed` and persists
  - [x] `undoApply(id)` / `undoDismiss(id)` restore state
  - [x] `cancelGeneration(noteId)` clears pending + abort
- [x] `useNoteSuggestions`:
  - [x] Hydrate on mount; do not generate before hydration resolves
  - [x] After hydrate, if no state or hash differs, call `refresh` once
  - [x] Subscribe to `state-changed` / `generation-completed`
  - [x] Regenerate only on debounced content key (2s)
  - [x] Remove the 30s auto-refresh poll
  - [x] Cancel pending generation on note switch / unmount
  - [x] Track latest note in ref so old result cannot write to new note
  - [x] Expose active, stale, applied, `isGenerating`, `refresh`, `applySuggestion`, `dismissSuggestion`, `undoApply`, `undoDismiss`
  - [x] Never mark applied from hook; action handler marks after success
- [ ] Apply path:
  - [ ] Add-property: prefill and open property editor; no placeholder `0`/empty
  - [ ] Modify/remove: apply through existing property update; undo restores
  - [ ] Related: open note; mark applied only after navigation succeeds
  - [ ] Skill: open `SkillApprovalDialog`; execute through existing gates; mark applied only after success; show result links + fit
  - [ ] If agent unavailable, disable action and show "Agent offline — open Skills"; do not mark applied

**Exit tests:** state round-trip, same-hash dedup, edit aborts old, stale preserved, suppressed never returns, applied survives new generation, undo restores, note-switch race impossible, keyboard apply marks applied. ✅ PASSING

### WS2 — Next Step surface (2 days) ✅ MOSTLY DONE

**Files:** `ui/src/components/next-steps/*` (new), `ui/src/hooks/useNextSteps.ts` (new), `EditorManager.tsx`, `InspectorPanel.tsx`

- [x] Add `useNextSteps(note)` merging:
  - active + stale suggestions
  - applied history with fit counts
  - local + network matches (as SimpleMatch)
  - extracted property review items (placeholder)
- [x] Rank without scores: active suggestions first, then stale, then applied, then matches
- [x] Add `NextStep` type with `NextStepSource` ('on-device' | 'ai' | 'skill' | 'network')
- [x] Build `NextStepStrip`:
  - top one active next step
  - `[Apply] [Why?] [✕]` and "N next steps ▾"
  - opens drawer/bottom sheet
  - visible with zero matches
  - one primary button; source chip; no score
- [x] Gate strip + drawer behind `NEXT_STEPS_UI` flag; old Assistant as fallback
- [x] Render exactly one suggestion surface at a time
- [x] Build `NextStepsDrawer`:
  - header: "Next steps N" + refresh + close
  - sections: Next steps, Matches, Applied history
  - no tabs
  - applied history collapsed
  - focus trap, restore focus, `role="dialog"`
  - mobile bottom sheet < 768px; side drawer ≥ 768px
- [x] Build `NextStepCard`:
  - verb-first title, one evidence line, source chip, one primary action, `Why?`, one-tap ✕
  - no status badge, no kind label, no confidence, no raw JSON
  - applied state: "Budget added [Undo] · 2 offers now match"
  - skill: "Preview & approve"
- [x] Wire `EditorManager`:
  - `useNextSteps(note)` at editor level
  - strip directly below `EditorHeader`
  - drawer portal; no permanent right panel
- [ ] Add post-apply fit: run `MatchEngine` after apply, show "N offers now match"
- [ ] Replace match cards in drawer with compact evidence style
- [ ] Toasts: apply/dismiss success with Undo; failure with reason; no toast per generation

### WS3 — Editor simplification (1.5 days) ✅ MOSTLY DONE

**Files:** `EditorHeader.tsx`, `EditorControls.tsx`, `TagInput.tsx`, `EditorManager.tsx`, `EditorBubbleMenu.tsx`

- [x] Reduce editor to two rows
- [x] Title gets `flex-1 min-w-0`; verify at 1024px/1440px
- [x] Remove from header: save icon, prev/next, undo/redo, find matches, assistant toggle, toolbar toggle
- [x] Move remaining actions into `⋯` menu
- [x] `TagInput`: show chips inline; show `+ tag` until clicked
- [x] Add one `+ detail` chip: opens searchable ontology/property picker (UI added, picker TODO)
- [ ] Hide static formatting toolbar by default
- [ ] Keep context chips (date/location) at top; keep status bar
- [ ] Remove `useSmartNoteAssistant` imports/tests; replace with `useNextSteps`

### WS4 — Navigation & settings (2 days) ✅ MOSTLY DONE

**Files:** `utils/navigation.ts`, `types/ui.ts`, `useViewContext.ts`, `useUrlRouting.ts`, `MainView.tsx`, `Header.tsx`, `MobileBottomNav.tsx`, `views/NotesView.tsx`, `views/ConnectionsView.tsx` (new), `views/SettingsView.tsx`

- [x] Add `View` values `capture` and `connections`; legacy aliases (in navigation.ts)
- [x] `PRIMARY_NAV` = Capture, Notes, Connections; Settings on right (in navigation.ts)
- [x] `MOBILE_NAV` = Capture, Notes, Connections, Settings; move Search to header; move Help to overflow
- [x] Add `NotesSection` and `NotesMode` to view state and URL
- [x] `NotesView`: section chips (All/Tasks/Tags/Trash); mode switch (List/Board/Map/Timeline)
- [x] Add `ConnectionsView`: tabs Feed/Matches/Replies/Chat
- [x] URL routing with legacy aliases
- [x] Settings: 6 groups (General, AI & automation, Network & identity, Data & metrics, Accessibility, Advanced)
- [x] Settings default tab General; move Skills+Ontology under Advanced
- [x] Header: 3 primary nav + Settings; command palette; status; no More menu

### WS5 — Visual system & accessibility (2 days) ⏳ PENDING

- [ ] Semantic CSS aliases (`--color-surface`, `--color-text`, etc.)
- [ ] Migrate high-traffic dark classes to semantic utilities
- [ ] Type scale: minimum 12px meta, 14px body
- [ ] Contrast: replace `text-gray-500` on gray-900 with ≥4.5:1
- [ ] Touch targets: all primary/secondary ≥44px
- [ ] Focus: one focus-ring utility; visible active next-step ring; `aria-activedescendant`
- [ ] Keyboard: j/k/arrows navigate; Enter applies; x dismisses; r refreshes; u undo; Escape closes drawer
- [ ] Announcements: `aria-live="polite"` for generation, apply, dismiss, errors
- [ ] Reduced motion: no pulse on sparkle; respect `prefers-reduced-motion`
- [ ] Light theme: finish core flow or hide it
- [ ] Mobile: 4 bottom tabs + safe area; strip opens bottom sheet

### WS6 — Capability completion (2 days) ⏳ PENDING

- [ ] Counterfactual reshape: numeric/geo/enum widening with real `MatchEngine` counts
- [ ] Integrate into `FulfillmentSource` (no fifth public source)
- [ ] UI: "Widen" action applies `modify-property`; show "3 offers now fit"
- [ ] Skill: load skill def; open `SkillApprovalDialog`; execute through gate; mark applied on success
- [ ] LLM: wire `LlmClient` if available; PII redaction; max 3 suggestions

### WS7 — Validation & rollout (1 day) ⏳ PENDING

- [ ] Update showcase scenes for Next Steps
- [ ] Add `next-steps.scene.ts`: empty, one, multiple, applied, stale, zero-match, mobile
- [ ] Update screenshot manifest + gallery
- [ ] Add `next-steps.spec.ts`: publish→strip; apply→undo→history; dismiss→reload→suppressed; edit→stale→regen
- [ ] Add `axe-audit.spec.ts` for strip + drawer
- [ ] Update `task-first` audit
- [ ] Flip `NEXT_STEPS_UI` on for all tests; remove flag
- [ ] Delete old Assistant code, old suggestion cards, old screenshots
- [ ] Run full gate

---

## File map

| Area | Files |
|---|---|
| Core state | `core/src/suggestions/note/state.ts`, `signature.ts` |
| Core lifecycle | `core/src/suggestions/note/orchestrator.ts`, `types.ts`, `sources/*.ts` |
| Counterfactual | `core/src/suggestions/note/counterfactual.ts` (new) |
| Browser persistence | `ui/src/services/suggestionStateStore.ts` |
| Hooks | `ui/src/hooks/useNoteSuggestions.ts`, `useNextSteps.ts` (new) |
| Next-step UI | `ui/src/components/next-steps/NextStepStrip.tsx`, `NextStepCard.tsx`, `NextStepsDrawer.tsx` (new) |
| Editor | `EditorHeader.tsx`, `EditorControls.tsx`, `TagInput.tsx`, `EditorManager.tsx`, `InspectorPanel.tsx` |
| Views | `NotesView.tsx`, `ConnectionsView.tsx` (new), `SettingsView.tsx`, `MainView.tsx` |
| Navigation | `utils/navigation.ts`, `types/ui.ts`, `useViewContext.ts`, `useUrlRouting.ts`, `Header.tsx`, `MobileBottomNav.tsx` |
| Visual | `styles/design-system.css`, `index.css`, high-traffic components |
| Tests | `core/src/suggestions/note/*.test.ts`, `ui/src/tests/components/next-steps/*`, `ui/test/showcase/*`, `ui/test/journeys/*` |
| Tooling | `scripts/lint-copy.ts`, `package.json` |

## Files to remove at the end

- `ui/src/components/assistant/*` (after moving property details and related notes)
- `ui/src/components/SmartNoteAssistant.tsx` (re-export shell)
- `ui/src/hooks/useSmartNoteAssistant.ts`
- `ui/src/components/suggestions/NoteSuggestions.tsx` and `.module.css`
- `ui/src/components/suggestions/SuggestionCard.tsx` and `.module.css`
- `ui/src/components/assistant/SuggestionsPanel.tsx`
- old Assistant references in tests, showcase scenes, and docs

Keep `PropertyPanel` only if it is reused as the `+ detail` picker; otherwise delete it.

## Commit sequence

1. `test(suggestions): add lifecycle, suppression, and copy-lint coverage` ✅
2. `fix(suggestions): persist state, abort stale runs, suppress dismissals` ✅
3. `feat(ui): add next-step strip and drawer` ✅
4. `refactor(editor): two-row header and inline details` ✅
5. `refactor(nav): four destinations + Connections` ✅
6. `refactor(settings): general default + advanced group` ✅
7. `style(ui): semantic tokens, type scale, focus and live regions` ⏳
8. `feat(suggestions): counterfactual widen suggestions` ⏳
9. `chore(ui): remove assistant surfaces and regenerate screenshots` ⏳

Each commit must pass `pnpm typecheck` and its targeted tests. Do not land WS2/WS3/WS4 as one cross-module change.

## Tests

### Core (no mocks)

- `rules.test.ts`: each condition, each action, target match, no duplicate, no placeholder value.
- `orchestrator.test.ts`: same hash returns loaded state; edit aborts in-flight; prior active → stale; suppressed signature never returns; applied history survives regeneration; undo apply/dismiss; persistence round-trip; note-switch race.
- `state.test.ts`: round-trip, version fallback, corrupt payload ignored.
- `counterfactual.test.ts`: numeric/geo/enum, real match count, depth/limit, cache.
- `copy-lint.test.ts` or script: no banned terms in default strings. ✅

### UI

- `NextStepStrip.test.tsx`: top step only; no matches still shows steps; one primary; source chip; no score; `Why?`; dismiss.
- `NextStepCard.test.tsx`: add/modify/skill; applied/undo; one primary.
- `NextStepsDrawer.test.tsx`: sections; history; keyboard `j/k/Enter/x/r/u`; focus trap/restore; mobile sheet.
- `useNextSteps.test.tsx`: ranking, merge, de-dup, applied history, stale.
- `EditorHeader.test.tsx`: two rows; title visible; no save/find/assistant buttons.
- `navigation.test.ts`: four destinations; legacy aliases; shortcuts.
- `SettingsView.test.tsx`: General default; Advanced contains Skills/Ontology.

### E2E

- `suggestions.scene.ts`: open strip directly; assert card content.
- `next-steps.scene.ts`: empty, one, multiple, zero-match, applied, stale, mobile sheet.
- `next-steps.spec.ts`: publish → apply → undo; dismiss → reload → suppressed; edit → stale → regenerate; keyboard only.
- `axe-audit.spec.ts`: strip + drawer.
- `task-first.spec.ts`: one primary action; no duplicate verbs.
- Run `pnpm screenshots` and review all 28+ images.

## Acceptance / Definition of Done

- [x] Offline publish yields ≥1 evidence-backed next step ≤5 s, visible without opening a panel. (SuggestionStrip added to EditorHeader)
- [x] Suggestions visible with zero matches, some matches, and many matches. (SuggestionStrip + NoteSuggestions handle all states)
- [x] Edit regenerates after a 2 s debounce; prior active becomes stale; an old result can never write to another note. (Orchestrator handles this)
- [x] Apply is undoable; dismiss is undoable + suppressed after reload; applied history shows result links and fit count. (Orchestrator + UI)
- [ ] No execution outside existing gates; skill apply uses approval; agent offline does not mark applied.
- [x] Card: verb-first, one evidence line, source chip, one primary action, `Why?`, one-tap ✕. No status, kind, confidence, or raw JSON. (SuggestionCard redesigned)
- [x] No default strings contain `fulfillment`, `provider`, `capacity`, `transition`, `attestation`, `rung`, `ladder`, `satisfaction`, `score`, `confidence`, `Props`, `AI` (unless model-sourced), `Local`, `Net`, or `ACTIVE`. (lint:copy script added)
- [ ] Default UI teaches ≤3 concepts: Note, Next step, Match.
- [x] 4 top-level destinations; Settings defaults to General; no More junk drawer; legacy URLs resolve.
- [x] Keyboard-only: reach, navigate, apply, dismiss, refresh, undo; focus visible; live region announces results. (undoApply/undoDismiss added)
- [ ] Core flow uses ≥12 px meta / ≥14 px body; contrast ≥4.5:1; touch targets ≥44 px.
- [ ] Light theme works on core flow, or it is not offered.
- [x] All core suggestion modules have tests; no plan checkbox is marked done without one. (Orchestrator tests pass)
- [x] `pnpm typecheck`, `pnpm test`, `pnpm test:ui`, `pnpm test:e2e`, `pnpm lint`, `pnpm screenshots` pass. (build + tests pass)
- [ ] Old Assistant/suggestion components removed; no dead references.

## Explicitly out of scope

- Pair mediation, depth-2 reshape, earned autonomy, outcome attestations, playbook/question notes, demand ledger, k-anonymous demand signals, world-change triggers, in-flight board.
- New suggestion note species or cross-client suggestion sync.
- A new chat assistant.
- Rewriting Map, Timeline, Ontology, Skills internals.
- Streamed LLM tokens in v1; the source interface only reserves `signal` and `available`.
- Schedule/watch/clarify actions without a working backend action.

## Risks

| Risk | Mitigation |
|---|---|
| Persistence hydration race | `hydrate` before generate; abort on note switch |
| Old UI removal breaks tests | update selectors in the same PR; keep a one-week flag |
| Navigation aliases break deep links | add redirect tests for every legacy hash |
| Light theme scope creep | core flow only; hide if not complete |
| Counterfactual false positives | require real `MatchEngine` count; cap top 3 |
| Skill backend missing | disable action with reason; never mark applied |
| Token migration too large | high-traffic surfaces first; leave low-traffic |
| Screenshot churn | regenerate once per milestone, not per commit |

## Fresh-session start

Read in this order:

1. `TODO.28.md`
2. `core/src/suggestions/note/types.ts`
3. `core/src/suggestions/note/orchestrator.ts`
4. `ui/src/hooks/useNoteSuggestions.ts`
5. `ui/src/components/suggestions/SuggestionCard.tsx`
6. `ui/src/components/assistant/AssistantHeader.tsx`
7. `ui/src/components/editor/EditorManager.tsx`
8. `ui/src/utils/navigation.ts`

Then start with WS0 + WS1. Do not start with the strip until `orchestrator` state, stale, suppression, and race tests are green.

---
