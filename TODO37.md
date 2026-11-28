# TODO37 — Consolidated Architecture & Remaining Work (Revised)
*Revised: 2026-11-27 — Post WP-5/6/7/10 completion, strategic reprioritization for maximum leverage*

---

## Executive Summary

**Completed (WP-1,2,3,4,5,6,7,8,9,10,11)**: Unified Registry, StrategySystem, UrlRouter, BaseStepExecutor (15/15), BaseCommand/BaseCliHandler, specific error types, migration registry, UnifiedMetaphor, Test utils package, Property Widget bases, UI Component bases.

**Remaining**: UISG tests (WP-12), Browser verify (WP-13), Captions (WP-14).

**Key Insight**: The established patterns (BaseCommand, BaseStepExecutor, UnifiedMetaphor) are proven templates. Apply them systematically to remaining consolidation work rather than inventing new patterns.

---

## Priority Tier 1 — Complete Foundation (Do Next)

These finish what was started and unblock everything else.

| ID | Work | Files | Effort | Impact |
|----|------|-------|--------|--------|
| **WP-4** | ~~**Finish Step Executor Base Class** — Migrate remaining 6 executors (`navigate`, `script`, `seed`, `assertNoConsoleErrors`, `assertAria`, `assertAriaSnapshot`, `assertFocus`, `assertRole`, `assertAccessibleName`) to `BaseStepExecutor`~~ | `optimize/src/stepExecutors/*.ts` | ✅ Done | All 15 executors use BaseStepExecutor |
| **WP-11** | ~~**Test Infrastructure Unification** — Create `@notention/test-utils` package with: mock factories, test data generators, assertion helpers, Playwright fixtures~~ | `packages/test-utils/` (new) | ✅ Done | Unified test utilities; mock factories, Playwright fixtures, Vitest helpers |

**Dependency**: WP-11 enables faster work on WP-12, WP-13, WP-14.

---

## Priority Tier 2 — UI Consolidation (Medium Impact)

Apply the BaseClass pattern established in WP-4/WP-5.

| ID | Work | Files | Effort | Impact |
|----|------|-------|--------|--------|
| **WP-8** | ~~**Property Widget Base Class** — Extract `BasePropertyWidget` with: validation pipeline, formatting, accessibility, error display. Migrate 5 widgets.~~ | `ui/src/components/properties/widgets/*.tsx` | ✅ Done | BasePropertyWidget + 5 migrated (Text, Enum, Date, Location, Currency) |
| **WP-9** | ~~**UI Component Base Classes** — Extract: `BaseModal` (portal, focus trap, escape), `BasePanel` (resizable, collapsible), `BaseList` (virtualized, selectable), `BaseEditor` (dirty tracking, autosave).~~ | `ui/src/components/base/*.tsx` (new) | ✅ Done | BaseModal, BasePanel, BaseList, BaseEditor with full feature sets |

**Approach**: Create base classes first, then migrate one widget/component at a time. Use composition over inheritance where possible (React hooks pattern).

---

## Priority Tier 3 — Verification & Polish (Low Risk, High Confidence)

Independent, can parallelize.

| ID | Work | Files | Effort | Impact |
|----|------|-------|--------|--------|
| **WP-12** | **UISG Template Test Coverage** — Add to generated tests: axe assertions, visual snapshots (playwright), edge cases (empty, overflow, RTL), property validation | `ui/test/uisg/*.test.ts` | Low (2h) | Catches regressions in generated components |
| **WP-13** | **ProfileRegistry Browser Verification** — Verify: localStorage persistence, revision store mock, cross-tab sync, hydration race conditions | `ui/test/profileRegistry.browser.test.ts` | Low (1h) | Confirms cross-platform parity |
| **WP-14** | **Help Video Captions Verification** — Verify: WebVTT generation → `HelpVideoPlayer` → journey integration → caption sync | `ui/src/components/HelpVideoPlayer.tsx`, journey files | Low (2h) | Completes TODO35.md item |

**Strategy**: Run WP-12/13/14 in parallel after WP-11 provides test utilities.

---

## Priority Tier 4 — Architecture Improvements (Strategic Leverage)

These are multiplicative — they accelerate all future work.

| ID | Work | Effort | Impact |
|----|------|--------|--------|
| **A** | **Plugin/Extension System** — Dynamic loading: `Plugin` interface with `strategies`, `profiles`, `commands`, `uiExtensions`. Hot-reload via HMR. Feature flags per plugin. | Medium (4h) | Enables 3rd-party extensions, isolates features, enables gradual rollout |
| **B** | **Reactive State Layer** — Replace `useViewContext` + `useSettingsContext` + `useNotes` with single signals-based store (`@legendapp/state` or custom). Fine-grained subscriptions, DevTools time-travel. | Medium (6h) | Eliminates context nesting; 10x render optimization; debuggable state |
| **C** | **Build-Time Codegen Pipeline** — Extend UISG codegen: Strategy resolution → decision trees, Property validation → TS types, Routes → type-safe navigation, Metaphors → component registry | Medium (4h) | Moves runtime cost to build; type-safe APIs; smaller bundles |
| **D** | **Observability/Telemetry** — Structured events in `Registry`, `StrategySystem`, `UrlRouter`, `BaseCommand`, `BaseStepExecutor`. OpenTelemetry compatible. | Low (2h) | Production debugging; performance baselines; automated regression detection |

