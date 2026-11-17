# UI Convergence Audit — 2026-11-17 (W12)

## Verdict

W11 removed duplicate controls. W12 measures what remains: how much of the screen the work
occupies, how much space earns its pixels, and where an empty or sparse layout hides the
primary action. Two structural defects are fixed (mobile shell, empty-state footprint) and
five views still miss the density gate. Timeline is the worst: the calendar is dark now, but
the visible month contains no events.

Status: **W12.0 done**, **W12.1 first pass done**, **W12.2–W12.4 open**.

Evidence: `doc/evidence/space-utilization.json`, `doc/evidence/space/<viewport>/*.jpg`.

## Method

- Harness: `pnpm space:audit` (`ui/test/audit/space.spec.ts`, measurements in
  `ui/test/support/space.ts`).
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
  - **Density**: visible actions + facts per 1000px of content height.
- No page scrolls horizontally in any capture (`overflowX = 0`, 30/30) and no stretch
  defect remains (0/30).
- Each screenshot is a full-viewport JPEG at 60% quality; the numbers and the image come
  from the same settled render.

## Gate vocabulary

| Gate | Pass condition |
|---|---|
| Content ratio | ≥ 0.60 on populated screens |
| Wasted space | < 0.15 |
| Empty footprint | ≤ 0.40, content-sized, never full-height |
| Stretch defect | 0 |
| Horizontal overflow | 0 |
| One primary | One visible primary action per view; no duplicate verb |
| Mobile first screen | Primary content visible at 390×844 without scrolling |

Empty screens are judged by footprint and waste, not content ratio. "Populated" means the
seed produced rows in the measured root.

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

### Editor
```
┌ title / property chips
├ content column ≤ 720px, inspector 320px on demand
└
```

