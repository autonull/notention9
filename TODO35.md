# TODO35 — UI/UX Improvements via UISG/Optimizer

## Overview

**Single source of truth**: `optimize/uisg.yaml` defines all surfaces, templates, journeys, metrics, experiments.
**This file**: Human-readable execution plan with ownership, sequence, and dependencies.
**Generated**: `docs/UI_UX_SPEC.md` (run `pnpm optimize:sync-docs`).

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

## 7. Advanced Integrations (Week 6)

| Feature | Tasks | Acceptance |
|---------|-------|------------|
| Metaphor/Plugin Help | Auto-import plugin README → Help topic, Skill approval → "Learn more" | `metaphor-help` journey passes |
| Agent/Automation Help | Topics: automation-basics, agent-capabilities, skill-management | Help topics exist |
| Network/Chat Deep Dive | Topics: nostr-keys, relay-management, encrypted-chat, match-explanations | Help topics exist |
| Accessibility | Live regions, focus management, screen reader announcements, high contrast, reduced motion | 4 a11y journeys pass, 0 critical/serious violations |
| i18n (EN + 1 locale) | Help topics in `ui/src/i18n/locales/{en,es}.json`, video WebVTT captions | `help-system-completion` passes for ES |
| Performance | Code splitting (React.lazy), topic lazy-load, video streaming, search index (MiniSearch) | Bundle size < threshold |

---

## 8. Optimization Loop (Week 7)

```bash
# 1. Full evaluation
pnpm optimize:run              # golden-path + all journeys
pnpm optimize:evaluate --output ux-report.json

# 2. Friction analysis
pnpm optimize:friction
pnpm optimize:prioritize

# 3. Variant experiments (top 5 surfaces)
pnpm optimize:experiment surface=help-system variants=interactive,video,searchable,contextual runs=100
pnpm optimize:experiment surface=describe-it-promo variants=pulse,tooltip,contextual-hint runs=100
pnpm optimize:experiment surface=empty-state-actionable variants=notes-all,network,matches runs=100
pnpm optimize:experiment surface=mobile-property-editor variants=bottom-sheet,fullscreen-modal runs=100
pnpm optimize:experiment surface=settings-directory variants=grouped,wizard runs=100

# 4. Sync docs with results
pnpm optimize:sync-docs
```

**Acceptance**: All acceptance criteria in Section 9 met, `ux-report.json` committed

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
- `optimize/src/journeys/*.ts` (30+ files) — pending
- `optimize/src/uiuxEvaluator.ts` (metrics) — pending
- `optimize/src/experiments/generated.ts` — pending
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
# Development
pnpm optimize:generate          # Scaffold from uisg.yaml
pnpm optimize:sync-docs         # Update docs/UI_UX_SPEC.md
pnpm optimize:validate          # Validate uisg.yaml schema
pnpm optimize:run               # Run all journeys (golden-path)
pnpm optimize:run journey=X     # Run single journey
pnpm optimize:evaluate          # UX metrics evaluation
pnpm optimize:experiment        # Run variant experiment
pnpm optimize:friction          # Record friction
pnpm optimize:prioritize        # Prioritize from friction

# Simulator (help videos)
pnpm start -w simulator -- --ui-server  # Movie Studio UI

# Quality
pnpm check:ui                   # Typecheck + axe (dual-theme)
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

---

*Generated: 2026-11-25*
*Final: 2026-11-25 (uisg.yaml as source of truth)*
*Status: Week 4 Mobile Surfaces Complete + UISG Experiments Running — Week 7 Advanced Integrations Next*
*Last updated: 2026-11-26*