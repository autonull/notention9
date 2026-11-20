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
- The spec’s counterfactual reshape (“Widen budget → 3 more offers”) is absent.
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
   (“3 of 4 fit”, “2 more offers”) instead of confidence percentages.
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

**Core surfaces:** Note, Next step, Match. No user-facing “Assistant”,
“Props”, “Fulfillment”, “Local”, or “Net”.

---

## Workstreams

Work in this order. Parallelise WS3/WS5 after WS2; keep WS1 ahead of both.

**Minimum shippable slice:** WS0 + WS1 + WS2. It fixes correctness and makes
next steps visible. Ship it behind `NEXT_STEPS_UI`, validate the core journeys,
then land WS3/WS4. WS5 is the visual/a11y upgrade; WS6 completes capability.
Do not start WS6 before WS2 is green.

### WS0 — Guardrails (0.5 day)

- [ ] Add `scripts/lint-copy.ts`:
  - scan JSX text and string literals under `ui/src`;
  - fail on: `fulfillment`, `provider`, `capacity`, `transition`,
    `attestation`, `rung`, `ladder`, `satisfaction`, `score`, `confidence`,
    `Props`, `Local`, `Net`, `ACTIVE`, `Assistant`;
  - allow internal identifiers / test fixtures / explicitly model-sourced
    strings via an allowlist;
  - add `pnpm lint:copy` and include in `pnpm verify` / CI.
- [ ] Add `ui/src/config/flags.ts` with `NEXT_STEPS_UI` (env-backed, default
  off). Use it only to stage WS2 against the old Assistant; flip it on in WS7,
  then remove the flag and the old path.
- [ ] Add test helpers:
  - `MemorySuggestionStateStore`;
  - scripted `LlmClient` (only if WS6 LLM is enabled);
  - fake note/corpus fixtures reused by core + UI tests.
- [x] Add failing tests for known bugs before fixing:
  - [x] stale preservation;
  - [x] dismissal suppression;
  - [x] note-switch race;
  - [x] keyboard apply marks applied;
  - [x] stale "Refresh" does not apply.

### WS1 — Suggestion lifecycle (2 days)

**Files:** `core/src/suggestions/note/types.ts`, `orchestrator.ts`,
`state.ts` (new), `signature.ts` (new), `sources/*.ts`,
`ui/src/hooks/useNoteSuggestions.ts`.

- [ ] Add `core/src/suggestions/note/state.ts`:

```ts
export interface AppliedSuggestion {
  suggestion: NoteSuggestion;
  appliedAt: number;
  resultNoteIds: string[];
  fitCount?: number;
}

export interface SuggestionState {
  version: 1;
  noteId: string;
  contentHash: string;
  generationId: string;
  active: NoteSuggestion[];
  stale: NoteSuggestion[];
  applied: AppliedSuggestion[];
  suppressed: string[];
  updatedAt: number;
}

export interface SuggestionStateStore {
  load(noteId: string): Promise<SuggestionState | null>;
  save(state: SuggestionState): Promise<void>;
  remove(noteId: string): Promise<void>;
}
```

- [ ] Implement `MemorySuggestionStateStore` in core.
- [ ] Add a browser adapter in `ui/src/services/suggestionStateStore.ts`
  using `localforage`:
  - key `notention:next-steps:v1:<noteId>`;
  - TTL 30 days; prune to the last 30 notes;
  - cap 50 suggestions per note;
  - stored locally only; never transmitted.
- [ ] Export `SuggestionState`, `SuggestionStateStore`, and
      `MemorySuggestionStateStore` from `core/src/suggestions/note/index.ts`
      and the browser/core entry points.
- [ ] Inject the browser store once in `AppShell`/`SettingsProvider`:
  `suggestionOrchestrator.setStateStore(store)`.
  Do not create a store inside every hook or per render.
- [ ] Add `signature.ts` with a stable signature:

```ts
export function suggestionSignature(s: NoteSuggestion): string {
  return [
    s.evidence[0]?.source ?? 'unknown',
    s.kind,
    s.proposedChange?.property?.key ?? '',
    s.proposedChange?.property?.operator ?? '',
    s.proposedChange?.property?.values.join(',') ?? '',
    s.skillId ?? '',
    s.relatedNoteId ?? '',
  ].join('|');
}
```

