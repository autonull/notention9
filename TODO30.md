# TODO.30 — One Workspace, One Path

**Scope:** `ui` information architecture, typography, color, spacing, note context, capture,
settings, mobile, screenshots, and the fast verification loop.
**Supersedes:** the Inbox / Connections top-level split in `README.md`,
`doc/UI_AUDIT*.md`, `ui/src/utils/navigation.ts`, and the W11/W12 navigation passes.
**Non-goals:** new matching semantics, transports, AI models, protocols, or persistence formats.
**Core rule:** a note is the product. Everything else is either capture, context for a note, or
configuration.

---

## 1. The immediate correction

`Inbox` is not a place. It is a list of notes, and a list is a view of `Notes`.
`Connections` is not a place. A connection is a relationship of a note: a match, an offer, a
reply, a chat, or a published peer. Putting either in the top bar creates three copies of the
same thing and forces the user to remember which copy owns which action.

The top-level destinations become:

```
Notes       the only work surface: capture, browse, open, edit, connect
Settings    the only configuration surface
```

Everything else is a **mode**, **overlay**, or **context panel**:

| Capability | New home |
|---|---|
| Inbox / quick capture | Omnibox at the top of Notes; `Cmd+N` opens the full composer |
| All notes / recent notes | Notes canvas; the one list |
| Tasks / Journal / Ideas / People | Filters on Notes, not separate views |
| Board / Map / Timeline | Modes of the Notes canvas |
| Trash | A filter in Notes, with restore/delete |
| Matches / requests / offers | Context rail of the open note |
| Network feed / public notes | Search overlay (“Explore notes”), not a view |
| Replies / chat | Context rail of the note or match thread |
| Labels / Ontology / Skills | Settings tabs |
| Settings | Full-screen surface, no note sidebar |
| Simulator / developer tools | Settings > Advanced, or a separate dev page |

No capability is removed. Only the false destinations are.

---

## 2. The zen critical path

> **Write one thing. See one next step. Respond. Done.**

```
                    ┌──────────────────────────────────────┐
                    │  What's on your mind?                │
                    │  [ large omnibox               ] [→] │
                    └──────────────────┬───────────────────┘
                                       │ Enter
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  Note                                │
                    │  Title, prose, details               │
                    │  Next step: Add a budget   [ Add ]    │
                    │  Context rail: Matches 2  ↗          │
                    └──────────────────┬───────────────────┘
                                       │ Respond
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  Response sent · next step applied    │
                    │  [ View response ]                   │
                    └──────────────────────────────────────┘
```

Rules that make it feel calm:

1. **One entry.** The omnibox is the only capture control. No header New Note, no sidebar New
   Note, no mobile Capture tab.
2. **One primary action per state.** Capture: `Keep note`. Note: `Publish` or `Respond`.
   Next step: `Add`. Match: `Respond`. Never two filled primary buttons.
3. **One next step.** Show the top step only. The drawer holds the rest behind `+N`.
4. **One context rail.** Next steps, matches, replies, and share live in the note’s right rail,
   collapsed by default on narrow screens.
5. **One vocabulary.** `Note`, `Detail`, `Next step`, `Match`, `Reply`. No `Inbox`, `Feed`,
   `Connections`, `Dashboard`, `Provider`, or `Attestation` in default UI.
6. **One screen of chrome.** The top bar has brand, search, capture, settings. Nothing else.

First-run state is not a dashboard. It is the omnibox and one line:

> **Write what you need, or what you can offer.**

---

## 3. Target information architecture

### 3.1 Routes

A single hash router with query verbs:

| Route | Meaning |
|---|---|
| `#/notes` | Notes workspace (default) |
| `#/notes?mode=board` | Board mode |
| `#/notes?mode=map` | Map mode |
| `#/notes?mode=timeline` | Timeline mode |
| `#/notes?filter=trash` | Trash filter |
| `#/notes?capture=1` | Composer focused |
| `#/notes?explore=1` | Search overlay, public notes scope |
| `#/notes/:id` | Note detail |
| `#/notes/:id?tab=matches` | Note context rail, matches tab |
| `#/settings` | Settings |
| `#/settings/:tab` | Settings tab (`labels`, `ontology`, `skills`, …) |

Legacy redirects are mandatory and tested:

```
#inbox      #capture    → #/notes?capture=1
#network    #connections → #/notes?explore=1
#chat       #responses   → #/notes?tab=replies   (with note id when present)
#actions                 → #/notes?mode=board
#map                     → #/notes?mode=map
#timeline                → #/notes?mode=timeline
#trash                   → #/notes?filter=trash
#labels                  → #/settings/labels
#ontology                → #/settings/ontology
#skills                  → #/settings/skills
#settings                → #/settings
```

