# TODO.31 — The Note Is the Page

**Status:** done. W31.0–W31.9 and the follow-up passes landed. Supersedes the previous `TODO31.md`
draft (“Consolidation, Surface by Surface”).
**Continues:** TODO.30 and the one-workspace pass.
**Non-goals:** matching semantics, transports, AI models, persistence formats,
and new capabilities.
**Core rule:** one note, one page. Everything else is history, margin, or a
command. Do not add a surface to solve a crowded surface.

---

## Progress

Last updated after the second follow-up pass. The gallery still has 47 scenes;
`note/compose` replaces `capture/composer` and `editor/property-edit`
replaces `editor/property-inspector`.

| Workstream | State | Landed | Still open |
| :--- | :--- | :--- | :--- |
| W31.0 Grammar, tokens, guards | **Partial** | `NOTE_BROWSE_MODES` (List first), `NOTE_SORT_ORDERS`, `NOTE_RAIL_TABS`, `ARRANGE_GROUPS`, `historyShare`/`contextShare`/`contextOpen` keys, page/chrome tokens, `ResizablePane`, `PageSurface`, `ArrangeMenu`, `Modal` placement/footer slots, `KitGallery` (`#/kit`), icon `tone` prop; one `Tabs` in `kit` (`TabOption`) after `Navigation` deletion; `check-ui-layers` and settings type guards | `ListRow`, `Field`, `ContextPanel` extraction only when a second use exists; layer check has no per-file baseline |
| W31.1 The page | **Done** | Full-bleed page, editable 30 px title in the page, one 3 rem bar, focus-only formatting row, saved + word count at page end, 17 px body, 88ch left-aligned measure, `PageSurface` / `PageHeader` / `PageTitle` / `PageMeta`; `KitGallery` exercises the page patterns | None |
| W31.2 History and page | **Done** | Persistent history rail on `lg+`, percentage share with pointer/keyboard resizer, List default, `Arrange` menu, 3-line rows with active edge, one row tab stop with arrows/Home/End/Enter, mobile list/page swap, subset/arrangement/order persist, pure `selectIndex` + tests, group axis scoped to Board | None |
| W31.3 New note is a page | **Done** | `New note` creates and focuses a blank page; capture modal and hero omnibox deleted; `Cmd/Ctrl+N` creates a page; paste-to-capture writes into a page | None |
| W31.4 Details in the page | **Done** | Floating inspector and bar `Details` removed; inline chips edit through `PropertyEditor`; page `+ Add detail` uses the same form; imported details with no inline node show in the page and edit in one popup; chips are keyboard reachable and focus returns after close | None |
| W31.5 One context rail | **Done** | Four top-level tabs (`Next`, `Matches`, `Replies`, `Chat`), nested toggle removed, rail closed when empty, auto-open when context exists, percentage share and resizer, `Context` control with count | Mobile uses a bottom pane, not a labelled bottom sheet with a drag handle |
| W31.6 List, browse, cards | **Done** | `Arrange` is the only layout/order control, all five arrangements and ten orders reachable, List is default, card chrome quieted, rows share history spacing, Board groups by status or none | None |
| W31.7 Explore, search, chat | **Done** | `IdentityStrip` / `FeedRow` patterns; relay health is a chip with a click-to-open panel; one filter row (domains + input, no label, no tag row); feed rows with one property line and one action row; read-only feed is one line; chat list uses `FeedRow`, conversation carries app typography and one composer; palette scopes come from `PALETTE_SCOPES`; `RelayStatusBanner` and `DiscoveredProperties` deleted | None |
| W31.8 Settings, overlays, status | **Done** | `SettingsDirectory` + `SettingsSection` patterns; `SettingsView` is directory + panel + tab switch; one `SectionHeader` at 15 px (optional 14 px icon) for every tab; tab cards and `animate-fade-in` removed; every settings surface, control, and copy is on tokens with no `blue-*`, `purple-*`, `neutral-*`, or `text-white`; `styles/tone.ts` tone map used by `Chip`, `Toast`, `ConnectivityBanner`, `DegradedModeBanner`, and icons; dead `Popover`, `Drawer`, `Dropdown`, `CommandPalette`, `ConfirmationDialog`, `EnhancedCommandPalette`, `VirtualizedList`, `PrivacyControl` and their tests deleted | None |
| W31.9 CSS, tests, evidence | **Done** | `index.css` 234 lines; calendar and leaflet moved to `styles/calendar-leaflet.css`; dead button/card/widget CSS deleted; 47 screenshots regenerated; manifest and README updated; journeys rewritten for the page; network and chat scenes recaptured after W31.7; audit evidence refreshed from the shell scan; ontology, help, and editor captures refreshed; dead `RelatedNotesPanel`, root `SuggestionItem`, and `ExtractionReview` with its test block deleted | Remaining gallery groups predate the modal, icon-tone, and tab-merge passes; recapture at the next visual milestone |

### Next order

No workstream is open. This pass landed three follow-ups:

- `task-first` scans `[data-testid="app-shell"]`, so the top-bar `New note`
  counts as the primary on list views (8 px from the top, tab stop 2).
  Duplicates ignore navigation and tablists, and the header action carries
  `data-variant`.
- `ui/Navigation.tsx` is deleted: its unused `Breadcrumb`, `Pagination`,
  `Stepper`, `Nav`, `TabPanel`, and duplicate `Tabs` are gone. `kit` owns the one
  `Tabs` (`TabOption`), and ontology uses it.
- History rows rove: the selected row, or the first row when the selection is
  elsewhere, is the list's only tab stop. Arrows move focus, Home/End jump, and
  Enter/Space opens. `Publish` drops from tab stop 19 to 2.
- The help dialog is on tokens and the shared `Button`; its concepts, keys, and
  action carry no literal accent classes.
- The property editor's key, extraction, learned-suggestion, and definition
  box are on tokens; the `editor` group is recaptured.
- Agent status panels, metrics, and capability chips are on tokens; the
  disabled and connecting states match.
- Ontology alias, attribute, and conflict surfaces are on tokens, as are empty
  states and the language selector; `notes/empty` and the suggestions empty
  state are recaptured.
- Ontology nodes, privacy confirmation, describe-it, and automations are on
  tokens; `settings/ontology` and the editor group are recaptured.
- The property palette, niche selectors, note preview, quick capture,
  ontology suggestions, local match, and automation cards are on tokens;
  `search` and `modals/command-palette` are recaptured.
- `RelatedNotesPanel`, the root `SuggestionItem`, and `ExtractionReview` (with
  its test block) are deleted; no references remained.

The remaining items are follow-ups, in value order:

1. **Tone tail** — every high-traffic surface is on tokens: settings,
   header, help, page/history, editor, property palette and niche selectors,
   ontology, empty states, command-preview, agent, dashboard, and automation.
   A long tail of one to six literal classes remains across widget, layout,
   and metaphor files, plus deliberate semantic colors: `PropertyBlock`
   categories, agent status, match types, automation cadence, and suggestion
   type badges. Do not sweep the tail; route a file when its surface changes,
   and keep semantic colors unless the axis changes.
2. **W31.0 extraction** — extract `ListRow`, `Field`, and `ContextPanel` only
   where a second use exists. `KitGallery` is the gallery entry when another
   second use appears; do not extract a one-off.
3. **Evidence refresh** — `settings/ontology` is current; recapture the other
   groups that predate the modal, icon-tone, and tab-merge changes.


---

## 0. The change in one paragraph

Notention already has the right nouns: notes, details, matches, replies, chat,
publish. The interface still arranges them like an admin console. The note is a
640 px card in a 1,000 px room, the title lives in a toolbar, details have three
doors, and the context rail is always open even when it has nothing to say.

This pass makes the note the page. The shell is a familiar language-model UI:
history on the left, one central canvas, context on the right, one quiet bar on
top. The difference is the center. The center is a document, not a conversation.
Everything a chat UI puts around a thread — history, view picker, context,
actions, counts — surrounds the note instead.

The history is not a feed either. It is a semantic index: sets and subsets of
notes, five arrangements, ten sort orders. A chat UI can only show a
chronological log. Notention can show the same notes by status, date, title,
proximity, relevance, or tag; as a list, canvas, board, map, or timeline. That
is the differentiator. Typography carries the hierarchy: a large editable
title, a comfortable body, quiet chrome. A stranger should need no explanation.

**The one-sentence test:** a stranger opens Notention, sees their notes as
history, opens one, and the note fills the screen like a page; they type a
sentence, add one detail, and close or publish while matches, replies, and next
steps wait at the edge instead of in the way.

---

## 1. What the screenshots show

Measurements are from the 1440 × 900 gallery in `doc/screenshot/`.

