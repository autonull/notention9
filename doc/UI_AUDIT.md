# UI/UX Audit — 2026-11-17

## Verdict

The app works, but the screenshots showed a surface that needed onboarding, repeated the same
creation action three or four times, and mixed the dashboard into the notebook. A stranger could
not tell where to start, and a returning user paid for chrome they did not use. "Intuitive elegance"
here means one capture field, one match card, one list — the capability stays, the noise goes.

This audit seeded the W11 phases in `TODO.25.md`. The "before" findings below come from the
2026-11-17 screenshot review; the "after" column records what changed in the same session.

## Per-screenshot findings

| Screenshot | Primary action | Duplicate actions | Orphan chrome | Competing emphasis | Navigation cost | Removal candidate | Disclosure candidate |
|---|---|---|---|---|---|---|---|
| `inbox/empty.png` | Type in capture | Header New Note, sidebar New Note, Welcome New Note, 3-step onboarding card, Create-first-note, Load sample | Onboarding card, "Welcome back", Welcome header, feature button | Two blue primaries (header + Welcome) plus the onboarding CTA | 0 clicks, but 5 competing CTAs | Onboarding card; Welcome header; duplicate New Note buttons | Sample workspace as a quiet text link |
| `inbox/populated.png` | Capture or Respond | Same 3 New Note buttons; Respond and Open match | Welcome header, Features, Automations panel, Stats grid, Quick Actions, onboarding step 3 | Match score, onboarding progress, stats, and actions all shout | 1 click to Respond | Welcome, Stats, Quick Actions, Automations from the default surface | Automations under Advanced |
| `notes/grid.png` | Open a note | New Note (header, sidebar, Welcome); Notes nav fell back to the dashboard | Dashboard remnant inside Notes | Capture card and match card occupied the Notes view | 0 clicks, but wrong screen | Dashboard fallback for Notes | Sidebar grid mode remains |
| `notes/trash.png` | Restore or delete | New Note in sidebar/header | None visible | Empty state and chrome | 1 click | — | — |
| `timeline/month.png` | Open an event | New Note | No empty explanation when no dated notes | Calendar and empty grid | 1 click | — | Empty hint above calendar |
| `actions/board.png` | New Task | New Note globally | Raw `<p>` HTML in cards; three always-empty sections | Three headings with no content | 1 click | Raw HTML; empty section blocks | — |
| `responses/*` | Respond to a match | New Note globally | Custom emoji empty state | Empty state and heading | 1 click | Hand-rolled empty state | — |
| `labels/*` | Create label | New Note globally | Inline "No labels" block | Form and empty copy | 1 click | Hand-rolled empty state | — |
| `chat/thread.png` | Send a message | New Note globally | Full-screen "requires account" wall | Identity wall | 1 click | Wall replaces feed context | Setup action inside an empty state |
| `network/connect-identity.png` | Add identity | New Note globally | Whole view blocked by identity | Identity prompt consumed the screen | Impossible until setup | Full-screen identity gate | Read-only feed first; identity banner at top |
| `network/feed.png` | Fork or Chat | New Note globally | None | Feed cards and relay banner | 1 click | — | Relay detail stays |
| `matching/results.png` | Respond | Open request, Open match, Respond, Not a match, Show details | Duplicate of Inbox populated | Four actions on one card | 1 click | Open request / Open match buttons (titles are links) | Why this match details |
| `map/pins.png` | Select a pin | New Note globally | Broken marker images | Popup and markers | 1 click | Placeholder image | — |
| `modals/command-palette.png` | Run a command | New Note command vs button | Note results dominate commands | Search and notes | 1 key | — | — |
| `modals/help.png` | Read a shortcut | — | Long list | Keyboard wall | 1 key | — | Group by task |
| `ontology/graph.png` | Inspect a node | New Note globally | Dense legend | Graph and legend | 1 click | — | Legend behind toggle |

## Ranked removals

Ranked by (confusion saved × frequency) ÷ capability-loss risk.