### 3.2 The shell

Desktop, 1440 × 900:

```
┌────────────────────────────────────────────────────────────────────┐
│ ✳  Notention      ⌘K  Search notes…             + New note   ⚙   │ 72px
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Notes                                          Canvas List Board │ 48px
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  What's on your mind?                                        │  │
│  │  Write what you need, or what you can offer.          [ → ]  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ▌ Looking for a React developer            request · 2h ago      │
│  ▌ React developer available                offer · 2h ago        │
│  ▐ Garden help on Saturdays                 offer · 3h ago        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Full width: `w-full`, `h-dvh`, 16–24px gutters, no `max-w-3xl mx-auto`.
- One **content column** that fills available width. At 1440, a notes grid of 3–4 columns, not
  a 637px feed centred in a 1440px void.
- Prose in a note is capped at `72ch` for readability, but the panel that contains it is not.
- No permanent left sidebar. The note list is the Notes workspace.
- No right panel on the workspace. The context rail exists only in a note.

Mobile, 390 × 844:

```
┌───────────────────────────────┐
│ Notes              ⌘K    +    │ 56px
├───────────────────────────────┤
│ What's on your mind?          │
│ [ Write…              ] [→]   │
├───────────────────────────────┤
│ Looking for a React developer │
│ request · 2h ago              │
│ …                             │
└───────────────────────────────┘
```

- No bottom navigation. A single floating `+` opens the same composer.
- The note context rail becomes a bottom sheet with a handle, not a second screen.
- Safe-area insets, 16px gutters, full height.

### 3.3 Note detail

```
┌────────────────────────────────────────────────────────────────────┐
│ ←  Notes      Looking for a React developer        Publish   ⋯     │
├───────────────────────────────────────────┬────────────────────────┤
│                                           │  NEXT STEP             │
│  Looking for a React developer            │  Add a budget          │
│                                           │  [ Add ]      Why?     │
│  We are building a small community tool    │                        │
│  and need help with the interface.         │  MATCHES 2             │
│                                           │  React developer … 93% │
│  ▌ skill = React                          │  [ Respond ]           │
│  ▌ rate = 900–1200 USD                    │                        │
│  ▌ status = open                          │  REPLIES 0             │
│                                           │  No replies yet        │
│                                           │                        │
└───────────────────────────────────────────┴────────────────────────┘
```

- The note is the page. No note list on the left and no duplicate list behind it.
- The context rail is 22rem on desktop, a sheet on mobile.
- One accent per note, used on the 4px edge, the dot, and the primary action.
- Publish and Respond never appear together. If the note is yours, `Publish`; if someone
  else’s offer matches yours, `Respond`.
- `⋯` holds Copy, Export, Template, Archive, Delete.
- `Back` returns to the workspace at the same scroll position.

---

## 4. Visual system

### 4.1 Type

| Token | Desktop | Mobile | Use |
|---|---|---|---|
| `display` | 56/60, 700 | 40/44, 700 | First-run line, empty state |
| `h1` | 40/48, 700 | 32/40, 700 | Note title |
| `h2` | 24/32, 600 | 22/30, 600 | Section |
| `body-lg` | 20/34 | 18/30 | Note prose |
| `body` | 18/30 | 16/26 | Default body |
| `ui` | 15/22, 500 | 15/22, 500 | Buttons, fields, tabs |
| `meta` | 13/18, 500 | 13/18, 500 | Timestamps, counts |

Rules:

- No 9px or 10px text. No uppercase tracking for sentences. No 12px body.
- Maximum three sizes per surface. The note title and body dominate; chrome stays quiet.
- Use `clamp()` for display and title so the same components breathe on 1024–1920.
- Buttons are at least 44px tall; primary buttons 48–52px on mobile.
- Line length stops at 72ch; panels and grids do not.

### 4.2 Color

Use a neutral black canvas and one accent per note. Chrome is black and dark gray, never blue.

```
--bg:            #050505
--surface:       #111111
--surface-2:     #191919
--line:          #2b2b2b
--text:          #f5f5f5
--text-muted:    #a3a3a3
--accent-request:#ff6b6b   coral
--accent-offer:  #34d399   jade
--accent-event:  #c084fc   violet
--accent-task:   #fbbf24   amber
--accent-person: #60a5fa   sky
--accent-neutral:#d4d4d4
--success:       #34d399
--danger:        #ff5c7a
```

- **Dark mode is neutral, not blue-tinted.** Replace `gray-950` / `gray-900` surfaces with
  `neutral-950` / `neutral-900`; the header, shell, settings, panels, and mobile chrome stay in
  black and neutral gray. `theme-color` and the PWA chrome are `#050505`.