| # | Surface | Current state | Why it hurts | Target |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Note document | `max-width: 40rem` and centered (`ui/src/index.css:23`). At 1440 the document is 640 px inside a ~1,119 px pane: ~480 px of dead gutter. | The eye reads a narrow card, not a page. The note looks smaller than the chrome around it. | Page sheet fills the pane. Prose keeps a left-aligned readable measure. Body 17 px, title 30 px. |
| 2 | Note title | 20 px, sits in the bar (`editor/EditorHeader.tsx:120`), sharing the row with privacy, details, publish, and overflow. | The most important text is the same size as a widget label and competes with buttons. | Editable page title, 30/36 px, at the top of the document. The bar keeps only back, saved, publish, overflow. |
| 3 | Note chrome | Three stacked rows: 56 px bar, 44 px toolbar (`TiptapToolbar.tsx:171`), 33 px status bar (`TiptapEditor.tsx:257`). | ~133 px of chrome before prose. The status row repeats “Saved” and a word count as permanent furniture. | One `3rem` bar. Formatting on selection and slash. Saved + word count at the page end or bar edge. |
| 4 | Notes workspace | Grid is the default (`ViewNavigationContext.tsx:35`). Capture is a hero input above the grid. Selecting a note replaces the list. Sort is stored but not exposed. | There is no history, and the index cannot be arranged or ordered. Browsing and writing are two different screens, so the user loses place and context. | Persistent, resizable history rail + document on `lg+`. One `Arrange` control exposes layouts and sort orders. |
| 5 | Details | Three entry points: bar `Details`, toolbar `Add detail`, and a floating `InspectorSidebar` (`EditorManager.tsx:294`). The inspector renders bottom-left, over the page. | Three doors to one room. The floating panel looks like a bug, steals the editor corner, and makes “details” feel modal. | Chips live in the page. `Add detail` / slash inserts. Clicking a chip edits. One shared `PropertyEditor` popup. No floating inspector. |
| 6 | Context rail | Three tabs, 20 rem, always visible. `Replies` contains a second `Replies / Chat` toggle (`NoteContextRail.tsx:44`). Empty `Next steps` occupies the full rail. | Duplicated hierarchy. The rail is 22% of the screen even when it has no content. | Four top-level tabs: Next, Matches, Replies, Chat. No nested toggle. Rail opens only when context exists or the user opens it. |
| 7 | Search / Explore | Scope tabs, then identity block, relay card, filter chips, filter input, tag chips, and large feed cards. | Five competing blocks inside one overlay. One note takes ~190 px; the feed reads as a settings page. | Search field, one scope row, compact identity/status strip, one filter row, compact note rows. One identity. |
| 8 | Settings | 15 tab headings at `text-xl`; 80 legacy `bg-neutral-800/900` uses; 840 px content column; 188 px directory. | One tab at a time uses a different visual language from the next. Sparse tabs leave more empty space than content. | One 15 px `SectionHeader`, one card, one `Field`, one primary action per tab. |
| 9 | Chat | Contact list heading 18 px; conversation header 14 px; bubbles and composer use old neutrals. | Chat reads as a second app. It should share the app's chrome and typography, not mimic the note. | One conversation header, one bubble style, one composer. In the rail, the tab is the title. |
| 10 | Overlays and status | Hand-rolled overlays, `HelpDialog` plus `KeyboardShortcutsHelp`, banners with utility colours. | Inconsistent escape, focus, and tone. Two help launchers. | `Modal`/`ConfirmDialog` everywhere. One help surface. One tone map for toast, banner, chip, status. |
| 11 | Mobile | Single column and full-screen note are correct, but the note still opens with a 20 px bar title and no history. | It feels like a separate layout, not the same product at 390 px. | History home, page on selection, bottom context sheet. Same title and body scale. |
| 12 | Legacy CSS | `index.css` is 1,249 lines with old neutral widgets and duplicated focus/scroll rules. | Every visual change fights two systems. | Under 400 lines: editor prose, leaflet, calendar, print, motion, skip link. |

The counts that matter before this pass:

| Measure | Now |
| :--- | :--- |
| Settings tab headings at `text-xl` | 15 |
| Legacy `bg-neutral-800/900` uses in settings | 80 |
| Components using `text-white` | 65 files |
| Note document width at 1440 | 640 px of ~1,119 px pane |
| Body font size | 0.97 rem (15.5 px) |
| Note title | 20 px, in the bar |
| Chrome rows above prose | 3 |
| Entry points to editing a detail | 3 |
| Rail tabs with a nested toggle | 1 |
| `ui/src/index.css` | 1,249 lines |

---

## 2. Design law

Every workstream is judged against these rules.

1. **The page is the interface.** The open note fills the available pane in
   both axes. The list is an index, not a competing canvas.
2. **Everything else surrounds the note.** History sits left; context sits
   right; the bar sits above; overlays sit above that; browse modes replace
   only the center. No capability becomes a second note. Surrounding panes use
   proportional shares, not fixed pixel widths, and the user can resize them.
3. **Type is hierarchy.** Title ≥ 28 px, body ≥ 17 px, chrome 12–13 px.
   If everything is 14 px, nothing is important.
4. **One semantic index, one page.** Desktop shows the note index and the
   document at the same time. Selecting a note never replaces the index. The
   index keeps its subset, arrangement, and sort when the page scrolls.
5. **Context is optional.** The context rail starts closed unless the note has a
   next step, match, reply, or contact. A badge advertises what is waiting.
6. **Commands before controls.** `Cmd/Ctrl+K`, `/`, and the selection bubble
   carry formatting and insertion. Do not keep a permanent ribbon for actions
   used once a week.
7. **One primary per surface.** Publish is the note's primary. New note is the
   workspace's primary. Everything else is secondary, a chip, or overflow.
8. **Progressive disclosure.** Default to the current task: writing. Reveal
   history on request, context on request, advanced formatting on selection.
9. **Quiet chrome.** One neutral palette. Accent only for focus, selection,
   publish, and the active tab. No decorative borders, gradients, or glows.
10. **Lowest common denominator.** If a first-time user cannot name a control,
    label it. Icon-only is allowed only where the icon is universal and a tooltip
    and accessible name exist.
11. **No dead ends.** Escape leaves any layer without losing work. Autosave is
    the default. The back control returns to the same scroll position.

### What this means for each widget

| Widget | Priority in the writing task | Size / treatment |
| :--- | :--- | :--- |
| Note title | 1 | 30/36 px, editable, page top |
| Prose | 1 | 17/28 px, page surface |
| Add detail / chip | 2 | 12–13 px, inline, quiet |
| Save state | 2 | 11–12 px, page end or bar edge |
| Publish | 1 action, 0 chrome | One primary button in the bar |
| History row | 2 | 13–14 px title, 12 px preview, 52–60 px row |
| Context tab | 3 | 12 px label, `2.25rem` tab row, hidden until needed |
| Formatting | 3 | Selection bubble; slash menu |
| Arrange | 3 | One labelled `Arrange` menu: layout, order, group |
| Search / settings | 3 | Global bar actions |
| Word count | 4 | 11 px, muted, end of page |

---

## 3. Borrowed grammar

The shell is the language-model UI. The center is not.

A language-model UI is a layout with one history list on the left, one dominant
canvas in the middle, and everything that acts on the center gathered around
it. Notention keeps that layout and changes only the center: the canvas is a
note, not a thread. History is an index of notes, not a log of turns. The
surrounding rail holds the possibilities of the open note: next steps, matches,
replies, chat, publish, details. A chat UI surrounds a conversation; Notention
surrounds a description.

**A note is one description.** The whole note is present at once: title, prose,
details, tags, status. Changes happen in place. There are no turns, no
transcript, no append-only history, and no “message” boundary inside a note.
Selecting a history row opens that description; it does not append to it. Chat
is a separate capability and remains a conversation because that is what chat
is.

### The history is a semantic index

The left pane is not a chronological feed. It is a set of notes with three
independent axes. The axes compose; changing one does not reset the others.

| Axis | Options |
| :--- | :--- |
| Subset | All, Tasks, Tags, Trash; search results; tag or property filters |
| Arrangement | List, Canvas, Board, Map, Timeline |
| Sort | Updated ↓/↑, Created ↓/↑, Title A–Z/Z–A, Soonest, Nearest, Relevance, Tags |

Grouping is part of the arrangement: Board groups by status, Timeline by date,
Map by location, List by the active sort. New grouping modes are allowed only
when the notes support them; do not invent a group axis that the data cannot
answer.

This is the one place where Notention is deliberately more capable than a
language-model UI. The history control must expose the axes, not hide them
behind a chronological default. One `Arrange` control is enough for layout +
sort + group; it must not become three rows of chrome.

### Borrow

| Familiar interface | Notention equivalent |
| :--- | :--- |
| History sidebar | Note history: one list, sections, search, active row |
| New entry at the top of history | `New note`; creates a blank page and focuses it |
| One large central canvas | Full-bleed note page |
| Model picker | `Arrange`: List, Canvas, Board, Map, Timeline |
| Sidebar collapse | History collapse; context collapse |
| Token count | Saved state + word count |
| Slash commands | `/` for detail, template, heading |
| Selection toolbar | `EditorBubbleMenu` for bold, italic, link, detail |

### The center is different