| Rank | Change | Confusion saved | Capability-loss risk | Phase | Status |
|---|---|---|---|---|---|
| 1 | Delete onboarding checklist and its state | High | None | W11.1 | Done |
| 2 | One capture entry: remove header, sidebar, Welcome, and mobile "New Note" buttons | High | Low — Cmd+N and the command palette remain | W11.2 | Done |
| 3 | Remove Welcome header, Features, StatsGrid, Quick Actions, and the Automations panel from Inbox | High | None — stats are in Settings; automations move to Advanced | W11.3 | Done |
| 4 | Notes view lists notes instead of falling back to the dashboard | High | None | W11.3 | Done |
| 5 | One `EmptyState` for Notes, Trash, Timeline, Actions, Responses, Labels, Chat, Contacts, Network | Medium | None | W11.4 | Done |
| 6 | Network renders the read-only public feed before identity exists | Medium | None | W11.5 | Done |
| 7 | Replace raw HTML previews with `getTextFromHtml` | Medium | None | W11.8 | Done |
| 8 | One icon per concept (Actions, Responses) | Low | None | W11.8 | Done |
| 9 | Match card: four actions → Respond, Revise, Not a match; titles are links | Medium | Low — same verbs, fewer duplicates | W11.8 | Done |
| 10 | Capture card: remove hero title/subtitle; templates behind "More ways to capture" | Medium | None | W11.3 / W11.8 | Done |

## Proposed IA (before → after)

Before:

```
Inbox = Dashboard
  Welcome header (New Note, Features)
  Quick Capture
  Onboarding checklist
  Sample workspace
  Match card (4 actions)
  Automations
  Stats
  Recent activity + Quick Actions
  Notes list
  Advanced (duplicate automations)
```

After:

```
Inbox
  Capture (one field, templates behind More)
  Sample workspace link (empty only)
  Match card (Respond primary; Why this match disclosure)
  Recent notes (or one empty state)
  Advanced → Automations
```

Navigation vocabulary: Inbox, Notes, Actions, Map, Timeline, Network, Chat, Responses, Labels,
Trash, Skills, Settings. "Responses" is the label everywhere; "New Note" is a command, not a
button on every screen.

## Implementation status (this session)

- W11.0: this document.
- W11.1: deleted `OnboardingChecklist`, its settings state, and its three tracking effects.
- W11.2: one capture surface; `Cmd+N` focuses `[data-testid="quick-capture-input"]`; the command
  palette still offers "New Note" as a menu command.
- W11.3: Inbox keeps capture, the local match, recent notes, and Advanced → Automations.
  `NotesView` renders a list instead of `DashboardView`; dead dashboard components removed.
- W11.4: shared `EmptyState` in the views listed above.
- W11.5: `useNetworkData` subscribes without an identity; `NetworkView` shows a compact
  "read-only public feed" banner above the feed instead of a full-screen gate.
- W11.8: shared HTML-to-text helper, one icon per view, and the match card action reduction.

## Harness findings (fixed so evidence is trustworthy)

- `ui/test/support/seed.ts` built `/#${hash}` while callers already passed `#view`, producing
  `/##view`. The router saw `##view` and fell back to Notes, so the old network/matching
  screenshots were actually the Inbox. The helper now normalizes the leading `#`.
- `useUrlRouting` reset its "from URL" flag on a timer, so the default view could push `#notes`
  before the deep-linked state committed. It now waits for the pending URL view to match the
  committed view before it stops suppressing the push.
- The screenshot suite needs a built `@notention/core`; a stale `dist/browser` failed to resolve
  `@notention/core/telemetry/matchDigest`. It is rebuilt in the screenshot prerequisite step.

## Redundancy sweep (W11.6, post-change)

| View | Remaining duplicate | Decision |
|---|---|---|
| Inbox | Sidebar note list and main "Recent notes" list | Keep both: sidebar is navigation, main is the work surface. No duplicate verb. |
| Notes | No capture button; empty state links to the one capture field | Keep. |
| Actions | Header "New Task" and empty-state "Create a task" | Keep: the empty state only appears when the header action has nothing to act on. |
| Network | "Read-only public feed" banner and relay status | Keep: one is identity state, one is transport state. |
| Chat | Account empty state and contact empty state | Different scopes (identity vs contacts). |
| Settings | Four collapsible groups, all open by default | Keep; no duplicate tab labels. |
| Map | Broken marker images when a profile has no picture | File as a follow-up; fall back to initials. |

## Follow-ups (not bundled)

- W11.7: the stranger test is a human timing gate. Run `pnpm stranger-test` with a fresh profile
  and attach the observed install → capture → match → export time. Automated golden-path timing is
  not a substitute.
- Map markers still show placeholder images when a profile has no picture.
- A few pre-existing UI type errors in settings/hooks need a separate cleanup; they are not part of
  this audit.
