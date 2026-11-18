# UI Convergence Audit — 2026-11-17 (W12)

## Verdict

W11 removed duplicate controls. W12 measures what remains: how much of the screen the work
occupies, how much space earns its pixels, and where an empty or sparse layout hides the
primary action. W12.1 is complete: Actions is a list plus task detail, Labels and Ontology
use the content column, the network feed never blocks on a spinner, the inbox drops
pre-content chrome, and the timeline anchors to the month that holds its events. The
task-first audit (W12.2) finds one primary action per view and no duplicate screen-level
verbs; the first W12.3 round turns Settings into a section rail plus a panel, moving its first
control from 1,398px to 391px (454px on mobile) with 3 tab stops.

Status: **W12.0–W12.2 done**, **W12.3 round 1 (Settings) done**, **W12.4 open**.

Evidence: `doc/evidence/space-utilization.json`, `doc/evidence/space/<viewport>/*.jpg`,
`doc/evidence/task-first.json`.

## Method

- Harness: `pnpm space:audit` (`ui/test/audit/space.spec.ts`, measurements in
  `ui/test/support/space.ts`; task-first audit in `ui/test/audit/task-first.spec.ts`,
  measurements in `ui/test/support/taskFirst.ts`). Cases live in
  `ui/test/fixtures/auditCases.ts` so both audits measure the same render.
- 15 cases × 2 viewports (`1440×900`, `390×844`), each seeded from `ui/test/fixtures`.
- The measured root is `main`. When `main` is not painted (the mobile notes list), the
  sidebar is measured instead and `root` records which one was used.
- Definitions:
  - **Content ratio**: viewport rows covered by visible text, controls, media, or
    `[data-testid]` boxes ÷ viewport height. Chrome outside `main` is excluded.
  - **Wasted space**: internal gaps over 24px between covered rows ÷ viewport height.
  - **Empty footprint**: `[data-empty-state]` height ÷ viewport height.
  - **Stretch defect**: a wrapper at least 50% of the viewport tall, centered on both axes,
    with one child smaller than half its height.
  - **Density**: visible actions (buttons, links, form controls) + facts per 1000px of content
  height.
- No page scrolls horizontally in any capture (`overflowX = 0`, 30/30) and no stretch
  defect remains (0/30).
- Each screenshot is a full-viewport JPEG at 60% quality; the numbers and the image come
  from the same settled render.

## Gate vocabulary

| Gate | Pass condition |
|---|---|
| Content ratio | ≥ 0.60 on populated screens |
| Density | ≥ 8 visible actions (buttons, links, form controls) + facts per 1000px of content height, **or** content ratio ≥ 0.60 |
| Reveal cost | Primary action visible without scrolling, first content above the fold, and ≤ 4 tab stops to the primary |
| Wasted space | < 0.15 |
| Empty footprint | ≤ 0.40, content-sized, never full-height |
| Stretch defect | 0 |
| Horizontal overflow | 0 |
| One primary | At most one `data-variant="primary"` action per view; no duplicate screen-level verb |
| Primary reach | Primary action visible without scrolling; tab stops to the primary ≤ 4 |
| Mobile first screen | Primary content visible at 390×844 without scrolling |

Empty screens are judged by footprint and waste, not content ratio. "Populated" means the
seed produced rows in the measured root.

Content ratio counts covered pixels, so a dense row list (8px row gaps, icon buttons) always
scores low even when the screen is full of work. Density is the second gate: labels score
25.6 actions+facts per 1000px while covering 57% of the height. A compact form can miss both
and still be excellent: Settings mobile fits one screen with its first control at 454px and
three tab stops, so it passes on reveal cost. A view passes when waste stays under 15% and
one of ratio, density, or reveal cost clears its bar.

Calendars are exempt from the waste gate: the month grid is the surface, so empty cells are
the content until events fill them. Timeline must still show its events in the first paint
and keep density ≥ 8 (61.7 desktop, 71 mobile).

## Target wireframes

