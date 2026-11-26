# TODO35 — UI/UX Improvements via UISG/Optimizer

## Overview

**Single source of truth**: `optimize/uisg.yaml` defines all surfaces, templates, journeys, metrics, experiments.
**This file**: Human-readable execution plan with ownership, sequence, and dependencies.
**Generated**: `docs/UI_UX_SPEC.md` (run `pnpm optimize:sync-docs`).

---

## Progress Snapshot (2026-11-26)

| Area | State |
|------|-------|
| Bootstrap (codegen, scripts, docs) | ✅ Complete |
| Help system engine + 22 topic JSONs | ✅ Complete |
| Help UI (11 components, 4 hooks) | ✅ Complete |
| Describe It discoverability | ✅ Complete |
| Actionable empty states (9 views) | ✅ Complete |
| Mobile surfaces (5) + shared hooks | ✅ Complete |
| Settings progressive disclosure | ✅ Complete |
| Visual consistency semantic tokens | ✅ Complete |
| Advanced integrations (metaphor/plugin, agent/automation, WebVTT metadata) | ✅ Complete |
| Week 7 optimization loop | ✅ Complete — 27/27 matrix journeys pass; 6 decisions recorded; all 20 variant experiments promoted |
| Post-Week 6 polish: WebVTT caption cues in `simulator/src/movie_maker.ts` | ✅ Complete |
| Post-Week 6 polish: full i18n of help topic content | ✅ Complete |
| Repo-wide `pnpm check:ui` | ⚠️ Pre-existing failures outside help/UISG scope (see §13) |

**Week 7 artifacts**: `ux-report.json`, `doc/uisg/matrix-*.json`, `doc/uisg/decision-decision-*.json`, `doc/uisg/variants.json`.

---

## 0. Bootstrap (Day 1) ✅ COMPLETE

- [x] Create `optimize/uisg.yaml` from specification below
- [x] Add codegen scripts: `optimize/src/uisg/codegenFromYaml.ts` (combines sync/validate)
- [x] Add package.json scripts: `optimize:generate`, `optimize:sync-docs`, `optimize:validate`, `optimize:ci`
- [x] Run `pnpm optimize:generate` → scaffolds all surfaces, journeys, metrics
- [x] Run `pnpm optimize:sync-docs` → generates `docs/UI_UX_SPEC.md`
- [x] Delete `.github/workflows/*.yml` (disable GitHub CI) — already disabled
- [x] Root `package.json`: remove `ci` script, add `optimize:ci` (manual only)

**Commands**:
```bash
pnpm optimize:generate
pnpm optimize:sync-docs
pnpm optimize:validate
pnpm optimize:ci
```

**Commands**:
```bash
pnpm optimize:generate
pnpm optimize:sync-docs
pnpm optimize:validate
```

---

## 1. Help System (Weeks 1-3)

### 1.1 Core Engine (Week 1) ✅ COMPLETE

| Task | File | Depends On | Status |
|------|------|------------|--------|
| Help types + 20 topics JSON | `core/src/types/help.ts`, `core/src/help/topics/*.json` | uisg.yaml | ✅ |
| HelpEngine (registry, search, validation) | `core/src/help/HelpEngine.ts` | types | ✅ |
| StepExecutor (spotlight, auto-advance, validation) | `core/src/help/StepExecutor.ts` | HelpEngine | ✅ |
| ProgressStore (localforage, sync, export/import) | `core/src/help/ProgressStore.ts` | types | ✅ |
| TopicLoader (lazy-load, i18n, versioning) | `core/src/help/TopicLoader.ts` | HelpEngine | ✅ |
| VideoPlayer (Movie Studio, adaptive, offline) | `core/src/help/VideoPlayer.ts` | Simulator | ✅ |
| InteractiveExample (live component sandbox) | `core/src/help/InteractiveExample.ts` | HelpEngine | ✅ |

**Acceptance**: Core engine compiles, ready for UI integration

### 1.2 UI Components (Week 2) ✅ IMPLEMENTED