| Language-model center | Notention center |
| :--- | :--- |
| Conversation transcript | One note document, edited in place |
| Message turns | No turns, no message boundaries, no “reply inside” the note |
| Regenerate / branch | Next steps and Matches suggest changes; they do not fork the note |
| System prompt | Details and tags are visible parts of the note, not a hidden instruction layer |
| Composer as a separate input | Writing happens directly in the page |
| Attachments outside the text | Details are inline chips; templates insert into the document |

From note-taking and office apps:

- The list/preview split from Mail and Apple Notes: history stays, document
  updates in place.
- The page from Word and Docs: no card, no gutter, a real writing surface.
- The title in the page from Notion and Bear: the document owns its own name.
- Quiet chrome from Things and Linear: labels, not decoration.
- A persistent save state and a visible word count, small and out of the way.

---

## 4. Target composition

The note is the center. Everything that can act on it is a surrounding layer,
not a second center.

| Layer | Position | Contains |
| :--- | :--- | :--- |
| History | left | notes, sections, search, new note |
| Bar | top | back, saved state, publish, context, overflow |
| Page | center | editable title, prose, detail chips, tags, save/count |
| Context | right | next steps, matches, replies, chat |
| Inline | in the page | detail chips, extraction suggestions, template insertion |
| Overlays | above | command palette, search/explore, help, publish disclosure, identity setup, settings |
| Browse modes | behind the page | List, Canvas, Board, Map, Timeline |

No layer may duplicate another. Context may open and close; it may not become
a second page. Overlays may cover the page; they may not create a second
navigation. Browse modes replace the center; they do not replace the shell.

### Pane sizing

Widths are shares of the workspace, not fixed pixels. The defaults keep the
page dominant; the user can adjust either sidebar.

| Pane | Default share | Resize range | Behaviour |
| :--- | :--- | :--- | :--- |
| History | `22%` | `16%–30%` | drag handle; arrow keys; double-click resets |
| Context | `20%` | `15%–26%` | drag handle; arrow keys; double-click resets |
| Page | remaining | at least `50%` | grid middle column; never shrinks below half |

- Store the share as a percentage, not a pixel width. On viewport change the
  proportions hold.
- Use CSS grid, not flex-basis pixels:
  `grid-template-columns: var(--history-share) minmax(50%, 1fr) var(--context-share)`.
  The middle column is the page and receives the remainder, never below half.
- Both panes together never take more than `50%`; the page has `min-width: 0`
  and a floor of `50%`. A drag stops at that cap even if the dragged pane's own
  range would allow more.
- Below `lg`, history and page swap; context becomes a full-width sheet. Neither
  is resizable there.
- When both sidebars are closed, the page takes the whole workspace. When both
  are open at defaults, the page keeps `58%`.
- History and context shares persist across reload. Collapsed state persists
  separately.
- The handle is a vertical `separator` with `aria-valuenow` as a percentage.
  Arrow keys move it by one point; Home/End jump to its min/max.
- Resizing never changes the note content, selection, arrangement, or sort.

### Desktop, Notes home

```
┌ 3rem bar ────────────────────────────────────────────────────────────────┐
│ ✳ Notes        All 24 · Tasks 3 · Tags 8        Search  New note  Settings│
├ ~22% history ────────────────┬ main ──────────────────────────────────────┤
│ Search notes…                │  List · Updated ▾                          │
│ All · Tasks · Tags · Trash   │                                            │
│ ───────────────────────────  │  Note rows (browse)                       │
│ Looking for a React developer│  ───────────────────────────              │
│ React developer available    │                                            │
│ Garden help on Saturdays     │                                            │
│ …                            │                                            │
│                              │                                            │
│ [+ New note]                 │                                            │
└──────────────────────────────┴────────────────────────────────────────────┘
```

- The inline hero omnibox goes away. `New note` and `Cmd/Ctrl+N` are the one
  entry path; the blank page is where writing starts.
- One `Arrange` control exposes the three axes, labelled with the current
  arrangement and sort: `List · Updated`. It opens one popover with Layout,
  Order, and Group. It is not three rows of chrome.
- List is the default arrangement and Updated is the default order. Canvas /
  Board / Map / Timeline and all ten sort orders remain one selection away.
- The history rail keeps its scroll position when the document scrolls. A
  subset, arrangement, or order change never resets the open note.

### Desktop, note open

```
┌ 3rem bar ────────────────────────────────────────────────────────────────┐
│ ←  Notes        Saved 12:04        Publish        ⋯                        │
├ ~22% history ────┬ note page (remaining) ──────────┬ ~20% context ──────┤
│ All · Updated ▾  │  Looking for a React developer    │ Next  Matches  Rep…│
│ …                │                                    │                    │
│ active row       │                                    │                    │
│                  │  We are building a small community │  (empty → closed) │
│                  │  tool and need help with the       │                    │
│                  │  interface. Two weeks of work.     │                    │
│                  │                                    │                    │
│                  │  [request] [skill = React] [+ Add] │                    │
│                  │                                    │                    │
│                  │  …                                 │                    │
│                  │                                    │                    │
│                  │  19 words · Saved                  │                    │
└──────────────────┴────────────────────────────────────┴────────────────────┘
```

- The page fills the remaining width and height. Prose is left-aligned inside a
  readable measure; the sheet itself has no card border.
- Title and chips belong to the page. The bar repeats only the note's status.
- The history keeps its subset, arrangement, and order while a note is open.
  `All · Updated ▾` in the history header reorders the index without touching
  the note.
- Context is closed by default. One `Context` control in the bar shows a dot or
  count when something waits. Open state persists per session.

### Mobile

```
┌ 2.75rem bar: ✳  All ▾   Search   +   Settings ┐
│ Notes history (list)                        │
│ …                                          │
│ [+ New note]                               │
└────────────────────────────────────────────┘

open note:
┌ 2.75rem bar: ←   Saved   Publish   ⋯      ┐
│ Title (28 px, editable)                    │
│ Prose (17 px) fills                         │
│ chips …                                    │
│ 19 words · Saved                           │
│ [Context] opens a bottom sheet             │
└────────────────────────────────────────────┘
```

- Below `lg`, history and page swap. Back returns to history at the same scroll
  position.
- The context sheet has four tabs, horizontally scrollable. Do not add a
  `More` tab until a fifth tab is proposed.

---

## 4a. Capability map — all 47 gallery scenes

A redesign may move or rename a scene, but it may not silently delete a
capability. Every scene in `doc/screenshot/manifest.json` keeps one functional
home and one behavioural path.

| Gallery area | Scenes | New home | Must still work |
| :--- | :--- | :--- | :--- |
| `note` | `compose` | Blank page from `New note`; renamed from `capture/composer` | Full-page writing, extraction preview, one primary |
| `chat` | `thread` | Chat rail tab / full chat surface | Encrypted conversation, composer, encryption notice |
| `editor` | `add-detail`, `extraction-review`, `property-chips`, `property-edit`, `publish-panel`, `template-selector` | Inline chips; `PropertyEditor` popup; extraction review; publish disclosure; template selector | Typed detail controls, ontology hints, validation, accept/reject, publish summary, save-as-template |
| `matching` | `results` | Context `Matches` tab | Request ↔ offer score, reasons, respond |
| `mobile` | `notes` | History home; page after selection | Single-column list, open/back, touch targets |
| `modals` | `command-palette`, `help` | One `Cmd/Ctrl+K` palette; one help surface | Note/command search, shortcuts reference |
| `network` | `connect-identity`, `feed` | Explore overlay scope; identity strip; identity setup | Public read-only feed, add identity, relay status, publish/reply/fork/chat |
| `next-steps` | `applied`, `drawer-open`, `empty`, `mobile`, `multiple`, `single`, `stale`, `zero-match` | Context `Next steps` tab; existing drawer | Suggest, apply, undo, stale refresh, empty suppression, mobile touch targets |
| `note` | `chat`, `context`, `detail`, `replies` | Page + context tabs | Open note, matches, replies, chat, one primary |
| `notes` | `board`, `empty`, `grid`, `map`, `timeline`, `trash` | History + `Arrange`; empty home | Board, Canvas, Map, Timeline, Trash restore/delete, first-run entry |
| `search` | `explore`, `overlay` | One overlay with Search / Explore / Chat scopes | Search notes, public notes, commands |
| `settings` | `appearance`, `general`, `labels`, `network`, `networks`, `ontology`, `skills` | Settings directory, same tabs and deep links | Theme/density/accent, profile, labels, Nostr/network, providers/relay, ontology graph, skills |
| `suggestions` | `empty-state`, `job-request-missing-budget`, `multiple-suggestions`, `offer-missing-contact`, `recurring-request-missing-schedule`, `urgent-request-missing-deadline` | Inline `Next steps` + context tab | Deterministic rules, multiple cards, suppression when no trigger |

### Scene rules

- Every scene in the table is regenerated or replaced by a scene that shows the
  same capability. No area disappears from `doc/screenshot/README.md`.
