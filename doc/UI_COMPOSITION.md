# UI composition

The interface has one job: make the note feel like the product, and make every
other surface either capture, context, or configuration. This document describes
the small system that keeps that rule true as capabilities change.

## Layers

```
semantic tokens       src/styles/theme.css        colour, spacing, density
component tokens      src/styles/tokens.ts       button, input, card, modal
primitives            src/components/ui/kit.tsx   Chip, Segmented, Tabs, SectionHeader, ChoiceGrid
configuration         src/config/uiSurfaces.ts    modes, filters, settings groups, palette scopes
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

`Button` and `IconButton` share the same variants but have separate size tokens.
`IconButton` is square and never inherits button padding; this is what keeps icon
toolbars legible at 12–16 px.

## Configuration, not conditionals

`src/config/uiSurfaces.ts` owns:

- `NOTE_MODES`: canvas, list, board, map, timeline.
- `NOTE_SECTIONS`: all, tasks, tags, trash.
- `PALETTE_SCOPES`: search, explore, chat.
- `SETTINGS_GROUPS`: the complete settings directory and its tab ids.

Add a mode, filter, palette scope, or settings tab there. The surface component
maps configuration to behaviour; it does not hardcode a second list. Disabled
states are passed to the primitive (`Segmented.disabled`, `Tabs.disabled`), not
implemented with ad-hoc opacity classes.

## Layout rules

- **One bar per view.** There is no second page header. The bar owns identity,
  navigation, and the current view's controls.
- **Notes bar.** Brand mark, filter tabs, mode switcher, search, new note, and
  settings. The capture omnibox is the first content row, not another header.
- **Note bar.** Back, editable title, privacy, details, publish, and overflow.
  The formatting toolbar is the only second row; the document starts below it.
- **Settings bar.** Brand mark, `Settings` heading, search, new note, and the
  active settings control. The directory starts immediately below.
- **One search.** The bar's search control and `Cmd/Ctrl+K` open the same overlay.
- **Capture is a command bar.** The inline omnibox stays at the top of Notes;
  the composer is the full-detail path for `Cmd/Ctrl+N`.
- **The note is the document.** The title is edited in the note bar; prose, tags,
  and status sit in one column with a `40rem` measure.
- **Context is a rail.** Next steps, matches, replies, and chat live beside the
  document on desktop and below it on mobile. Do not add another destination.
- **Settings is a directory.** Groups are visible at once, with one active pane.
  No accordion hides the only route to a setting.

## Responsive rules

- Desktop: full toolbar, labelled view modes, context rail on the right.
- Mobile: the Notes bar swaps filter tabs and view modes for compact selects;
  the note bar wraps its title onto a second line inside the same header.
- The editor toolbar hides secondary formatting behind one "More" menu below
  `sm`. Primary actions remain: add detail, describe, text, bold, italic, more,
  source.
- The note context rail becomes a static bottom pane on mobile, not an overlay,
  so the status bar and tags remain reachable.
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