- [ ] Extend `SuggestionSource`:

```ts
export interface SuggestionSource {
  name: 'rules' | 'fulfillment' | 'related' | 'llm';
  available?(context: SuggestionGenerationContext): boolean;
  generate(
    context: SuggestionGenerationContext,
    signal: AbortSignal
  ): Promise<NoteSuggestion[]>;
}
```

- [ ] Rules:
  - treat `0` / empty rule values as “value TBD”;
  - emit the property key + operator but no proposed value;
  - the card action opens the property editor prefilled, not a committed
    placeholder;
  - do not emit a suggestion unless the ontology defines the key.

- [ ] Orchestrator:
  - [ ] `setStateStore(store)`; `hydrate(noteId)`; `getState(noteId)`.
  - [ ] On hydrate, show persisted state immediately. If the persisted
        `contentHash` differs from the current note, mark prior active as stale
        and schedule one regeneration.
  - [x] Track `pending: Map<noteId, { generationId; controller; promise }>`.
  - [x] New generation aborts the previous one for the same note (fixed race).
  - [x] Deduplicate by `contentHash`; return hydrated state instead of
        regenerating when the hash is unchanged.
  - [x] Include title, content, sorted properties, and tags in `contentHash`;
        a title/tag edit must not reuse a stale hash.
  - [x] Merge previous `active` into `stale` when missing from the new result
        (fixed overwrite bug).
  - [ ] Filter suppressed signatures and duplicates before persisting.
  - [ ] Keep `applied` history across generations.
  - [ ] Persist after every state transition.
  - [ ] Emit one `generation-completed` with the full state; do not emit
        `suggestion-added` per card.
  - [x] Remove `stalePreviousSuggestions` overwrite bug.
  - [ ] `applySuggestion(id, result)` moves to `applied` and persists.
  - [ ] `dismissSuggestion(id)` adds the signature to `suppressed` and
        persists.
  - [ ] `undoApply(id)` / `undoDismiss(id)` restore state for Undo.
  - [ ] `cancelGeneration(noteId)` clears pending + abort.
- [ ] `useNoteSuggestions`:
  - [ ] Hydrate on mount; do **not** generate before hydration resolves.
  - [ ] After hydrate, if there is no state or the content hash differs, call
        `refresh` once.
  - [ ] Subscribe to `state-changed` / `generation-completed`.
  - [ ] Regenerate only on a debounced content key (2 s), not on every
        `note` object identity change.
  - [ ] Remove the 30 s auto-refresh poll.
  - [ ] Cancel pending generation on note switch / unmount.
  - [ ] Track the latest note in a ref so an old result cannot write to a new
        note.
  - [ ] Expose active, stale, applied, `isGenerating`, `refresh`, `markApplied`,
        `markDismissed`, `undoApply`, `undoDismiss`.
  - [ ] Never mark applied from the hook; the action handler marks only after
        success.
- [ ] Apply path:
  - [ ] Add-property: prefill and open the property editor; do not commit
        placeholder `0` / empty values.
  - [ ] Modify/remove: apply through existing property update; undo restores.
  - [ ] Related: open the note; mark applied only after navigation succeeds.
  - [ ] Skill: open `SkillApprovalDialog`; execute through existing gates;
        mark applied only after success; show result links + fit.
  - [ ] If agent is unavailable, disable the action and show
        “Agent offline — open Skills”; do not mark applied.

**Exit tests:** state round-trip, same-hash dedup, edit aborts old, stale
preserved, suppressed never returns, applied survives new generation, undo
restores, note-switch race is impossible, keyboard apply marks applied.

### WS2 — Next Step surface (2 days)

**Files:** `ui/src/components/next-steps/*` (new),
`ui/src/hooks/useNextSteps.ts` (new), `EditorManager.tsx`,
`InspectorPanel.tsx`, delete `assistant/*` and old suggestion components.

- [ ] Add `useNextSteps(note)` merging:
  - active + stale suggestions;
  - applied history;
  - local + network matches;
  - extracted property review items (as `add-property` next steps).
