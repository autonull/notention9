# UI composition

The interface has one job: make the note feel like the product, and make every
other surface either capture, context, or configuration. This document describes
the small system that keeps that rule true as capabilities change.

## Layers

```
semantic tokens       src/styles/theme.css        colour, spacing, density
component tokens      src/styles/tokens.ts       button, input, card, modal
primitives            src/components/ui/kit.tsx   Chip, Segmented, Tabs, SectionHeader, ChoiceGrid
primitives            src/components/ui/ResizablePane.tsx  percentage pane separator
patterns              src/components/patterns     PageSurface, PageTitle, ArrangeMenu, DetailChips
configuration         src/config/uiSurfaces.ts    modes, orders, rail tabs, arrange groups, settings groups
surfaces              views, editor, settings, overlays
```

A surface may compose primitives and tokens, but it must not invent a second
visual language. The legacy `design-system.css` was removed; no class in it is
required to render the app.

## Semantic tokens

All core chrome uses the variables in `theme.css`:

| Token | Purpose |
| :--- | :--- |
| `--app-bg` | page background |
| `--app-surface` | cards, inputs, the document sheet |
| `--app-panel` | dialogs, rails, drawers |
| `--app-raised` | chips, selected controls, inline panels |
| `--app-hover` | hover and selected-row background |
| `--app-line`, `--app-line-strong` | hairline borders |
| `--app-text`, `--app-text-secondary` | primary text |
| `--app-muted`, `--app-faint` | secondary and tertiary text |
| `--app-accent`, `--app-accent-text`, `--app-accent-soft`, `--app-accent-line` | user accent, readable accent text, tint, border |
| `--ui-pad`, `--ui-gap`, `--ui-row`, `--ui-note-min` | density-aware component values |

Light mode swaps the values once on `:root[data-theme='light']`. Components keep
their utility classes, so no component needs a second light-mode branch. Avoid
`text-white` for text on the accent; use `text-[#ffffff]` so the light-theme
colour inversion does not turn it dark.

## Primitives

`ui/kit.tsx` is the smallest set that covers the current surfaces. Extend it
before adding a one-off control.

- `Chip`: tone (`neutral`, `accent`, `success`, `warning`, `danger`), `xs`/`sm`.
- `Segmented`: mutually exclusive display choice, optional per-option disable.
- `Tabs`: underline tabs with counts, used for filters and settings panes.
- `Toolbar`: one compact horizontal action bar.
- `SectionHeader`: title, one-line description, optional actions.
- `ChoiceGrid`: card-shaped single choice for theme, density, and other settings.
- `Kbd`, `Hint`: keyboard and helper text.
- `ResizablePane`: vertical separator with `aria-valuenow`, arrow-key steps,
  Home/End clamps, and double-click reset. Panes store percentages.

`Button` and `IconButton` share the same variants but have separate size tokens.
`IconButton` is square and never inherits button padding; this is what keeps icon
toolbars legible at 12–16 px.

## Configuration, not conditionals

`src/config/uiSurfaces.ts` owns:

- `NOTE_BROWSE_MODES`: list, canvas, board, map, timeline; List first.
- `NOTE_SORT_ORDERS`: the ten core orders with labels and direction.
- `NOTE_RAIL_TABS`: next, matches, replies, chat.
- `NOTE_SECTIONS`: all, tasks, tags, trash.
- `ARRANGE_GROUPS`: layout, order, group; one popover, three sections.
- `PALETTE_SCOPES`: search, explore, chat.
- `SETTINGS_GROUPS`: the complete settings directory and its tab ids.

Add a mode, filter, palette scope, or settings tab there. The surface component
maps configuration to behaviour; it does not hardcode a second list. Disabled
states are passed to the primitive (`Segmented.disabled`, `Tabs.disabled`), not
implemented with ad-hoc opacity classes.

## Layout rules

- **One bar per view.** There is no second page header. The bar owns identity,
  navigation, and the current view's controls.
- **Notes bar.** Brand mark, `Notes`, count, search, new note, and settings.
  Subsets and arrangement live in the history rail, not in three bar rows.
- **History bar.** Search, one `Arrange` control (`List · Updated`), and the
  All/Tasks/Tags/Trash tabs. The page keeps its subset, arrangement, and order.
- **Note bar.** Back, saved state, `Context` with a count, publish, and overflow.
  It is one `3rem` bar. The formatting row appears only while the editor has
  focus; selection bubbles and slash carry the rest.
- **Settings bar.** Brand mark, `Settings` heading, search, new note, and the
  active settings control. The directory starts immediately below.
- **One search.** The bar's search control and `Cmd/Ctrl+K` open the same overlay.
- **New note is a page.** `New note` and `Cmd/Ctrl+N` create an untitled page and
  put the cursor in its title. There is no capture modal and no hero omnibox.
- **The note is the document.** The title is edited in the page, not the bar.
  Prose is 17 px/1.7 inside an 88ch left-aligned measure; the sheet fills the
  pane. Saved state and word count sit at the page end.
- **Details are chips.** Inline property chips open the shared `PropertyEditor`;
  the page shows a `+ Add detail` chip and any imported detail that has no inline
  node. There is no floating inspector and no bar `Details` control.
- **Context is a rail.** Next, Matches, Replies, and Chat are four top-level
  tabs beside the document on desktop and a bottom pane on mobile. The rail is
  closed unless the note has context; the bar control advertises the count.
- **Settings is a directory.** Groups are visible at once, with one active pane.
  No accordion hides the only route to a setting.

## Responsive rules

- Desktop: history rail, page, and optional context rail share the width. History
  is a percentage (`22%`, range `16%–30%`); context is a percentage (`20%`, range
  `15%–26%`). The page keeps at least half. Drag handles and arrow keys resize.
- Mobile: history and page swap. Selecting a note replaces the list; back returns
  to the same scroll position. Title and body keep the desktop scale.
- The editor toolbar hides until the editor has focus. Primary insert paths
  remain the page `+ Add detail`, slash, and selection bubble.
- The note context rail becomes a bottom pane on mobile, not an overlay, so the
  status bar and tags remain reachable.
- Touch targets grow only on coarse pointers. Do not force 44 px control boxes on
  desktop.

## Accessibility contracts

- One `h1` per static surface; the note title stays an input with an accessible label.
- Tabs expose `role="tab"`, `aria-selected`, and `aria-controls` where a panel
  exists. Filters keep the tab role even when they filter a list.
- Modals expose `role="dialog"` and a name; the panel must paint above the
  backdrop (`relative z-10`), or clicks are intercepted.
- Text on `--app-faint` and `--app-muted` must reach 4.5:1 in both themes.
- Accent text uses `--app-accent-text`, never the raw accent.
- `pnpm check:ui` covers `lint:type`, typecheck, eight dual-theme axe views, and
  the golden-path journeys.

## Tests as feedback

The screenshot gallery is visual evidence, not a contract. Keep assertions on
behaviour and roles. Colour values, copy, and exact pixel layout are intentionally
relaxed when a design pass changes them; functionality is covered by the
golden-path, next-step, publish, relay, and settings journeys.