- Blue is a **note accent** for `person` notes and a link colour. It is never the app background,
  header, panel, default button, or focus ring. The default primary is the open note’s accent;
  an untyped note uses a neutral light fill.
- The accent is a **thin 4px edge**, a **dot**, or the **one primary action**. Never a rainbow
  of chips.
- Type is communicated by color + word, not color alone.
- Active primary: accent fill with near-black text when contrast allows, otherwise white.
- Gradients are allowed only on the first-run canvas and the active note edge; no decorative
  gradients in chrome.
- Status is colour + icon + word: `Open`, `Applied`, `Sent`. No colour-only meaning.

### 4.3 Space and focus

Priority order, top to bottom:

1. Note title / omnibox.
2. One primary action.
3. Next step.
4. Note body.
5. Context rail.
6. Metadata.

- 24px between major sections; 12px within a card; 8px inside chips.
- No page-level card wrapping the whole page. Cards are for notes, steps, and context items.
- Use dividers, not nested cards, to separate sections.
- The first screen is 80% content, 20% chrome.
- On desktop the workspace uses ≥95% of the viewport width. On settings, ≥90%.
- No `px-8` side gutters around a centred 768px feed. Use full width.

---

## 5. Workstreams

Each workstream is one commit (or a small commit pair) and must leave `typecheck`, the two
axe views, and the golden-path journeys green.

### W30.0 — Guardrails first

- Add failing tests for: no `Inbox` or `Connections` top-level nav; `#inbox` redirects to
  `#/notes?capture=1`; one primary per view; body ≥16px; axe on Notes and Settings.
- Replace the 54-journey suite with one **golden path** spec:
  capture → note → next step → respond → done.
- Reduce the screenshot gallery to 12 intentional scenes:
  `notes-empty`, `notes-grid`, `note-detail`, `note-context`, `capture`, `search`,
  `settings-general`, `settings-network`, `settings-skills`, `board`, `map`, `timeline`.
- Freeze the old gallery under `doc/screenshot/archive/` until the new one is complete.

### W30.1 — Collapse the IA

- `core/src/types/`: `View` becomes `Notes | Settings`; add `NoteMode` and `SettingsTab`.
  Keep a `LegacyView` parser for old hashes.
- `ui/src/utils/navigation.ts`: delete `PRIMARY_NAV`, `MOBILE_NAV`, `VIEW_NAV_FAMILY`, and
  `usesNoteSidebar`; replace with `parseRoute`, `routeToHash`, and `LEGACY_REDIRECTS`.
- `ui/src/hooks/useUrlRouting.ts`: parse `#/notes/:id?mode/…` and `#/settings/:tab`;
  ignore unknown hashes by redirecting to `#/notes`.
- `ui/src/components/AppShell.tsx`: one `<Header>`, one `<MainView>`, no sidebar wrapper,
  no mobile bottom nav, no `isMobileNoteList` branch.
- Delete `InboxView`, `ConnectionsView`, and `Header`’s nav tabs. Remove their tests and
  deep-link routes.
- Keep `#actions`, `#map`, `#timeline`, `#trash` as note-mode/filter redirects.

### W30.2 — Full-bleed workspace

- `NotesView` becomes the workspace:
  - `<CaptureOmnibox>` hero at the top.
  - one filter row (`All / Tasks / Tags / Trash`) as chips.
  - one view switcher (`Canvas / List / Board / Map / Timeline`) as a segmented control.
  - full-bleed grid/list with `minmax(320px, 1fr)` columns.
  - no `max-w` wrapper, no sidebar, no section title bigger than `h2`.
- Merge Inbox’s local match preview into the note context rail; keep the one hero match only
  when there is a selected note. Do not duplicate capture.
- Delete `Sidebar`, `SidebarHeader`, `SidebarList`, `FilterBar`’s duplicate filter row, and
  `SidebarContext` when the last consumer moves.
- Ensure the grid keeps scroll position when returning from a note.

### W30.3 — Note detail and context rail

- `EditorManager` becomes the note page: `h-dvh`, back button, title, prose, details, one
  primary action, overflow menu.
- Add `NoteContextRail`:
  - `Next steps` (top step only; drawer for more).
  - `Matches` (local offer/request pairs; Respond first).
  - `Replies` (thread + composer).
  - `Share` (publish gate).
- Rail is 22rem, sticky, full height; no page-level card. On mobile it is a bottom sheet with
  a handle and one detent.