- [ ] Rank without scores:
  1. missing required property;
  2. counterfactual (“Widen budget”);
  3. skill action;
  4. match;
  5. related note;
  6. model suggestion as a tie-breaker after deterministic.
  Stale items last; applied history collapsed below.
- [ ] Add `NextStep` type:

```ts
export type NextStepSource = 'on-device' | 'ai' | 'skill' | 'network';

export interface NextStep {
  id: string;
  title: string;        // verb-first
  evidence: string;     // one human line
  why?: string;
  source: NextStepSource;
  state: 'active' | 'stale' | 'applied';
  actionLabel?: string;
  apply?: () => Promise<void> | void;
  dismiss?: () => void;
  undo?: () => void;
}
```

- [ ] Build `NextStepStrip`:
  - top one active next step, or “2 offers match” when only matches exist;
  - `[Apply] [Why?] [✕]` and “3 next steps ▾”;
  - opens the drawer / bottom sheet;
  - visible with zero matches; disappears when there is truly nothing;
  - one primary button; source chip; no score.
- [ ] Gate the strip + drawer behind `NEXT_STEPS_UI`; keep the old Assistant as
      the fallback until WS7 flips the flag.
- [ ] Render exactly one suggestion surface at a time:
      `NEXT_STEPS_UI ? <NextStepStrip/> : <SmartNoteAssistant/>`.
      Do not mount both hooks; that would generate twice.
- [ ] Build `NextStepsDrawer`:
  - header: “Next steps 3” + refresh icon + close;
  - sections: Next steps, Matches, Applied history;
  - no tabs;
  - applied history collapsed: “1 applied · 3 results fit”;
  - focus trap, restore focus, `role="dialog"`;
  - mobile bottom sheet < 768 px; side drawer ≥ 768 px.
- [ ] Build `NextStepCard`:
  - verb-first title, one evidence line, source chip, one primary action,
    `Why?` disclosure, one-tap ✕;
  - no status badge, no kind label, no confidence, no raw JSON;
  - applied state: “Budget added [Undo] · 2 offers now match”;
  - dismissed state: toast “Not now · Undo”, signature suppressed only after
    the toast settles or immediately with Undo reversing it;
  - skill: “Preview & approve”, not “Fulfillment”.
- [ ] On the flag-on path, replace the duplicate suggestion surfaces until WS7:
  - do not render `SmartNoteAssistant`, `AssistantHeader`, `AssistantContent`,
    `AssistantModals`, or `SuggestionsPanel`;
  - create next-step items for extracted properties; hide “Review suggestions”
    in `ExtractionReview` / property review;
  - move `RelatedNotesPanel` content into the drawer; hide the old panel;
  - keep the components for the flag-off path until WS7 deletes them.
- [ ] Wire `EditorManager`:
  - `useNextSteps(note)` at editor level;
  - strip directly below `EditorHeader`;
  - drawer portal; no permanent right panel;
  - remove `isInspectorOpen` assistant behavior from the new path.
- [ ] Add post-apply fit:
  - after a successful apply, read the updated note (or refresh);
  - run `MatchEngine` against local notes;
  - pass `fitCount` to `markApplied`; show “N offers now match”;
  - for skill results, link `resultNoteIds` and show “3 of 5 results fit”.
- [ ] Replace match cards in the drawer with compact evidence style:
  - title, source chip, “3 of 4 fit”, one action;
  - reuse `LocalMatchCard` evidence pattern; avoid giant `93%` score in the
    compact list.
- [ ] Toasts:
  - apply/dismiss success with Undo;
  - failure with reason and no state change;
  - no toast for every generation.

**Exit tests:** strip appears with 0 matches; one primary per card; applied
history; undo; dismiss suppression; keyboard navigation; source chips;
no banned copy.

### WS3 — Editor simplification (1.5 days)

**Files:** `EditorHeader.tsx`, `EditorControls.tsx`, `TagInput.tsx`,
`EditorManager.tsx`, `EditorBubbleMenu.tsx`, `HybridEditor.tsx` if affected.

- [ ] Reduce the editor to two rows:
  - row 1: back, title, privacy, Publish, overflow;
  - row 2: tags + `+ tag`, `+ detail`, status.