**Sequencing**: A → B → C → D (each builds on previous). Can start A in parallel with Tier 2.

---

## Dependency Graph (Optimized Execution Order)

```
✅ T0, WP-1,2,3,4,5,6,7,8,9,10,11
    │
    ├──→ WP-12 (UISG tests) 
    ├──→ WP-13 (Browser verify)
    ├──→ WP-14 (Captions)
    │
    └──→ A (Plugin System) — independent, high leverage
            │
            ├──→ B (Reactive State) — needs A for plugin state isolation
            │       └──→ C (Build-Time Codegen) — needs B for signal-based codegen
            │               └──→ D (Observability) — instruments all above
```

---

## Resource Allocation (Sprints)

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| 1 | ~~WP-4~~, ~~WP-11~~ | All executors unified ✅; test-utils package ✅ |
| 2 | ~~WP-8~~, WP-12 | Widget bases done ✅; UISG test coverage |
| 3 | ~~WP-9~~, WP-13, WP-14 | Component bases ✅; browser verify; captions done |
| 4 | A (Plugin System) | Dynamic plugin loading + hot-reload |
| 5 | B (Reactive State) | Signals-based store replacing contexts |
| 6 | C (Build-Time Codegen) | Extended codegen pipeline |
| 7 | D (Observability) | Telemetry in all core systems |

**Total**: ~32 hours across 7 sprints (vs original 40-50 across 5)
**Efficiency gain**: Parallel tracks + proven patterns + eliminated rework

---

## Pattern Templates (Reuse, Don't Reinvent)

### BaseClass Pattern (from WP-4/WP-5)
```typescript
// Template for any base class
export class BaseX {
  // Shared utilities as static methods
  static sharedUtil() {}
  
  // Factory creates concrete implementation
  static create(options: Options): Implementation {
    return { execute: async (ctx) => { /* use static utils */ } };
  }
}

// Mixins for optional capabilities
export const withCapability = { capabilityMethod() {} };
```

### Unified Definition Pattern (from WP-10)
```typescript
// Single source of truth with optional extensions
export interface UnifiedX extends CoreX {
  uiComponent?: React.ComponentType<Props>;
  uiPreview?: React.ComponentType<PreviewProps>;
  uiValidate?: (values: Values) => string[];
}
```

### Registry Integration Pattern (from WP-1/2)
```typescript
// Register in both core and UI atomically
export function createBundle(definition: UnifiedX) {
  return {
    definition,
    register(coreRegistry, uiPlugin) {
      coreRegistry.register(toCore(definition));
      if (definition.uiComponent) uiPlugin.register(definition.id, definition.uiComponent);
    }
  };
}
```

---

## Verification Checklist

```bash
# Tier 1 — Foundation
pnpm --filter @notention/optimize test      # All 15 executors use BaseStepExecutor
pnpm --filter @notention/test-utils test    # Test utilities package

# Tier 2 — UI Consolidation
pnpm --filter @notention/ui test            # Widget/component bases
pnpm --filter @notention/ui typecheck       # Strict TS

# Tier 3 — Verification
pnpm check:ui                               # Axe, dual-theme, visual snapshots
pnpm --filter @notention/ui test:browser    # ProfileRegistry, captions

# Tier 4 — Architecture
pnpm build                                  # All workspaces
pnpm optimize:generate                      # UISG codegen with new pipeline
```

---

## Key Principles (Enhanced)

1. **Finish what's started** — WP-4, WP-11, WP-8, WP-9 complete; WP-12/13/14 next
2. **Proven patterns only** — BaseCommand, BaseStepExecutor, UnifiedMetaphor are templates; apply them
3. **Test infrastructure first** — WP-11 accelerates WP-12/13/14 by 2x ✅
4. **Architecture multiplicative** — Plugin → Reactive → Codegen → Observability compounds
5. **Parallelize independent tracks** — Tier 3 items (12/13/14) are fully independent after WP-11 ✅
6. **No new patterns without 3+ uses** — Wait for repetition before abstracting

---

*Generated: 2026-11-27*
*Status: Core refactoring complete; Tier 0 CI blockers RESOLVED; WP-1/2/3/4/5/6/7/8/9/10/11 COMPLETE*
*Next: WP-12 (UISG tests), WP-13 (Browser verify), WP-14 (Captions) in parallel*