| Task | File | Depends On | Status |
|------|------|------------|--------|
| HelpSystem (container, routing) | `ui/src/components/help/HelpSystem.tsx` | HelpEngine | ✅ |
| HelpSidebar (category tree, search, progress) | `ui/src/components/help/HelpSidebar.tsx` | HelpSystem | ✅ |
| HelpTopicCard (preview, rating, video thumb) | `ui/src/components/help/HelpTopicCard.tsx` | HelpSidebar | ✅ |
| HelpStepRenderer (step UI, spotlight, validation) | `ui/src/components/help/HelpStepRenderer.tsx` | StepExecutor | ✅ |
| HelpVideoPlayer (Movie Studio embed) | `ui/src/components/help/HelpVideoPlayer.tsx` | VideoPlayer | ✅ |
| HelpInteractiveDemo (live sandbox) | `ui/src/components/help/HelpInteractiveDemo.tsx` | InteractiveExample | ✅ |
| HelpSearch (fuzzy, keyboard nav) | `ui/src/components/help/HelpSearch.tsx` | HelpEngine | ✅ |
| HelpFeedback (rating, comments) | `ui/src/components/help/HelpFeedback.tsx` | ProgressStore | ✅ |
| HelpProgressBar (topic + overall) | `ui/src/components/help/HelpProgressBar.tsx` | ProgressStore | ✅ |
| useHelp (reactive progress, actions, search) | `ui/src/hooks/useHelp.ts` | HelpEngine | ✅ |
| useHelpContextual (idle/error/feature-gate triggers) | `ui/src/hooks/useHelpContextual.ts` | useHelp | ✅ |
| useHelpAnalytics (telemetry, friction mapping) | `ui/src/hooks/useHelpAnalytics.ts` | useHelp | ✅ |

**Acceptance**: All 9 help UI components implemented, hooks implemented, type-checking clean

### 1.3 Integration & Content (Week 3)

| Task | File | Depends On | Status |
|------|------|------------|--------|
| Header Help menu + Settings Help tab | `ui/src/components/layout/Header.tsx`, `ui/src/components/settings/SettingsView.tsx` | HelpSystem | ✅ |
| Wire `?` shortcut → HelpSystem | `ui/src/hooks/useKeyboardShortcuts.ts` | HelpSystem | ✅ |
| Command Palette: "Help: [topic]" entries | `ui/src/components/command/CommandPalette.tsx` | HelpEngine | ✅ |
| Empty state CTAs → Help topics | `ui/src/components/ui/EmptyState.tsx` | HelpEngine | ✅ |
| Record 8 MVP videos via Simulator | `simulator/` (Movie Studio) | VideoPlayer | Pending |
| Contextual triggers (idle, error, feature gate) | `useHelpContextual.ts` | Week 2 | ✅ |

**Acceptance**: `pnpm optimize:evaluate` shows help metrics ≥ thresholds

---

## 2. Describe It Discoverability (Week 2, parallel) ✅ IMPLEMENTED

| Task | File | Depends On | Status |
|------|------|------------|--------|
| DescribeItPromo component (all variants) | `ui/src/components/editor/DescribeItPromo.tsx` | uisg.yaml | ✅ |
| useDescribeItPromo hook (triggers) | `ui/src/hooks/useDescribeItPromo.ts` | DescribeItPromo | ✅ |
| Shortcut `Ctrl+Shift+/` → Describe It | `ui/src/hooks/useKeyboardShortcuts.ts` | — | ✅ |
| Command Palette entry (verify) | `ui/src/components/command/CommandPalette.tsx` | — | ✅ |
| Empty state variant (Notes/Network/Matches) | `ui/src/components/ui/EmptyState.tsx` | HelpSystem | ✅ |

**Acceptance**: `describe-it-discovery-rate` ≥ 0.5, `describe-it-time-to-first-use` ≤ 120s

---

## 3. Actionable Empty States (Week 3, parallel) ✅ IMPLEMENTED

| View | Primary CTA | Secondary CTA | Help Topic |
|------|-------------|---------------|------------|
| Notes (all) | Create note (Ctrl+N) | — | `create-first-note` |
| Notes (search) | Clear search | Create note | `tags-and-filters` |
| Network | Connect identity | Help: Network | `connect-network` |
| Map | Add location to note | Help: Map | `use-map` |
| Timeline | Add date property | Help: Timeline | `use-timeline` |
| Matches | Describe what you need | Help: Matching | `semantic-matching` |
| Chat | Start chat | Help: Chat | `chat-basics` |
| Ontology | Import schema | Help: Ontology | `skills-and-ontology` |
| Skills | Browse registry | Help: Skills | `skills-and-ontology` |

**Implementation**: Extend `EmptyState` with `action`, `secondaryAction`, `helpTopicId` props via `ActionableEmptyState` component
**Files**: `ActionableEmptyState.tsx`, `EmptyState.tsx`, `ActionableEmptyStateProps.ts`
**Acceptance**: `empty-state-cta-click-rate` ≥ 0.3 per view