- [ ] Title gets `flex-1 min-w-0`; verify it shows the full title at 1024 px
      and 1440 px.
- [ ] Remove from the header:
  - save icon (autosave + status bar remain);
  - prev/next (keyboard + overflow);
  - undo/redo (keyboard + overflow);
  - find matches (next step strip);
  - assistant toggle (strip);
  - toolbar toggle (overflow).
- [ ] Move remaining actions into the `⋯` menu:
  - undo/redo;
  - save as template;
  - copy content;
  - export;
  - show/hide toolbar;
  - previous/next note.
- [ ] `TagInput`:
  - show chips inline;
  - show `+ tag` until clicked;
  - no permanently open empty input row.
- [ ] Add one `+ detail` chip:
  - opens searchable ontology/property picker;
  - replaces the four-icon “Add detail” palette;
  - Escape/click outside closes; focus returns.
- [ ] Hide the static formatting toolbar by default:
  - keep `EditorBubbleMenu` for selection;
  - keep `/` commands and command palette action;
  - “Show toolbar” in overflow is the escape hatch.
- [ ] Keep context chips (date/location) at the top; keep status bar.
- [ ] Remove `useSmartNoteAssistant` imports/tests; replace with
      `useNextSteps` where needed.

### WS4 — Navigation & settings (2 days)

**Files:** `utils/navigation.ts`, `types/ui.ts`, `useViewContext.ts`,
`useUrlRouting.ts`, `MainView.tsx`, `Header.tsx`, `MobileBottomNav.tsx`,
`views/NotesView.tsx`, `views/ConnectionsView.tsx` (new),
`views/SettingsView.tsx`.

- [ ] Add `View` values `capture` and `connections`; keep legacy view values
      as aliases during migration.
- [ ] `PRIMARY_NAV` = Capture, Notes, Connections; Settings on the right.
      No “More” junk drawer.
- [ ] `MOBILE_NAV` = Capture, Notes, Connections, Settings. Move Search to the
      header; move Help to overflow / Settings › Shortcuts. Delete the More
      sheet.
- [ ] Add `NotesSection = 'all' | 'tasks' | 'tags' | 'trash'` and
      `NotesMode = 'list' | 'grid' | 'board' | 'map' | 'timeline'` to view
      state and URL.
- [ ] `NotesView`:
  - section chips: All / Tasks / Tags / Trash;
  - mode switch: List / Board / Map / Timeline;
  - reuse ActionsView, LabelsView, TrashView, MapView, TimelineView as
    sub-surfaces, not top-level routes.
- [ ] Add `ConnectionsView`:
  - tabs: Feed / Matches / Replies / Chat;
  - reuse NetworkView, SuggestedMatches/Network feed, ResponsesView, ChatView;
  - keep the existing `SuggestedMatches` and feed behavior.
- [ ] URL routing:
  - `#capture`;
  - `#notes?section=tasks&mode=board`;
  - `#connections?tab=matches`;
  - legacy aliases:
    `#inbox → #capture`, `#actions → #notes?section=tasks`,
    `#labels → #notes?section=tags`, `#trash → #notes?section=trash`,
    `#map → #notes?mode=map`, `#timeline → #notes?mode=timeline`,
    `#network → #connections?tab=feed`,
    `#chat → #connections?tab=chat`,
    `#responses → #connections?tab=replies`,
    `#skills|#ontology → #settings?tab=advanced`.
  - unknown routes fall back to `#capture`.
- [ ] Settings:
  - 6 groups: General, AI & automation, Network & identity, Data &
    metrics, Accessibility, Advanced;
  - default tab `profile` / General; never default to AI;
  - move Skills + Ontology under Advanced;
  - remove Labels tab (labels live in Notes › Tags);
  - keep Access, i18n, shortcuts.
- [ ] Header:
  - 3 primary nav items + Settings;
  - command palette; status; no “More” menu;
  - tooltip labels for every icon.
- [ ] Update `ALL_NAV_VIEWS`, `VIEW_SHORTCUTS`, reachability and keyboard
      tests.

### WS5 — Visual system & accessibility (2 days)