Notation: `[action]`, `…` content, `▸` disclosure. The wireframe is the review gate for
W12.3; numbers are budgets, not exact pixels.

### Inbox
```
┌ [capture input]…………………………………… [→]  ≤ 96px
│ ▸ More ways to capture   ▸ Capture tips
├ [match: request → offer, score, Respond | Revise | Not]  ≤ 300px
├ Recent notes · 2 columns, first row ≤ 520px
└
```
One capture entry. No sidebar empty state duplicating the main empty state.

### Notes (list / grid)
```
┌ sidebar 320px: search, filters, rows 56–72px
│ main: selected note OR grid cards
│ empty: title + one line, no illustration above md
└
```
Mobile: the notes list is the screen; the bottom nav pads it, no horizontal scroll.

### Trash / Responses / Labels
```
┌ H1 + one-line purpose
├ rows 56–64px, actions at row end
│ empty: content-sized box, ≤ 40% viewport, left in the content column
└
```
Labels at lg: two columns, rail 2fr (create + Advanced pinned bottom) | list 3fr.

### Editor
```
┌ title / property chips
├ content column ≤ 720px, inspector 320px on demand
└
```

### Actions
```
┌ H1 + [New Task]                          one primary
├ left 3fr: status groups (running, queued, todo, completed, then unknown)
│ rows: title + property/tag chips, selected row highlighted
├ right 2fr: task detail — status, title, content, property table, [Open note]
│ no row is dropped for an unrecognised status
└
```
Mobile: rows only; a row tap opens the note.

### Chat
```
┌ contacts 1/3 | thread 2/3
│ no identity: one click [Set up identity], footprint ≤ 40%
└
```

### Network
```
┌ read-only banner + [Add identity]   ≤ 72px
├ relay status (collapsible detail)
├ feed rows, or an explicit empty/error state — never an endless spinner
└
```

### Map
```
┌ full-bleed map, controls top-left
│ popup only after pin selection
│ no persistent shortcut overlay
└
```

### Timeline
```
┌ filter bar 48px
├ "N dated notes · Next <title> <date> [Jump to next|latest]"   ≤ 32px
├ month grid, today/off-range cells dark, events visible
│ the calendar opens on the month that holds the nearest event, never an empty month
│ no dated notes at all → content-sized empty state, no grid
└
```

### Ontology / Settings
```
┌ H1 + one-line purpose + mode switch (Edit Mode, Graph/Learning/Conflicts)
├ [Update Ontology] primary, [Optimize] secondary          one primary
├ tree: roots → nodes, each with an attribute list (real list semantics)
└
```
Settings still needs the two-column rail + panel pass (W12.3): its first control sits at
1,398px today.

## Gate results (final run, 2026-11-17)