- Move `NetworkView` feed and `ChatView` out of top-level routing:
  - `MatchesView` → rail match cards.
  - `ResponsesView` → rail replies.
  - `NetworkFeedList` → `SearchOverlay` with `scope=public`; no global page.
- Keep the existing privacy gate, approvals, skill permissions, and local-first behaviour.
- One primary per state: `Publish` for own notes; `Respond` for matches; `Add` for next steps.

### W30.4 — Type and color

- Add `ui/src/styles/type.css` with `display`, `h1`, `h2`, `body`, `ui`, `meta`.
- Replace every `text-[9px]`, `text-[10px]`, and uppercase sentence with the scale.
- Add `ui/src/styles/palette.css` with the neutral blacks/greys and accents above; map note
  intent to `--note-accent`. Replace blue-tinted surfaces mechanically:

  | Current | Replace with |
  |---|---|
  | `bg-gray-950` | `bg-neutral-950` |
  | `bg-gray-900` | `bg-neutral-900` |
  | `bg-gray-800` | `bg-neutral-800` |
  | `border-gray-800/700/600` | `border-neutral-800/700/600` |
  | `text-gray-100…400` | `text-neutral-100…400` |
  | `bg-blue-600` primary action | `bg-[var(--note-accent)]` or neutral light |
  | `ring-blue-500` focus | `ring-[var(--note-accent)]` or neutral light |

  Leave the per-note accents (coral, jade, violet, amber, sky) and the danger/success colours
  alone. Do not leave a blue-tinted page, panel, header, or default button.
- Note cards: 4px left edge, title 18/24, one detail line 15/22, meta 13/18.
- Note detail: title 40/48, prose 20/34, chips 14/20.
- Settings: title 40/48 desktop / 32/40 mobile; section labels 13/18.
- Contrast: all body text ≥4.5:1; meta ≥4.5:1; disabled ≥3:1.

### W30.5 — Capture, search, and commands

- `CaptureOmnibox`: one 32px input, a primary arrow, one hint line. Enter opens the note in
  the editor. No modal for the default path.
- `Cmd+N` opens a full-screen composer with the same field and a `Keep note` primary.
- `Cmd+K` opens one search overlay: notes, details, tags, public notes, commands. One field,
  grouped results, `Enter` opens, `→` previews. No separate command palette.
- Remove header search icon duplication and mobile search button. Keep one keyboard hint.
- All empty states use the same omnibox and one line.

### W30.6 — Settings

- Full-screen settings with a 16rem section nav and a content column; no note sidebar.
- 5 groups, one open at a time: General, Appearance, Network & Identity, AI & Automation,
  Advanced.
- `labels`, `ontology`, and `skills` are real tabs; `#/settings/labels` selects Labels.
- Provider cards: one row, one switch, one sentence; status text is always present.
- Delete the duplicate “Local-Only Mode” sentence and the empty status bullet.
- Settings title 40/48; section title 24/32; body 16/26.

### W30.7 — Mobile

- Delete the bottom navigation. The header has back, title, overflow.
- One floating `+` action; same composer as desktop.
- Notes grid single column with 16px gutters; note detail full-screen.
- Context rail becomes a bottom sheet with three tabs: Next steps / Matches / Replies.
- Every touch target ≥44px; no horizontal overflow; no 6-tab bar.
- Capture field 18px; one primary `Keep note`.

### W30.8 — Evidence and developer loop

- One screenshot implementation, 12 scenes; `pnpm screenshot <scene>` refreshes one image.
- `pnpm check:ui` = typecheck + axe Notes/Settings + 6 golden-path journeys.
- One full gallery per milestone, not per commit; keep `pnpm screenshots:all` optional.
- Remove `waitForTimeout` from journeys except one deterministic settle; use locators.
- Run the local relay per screenshot worker or clear it before the gallery, so the public feed
  cannot leak notes from other tests.
- Document the 3 commands a stranger needs: `pnpm dev`, `pnpm check:ui`, `pnpm screenshot notes`.

---

## 6. Acceptance

- [ ] Only two top-level destinations: `Notes` and `Settings`.
- [ ] No `Inbox`, `Connections`, `Network`, `Chat`, `Responses`, `Dashboard`, or `Feed`
      labels in default navigation.
- [ ] `#inbox`, `#network`, `#connections`, `#chat`, `#responses`, `#actions`, `#map`,
      `#timeline`, `#trash`, `#labels`, `#ontology`, `#skills` redirect and never dead-end.
- [ ] Capture is one field; there is no second New Note/New Task/Capture control on the same
      screen.