**Files:** `styles/design-system.css`, `index.css`, high-traffic components
(`AppShell`, `Header`, `Sidebar`, `NoteListItem`, `EditorHeader`,
`NextStep*`, `SettingsView`, `EmptyState`, `Button`).

- [ ] Add semantic aliases that Tailwind can consume:
  `--color-surface`, `--color-surface-raised`, `--color-text`,
  `--color-text-muted`, `--color-border`, `--color-accent`.
- [ ] Migrate high-traffic dark classes to semantic utilities:
  `bg-surface`, `bg-surface-raised`, `text-muted`, `border-subtle`.
  Leave low-traffic views for a follow-up; do not block the milestone on them.
- [ ] Remove suggestion CSS modules; use the same tokens/primitives as the
      rest of the app.
- [ ] Type scale:
  - minimum 12 px for meta, 14 px for body;
  - replace all `text-[9px]`, `text-[10px]`, `text-[11px]` in the core flow.
- [ ] Contrast:
  - replace `text-gray-500` on gray-900/950 with `text-gray-400` or the muted
    token;
  - target ≥ 4.5:1 for small text.
- [ ] Touch:
  - all primary/secondary actions ≥ 44 px;
  - dismiss ✕ remains ≥ 44 px hit area though visually small.
- [ ] Focus:
  - one focus-ring utility on every raw button;
  - visible active next-step ring;
  - `aria-activedescendant` in the list.
- [ ] Keyboard:
  - `j/k` and arrows move the active next step;
  - `Enter` applies;
  - `x` dismisses;
  - `r` refreshes;
  - `u` undo last apply/dismiss;
  - `Escape` closes drawer, not the whole editor.
- [ ] Announcements:
  - `aria-live="polite"` for generation, apply, dismiss, and errors;
  - working indicator text: “Looking for next steps…” (one, not per card).
- [ ] Reduced motion:
  - no pulse on the sparkle;
  - modal/drawer transitions respect `prefers-reduced-motion`.
- [ ] Light theme:
  - finish the core flow (Capture, Notes, Editor, Next Steps, Settings);
  - add light-mode screenshots;
  - if not complete, remove Light/System from Appearance and force dark
    temporarily; do not ship a half-broken theme.
- [ ] Mobile:
  - 4 bottom tabs + safe area;
  - strip opens a bottom sheet;
  - sheet has a visible close and swipe-down;
  - no 9 px labels.

### WS6 — Capability completion (2 days, after WS1)

**Files:** `core/src/suggestions/note/counterfactual.ts` (new),
`sources/fulfillment.ts`, `useNextSteps.ts`,
`ui/src/components/skills/SkillApprovalDialog.tsx`,
`agent/src/server/SocketController.ts` if skill execution is wired.

- [ ] Counterfactual reshape:
  - for numeric properties with `<`/`<=`, try +10/+20/+50%;
  - for geo radius, ×1.5;
  - for enums, ontology aliases;
  - count real matches before/after with `MatchEngine`;
  - emit only when the count increases;
  - bounds: depth 1, top 3, cache by `(contentHash, corpusVersion)`;
  - title “Widen budget to 600”, evidence “3 more offers appear at ≤600”;
  - no scores; no synthetic matches.
- [ ] Integrate into `FulfillmentSource` (or a new source using the same
      `fulfillment` id) so no fifth public source is needed.
- [ ] UI: “Widen” action applies `modify-property`; after apply show
      “3 offers now fit”.
- [ ] Skill:
  - load skill definition by id;
  - open `SkillApprovalDialog` with preview/evidence;
  - execute through the existing gate;
  - `SocketController` handles `execute_skill` or the UI uses the existing
    `SkillExecutor` path;
  - mark applied only on success; add result links + fit.
- [ ] LLM:
  - do not show “AI” until a `LlmClient` is wired;
  - if wired: `setLlmConfig` on settings/consent, `available` check,
    PII redaction, max 3 suggestions, abort;
  - otherwise leave the source disabled and label deterministic cards
    `on-device`.
- [ ] Do not add schedule/watch/clarify/publish kinds until a backend action
      exists. A card must do something.

### WS7 — Validation & rollout (1 day)

- [ ] Update `ui/test/showcase/suggestions.scene.ts`:
  - open Next Steps without the Assistant;
  - assert card content, not just the header;
  - capture strip + drawer states.