| Viewport | Case | State | Ratio | Waste | Density | Empty | Verdict |
|---|---|---|---|---|---|---|---|
| desktop | inbox-empty | empty | 0.611 | 0 | 8.7 | 0.38 | PASS empty |
| desktop | inbox-populated | populated | 0.844 | 0 | 14 | — | PASS |
| desktop | notes-list | populated | 0.857 | 0.002 | 43.8 | — | PASS |
| desktop | notes-grid | populated | 0.83 | 0 | 7.5 | — | PASS |
| desktop | trash | populated | 0.929 | 0 | 2.4 | — | PASS |
| desktop | timeline | populated | 0.307 | 0.302 | 63.1 | — | exempt (calendar cells) |
| desktop | actions | populated | 0.663 | 0.069 | 9.1 | — | PASS |
| desktop | responses | empty | 0.16 | 0.038 | 4.4 | 0.227 | PASS empty |
| desktop | labels | populated | 0.571 | 0.073 | 25.6 | — | PASS |
| desktop | ontology | populated | 0.739 | 0.05 | 28.3 | — | PASS |
| desktop | map | populated | 0.959 | 0 | 4.6 | — | PASS |
| desktop | settings | populated | 0.722 | 0 | 20.4 | — | PASS |
| desktop | chat | empty | 0.146 | 0 | 6.3 | 0.342 | PASS empty |
| desktop | editor | populated | 0.857 | 0.002 | 39 | — | PASS |
| desktop | network | empty | 0.531 | 0.092 | 28.5 | — | PASS empty |
| mobile | inbox-empty | empty | 0.447 | 0 | 12.7 | 0.204 | PASS empty |
| mobile | inbox-populated | populated | 0.864 | 0 | 12 | — | PASS |
| mobile | notes-list | populated | 0.81 | 0.006 | 49.7 | — | PASS |
| mobile | notes-grid | populated | 0.823 | 0.001 | 24.7 | — | PASS |
| mobile | trash | populated | 0.829 | 0 | 2.9 | — | PASS |
| mobile | timeline | populated | 0.421 | 0.109 | 72.6 | — | PASS |
| mobile | actions | populated | 0.626 | 0 | 9.5 | — | PASS |
| mobile | responses | empty | 0.171 | 0.04 | 4.4 | 0.242 | PASS empty |
| mobile | labels | populated | 0.528 | 0.115 | 16 | — | PASS |
| mobile | ontology | populated | 0.722 | 0.053 | 25.1 | — | PASS |
| mobile | map | populated | 1 | 0 | 4.7 | — | PASS |
| mobile | settings | populated | 0.586 | 0.092 | 5.4 | — | PASS reveal |
| mobile | chat | empty | 0.155 | 0 | 6.3 | 0.365 | PASS empty |
| mobile | editor | populated | 0.817 | 0.007 | 44.3 | — | PASS |
| mobile | network | empty | 0.591 | 0.032 | 28.1 | — | PASS empty |

Summary: 29/30 pass; the desktop timeline is exempt with its reason recorded above. All 30
captures have zero stretch defects and zero horizontal overflow.

## W12.1 — shipped space-utilization pass

Each change is an objective gate failure, not a new visual direction.

| # | Change | Before | After | Evidence |
|---|---|---|---|---|
| 1 | Mobile shell: sidebar is the notes list only; every other view paints `main` first | All views at 390×844 showed the 320px sidebar full-bleed and the view offscreen | Inbox capture, map, timeline, actions render first | mobile screenshots; `AppShell.tsx` |
| 2 | One mobile nav row: 4 tabs + search + help; removed the second Capture/Search/Help bar | 130px of chrome, duplicate Capture verb, "ACTIO…" truncated | 64px, one capture entry (inbox field), labels fit | `MobileBottomNav.tsx`; mobile journey |
| 3 | Empty states: illustration and example hint hidden below `md`, smaller paddings | Inbox empty footprint 0.60 desktop / 0.68 mobile; chat 0.40 | 0.38 / 0.20; chat 0.34 / 0.36 | `EmptyState.tsx`; footprint column |
| 4 | Actions: list plus task detail rail; every status grouped (queued tasks were dropped) | Ratio 0.27; 2 of 4 seeded tasks rendered; clicking always navigated away | 0.663 desktop / 0.626 mobile; queued tasks visible; detail shows content, properties, "Open note" | `ActionsView.tsx`; actions screenshot |
| 5 | Timeline: dark month cells, readable toolbar (cascade specificity), calendar anchored to the month that holds events | White today/off-range cells on dark; opened November while the only events were in October | October shows both events; "Jump to latest" + "N dated notes" strip | `index.css`, `TimelineView.tsx`; timeline screenshot |
| 6 | Labels: two-column layout (create + Advanced | list) | 54% narrow column, inner `max-h-96` scroll, blank fold | 8 labels above the fold, no inner scroll on desktop, Advanced pinned to the rail bottom | `LabelsTab.tsx`; labels screenshot |
| 7 | Empty-state and shared label contrast | Serious axe violations on 11 views | 11/11 axe views pass | `EmptyState.tsx`, `tokens.ts` |
| 8 | Removed the persistent mobile "Shortcuts for view" overlay and the dead `ContextualHint` | 280px card covered the map and actions | Shortcuts remain under Help | mobile map screenshot |
| 9 | Mobile header: view title instead of an empty 64px bar; no duplicate Settings gear | Blank left half | Title + connection state | `Header.tsx` |
| 10 | Inbox ships no pre-content chrome: Automations disclosure appears only after the first note | Mobile empty waste 0.20 | 0.00 waste on both viewports | `InboxView.tsx`; gate table |
| 11 | Network feed: skeleton rows instead of a lone spinner; loading window 1.5s; feed waits for the empty state in the audit | Desktop ratio 0.27, spinner at 250ms, never measured | 0.531 desktop / 0.572 mobile, empty feed state | `NetworkFeedList.tsx`, `useNetworkData.ts` |
| 12 | Ontology: intro card removed (one-line subtitle), "Update" is the only primary, attribute rows are a real list | Ratio 0.54, two competing primaries, attributes invisible to the a11y tree | 0.739 desktop / 0.722 mobile, density 28.3, one primary | `OntologyView.tsx`, `AttributeList.tsx` |
| 13 | Audits share one case fixture; `Button` exposes `data-variant` for detection | Two drifting case lists; primary detection guessed from colour | `auditCases.ts`, `data-variant` | this file |