- Renames are allowed when the name describes the new home:
  `capture/composer` → `note/compose`,
  `editor/property-inspector` → `editor/property-edit`.
- A scene that only proved an old surface may be deleted after its capability
  has a journey: for example, a screenshot of the floating inspector is not a
  capability, but “edit a detail” is.
- The scene count must not shrink below 47. New scenes are welcome; a lower
  count requires a written mapping for every removed scene.
- Beyond the UI, this pass touches nothing: matching, parsing, ontology,
  network providers, agent tools, CLI, and simulator stay intact. No capability
  outside the shell may be used as a reason to keep a duplicated UI surface.

### Removed surface → functional replacement

| Removed surface | Capability it carried | Still available from |
| :--- | :--- | :--- |
| Full-screen `CaptureComposer` | Type a note, extract details, keep | `New note` → blank page → keep |
| Hero omnibox | Quick capture from first run | `New note`, `Cmd/Ctrl+N`, empty-page prompt |
| Floating `InspectorSidebar` | See/edit all properties, validation, hints | Inline chips, `Add detail`, `PropertyEditor` popup |
| Bar `Details` control | Open the details surface | Inline chips + `Add detail` |
| Nested `Replies / Chat` toggle | Replies and chat for a note | Context `Replies` and `Chat` tabs |
| Five-button mode switcher | List, Canvas, Board, Map, Timeline | One labelled `Arrange` menu |
| Separate `HelpDialog` | Shortcut reference | One help surface with shortcuts |
| Always-open context rail | Next steps, matches, replies, chat | `Context` control + badge; drawer |
| Old settings cards | Every settings control | Same tabs, one `SectionHeader` / `Field` / card grammar |

---

## 4b. Architecture and composition

The design will keep changing. The architecture must make the next change
cheaper, not harder. The goal is not a component library. The goal is a small
set of general units that can be recomposed into a different UI without
rewriting the app.

### Layers

```
tokens          theme.css, type.css, palette.css
primitives      Button, Modal, Chip, Field, Tabs, ResizablePane
patterns        WorkspaceFrame, PageSurface, ListRow, ArrangeMenu, IdentityStrip
surfaces        NoteIndexPanel, NoteDocument, ContextRail, SettingsPanel
screens         NotesWorkspace, SettingsView, ExploreOverlay
shell           AppShell, routes, global bar
config          uiSurfaces.ts, storage keys
hooks/services  note index, document, publish, matches, chat
```

Directions:

- `tokens → primitives → patterns → surfaces → screens → shell`.
- `config → all` as data only.
- `hooks/services → surfaces and screens`, never into primitives or patterns.
- One-way imports. No primitive imports a hook. No pattern imports a surface.
  No surface imports a screen. No screen imports another screen.
- A screen may compose surfaces. A surface may compose patterns and primitives.
  A pattern may compose primitives. Nothing imports upward.
- The shell owns routing and layout. It does not own note editing, publishing,
  or matching.

### Component contracts

- **Presentational components** accept `data`, `actions`, `slots`, and a small
  `variant` / `tone` / `density`.
- Use slots (`header`, `children`, `footer`, `aside`) instead of layout flags.
  Avoid `showSidebar`, `isNarrow`, `hasHeader`, and similar booleans.
- Use `variant` only when appearance changes. Do not build a 20-prop
  `UniversalPanel`.
- **Hooks return a model**, not JSX: `{state, actions, derived}`. No Tailwind
  classes, no components, no DOM in a hook.
- **Pure reducers/selectors** own the index composition:
  `selectIndex(notes, {subset, arrangement, order, query, location})` returns
  `{items, counts, hidden, disabledOrders}`. Test it with plain objects.
- Never fetch, persist, or subscribe inside a presentational component.

### Extraction map

Do this only in files the redesign already touches. Do not start a global
refactor.

| Current | New units | Gain |
| :--- | :--- | :--- |
| `NotesView` (231 lines) | `NotesWorkspace`, `NoteIndexPanel`, `NoteDocument`, `useNoteIndex` | Index and page compose independently |
| `EditorManager` (358 lines) | `NoteDocument`, `NoteBar`, `NotePage`, `useNoteDocument` | Document can render without the shell |
| `NoteContextRail` (232 lines) | `ContextRail`, `ContextTabs`, `NextStepsPanel`, `MatchesPanel`, `RepliesPanel`, `ChatPanel` | Each possibility is a unit |
| `PropertyEditor` (511 lines) | `DetailForm`, `DetailSourcePicker`, `DetailValueField` | Same form reused by chips and next steps |
| `Header` (156 lines) | `GlobalBar`, `NotesIndexHeader`, `ArrangeMenu` | Global and index chrome separate |
| `SettingsView` (154 lines) | `SettingsDirectory`, `SettingsPanel`, `SettingsSection` | Same grammar for every tab |
| `Overlay` / `EnhancedCommandPalette` | Do not rewrite now | Out of scope; split only when touched |

### Layout primitives

- `WorkspaceFrame`: CSS grid with `top`, `start`, `center`, `end` slots.
  The center is `minmax(50%, 1fr)`; panes are percentage shares.
- `ResizablePane`: one implementation, keyboard separator, persisted share.
- `PageSurface`, `PageTitle`, `PageMeta`: the note page can be reused by a
  future full-screen mode or embedded view.
- `ListRow`, `Section`, `Field`, `ContextPanel`, `SurfaceTabs`, `ArrangeMenu`,
  `IdentityStrip`.
- Avoid a generic `Card` unless two surfaces use it. Avoid a `Kit` file that
  becomes a second application.

### State ownership

| State | Owner | Not in |
| :--- | :--- | :--- |
| Route, active view, selection | shell | page components |
| Subset, arrangement, order, shares, query | `useNoteIndex` | `NotesWorkspace` render |
| Dirty note, save, publish, privacy | `useNoteDocument` | `NotePage` / bar |
| Context tab, counts, chat target | context hooks | `NoteContextRail` render |
| Theme, density, toasts | existing global contexts | every component |

Do not add a new global context for layout. Do not put note logic in the shell.

### Composition gallery

`ui/src/dev/KitGallery.tsx`, available at `#/kit` or `?kit=1`. It renders:

- tokens and sample type at three widths;
- primitives and states: default, hover, focus, disabled, error, loading;
- patterns and presentational surfaces: `PageSurface`, `PageTitle`, `PageMeta`,
  `DetailChips`, `FeedRow`, `IdentityStrip`, `ArrangeMenu`, `SettingsSection`;
- both themes and both densities.

No app state, no router, no notes store. Fixed fixtures. Use it to compose the
next design without touching a surface. If a unit is not in the gallery, it is
not a system unit.

### Architecture guardrails

`scripts/check-ui-layers.mjs` in `pnpm check:ui`:

- primitives cannot import `hooks/`, `contexts/`, `services/`, or runtime
  `@notention/core`;
- patterns cannot import `contexts/`;
- no new `*.module.css` under `ui/src/components`;
- a touched file over 250 lines must split or carry a short justification.

Record existing violations once and freeze them; the check fails only on new
ones. Do not block on architectural purity. Guard the direction, not every edge.
A unit is “reusable” when it has at least two expected uses, or one clear
composition seam with a gallery entry. Do not extract a one-off.

### Non-goals

- No Storybook.
- No CSS-in-JS or new styling runtime.
- No state library.
- No mass rename or file move for symmetry.
- No second design system.

### Per-workstream architecture gain

Each workstream must leave at least one reusable unit and one smaller surface.

| Workstream | Reusable unit | Monolith reduced |
| :--- | :--- | :--- |
| W31.1 | `PageSurface`, `PageTitle`, `ResizablePane` | `TiptapEditor`, `EditorHeader` |
| W31.2 | `WorkspaceFrame`, `NoteIndexPanel`, `useNoteIndex` | `NotesView` |
| W31.3 | `useNoteCreation`, `NotePage` focus path | `AppShell`, `NotesView` |
| W31.4 | `DetailForm`, `DetailSourcePicker` | `PropertyEditor` |
| W31.5 | `ContextRail`, `ContextTabs` | `NoteContextRail` |
| W31.6 | `ArrangeMenu`, `ListRow` | `Header`, `NotesView` |
| W31.7 | `IdentityStrip`, `FeedRow` | `NetworkFeedHeader` |
| W31.8 | `SettingsDirectory`, `SettingsSection`, `Field` | `SettingsView` |
| W31.9 | one `theme.css` token layer | `index.css` |

If a workstream cannot name its reusable unit, it is a patch, not an
architecture gain.

---

## 5. Workstreams

### W31.0 — Grammar, tokens, and guards

Small, no intended visual change. Do this only for the items the page and
history workstreams need.

- Extend `ui/src/config/uiSurfaces.ts`:
  - `NOTE_RAIL_TABS`: `next`, `matches`, `replies`, `chat`.
  - `NOTE_BROWSE_MODES`: List, Canvas, Board, Map, Timeline; List first.
  - `NOTE_SORT_ORDERS`: the ten `SortOrder` values from `@notention/core`,
    with labels and direction. The UI must not carry a second hardcoded list.
  - `ARRANGE_GROUPS`: layout, order, group. One popover, three sections.
  - Keep `SETTINGS_GROUPS` as the only settings directory.