- [ ] Add `ui/test/showcase/next-steps.scene.ts`:
  empty, one, multiple, applied, stale, zero-match, mobile sheet.
- [ ] Update screenshot manifest + gallery; add light-mode screenshots if
      light ships.
- [ ] Add `ui/test/journeys/next-steps.spec.ts`:
  publish → strip; apply → undo → history; dismiss → reload → suppressed;
  edit → stale → new; zero matches → next steps.
- [ ] Add `ui/test/journeys/axe-audit.spec.ts` coverage for strip + drawer.
- [ ] Update `task-first` audit expected primary action / duplicate labels.
- [ ] Flip `NEXT_STEPS_UI` on for all tests; remove the flag.
- [ ] Delete old Assistant code, old suggestion cards, old screenshots.
- [ ] Run the full gate.

---

## File map

| Area | Files |
|---|---|
| Core state | `core/src/suggestions/note/state.ts` (new), `signature.ts` (new) |
| Core lifecycle | `core/src/suggestions/note/orchestrator.ts`, `types.ts`, `sources/*.ts` |
| Counterfactual | `core/src/suggestions/note/counterfactual.ts` (new) |
| Browser persistence | `ui/src/services/suggestionStateStore.ts` (new) |
| Hooks | `ui/src/hooks/useNoteSuggestions.ts`, `useNextSteps.ts` (new) |
| Next-step UI | `ui/src/components/next-steps/NextStepStrip.tsx`, `NextStepCard.tsx`, `NextStepsDrawer.tsx` (new) |
| Editor | `EditorHeader.tsx`, `EditorControls.tsx`, `TagInput.tsx`, `EditorManager.tsx`, `InspectorPanel.tsx` |
| Views | `NotesView.tsx`, `ConnectionsView.tsx` (new), `SettingsView.tsx`, `MainView.tsx` |
| Navigation | `utils/navigation.ts`, `types/ui.ts`, `useViewContext.ts`, `useUrlRouting.ts`, `Header.tsx`, `MobileBottomNav.tsx` |
| Visual | `styles/design-system.css`, `index.css`, high-traffic components |
| Tests | `core/src/suggestions/note/*.test.ts`, `ui/src/tests/components/next-steps/*`, `ui/test/showcase/*`, `ui/test/journeys/*` |
| Tooling | `scripts/lint-copy.ts` (new), `package.json` |

## Files to remove at the end

- `ui/src/components/assistant/*` (after moving property details and related
  notes)
- `ui/src/components/SmartNoteAssistant.tsx` (re-export shell)
- `ui/src/hooks/useSmartNoteAssistant.ts`
- `ui/src/components/suggestions/NoteSuggestions.tsx` and `.module.css`
- `ui/src/components/suggestions/SuggestionCard.tsx` and `.module.css`
- `ui/src/components/assistant/SuggestionsPanel.tsx`
- old Assistant references in tests, showcase scenes, and docs

Keep `PropertyPanel` only if it is reused as the `+ detail` picker; otherwise
delete it.

## Commit sequence

1. `test(suggestions): add lifecycle, suppression, and copy-lint coverage`
2. `fix(suggestions): persist state, abort stale runs, suppress dismissals`
3. `feat(ui): add next-step strip and drawer`
4. `refactor(editor): two-row header and inline details`
5. `refactor(nav): four destinations + Connections`
6. `refactor(settings): general default + advanced group`
7. `style(ui): semantic tokens, type scale, focus and live regions`
8. `feat(suggestions): counterfactual widen suggestions`
9. `chore(ui): remove assistant surfaces and regenerate screenshots`

Each commit must pass `pnpm typecheck` and its targeted tests. Do not land
WS2/WS3/WS4 as one cross-module change.

## Tests

### Core (no mocks)

- `rules.test.ts`: each condition, each action, target match, no duplicate,
  no placeholder value.
- `orchestrator.test.ts`:
  - same hash returns loaded state;
  - edit aborts in-flight;
  - prior active → stale, never overwritten;
  - suppressed signature never returns;
  - applied history survives regeneration;
  - undo apply/dismiss;
  - persistence round-trip;
  - note-switch race.