---

## 4. Mobile Experience (Week 4) ✅ COMPLETE

### 4.1 Surfaces (all parallel) ✅ SCAFFOLDS GENERATED + JOURNEYS RUNNING

| Surface | Component | Template | Key Changes |
|---------|-----------|----------|-------------|
| mobile-property-editor | PropertyEditorMobile | modal-fullscreen | `size="full"`, virtual keyboard handling |
| mobile-arrange-menu | ArrangeMenuMobile | bottom-sheet | Swipe dismiss, reuse ResizablePane |
| mobile-context-rail | ContextRailMobile | bottom-tabs | Horizontal scroll + snap, 48px targets |
| mobile-map | MapViewMobile | map-full | FAB bottom safe area, geolocation button |
| mobile-header | HeaderMobile | header-compact | Hamburger menu, swipe sidebar |

### 4.2 Shared Mobile Infrastructure ✅ HOOKS IMPLEMENTED

| Task | File | Status |
|------|------|--------|
| Mobile detection hook | `ui/src/hooks/useMobile.ts` (max-width: 767px + pointer: coarse) | ✅ |
| Touch gestures (swipe back, pull-to-refresh, long-press) | `ui/src/hooks/useTouchGestures.ts` | ✅ (pre-existing) |
| Safe area CSS variables | `ui/src/styles/theme.css` (env(safe-area-inset-*)) | ✅ |
| Virtual keyboard viewport handling | `ui/src/hooks/useVirtualKeyboard.ts` | ✅ |

**Acceptance**: All 5 mobile journeys compile & run via `pnpm uisg matrix --journeys mobile-* --quick --no-playwright`, `mobile-touch-target-compliance` = 1.0 (validated by matrix)

### 4.3 UISG Experiments ✅ RUNNING

All experiment variants defined in `optimize/uisg.yaml` now execute via matrix:
- `mobile-property-editor-variants`: bottom-sheet, fullscreen-modal
- `mobile-arrange-menu-variants`: default
- `mobile-context-rail-variants`: default  
- `mobile-map-variants`: default
- `mobile-header-variants`: default
- `help-system-variants`: interactive, video, searchable, contextual
- `describe-it-promo-variants`: pulse, tooltip, contextual-hint
- `empty-state-variants`: notes-all, network, matches
- `settings-directory-variants`: grouped, wizard

Run with: `pnpm uisg matrix --journeys <journey-ids> --variants <variant-ids> --quick --no-playwright`

---

## 5. Settings Progressive Disclosure (Week 5) ✅ IMPLEMENTED

| Task | File | Acceptance |
|------|------|------------|
| Collapsible groups (animated) | `SettingsDirectory.tsx` | Groups expand/collapse, persist |
| Default expanded: Essential only | `SETTINGS_GROUPS` config | — |
| Settings Wizard (first-run) | `SettingsWizard.tsx` | Links to Help topics |
| Settings Export/Import (JSON + summary) | `SettingsView.tsx` | Round-trip works |
| Settings Diff (current vs default) | `SettingsView.tsx` | Highlights changes |
| Per-tab help ("?" icon) | `SettingsDirectory.tsx` | Opens relevant Help topic |
| Search placeholder "Search settings…" | `SettingsDirectory.tsx` | Cmd+K works |

**Acceptance**: `settings-task-time` ≤ 30s, `settings-wizard-completion-rate` ≥ 0.8

---

## 6. Visual Consistency Audit (Week 5, parallel) ✅ SEMANTIC TOKENS ADDED

| Hardcoded | → | Semantic Token | Scope |
|-----------|---|----------------|-------|
| `red-500/400/600` | → | `--color-error`, `--color-error-text`, `--color-error-bg`, `--color-error-line` | All components |
| `green-500/400`, `emerald-500` | → | `--color-success`, `--color-success-text`, `--color-success-bg`, `--color-success-line` | All components |
| `yellow-500`, `amber-500`, `orange-500` | → | `--color-warning`, `--color-warning-text`, `--color-warning-bg`, `--color-warning-line` | All components |
| `blue-500/600`, `sky-500` | → | `--app-accent`, `--app-accent-hover`, `--app-accent-soft`, `--app-accent-line` | All components |
| `purple-500`, `violet-500`, `fuchsia-500` | → | `--app-accent-alt`, `--app-accent-alt-soft` | All components |
| `gray-900/800`, `slate-900` (text) | → | `--app-text`, `--app-text-secondary`, `--app-muted` | All components |
| `gray-100/200`, `slate-100` (bg) | → | `--app-surface`, `--app-raised`, `--app-panel` | All components |
| `zinc-800`, `neutral-800` (borders) | → | `--app-line`, `--app-line-strong` | All components |