- Add storage keys for `historyShare` and `contextShare`; keep `notesMode` and
  `sortOrder`. Persist percentages, never pixel widths.
- Add to `theme.css` / `type.css`:
  - `--page-pad`, `--page-measure`, `--chrome-height`, `--text-page`,
    `--text-page-title`, `--text-page-h2`.
  - `--history-share`, `--context-share`, `--pane-handle`.
  - one `PageTitle` treatment, one `PageMeta` treatment.
- Add primitives only where a second use is already visible:
  - `ListRow` (history row, feed row, settings row).
  - `Field` (label 11 px, hint 11 px, error 11 px, control 13 px).
  - `ContextPanel` (rail section with a title and one line of help).
  - `SurfaceTabs` (the rail, ontology, and compact surfaces) — shipped as the
    `kit` `Tabs` primitive with a size variant; no second tab grammar.
  - `ResizablePane` (percentage share, drag handle, keyboard separator,
    double-click reset, persisted value). Use it for history and context.
- Add composed patterns under `ui/src/components/patterns/`:
  - `WorkspaceFrame` with `top`, `start`, `center`, `end` slots.
  - `PageSurface`, `PageTitle`, `PageMeta`.
  - `ArrangeMenu`, `IndexHeader`, `IdentityStrip`.
  - Patterns may import primitives; primitives may not import patterns.
- Add one dev-only composition gallery, `ui/dev/KitGallery.tsx`, behind
  `?kit=1` or `#/kit`. It renders tokens, primitives, and patterns in both
  themes and three widths with fixed fixtures. No app state.
- Add `scripts/check-ui-layers.mjs`, then wire it into `package.json` as
  `lint:ui-layers` and into `check:ui`:
  - primitives cannot import `hooks/`, `contexts/`, `services/`, or runtime
    `@notention/core`;
  - patterns cannot import `contexts/`;
  - no new CSS module under `ui/src/components`;
  - touched files over 250 lines must split or state why not.
- Guardrails in `scripts/check-type-scale.mjs` or a sibling check:
  - no `text-xl` or `text-[20px]` in settings tabs;
  - no new `bg-neutral-800` / `bg-neutral-900` in `ui/src/components`;
  - no new `text-white` in `ui/src/components`;
  - no new `max-w-[40rem]` on the editor;
  - no fixed pixel width on history or context panes; use a share.
- Acceptance: typecheck, `lint:type`, layer check, gallery builds, and
  screenshots unchanged.

### W31.1 — The page (P0, highest visual impact)

This is the first workstream after the grammar because it fixes the first
screenshot.

Files: `index.css`, `styles/type.css`, `editor/TiptapEditor.tsx`,
`editor/EditorContent.tsx`, `editor/EditorHeader.tsx`,
`editor/EditorManager.tsx`, `editor/EditorStatusBar.tsx`,
`editor/TiptapToolbar.tsx`, new `patterns/PageSurface.tsx`,
`patterns/PageTitle.tsx`.

- Remove the 40 rem centered card. The editor pane becomes a full-height sheet
  with no `border-inline`, no `margin: auto`, and no `max-width` on the sheet.
- Keep prose readable: left-aligned, `max-width: min(100%, 88ch)` and
  `padding-inline: clamp(1.5rem, 5vw, 4rem)`. At 1440 with the rails open, the
  prose occupies ~86% of the sheet; at narrower widths it fills.
- Move the title from the bar into the page:
  - 30/36 px on desktop, 28/34 px on mobile, weight 600–650, tracking -0.03em.
  - It is an input, labelled “Note title”, with a placeholder of “Untitled note”.
  - It does not autofocus when the note has content; it does autofocus on a new note.
- Raise the body to 17 px / 1.7. Headings 26/21/18 px. Paragraph spacing 0.8 rem.
  Stretch the document vertically: the sheet is `min-h-full`, the editor area
  is `min-h-0 flex-1`, and the page scrolls inside it.
- Collapse chrome to one `3rem` bar:
  - back, saved state, `Publish`, overflow.
  - `Publish` is the only primary.
  - privacy, details, and export move into overflow or the page.
- Formatting:
  - keep the selection bubble (`EditorBubbleMenu`);
  - keep one compact `+` / `Add detail` control at the page top;
  - hide the `2.75rem` toolbar row by default, or make it a `2.25rem` row that
    appears while the editor has focus;
  - keep headings, lists, quote, code, and divider in the bubble/slash menu.
- Remove the separate status row. Saved state and word count render at the end
  of the page, 11 px, muted. The bar shows only the transient “Saving…” state.
- `` `.ProseMirror` `` becomes the page surface:
  ```
  background: var(--app-surface);
  color: var(--app-text-secondary);
  padding: var(--page-pad);
  font-size: var(--text-page);
  line-height: 1.7;
  ```
  The editor wrapper, not the prose, owns the full width and background.
- Extract the page frame into `PageSurface` and `PageTitle`. `TiptapEditor`
  stops owning the page title, width, and status. `EditorContent` composes the
  page; it can render without the app shell.

**Acceptance:** with no sidebar, the page fills ≥ 88% of the workspace; with the
history rail at its `22%` default, the page still fills its own pane. At 390 px
there is no horizontal overflow. Body is ≥ 17 px; title is ≥ 28 px. The only
chrome above the prose is one bar. `PageSurface` renders in `KitGallery` with no
app state. The golden-path, editor, and axe journeys pass.

### W31.2 — History and the page together (P0)

Files: `views/NotesView.tsx`, new `sidebar/NoteHistoryRail.tsx`,
`sidebar/NoteListItem.tsx`, `layout/Header.tsx`,
`contexts/ViewNavigationContext.tsx`, `hooks/useUrlRouting.ts`,
`config/uiSurfaces.ts`, `hooks/data/useNotesData.ts`, new
`hooks/useNoteIndex.ts`, `patterns/WorkspaceFrame.tsx`,
`patterns/IndexHeader.tsx`.

- Split `NotesView` into `NotesWorkspace` (layout) + `NoteIndexPanel`
  (presentation) + `NoteDocument` (page) + `useNoteIndex` (state).
- `useNoteIndex` owns subset, arrangement, order, query, shares, counts, and
  disabled orders. It returns a model, not JSX. `selectIndex` is a pure selector
  that composes the axes and returns `{items, counts, hidden, disabledOrders}`.
- On `lg+`, Notes is a `WorkspaceFrame` with a history rail and a page:
  - history: search, section chips, `New note`, rows, `Arrange`, resize handle;
  - page: the open note, or the current arrangement when no note is open;
  - context is the optional third pane, not part of the base layout.
  - the history rail never disappears when a note opens.
- History width is a share, `22%` default, `16%–30%` range. It is resizable and
  the value persists as a percentage. The page keeps at least `50%`.
- Make List the default. Migrate the stored `notesMode` only if it is the old
  default `canvas`; do not override a deliberate choice of Board, Map, or Timeline.
- History row:
  - one line title (13 px medium), one line preview (12 px muted), one meta line
    (11 px): time, privacy, unread/badge;
  - `3.25–3.75rem` tall; active row uses `--app-hover` and a left accent edge;
  - click keeps the rail and swaps the document;
  - `Esc` clears selection and returns focus to the active row.
- Arrange:
  - one `Arrange` control at the top of the history or main pane, labelled with
    the current state (`List · Updated`);
  - Layout: List, Canvas, Board, Map, Timeline;
  - Order: all ten `SortOrder` values; Updated desc is the default;
  - Group: board status, timeline bucket, map location; List uses the active order;
  - changing one axis never resets the others or closes the note.
- Subsets:
  - All, Tasks, Tags, Trash are the base subsets; the search field narrows any
    of them;
  - the result count is visible next to the subset;
  - a new subset may be added as a config entry, not a new sidebar row.
- Remove the inline capture hero from the list. `New note` in the history rail
  and `Cmd/Ctrl+N` are the entries.
- Mobile: list is home, page replaces it, back restores history scroll.

**Acceptance:** at 1440, open a note and edit it while the history remains
visible and scrolled to the same place. The history can be resized by pointer
and keyboard, clamps before the page reaches `50%`, and the share survives
reload. All five arrangements and all ten sort orders are reachable from
`Arrange`; changing them does not reset the note. `selectIndex` is unit-tested
with plain notes; `NoteIndexPanel` renders in `KitGallery` with no app context.
At 1024 and 390, no horizontal overflow and no lost selection. Selecting a note
updates the URL and survives refresh.

### W31.3 — New note is a blank page (P0)

Files: `components/capture/CaptureOmnibox.tsx`,
`components/capture/CaptureComposer.tsx`, `editor/EditorManager.tsx`,
`components/AppShell.tsx`, `hooks/useKeyboardShortcuts.ts`, `views/NotesView.tsx`.