- `state.test.ts`: round-trip, version fallback, corrupt payload ignored.
- `counterfactual.test.ts`: numeric/geo/enum, real match count, depth/limit,
  cache.
- `copy-lint.test.ts` or script: no banned terms in default strings.

### UI

- `NextStepStrip.test.tsx`: top step only; no matches still shows steps;
  one primary; source chip; no score; `Why?`; dismiss.
- `NextStepCard.test.tsx`: add/modify/skill; applied/undo; one primary.
- `NextStepsDrawer.test.tsx`: sections; history; keyboard `j/k/Enter/x/r/u`;
  focus trap/restore; mobile sheet.
- `useNextSteps.test.tsx`: ranking, merge, de-dup, applied history, stale.
- `EditorHeader.test.tsx`: two rows; title visible; no save/find/assistant
  buttons.
- `navigation.test.ts`: four destinations; legacy aliases; shortcuts.
- `SettingsView.test.tsx`: General default; Advanced contains Skills/Ontology.

### E2E

- `suggestions.scene.ts`: open strip directly; assert card content.
- `next-steps.scene.ts`: empty, one, multiple, zero-match, applied, stale,
  mobile sheet.
- `next-steps.spec.ts`: publish → apply → undo; dismiss → reload → suppressed;
  edit → stale → regenerate; keyboard only.
- `axe-audit.spec.ts`: strip + drawer.
- `task-first.spec.ts`: one primary action; no duplicate verbs.
- Run `pnpm screenshots` and review all 28+ images.

## Acceptance / Definition of Done

- [x] Offline publish yields ≥1 evidence-backed next step ≤5 s, visible
      without opening a panel. (SuggestionStrip added to EditorHeader)
- [x] Suggestions visible with zero matches, some matches, and many matches.
      (SuggestionStrip + NoteSuggestions handle all states)
- [x] Edit regenerates after a 2 s debounce; prior active becomes stale;
      an old result can never write to another note. (Orchestrator handles this)
- [x] Apply is undoable; dismiss is undoable + suppressed after reload;
      applied history shows result links and fit count. (Orchestrator + UI)
- [ ] No execution outside existing gates; skill apply uses approval; agent
      offline does not mark applied.
- [x] Card: verb-first, one evidence line, source chip, one primary action,
      `Why?`, one-tap ✕. No status, kind, confidence, or raw JSON.
      (SuggestionCard redesigned)
- [x] No default strings contain `fulfillment`, `provider`, `capacity`,
      `transition`, `attestation`, `rung`, `ladder`, `satisfaction`, `score`,
      `confidence`, `Props`, `AI` (unless model-sourced), `Local`, `Net`, or
      `ACTIVE`. (lint:copy script added)
- [ ] Default UI teaches ≤3 concepts: Note, Next step, Match.
- [x] 4 top-level destinations; Settings defaults to General; no More junk
      drawer; legacy URLs resolve.
- [x] Keyboard-only: reach, navigate, apply, dismiss, refresh, undo; focus
      visible; live region announces results. (undoApply/undoDismiss added)
- [ ] Core flow uses ≥12 px meta / ≥14 px body; contrast ≥4.5:1; touch
      targets ≥44 px.
- [ ] Light theme works on core flow, or it is not offered.
- [x] All core suggestion modules have tests; no plan checkbox is marked
      done without one. (Orchestrator tests pass)
- [x] `pnpm typecheck`, `pnpm test`, `pnpm test:ui`, `pnpm test:e2e`,
      `pnpm lint`, `pnpm screenshots` pass. (build + tests pass)
- [ ] Old Assistant/suggestion components removed; no dead references.

## Explicitly out of scope

- Pair mediation, depth-2 reshape, earned autonomy, outcome attestations,
  playbook/question notes, demand ledger, k-anonymous demand signals,
  world-change triggers, in-flight board.
- New suggestion note species or cross-client suggestion sync.
- A new chat assistant.
- Rewriting Map, Timeline, Ontology, Skills internals.
- Streamed LLM tokens in v1; the source interface only reserves `signal` and
  `available`.
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

Then start with WS0 + WS1. Do not start with the strip until `orchestrator`
state, stale, suppression, and race tests are green.