### Actions
```
┌ H1 + [New Task]
├ group header + dense rows (title, one-line preview, property/tag chips)
│ target: 3 groups + 5 rows above the fold
└
```

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
├ month grid, today/off-range cells dark, events visible
│ no events in the visible month → explain and point at the next dated note
└
```

### Ontology / Settings
```
┌ H1 + mode switch
├ 2 columns at lg: tree/list + detail, so rows do not float in a narrow column
└
```

## Gate results

`—` = gate not applicable (empty screen or list root).

| View | Viewport | Ratio | Waste | Empty | Verdict |
|---|---|---|---|---|---|
| inbox empty | desktop | 0.64 | 0.04 | 0.38 | empty OK, footprint OK |
| inbox populated | desktop | 0.84 | 0.00 | — | pass |
| notes list | desktop | 0.86 | 0.00 | — | pass |
| notes grid | desktop | 0.83 | 0.00 | — | pass |
| trash | desktop | 0.93 | 0.00 | — | pass |
| timeline | desktop | 0.23 | 0.38 | — | **fail: no events** |
| actions | desktop | 0.39 | 0.01 | — | **fail: sparse fold** |
| responses | desktop | — | 0.04 | 0.23 | empty OK |
| labels | desktop | 0.54 | 0.08 | — | **fail: narrow column** |
| ontology | desktop | 0.54 | 0.10 | — | **fail: narrow column** |
| map | desktop | 0.96 | 0.00 | — | pass |
| settings | desktop | 0.68 | 0.01 | — | pass |
| chat | desktop | — | 0.00 | 0.34 | empty OK |
| editor | desktop | 0.86 | 0.00 | — | pass |
| network | desktop | 0.27 | 0.04 | — | **fail: loading spinner** |
| inbox empty | mobile | — | 0.20 | 0.20 | empty screen; waste from the Automations gap |
| inbox populated | mobile | 0.86 | 0.00 | — | pass |
| notes list | mobile | 0.81 | 0.01 | — | pass (root: sidebar) |
| notes grid | mobile | 0.82 | 0.00 | — | pass (root: sidebar) |
| trash | mobile | 0.83 | 0.00 | — | pass |
| timeline | mobile | 0.32 | 0.22 | — | **fail: no events** |
| actions | mobile | 0.42 | 0.01 | — | **fail: sparse fold** |
| responses | mobile | — | 0.04 | 0.24 | empty OK |
| labels | mobile | 0.56 | 0.09 | — | **fail: narrow column** |
| ontology | mobile | 0.56 | 0.10 | — | **fail: narrow column** |
| map | mobile | 1.00 | 0.00 | — | pass |
| settings | mobile | 0.68 | 0.01 | — | pass |
| chat | mobile | — | 0.00 | 0.36 | empty OK |
| editor | mobile | 0.82 | 0.01 | — | pass |
| network | mobile | 0.42 | 0.01 | — | **fail: loading spinner** |

All 30 captures: stretch defects 0, horizontal overflow 0, axe serious/critical 0 (11 views).

## W12.1 — shipped space-utilization pass

Each change is an objective gate failure, not a new visual direction. Target wireframes
above still gate W12.3.

| # | Change | Before | After | Evidence |
|---|---|---|---|---|
| 1 | Mobile shell: sidebar is the notes list only; every other view paints `main` first | All views at 390×844 showed the 320px sidebar full-bleed and the view offscreen | Inbox capture, map, timeline, actions render first | mobile screenshots; `AppShell.tsx` |
| 2 | One mobile nav row: 4 tabs + search + help; removed the second Capture/Search/Help bar | 130px of chrome, duplicate Capture verb, "ACTIO…" truncated | 64px, one capture entry (inbox field), labels fit | `MobileBottomNav.tsx`; mobile journey |
| 3 | Empty states: illustration and example hint hidden below `md`, smaller paddings | Inbox empty footprint 0.60 desktop / 0.68 mobile; chat 0.40 | 0.38 / 0.20; chat 0.34 / 0.36 | `EmptyState.tsx`; footprint column |
| 4 | Actions: full-width grouped rows with property/tag chips, no duplicate title preview | Ratio 0.27, waste 0.13, wide dead field | 0.39, 0.01 | `ActionsView.tsx`; actions screenshot |
| 5 | Timeline: dark month cells and readable toolbar/date buttons (cascade specificity) | White today/off-range cells on the dark theme; dark-on-dark toolbar text | Dark grid, contrast passes | `index.css`; timeline screenshot |
| 6 | Labels: "theOntology Editor" spacing; label/description contrast | Text ran together; contrast violation | Reads "the Ontology Editor" | `LabelsTab.tsx`; axe Labels |
| 7 | Empty-state and shared label contrast | Serious axe violations on 11 views | 11/11 axe views pass | `EmptyState.tsx`, `tokens.ts` |
| 8 | Removed the persistent mobile "Shortcuts for view" overlay and the dead `ContextualHint` | 280px card covered the map and actions | Shortcuts remain under Help | mobile map screenshot |
| 9 | Mobile header: view title instead of an empty 64px bar; no duplicate Settings gear | Blank left half | Title + connection state | `Header.tsx` |

Caveat: the audit harness changed between the first and final run (root fallback,
waste definition). Deltas in the table come from the runs named in the Progress Log; the
table above is the final measured state.

## Ranked residual work

Ranked by (gate distance × frequency) ÷ risk.

1. **Timeline has no events in the visible month.** Demo notes carry October 2026 dates;
   the calendar opens November. Ratio 0.23, waste 0.38. Fix the fixture dates or add an
   "upcoming" strip and a next-event jump. Do not fake density with empty cells.
2. **Network never leaves the spinner.** With a connected relay and an empty feed, the view
   shows a spinner forever (W6.4 regression). Add a content-sized empty feed state.
3. **Actions fold is sparse.** 5 tasks in 3 groups fill 39% of the fold. Decide in W12.3:
   a kanban with equal-height columns, or rows plus a compact task detail rail.
4. **Labels and Ontology float in a narrow column.** 0.54/0.56 with 5–10% waste. Add a
   two-column layout at `lg`: list/tree + detail, or widen rows to the content column.
5. **Mobile inbox empty has 20% waste** between the empty state and Automations. Tighten
   the section gap or move Automations behind the existing disclosure.
6. **Stretch defects stay at zero**; keep the gate in the harness.
7. **W11.7 stranger test** still needs a human with a fresh profile.
8. **Match quality** (`pnpm optimize eval:match`, 2/22) is unchanged and outside W12.

## Approval gate

W12.0 required the target wireframes before code. The shipped W12.1 changes were limited to
objective defects (off-screen primary content, contrast, empty footprint > 40%, duplicate
verb). The remaining density work (items 1–5) changes composition and waits for review of
this document in W12.2/W12.3.

Definition of converged stays as written in `TODO.25.md` §W12: target met, every gate
green, and a stranger can name the primary action from the screenshot alone.