- [ ] The workspace uses ≥95% of the 1440px width and ≥90% of 390px, with only 16–24px gutters.
- [ ] Note detail uses the full width with a 22rem context rail; prose stops at 72ch.
- [ ] Body text ≥16px mobile / ≥18px desktop; no 9–10px text; no uppercase sentences.
- [ ] Dark-mode chrome is black / neutral gray; no blue-tinted surfaces or blue default button.
- [ ] One accent per note type; one primary action per view; ≥4.5:1 contrast.
- [ ] Every note connection (match, reply, chat, publish) is reachable from that note.
- [ ] No global note list is duplicated (no sidebar + main copy).
- [ ] Settings is full-screen with no note sidebar, and `#/settings/:tab` works.
- [ ] Mobile has no bottom nav, one composer, one context sheet, ≥44px targets.
- [ ] `pnpm typecheck`, `pnpm test:ui`, `pnpm check:ui`, and axe pass.
- [ ] 12 gallery scenes regenerate; full gallery < 90s on the machine default.

---

## 7. File map

| Area | Files |
|---|---|
| Routes / types | `core/src/types/ui.ts`, `ui/src/utils/navigation.ts`, `ui/src/hooks/useUrlRouting.ts` |
| Shell | `ui/src/components/AppShell.tsx`, `MainView.tsx`, `layout/Header.tsx` |
| Workspace | `views/NotesView.tsx`, `sidebar/*`, `dashboard/QuickCapture.tsx`, `dashboard/LocalMatchPreview.tsx` |
| Note detail | `editor/EditorManager.tsx`, `EditorHeader.tsx`, `InspectorPanel.tsx`, `next-steps/*` |
| Context | `network/NetworkFeedHeader.tsx`, `network/NetworkFeedList.tsx`, `network/SuggestedMatches.tsx`, `views/ChatView.tsx`, `views/ResponsesView.tsx`, `views/MatchesView.tsx` |
| Settings | `views/SettingsView.tsx`, `settings/*` |
| Style | `ui/src/index.css`, `ui/src/styles/design-system.css`, new `type.css`, `palette.css` |
| Tests | `ui/test/journeys/golden-path.spec.ts`, `axe-audit.spec.ts`, `ui/test/support/capture.ts` |
| Evidence | `ui/test/showcase/*.scene.ts`, `doc/screenshot/README.md` |

---

## 8. Order of work

1. **W30.0** — failing tests, golden path, 12-scene plan.
2. **W30.1** — route collapse and redirects; remove top-level Inbox/Connections.
3. **W30.2** — full-bleed Notes workspace; capture stays one entry.
4. **W30.3** — note detail and context rail; rehome matches, replies, publish.
5. **W30.4** — type and color tokens; apply to workspace, note, settings.
6. **W30.5** — omnibox, search overlay, command consolidation.
7. **W30.6** — settings full-screen and deep links.
8. **W30.7** — mobile sheet, floating capture, no bottom nav.
9. **W30.8** — gallery, evidence, docs, and final verification.

Do not start a later workstream while an earlier one has a failing golden-path test. Do not
add a new top-level surface to solve a local problem.

## 9. Risks and guards

| Risk | Guard |
|---|---|
| Old URLs break | Redirect table in W30.0; one test per legacy hash |
| Matches become undiscoverable | The note rail is visible on every selected note; `Matches` is a tab there, not a page |
| Capture gets lost on mobile | One floating `+` and one composer, tested at 390px |
| Settings becomes a junk drawer | 5 groups, one open, Advanced last |
| Type scale bloats | Three sizes per surface; a lint rule for `text-[9px]`/`text-[10px]` |
| Screenshot churn | 12 scenes; one scene per change; archive the old gallery |
| The next-step system regresses | The existing suggestion tests stay; the rail is a new host, not a new engine |
| Light theme remains half-done | Either finish it on the core path or hide the option; do not ship a broken theme |

## 10. Fresh-session start

Read, in order:

1. `TODO30.md`
2. `ui/src/utils/navigation.ts`
3. `ui/src/components/AppShell.tsx`
4. `ui/src/components/views/NotesView.tsx`
5. `ui/src/components/editor/EditorManager.tsx`
6. `ui/src/components/next-steps/NextStepStrip.tsx`
7. `doc/UI_AUDIT_2026-11-22.md`

Then run `pnpm dev`, open `#/notes`, and make the first screen the omnibox and the note list.
Do not add Inbox or Connections back to solve a local problem. If a connection matters, put it
in the note.

---

**The one-sentence test:** a stranger lands, types one sentence, keeps one note, sees one next
step, and responds to one match — all on one screen, with no tab called Inbox or Connections.