- `New note` and `Cmd/Ctrl+N` create an untitled note immediately, select it,
  and place the cursor in the title or first line. Do not open a modal.
- The blank page is the writing surface: one placeholder, one line of hint
  (“#tags or key: value add structure”), and the normal editor.
- `Ctrl/Cmd+Enter` saves and returns to history. `Shift+Enter` inserts a line.
- Delete the full-screen `CaptureComposer` surface. Keep its extraction logic
  in the editor path. If a mobile-specific expanded entry is ever needed, it is
  the same page, not a second component.
- Remove the hero omnibox and its sample-workspace link from `NotesView`.
  The empty workspace shows one line and one `New note` button.
- Do not remove the heuristic extraction preview; move it under the title or
  into the details line so it does not push the page down.
- Rename the `capture/composer` scene to `note/compose`, and keep the same
  capability in the gallery: full-page writing, extraction preview, one primary.

**Acceptance:** one visible way to create a note (`New note`), one keyboard
path (`Cmd/Ctrl+N`), and no capture modal. A new note is focusable and editable
within one frame. Existing capture journeys are rewritten to the page. The
`capture` capability remains in the scene map.

### W31.4 — Details live in the page (P0)

Files: `editor/EditorControls.tsx`, `editor/InspectorPanel.tsx`,
`editor/TiptapToolbar.tsx`, `editor/PropertyEditor.tsx`,
`editor/PropertyChip.tsx`, `note/NoteContextRail.tsx`, `next-steps/*`, new
`patterns/DetailForm.tsx`, `patterns/DetailSourcePicker.tsx`,
`patterns/DetailValueField.tsx`.

- Remove the floating `InspectorSidebar` from `EditorManager`, and delete its
  open/toggle state and `MobileBackdrop` usage if nothing else needs it.
- Delete the bar `Details` control. The page shows the note's chips under the
  title / first paragraph, with one `+ Add detail` chip at the end.
- One insertion path: toolbar `Add detail`, slash command, or the inline `+`.
  One edit path: click any chip. Both open the same `PropertyEditor` popup.
- Rebuild `PropertyEditor` as a thin container around `DetailForm`,
  `DetailSourcePicker`, `DetailValueField`, `Modal`, `SectionHeader`, and
  `Field`; use one `Segmented` source picker for `Extract / Locate / Map`. No
  card-in-card, no ad-hoc 18 px title, no old blue buttons. Each unit renders in
  `KitGallery`.
- Make `Next steps` apply and inspector edit use the same editor. There is no
  second detail form.
- Keep the chips keyboard reachable: `Tab` to chip, `Enter` to edit, `Escape`
  to close the popup and return focus to the chip.

**Acceptance:** no floating panel overlaps the page. `Add detail` and chip edit
open one form. The page shows existing details without opening anything. The
`editor/property-inspector` scene becomes `editor/property-edit` and still shows
typed widgets, ontology hints, validation, and the same edit result. The details
journey passes on the chip path.

### W31.5 — One context rail (P1)

Files: `note/NoteContextRail.tsx`, `config/uiSurfaces.ts`,
`chat/ChatPanel.tsx`, `chat/ChatWindow.tsx`, `chat/ContactList.tsx`,
`editor/EditorManager.tsx`, new `patterns/ContextRail.tsx`,
`patterns/ContextTabs.tsx`.

- Split `NoteContextRail` into `ContextRail` + `ContextTabs` + one panel per
  tab. Each panel owns its own empty state and actions.
- Add `Chat` as a fourth top-level rail tab. Delete the nested
  `Replies / Chat` toggle (`NoteContextRail.tsx:44`).
- Pass the note contact into `ChatPanel`; when the panel is inside the rail,
  suppress its duplicate conversation heading. The rail tab is the title. When
  chat is active, expand the rail or open a sheet.
- Rail behaviour:
  - `20%` default share, `15%–26%` range; resizable by pointer and keyboard;
  - full-width bottom sheet below `lg`, not resizable;
  - closed by default when the note has no context;
  - one `Context` control in the bar with a dot/count;
  - open state and share persist across reload;
  - `Esc` closes the sheet/rail without closing the note.
- Tabs: 12 px labels, counts at 11 px, `2.25rem` height. No second row.
- Empty states: one line, 12 px, no nested explanation. `Next steps` empty is
  “No next step yet. Add a detail.” Matches empty is “No matches yet.”
- Chat gets one composer, one bubble treatment, one send action.

**Acceptance:** reply, chat, and detail editing each have one entry. No rail
tab contains a second surface toggle. The rail resizes by pointer and keyboard
without squeezing the page below `50%`. At 390 px the four tabs fit or scroll
horizontally without truncating labels.

### W31.6 — List, browse views, and card polish (P1)

Files: `sidebar/NoteListItem.tsx`, `sidebar/NoteGridItem.tsx`,
`views/NotesView.tsx`, `config/uiSurfaces.ts`, `layout/Header.tsx`,
`hooks/data/useNotesData.ts`, new `patterns/ArrangeMenu.tsx`.

- `Arrange` from W31.2 is the only layout/order control. Do not add a second
  switcher in the bar or in the main pane.
- Default: List, Updated desc. List rows use the same `ListRow` primitive as
  history and settings. Polish the row density and active state.
- Canvas cards:
  - title 15 px, preview 13 px, one meta line;
  - no more than one accent mark per card;
  - keep pin/import/privacy, drop decorative glyphs.
- Board columns and timeline rows share the same row chrome.
- Map and timeline keep their existing behaviour; this pass changes their
  chrome, not their data.
- The arrangement, order, and group stay stored and routable. A changed axis
  never resets the others.

**Acceptance:** a first-time user can name the current arrangement and order
and change either. List + Updated loads by default for a fresh profile. All
five arrangements render and keep their URLs. The index keeps its subset,
arrangement, and order after reload.

### W31.7 — Explore, search, and chat (P1)

**Landed.** `IdentityStrip` and `FeedRow` exist and own the identity line and
the row grammar. The overlay has one search field and one scope row fed from
`PALETTE_SCOPES`. Explore is a strip (avatar, name, npub, relay chip, edit), a
chip panel for relay detail, one filter row, and compact rows. The read-only
state is one line. Chat has contact rows from `FeedRow`, one composer, and app
typography. `RelayStatusBanner` and `DiscoveredProperties` are deleted.

Files: `network/ProfileHeader.tsx`, `network/NetworkFeedHeader.tsx`,
`network/RelayStatusChip.tsx`, `network/NostrEventCard.tsx`,
`command/CommandPalette.tsx`, `chat/*`, `patterns/IdentityStrip.tsx`,
`patterns/FeedRow.tsx`.

- Search overlay:
  - one search field;
  - one scope row: Search / Explore / Chat;
  - no repeated product title inside the panel.
- Explore:
  - one compact identity/status strip: `2rem` avatar, name, truncated npub,
    relay chip, edit;
  - relay health is a chip on that strip, not a full card;
  - one filter row: domain chips + filter input; remove the extra
    “Feed filters” label and standalone tag chip row;
  - feed rows: identity 11 px, one property line, one action row; no card inside
    a card.
- Chat: contact list uses history rows; conversation uses the app's typography
  and one composer. It does not borrow the note document's structure.
- Keep the read-only public-feed state. It can be a single line on the strip.

**Acceptance:** a long npub truncates. Public feed, connect identity, fork, and
chat still work. One identity per overlay. No duplicate heading inside the
palette.

### W31.8 — Settings, overlays, and status (P2)

**Landed.** `patterns/SettingsDirectory.tsx` owns the roving-tabindex list and
`patterns/SettingsSection.tsx` wraps one `SectionHeader` plus its body.
`SettingsView` is directory + panel + tab switch, and every tab starts with the
same 15 px header. Tab-level cards and `animate-fade-in` are gone; the panel
supplies the surface. `styles/tone.ts` is the one tone map.

Left: the three hand-rolled overlays outside settings, and literal accent icon
colors inside tab bodies.

Files: `views/SettingsView.tsx`, `settings/*Tab.tsx`, `ui/Modal.tsx`,
`ui/ConfirmationModal.tsx`, `ui/Toast.tsx`, `layout/*Banner.tsx`,
`modals/HelpDialog.tsx`, `ui/KeyboardShortcutsHelp.tsx`, new
`patterns/SettingsDirectory.tsx`, `patterns/SettingsSection.tsx`.

**Also fixed in W31.7:** the context resizer sits outside the flex flow
(`absolute`), so the note page no longer overflows the viewport, and `Input`
accepts `wrapperClassName` so a field can size itself inside a row.


- Split `SettingsView` into `SettingsDirectory` + `SettingsPanel` +
  `SettingsSection`. A tab renders a list of sections; it does not own the
  directory, bar, or layout.
- Every settings tab starts with the same 15 px `SectionHeader`; remove all 15
  tab-level `text-xl` headings.
- Replace old neutral cards with `--app-surface`, `--app-line`, `--app-raised`.
- Standardise section spacing to `space-y-8`, field spacing to `space-y-3`,
  labels to sentence case, controls to 13 px.
- Use one `Field` for label + hint + error. Do not invent a second form row.
- Widen the settings content column only where it reduces empty space; do not
  add a second column for its own sake.
- One primary per tab. Toggles and selects are secondary.
- Replace every hand-rolled overlay with `Modal` or `ConfirmDialog`:
  backdrop below panel, panel `relative z-10`, focus trap, `Esc`, focus returns
  to the trigger.
- One help surface with a shortcuts section. Delete the duplicate launcher.
- One tone map for toast, banner, chip, and status, using `Chip` tones.

**Acceptance:** 0 `text-xl` headings in settings; one heading size; one card
style; all settings axe views pass in dark and light. The duplicate help
launcher is gone. No overlay intercepts its own buttons.

### W31.9 — CSS retirement, tests, and evidence (P2)

Files: `ui/src/index.css`, `ui/src/styles/theme.css`,
`ui/test/journeys/*`, `ui/test/showcase/*`.

- Inventory emitted classes in `index.css` against source. Delete dead rules.
- Move reusable rules into `theme.css`.
- Keep only:
  - editor prose and semantic widgets;
  - leaflet, calendar, scrollbar, skip link, print, reduced-motion fallbacks.
- Remove the old `.widget`, `.tag`, `.property-*` neutral blues if the new
  semantic chip styles replace them.
- Regenerate the affected screenshot groups. Add one `note/page` scene that
  proves the full-bleed page at 1440 and 390. Add one `notes/arrange` scene that
  shows `List · Updated` with the menu open and one alternate sort applied.
- Update `doc/screenshot/manifest.json` and `README.md` from the scene map in
  §4a. Rename moved scenes; do not drop an area.
- Run `pnpm check:ui` before merge.

**Acceptance:** `index.css` < 400 lines; no duplicate focus rules; visual diffs
are zero except intentional changes; screenshot gallery regenerated for changed
groups; the manifest still covers all 47 capabilities.

---

## 6. What gets deleted

Deletion is the point. If a row below survives, justify it in the PR.

| Remove | Replace with |
| :--- | :--- |
| 40 rem centered `.ProseMirror` card | Full-height page sheet |
| Note title in the bar | Editable page title |
| Separated editor status row | Inline saved + word count |
| Permanent 44 px formatting ribbon | Selection bubble + slash + compact insert row |
| Hero capture omnibox | `New note` / `Cmd+N` blank page |
| `CaptureComposer` modal | The page |
| Bar `Details` control | Inline chips + `Add detail` |
| Floating `InspectorSidebar` | Chip editor popup |
| Nested `Replies / Chat` toggle | `Chat` rail tab |
| Five-button mode switcher in the bar | Labelled `Arrange` menu |
| Always-open empty context rail | Context control + badge |
| Duplicate help modal | One help surface |
| Legacy neutral settings cards | Token surfaces |
| Dead `index.css` rules | Under 400 lines |

Capability must not disappear. Each old path has one home, and §4a maps every
gallery scene to that home. This table is the summary; the scene map is the
proof.

| Capability | Home after this pass |
| :--- | :--- |
| Create a note | `New note`, `Cmd/Ctrl+N`, blank page |
| Browse notes | History rail, List, `Arrange` |
| Sort / arrange / subset notes | `Arrange` (layout, order, group), section chips, search |
| Open a note | History row; page in place |
| Edit title / prose | Page |
| Add / edit details | `Add detail`, slash, chip popup |
| Next steps | Context tab |
| Matches | Context tab |
| Replies / chat | Context tabs |
| Publish | Bar primary + disclosure |
| Search / public notes | `Cmd/Ctrl+K` overlay |
| Settings | Full screen, directory |
| Accessibility | Tabs, labels, focus return, axe |

---

## 7. Test policy

Keep tests that protect behaviour:

- golden path: new note, type, keep, open, search, settings deep link, replies;
- publish and relay isolation;
- next-steps apply and accessibility;
- mobile open/back and context sheet reachability;
- axe in dark and light on Notes, Note, Settings, Skills.

Relax or delete tests that encode the previous composition:

- exact page colours and `40rem` widths;
- exact settings copy and heading sizes;
- layout that assumes two stacked headers or a floating inspector;
- screenshots as assertions;
- mode-switcher button selectors after the `Arrange` menu replaces them.

Add a behavioural test only where a consolidation could remove a capability:

- `New note` creates a focusable page and no modal exists;
- the history rail keeps its selection and scroll while the page scrolls;
- the history keeps its subset, arrangement, and order after reload;
- all ten sort orders produce deterministic order and all five arrangements
  remain reachable;
- resizing a sidebar updates a percentage, clamps at the `50%` page floor, and
  survives reload; arrow keys move the separator;
- `selectIndex` composes subset × arrangement × order with plain note objects;
- every primitive and pattern renders in `KitGallery` without app context;
- `check-ui-layers` reports zero new violations;
- `Details` is reachable from a chip after the inspector is removed;
- `Chat` is reachable as a top-level rail tab after the nested toggle is removed;
- `Escape` returns focus to the history row or the chip that opened a popup.

Do not let a brittle test block a P0 visual change. If it asserts the old
composition, delete or skip it in the same change and note the behavioural
coverage that replaces it.

---

## 8. Order of execution

1. **W31.0** — grammar, tokens, guards. No visual change.
2. **W31.1** — the page. Largest visual gain, independent of navigation.
3. **W31.2** — history + page together. The product shape changes here.
4. **W31.3** — new note is a blank page. Removes the last capture modal.
5. **W31.4** — details in the page. Removes the three-door problem.
6. **W31.5** — context rail. Removes the nested toggle and the always-open rail.
7. **W31.6** — list, browse views, card polish.
8. **W31.7** — explore, search, chat.
9. **W31.8** — settings, overlays, status.
10. **W31.9** — CSS retirement, tests, evidence.

Do not start W31.2 before W31.1 passes its width and font acceptance. Do not
start W31.5 before W31.4 removes the floating inspector, or the rail will keep
two detail paths.

Each workstream lands with:

- `pnpm --filter @notention/ui typecheck`
- `pnpm lint:type`
- `pnpm lint:ui-layers`
- its new units added to `KitGallery`
- the focused journeys for the changed surface
- a regenerated screenshot group
- `pnpm check:ui` before merge

---

## 8a. Smallest path to the result

Do not build all ten workstreams to learn whether the paradigm works. Build the
center and the index, look at them, then decide.

### The one-day spike

One branch, no new dependencies, no settings/explore/CSS rewrite:

1. **Page**: W31.1. Remove the centered card, move the title into the page,
   raise the type, collapse to one bar.
2. **Index**: W31.2, but with a fixed share first. Use the existing list, board,
   map, and timeline components. Do not build resize, persistence, or all ten
   order options yet.
3. **Blank note**: W31.3. `New note` selects a blank page; keep the hero omnibox
   temporarily if removing it costs a test rewrite.
4. **Details**: W31.4. Remove the floating inspector; keep the chips + popup.
5. **Stop.** Do not touch settings, explore, chat, or `index.css`.

This is enough to see the note as the page, the index on the left, and context
on the right. It is also enough to feel whether the center is too narrow, the
type too large, or the index too heavy.

### Decision gate

Take three screenshots — 1440 with both panes, 1440 with context closed, 390
with list and note — and ask one person who has not read this document:

| Question | Pass |
| :--- | :--- |
| What is the main thing on this screen? | “The note” / “the writing” |
| Where do you find another note? | The left index |
| How would you sort or rearrange notes? | The `Arrange` label is discoverable |
| What is the primary action? | New note / publish, not a toolbar icon |
| Does anything look broken or floating? | No |

If the answer is “a chat app” or “a dashboard”, stop and revise the composition
before the remaining workstreams. Do not normalize settings to compensate for a
weak center.

### If you want zero code first

A 90-minute static page with the same tokens, seeded notes, one document, and one
`Arrange` popover is enough to compare proportions. Do not spend more than that;
the real page pass is cheap, and a static mock can hide real flex and scroll
problems.

### Low-effort substitutions

| Planned work | Cheaper equivalent | Why |
| :--- | :--- | :--- |
| W31.5 full rail rebuild | Existing rail + remove nested toggle + add Chat tab | Most of the rail already works |
| W31.6 card polish | Keep current cards; only default to List and host existing views | The differentiator is the index, not the card |
| W31.7 explore/chat rewrite | Keep current overlay; only compact the identity strip if it blocks the page | Secondary surface |
| W31.8 settings normalisation | Defer until the page + index are accepted | 15 tabs, low user impact |
| W31.9 CSS retirement | Delete only rules that block the page; inventory later | Classes still move |
| Custom resize from day one | Fixed share in the spike, `ResizablePane` after the gate | Resize is polish, not the idea |
| New primitives | `ResizablePane`, `ListRow`, `Field` only | Everything else can compose |

### Exceed without a new surface

Do not add these now. They are the natural next step if the core lands:

- **Saved index views**: a subset + arrangement + order saved as a note. This
  follows “everything is a note” without adding a destination.
- **Relevance to the open note**: sort the index by semantic similarity to the
  note being read, not only by text search.
- **Arrangement suggestions**: when a note set has dates or locations, offer
  `Timeline` or `Map` inside `Arrange`. Do not add a second control.

---

## 9. Success measures

Track before and after. Numbers are targets, not screenshot assertions.

| Measure | Now | Target |
| :--- | :--- | :--- |
| Note page share at 1440 | 640 px / ~1,119 px | ≥ 88% closed; ≥ 78% history at default; ≥ 58% both at defaults |
| Body font | 15.5 px | ≥ 17 px |
| Note title | 20 px, bar | ≥ 28 px, page |
| Chrome rows above prose | 3 | 1 |
| Chrome height | ~133 px | ≤ 3.5 rem |
| Default Notes mode | Canvas grid | List + history |
| History rail on desktop | absent | 22% share, persistent, resizable |
| Context rail | always open, fixed | 20% share, closed unless context, resizable |
| Resizable sidebars | 0 | 2, pointer + keyboard |
| Sort orders exposed in the UI | 0 of 10 | 10 of 10 |
| Arrangements exposed | 5 of 5 | 5 of 5, one `Arrange` control |
| Subsets | 4 sections + search | 4 sections + search, count visible |
| Entry points to detail editing | 3 | 1 insert + inline chips |
| Rail tabs with nested toggles | 1 | 0 |
| Settings tab headings at 20 px | 15 | 0 |
| Legacy neutral surfaces in settings | 80 | 0 |
| `text-white` in touched components | 65 files | 0 in touched files |
| Primary actions per surface | 2+ | 1 |
| `ui/src/index.css` | 1,249 lines | < 400 |
| Capabilities in the gallery map | 47 scenes | 47/47 with a named home |
| Touched files over 250 lines | `EditorManager` 358, `PropertyEditor` 511 | 0 without a split |
| New reusable units | 0 | at least 1 per workstream |
| Layer violations | not checked | 0 new; existing frozen |
| Component gallery | none | 1, both themes, 3 widths |
| `pnpm check:ui` | green | green |

Qualitative measures:

- A first-time user can point to “the note” in under three seconds.
- The note is the largest object on every note screen.
- Every possibility around the note — next step, match, reply, chat, publish,
  details — has one surrounding home and does not become a second center.
- Every capability in §4a is reachable without a removed surface.
- Every workstream names at least one reusable unit it leaves behind.
- Touched presentational components import no hooks, contexts, or services.
- The next design can be composed in `KitGallery` without the app state.
- No surface uses more than one heading size and one card style.
- Every empty state has one action or one sentence, not both.
- Every overlay closes with `Escape` and returns focus.
- No action exists only in a hover state.

## 9a. Edge cases to settle now

| Edge case | Rule |
| :--- | :--- |
| `Nearest` without location | Disable it with a hint: “Location needed.” Never silently fall back. |
| `Relevance` without a search term | Disable it, or use the open note as the relevance target. Do not return arbitrary order. |
| The open note falls outside the current subset | Keep the page open. The index shows the empty result and a “Clear filters” action. Never close the note. |
| A sort moves the selected row | Keep the note open. Scroll the index to the row only when it is still in the subset. |
| Board / Map / Timeline receives notes without the required property | Show the hidden count and a one-line reason. Do not silently drop notes. |
| Active Chat needs more than the rail | Chat is the one conversation. When active, expand it to a wider pane or full sheet; the rail remains the entry. |
| Resize, sort, or subset change while the note is dirty | Do not add it to note undo. Autosave the note; do not mark the note dirty. |
| Mobile | No resize. The subset, arrangement, and order survive rotation and reload. |
| Large note sets | Sort through the existing `NoteFilter` cache; do not sort on every render. |
| Naming | “History” is the working name. Test “Index” and “Notes” with the first users; ship whichever is understood without a sentence. |

---

## 10. Decisions

These replace the open questions in the previous draft. Decide from use, not
preference; do not add a surface to avoid a decision.

| Question | Decision | Reason |
| :--- | :--- | :--- |
| Where does `Details` live? | Inline chips + one popup editor. No rail tab, no floating sheet. | Details are part of the note. A tab would hide the thing the note is about. |
| Is capture a separate input? | No. `New note` creates a blank page; writing happens in the page. | A note is one description edited in place, not a transcript; one path, no modal. |
| Does Explore stay in the overlay? | Yes. | It is already reachable from `Cmd/Ctrl+K`; moving it again adds a destination. |
| Is the context rail always open? | No. Closed by default; opens from one `Context` control. | The note must dominate. A badge keeps matches and replies discoverable. |
| How many rail tabs on mobile? | Four, horizontally scrollable. | Labels are short; a `More` tab adds a layer before it is needed. |
| Does the note title stay in the bar? | No. The page owns the title. | The title is content, not chrome. |
| Is history only chronological? | No. Updated is the default order, not the only order. | Sets, arrangements, and sorts are the differentiator from a chat log. |
| How are sidebars sized? | Proportional shares, persisted as percentages, resizable by pointer and keyboard. | Fixed pixel widths do not survive viewport changes; the page must stay dominant. |
| Does Chat stay in the narrow rail? | It starts there, then expands to a wider pane or full sheet when active. | Chat is a conversation; the note is not. Do not cram a conversation into 20%. |
| Is it called History? | Working name only. Test “Index” and “Notes” before shipping copy. | History implies chronology; this surface is a semantic index. |
| Does the formatting ribbon stay? | Only as a quiet insert row or on focus. Selection bubble and slash carry the rest. | Permanent formatting chrome contradicts “the note is the page”. |
| Does the grid disappear? | No. It becomes one layout inside `Arrange`. | Capability stays; default attention does not. |

---

## 11. Risks and guards

| Risk | Guard |
| :--- | :--- |
| The page becomes an unreadably long line | Prose keeps a left-aligned `88ch` measure; the sheet fills, the text does not. |
| Architecture work delays the result | Spike first; extract only in touched files; no mass refactor. |
| Abstraction becomes a second framework | Two uses or one responsibility before extraction; no god props; gallery proves composition. |
| Layer guard blocks delivery | Freeze existing violations; fail only on new ones. |
| A resized sidebar squeezes the note | Proportional shares with a `50%` page floor; clamps stop the drag; mobile uses a sheet. |
| Users cannot find the note list | History is visible on every desktop note; `Esc` returns; back is always present. |
| Sort and arrangement stay hidden | `Arrange` shows `List · Updated`; all ten orders and five layouts are in one popover; one test per axis. |
| Removing the toolbar hides formatting | Selection bubble, slash menu, shortcuts, and a compact insert row. |
| Context becomes undiscoverable | One `Context` control with a count; auto-open on first match only if the user has no prior preference. |
| Stored `canvas` default fights List | Migrate only the old default; never override Board/Map/Timeline. |
| Autosave loses work on navigation | Keep debounce + flush on close; test select → edit → select. |
| Screenshot churn blocks work | One gallery run per milestone; generation is evidence, not a gate. |
| Settings rewrite becomes endless | Batch per group, one heading and one card style, screenshot each tab. |
| CSS deletion removes a needed leaflet/calendar rule | Keep the explicit allowlist; visual diff the map and timeline views. |

---

## 12. Fresh-session start

Read, in order:

1. `TODO31.md`
2. `TODO30.md`
3. `doc/UI_COMPOSITION.md`
4. `ui/src/index.css` and `ui/src/styles/theme.css`
5. `ui/src/components/editor/TiptapEditor.tsx`
6. `ui/src/components/editor/EditorHeader.tsx`
7. `ui/src/components/editor/EditorManager.tsx`
8. `ui/src/components/views/NotesView.tsx`
9. `ui/src/components/note/NoteContextRail.tsx`
10. `ui/src/config/uiSurfaces.ts`
11. `core/src/types/domain.ts` (`SortOrder`) and
    `ui/src/hooks/data/useNotesData.ts`
12. `doc/screenshot/note/detail.png`, `note/compose.png`, `notes/grid.png`,
    `editor/property-edit.png`

Before editing, read §4b and name the reusable unit this workstream will leave
behind. Do the §8a spike before the full workstream order. Run `pnpm dev`, open
`#/notes`, and put the note in the middle at full size before touching another
surface. The history is a semantic index: verify subset, arrangement, order, and
resizing before styling the page.

Do not add Inbox, Connections, a second sidebar, a floating inspector, or a
capture modal to solve a local problem. If a connection matters, it belongs to
the note. If an action matters, it belongs in the page or the bar. If it does
not, it belongs in overflow.

**The final test:** open the app, arrange the history as List · Updated (or
Board · Status, or Map · Nearest), resize it, open a note, and write. Nothing
should sit between the person and the sentence except a title, a page, and the
possibilities at the edge. Every capability in §4a remains reachable from the
surrounding layers.