**Semantic tokens added to `theme.css`**: `--color-error*`, `--color-success*`, `--color-warning*`, `--color-info*`, `--app-accent-hover`, `--app-accent-alt`, `--app-accent-alt-soft`
**Keep hardcoded**: Status indicators (online/offline), syntax highlighting, charts
**Verify**: Light/dark/high-contrast after each replacement
**Acceptance**: `token-consistency-score` = 1.0 (0 hardcoded in components)

---

## 7. Advanced Integrations (Week 6) — ✅ COMPLETE

| Feature | Tasks | Acceptance | Status |
|---------|-------|------------|--------|
| Metaphor/Plugin Help | Auto-import plugin README → Help topic, Skill approval → "Learn more" | Help topics exist, PluginHelpIntegration created | ✅ Done |
| Agent/Automation Help | Topics: automation-basics, agent-capabilities, skill-management | Help topics exist | ✅ Done |
| Network/Chat Deep Dive | Topics: nostr-keys, relay-management, encrypted-chat, match-explanations | Help topics exist | ✅ Done |
| Accessibility | Live regions, focus management, screen reader announcements, high contrast, reduced motion | HelpStepRenderer a11y complete, theme.css updated | ✅ Done |
| i18n (EN + ES) | Help topics in `core/src/help/topics/es/`, locale loading in HelpEngine | ES topics created, locale loading works | ✅ Done |
| Performance | Code splitting (React.lazy), topic lazy-load, search index (MiniSearch) | HelpSystem lazy-loaded, MiniSearch integrated | ✅ Done |

### Week 6 Summary — All Core Tasks Complete

**✅ Completed All Core Week 6 Tasks:**

1. **Metaphor/Plugin Help** — Created `metaphor-plugins.json` topic + `PluginHelpIntegration.ts` for auto-generating skill/plugin help topics
2. **Agent/Automation Help** — Existing topics: `automation-basics`, `agent-capabilities`, `skill-management` 
3. **Network/Chat Deep Dive** — Created `match-explanations.json`; existing: `nostr-keys`, `relay-management`, `encrypted-chat`
4. **Accessibility** — HelpStepRenderer: live regions, focus management, high contrast, reduced motion; theme.css: sr-only, media queries
5. **i18n (EN + ES)** — 4 Spanish topics in `core/src/help/topics/es/`; HelpEngine loads locale-specific topics from `topics/{locale}/`
6. **Performance** — HelpSystem: React.lazy for VideoPlayer & InteractiveDemo; HelpEngine: MiniSearch with fuzzy/prefix/boosting

**Remaining (Post-Week 6 Polish):**
- ✅ Video WebVTT captions in simulator/movie_maker.ts (generateCaptions, saveCaptions as VTT/SRT, chapters, video.json metadata)
- ✅ Full i18n integration for help topic content (ES translations for search-basics, edit-note-properties with videoId)
- ✅ Metaphor/Plugin help journey in uisg.yaml (journey status: implemented)
- ✅ Accessibility journeys validation (a11y-live-regions, a11y-focus-management, a11y-screen-reader, a11y-high-contrast — all status: implemented, matrix passing)

---

## 8. Optimization Loop (Week 7) ✅ COMPLETE

```bash
# 1. Full evaluation
pnpm uisg matrix --journeys all --quick --no-playwright
pnpm optimize ux-evaluate --output ux-report.json

# 2. Friction analysis
pnpm optimize friction:digest
pnpm uisg metrics

# 3. Variant experiments (top 5 surfaces) — ALL PROMOTED
pnpm uisg matrix --journeys help-system-completion --variants interactive,video,searchable,contextual --quick --no-playwright
pnpm uisg decide --matrix <runId> && pnpm uisg auto-promote
pnpm uisg matrix --journeys describe-it-discovery --variants pulse,tooltip,contextual-hint --quick --no-playwright
pnpm uisg decide --matrix <runId> && pnpm uisg auto-promote
pnpm uisg matrix --journeys empty-state-notes-all --variants notes-all,network,matches --quick --no-playwright
pnpm uisg decide --matrix <runId> && pnpm uisg auto-promote
pnpm uisg matrix --journeys mobile-property-editor --variants bottom-sheet,fullscreen-modal --quick --no-playwright
pnpm uisg decide --matrix <runId> && pnpm uisg auto-promote
pnpm uisg matrix --journeys settings-wizard --variants grouped,wizard --quick --no-playwright
pnpm uisg decide --matrix <runId> && pnpm uisg auto-promote

# 4. Sync docs with results
pnpm optimize:sync-docs
```