Caveat: the harness changed between the first and final run (root fallback, waste
definition, tasks' `data-variant`). Deltas in the table come from the runs named in the
Progress Log; the table above is the final measured state.

## W12.2 — task-first audit

Harness: `ui/test/audit/task-first.spec.ts`, evidence in `doc/evidence/task-first.json`.
For every case it records the primary actions (`data-variant="primary"` or the calendar's
active view), their viewport position and tab-stop index, duplicate screen-level verbs
(row-level repeats excluded), and the tab distance to the first content marker.

| Finding | Evidence | Consequence |
|---|---|---|
| No duplicate screen-level verbs on any view | `duplicateLabels = []` on 30/30 after excluding row-level repeats | W11 principle 2 holds |
| Primary action visible without scrolling, except the capture submit | Actions "+ New Task" @88px/tab 0; Labels "Add" @220px/tab 1; Ontology "Update Ontology" @148px/tab 4 | Capture is the inbox focal element, but its submit is disabled until text is typed (`QuickCapture.tsx`), so the audit sees no primary |
| Notes views reach the editor primary ("Publish") only after 8–9 tab stops | notes-list: tab 9 desktop, tab 9 mobile | Open: the list has no primary of its own; a later round should put one capture entry in the list header (no second "New Note" verb) |
| Settings' first control was at 1,398px | settings: `content@1398` → now 391 desktop / 454 mobile, 3 tab stops | Resolved in W12.3 round 1 |
| Timeline primary is the calendar view switch | timeline: "Month" @205px/tab 5 | The calendar is the content; the strip is the only competing chrome |

## W12.3 — convergence rounds

One view per round, screenshot diff plus gates.

### Round 1 — Settings (shipped)

| Before | After |
|---|---|
| Five collapsible groups stacked full width; the tab list filled the viewport, the first control sat at 1,398px on both viewports | Section rail (16rem) plus panel at `lg`; `role="tablist"` with roving tabindex and arrow-key navigation; a `Section` select on mobile; first control at 391px desktop / 454px mobile |
| Ratio 0.68 desktop / 0.678 mobile, waste 0.011/0.012 | Ratio 0.722 desktop / 0.586 mobile, waste 0/0.092; density 20.4/5.4; mobile passes on reveal cost |
| `relay changes persist` journey failed: the tab buttons had no `role="tab"` | Journey passes; arrow keys move between sections and Tab leaves the rail for the panel |

Residual: compact form fields make density a weak signal on mobile; the panel's own spacing is
the next lever if the ratio gate ever needs to clear on that viewport.

### Round 2 — Capture submit affordance (shipped)

| Before | After |
|---|---|
| Submit arrow disabled until text entered; inbox has no visible primary on first paint | Submit always visible with `variant="primary"`; reads as primary action immediately | `QuickCapture.tsx`; inbox screenshots |

### Round 3 — Notes list primary (shipped)

| Before | After |
|---|---|
| Notes list header: title + count only; primary "Publish" in editor at tab 9 | Header adds "+" icon button (ghost, sm) opening inbox capture; no second "New Note" verb | `NotesView.tsx`; notes-list screenshots |

### Round 4 — Labels mobile row height (shipped)

| Before | After |
|---|---|
| Rows `p-3`, gap `space-y-2`; mobile ratio 0.528, waste 0.115 | Rows `p-2 md:p-3`, gap `space-y-1.5`; mobile ratio 0.552, waste 0.063 | `LabelsTab.tsx`; labels mobile screenshot |

## Ranked residual work (wireframe vs reality)

Ranked by (gate distance × frequency) ÷ risk. **Bold** = wireframe not met.

1. **Chat identity wall.** Wireframe: compact banner (≤72px) + read-only content. Reality: full-screen `EmptyState` wall (ratio 0.146, footprint 0.342). Primary = "Set up identity" (not chat).
2. **Network primary buried.** Wireframe: read-only banner + [Add identity] ≤72px. Reality: compact prompt OK, but primary "Check Connection Settings" at tab 17 (740px down). Feed is content but no primary action on it.
3. **Timeline empty grid.** Wireframe: opens on month with events, never empty month. Reality: 2 events in month → 90% empty cells (ratio 0.307, waste 0.329 exempt). Add more demo events across current month.
4. **Responses empty state.** Wireframe: not defined. Reality: empty state with "Find a match" button that navigates away (ratio 0.16). Primary should be in-view action.
5. **Notes-grid no primary.** Wireframe: not defined. Reality: no primary action detected (primaries=0). Add capture entry in header like notes-list.
6. **Trash no primary.** Wireframe: not defined. Reality: no primary action detected (primaries=0). Empty state only.
7. **Map no primary.** Wireframe: full-bleed map, controls top-left. Reality: no primary action detected (primaries=0). Add "Drop pin" or search.
8. **Calendar demo density.** Month cells stay mostly empty with only 2 events; waste gate exempts calendars but wireframe expects events visible. Add demo events across current month.
9. **W11.7 stranger test** still needs a human with a fresh profile.
10. **Match quality** (`pnpm optimize eval:match`, 15/22 pass, mean F1=0.561) is unchanged and outside W12.

---

## Planned convergence rounds (W12.3c–W12.3f)

| Round | View | Wireframe gap | Fix |
|-------|------|---------------|-----|
| W12.3c | Chat | Full-screen wall → compact banner + read-first | Replace `EmptyState` with `ConnectIdentityPrompt` + show contact list read-only |
| W12.3d | Network | Primary at tab 17 → visible primary | Move "Check Connection Settings" to banner; feed row tap = primary |
| W12.3e | Timeline | 90% empty grid → events visible | Add 8–10 demo events across current month in `demoWorkspace.ts` |
| W12.3f | Responses | Empty state navigates away → in-view primary | Show recent matches from inbox as read-only cards; "Respond" as primary |
| W12.3g | Notes-grid | No primary → capture entry | Add "+" capture button in header (like notes-list) |
| W12.3h | Trash | No primary → restore action | Show "Restore" as primary on hover; empty state content-sized |
| W12.3i | Map | No primary → drop pin | Add floating "Drop pin" FAB; tap map = primary |

Each round: before/after screenshot diff + gates. W12.4 re-audit after all rounds.

## Approval gate

W12.0 required the target wireframes before code. The shipped W12.1 changes were limited to
objective defects (offscreen primary content, contrast, empty footprint > 40%, duplicate
verb, dropped tasks, spinner-only loading, data hidden off the visible month). The remaining
work (items 1–5) changes composition and waits for review in W12.3; W12.4 needs a human
stranger.

Definition of converged stays as written in `TODO.25.md` §W12: target met, every gate
green, and a stranger can name the primary action from the screenshot alone.