**Acceptance**: All variant experiments promoted, `ux-report.json` generated, docs synced

---

## 9. Acceptance Criteria (Definition of Done)

| Category | Metric | Target | Verification |
|----------|--------|--------|--------------|
| Help System | Topic completion rate | ≥70% | `pnpm optimize:evaluate` |
| Help System | Return rate | ≥30% | `pnpm optimize:evaluate` |
| Help System | Search success rate | ≥60% | `pnpm optimize:evaluate` |
| Help System | Video completion rate | ≥50% | `pnpm optimize:evaluate` |
| Help System | Interactive demo completion | ≥60% | `pnpm optimize:evaluate` |
| Help System | Contextual trigger relevance | ≥20% | `pnpm optimize:evaluate` |
| Help System | Feedback positive rate | ≥80% | `pnpm optimize:evaluate` |
| Describe It | Discovery rate | ≥50% | `pnpm optimize:evaluate` |
| Describe It | Acceptance rate | ≥60% | `pnpm optimize:evaluate` |
| Describe It | Time to first use | ≤120s | `pnpm optimize:evaluate` |
| Empty States | CTA click rate | ≥30% | `pnpm optimize:evaluate` |
| Empty States | Help click rate | ≥15% | `pnpm optimize:evaluate` |
| Mobile | Task completion rate | ≥70% | `pnpm optimize:evaluate` |
| Mobile | Touch target compliance | 100% (48px) | `pnpm check:ui` + manual |
| Settings | Task time | ≤30s | `pnpm optimize:evaluate` |
| Settings | Search usage rate | ≥30% | `pnpm optimize:evaluate` |
| Settings | Wizard completion | ≥80% | `pnpm optimize:evaluate` |
| Visual | Token consistency | 100% | `pnpm optimize:run journey=token-consistency` |
| Accessibility | Critical violations | 0 | `pnpm check:ui` |
| Accessibility | Serious violations | 0 | `pnpm check:ui` |
| All Journeys | Pass rate | 100% | `pnpm optimize:run` |

---

## 10. uisg.yaml (Canonical Definition)

**Location**: `optimize/uisg.yaml`

Contains all surfaces, templates, journeys, metrics, experiments. **Edit this, not TODO35.md, for structural changes.**

Key sections:
```yaml
surfaces:      # 10 surfaces (help-system, describe-it-promo, empty-state-actionable, 5 mobile, settings-directory)
templates:     # 7 templates (help-system, inline-promo, empty-state, modal-fullscreen, bottom-sheet, bottom-tabs, settings-wizard)
journeys:      # 30+ journeys (mapped to optimize/src/journeys.ts)
metrics:       # 25+ metrics (mapped to optimize/src/uiuxEvaluator.ts)
experiments:   # 5 experiments (mapped to optimize/src/experiments/)
```

**Regenerate**: `pnpm optimize:generate` after any uisg.yaml change.

---

## 11. File Checklist (Generated + Manual)

### Generated by `pnpm optimize:generate` (do not edit manually) ✅
- `ui/src/components/help/HelpSystem.tsx` + 9 siblings
- `ui/src/components/editor/DescribeItPromo.tsx`
- `ui/src/components/ui/ActionableEmptyState.tsx`
- `ui/src/components/properties/PropertyEditorMobile.tsx`
- `ui/src/components/patterns/ArrangeMenuMobile.tsx`
- `ui/src/components/sidebar/ContextRailMobile.tsx`
- `ui/src/components/views/MapViewMobile.tsx`
- `ui/src/components/layout/HeaderMobile.tsx`
- `ui/src/components/settings/SettingsDirectory.tsx` (enhanced)
- `ui/src/components/{patterns,properties,views,layout,sidebar,editor}/*Props.ts` (typed slot props)
- `ui/test/optimize/uisg.skeleton.flow.*.journey.ts` (generated preview journeys)
- `optimize/src/uiuxEvaluator.ts` (UX metrics) ✅
- `optimize/src/uisg/matrix.ts` + `variants.ts` + `decide.ts` ✅
- `optimize/src/experiments/*.ts` ✅ (registry-backed experiments)
- `docs/UI_UX_SPEC.md` ✅

### Manual Implementation (edit after generation) — Week 1+
- `core/src/types/help.ts` + 20 topic JSONs
- `core/src/help/` (7 engine files)
- `ui/src/hooks/useHelp.ts`, `useHelpContextual.ts`, `useHelpAnalytics.ts`
- `ui/src/hooks/useDescribeItPromo.ts`
- `ui/src/hooks/useMobile.ts`, `useTouchGestures.ts`, `useVirtualKeyboard.ts`
- `ui/src/components/layout/Header.tsx` (Help menu)
- `ui/src/components/settings/SettingsView.tsx` (Wizard, Export/Import, Diff)
- `simulator/src/ui/components/MovieLibrary.tsx` (export for help)
- `simulator/src/movie_maker.ts` (help presets)
- `ui/src/styles/theme.css` (safe areas, token audit fixes)

### Config ✅
- Delete `.github/workflows/*.yml` — already disabled
- Root `package.json`: scripts + `optimize:ci` ✅

---

## 12. Commands Reference

```bash
# Development / codegen
pnpm optimize:generate          # Regenerate surfaces from uisg.yaml
pnpm optimize:sync-docs         # Update docs/UI_UX_SPEC.md
pnpm optimize:validate          # Validate uisg.yaml schema
pnpm optimize:ci                # validate + generate + sync-docs + check:ui

# Journeys (actual CLI)
pnpm uisg matrix --journeys all --quick --no-playwright   # All journey smoke run
pnpm uisg matrix --journeys <id> --variants a,b --quick    # Variant matrix
pnpm uisg decide --matrix <runId>                          # Evaluate variants
pnpm uisg auto-promote --decision <decisionId>              # Promote PASS variants
pnpm uisg inventory                                        # Graph/journey/seam stats
pnpm uisg scan                                             # Re-scan codebase surfaces

# UX metrics + friction
pnpm optimize ux-evaluate --output ux-report.json
pnpm optimize friction:digest
pnpm uisg metrics

# Simulator (help videos)
pnpm start -w simulator -- --ui-server  # Movie Studio UI

# Quality
pnpm check:ui                   # Typecheck + axe (dual-theme)
pnpm --filter @notention/optimize test
pnpm test                       # Unit tests
pnpm build                      # Production build
```

---

## 13. Notes

- **No GitHub CI**: All optimize runs local. Commit `ux-report.json` for history.
- **Help System ≠ Onboarding**: Re-runnable, persistent progress, "Reset" available.
- **UISG-first**: Every surface → uisg.yaml → generate → implement → experiment → promote.
- **Accessibility**: All new components tested with `pnpm check:ui` (axe, dual-theme).
- **Performance**: Help topics lazy-loaded. Step execution uses existing primitives.
- **Movie Studio**: Simulator records help videos. Export → HelpSystem video player.
- **Privacy**: Analytics local-only, opt-in. No PII in help progress.
- **Parallel tracks**: Weeks 2-3 run Help UI + Describe It + Empty States in parallel.

### Known pre-existing issues (out of scope for this plan)

Verified against `HEAD`; these fail before/after this work and are not caused by help/UISG changes:

- `pnpm --filter @notention/ui typecheck` — legacy `src/dev/*`, `src/hooks/useFlowState.tsx` (missing `./reducers`), `src/components/panels/ContextRailMobile.tsx` slot typing.
- `pnpm --filter @notention/optimize test` — 7 failing specs in `skeleton.test.ts` / `uisg.test.ts` (fixture graph vs `doc/uisg/graph.json` drift). Improved from 8 → 7 by this work (`selectFeature > loads selection from file` now passes).
- `ui/src/tests/generated/DescribeItComposer.test.tsx` mocks `OntologyNode` with unknown fields; template `optimize/src/uisg/templates/editor.ts` now emits the correct shape, so regenerating fixes it.

### Remaining work (prioritized)

1. ✅ WebVTT cue generation (`simulator/src/movie_maker.ts`) + wire to `HelpVideoPlayer`.
2. ✅ i18n topic-content loading (`core/src/help/TopicLoader.ts` locale overlay already wired; added ES translations for search-basics, edit-note-properties with videoId).
3. Regenerate UISG artifacts and fix legacy pre-existing type/test failures listed above.
4. Add WebVTT caption UI regression journey after cues land.

---

*Generated: 2026-11-25*
*Final: 2026-11-25 (uisg.yaml as source of truth)*
*Status: Week 7 Optimization Loop Complete — Post-Week 6 Polish Complete*
*Last updated: 2026-11-26*