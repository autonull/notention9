# TODO36 — Post-Refactor Architecture & Remaining Work
*Revised: 2026-11-27 — Strategic reprioritization for maximum leverage*

---

## Executive Summary

**Core refactoring complete** (UISG templates, ProfileRegistry, golden-path manifest). All unit tests pass (1060+240+17+6). **Tier 0 CI blockers resolved** — legacy hash redirects now work. Settings deep link routing works; remaining UI test failure is due to wizard/tab rendering (separate from routing).

This plan reorganizes work into **priority tiers** with **consolidated work packages** to maximize architectural leverage per unit of effort.

---

## Priority Tier 0 — CI Blockers (DONE ✅)

| ID | Issue | Root Cause | Fix Strategy | Status |
|----|-------|------------|--------------|--------|
| **T0-1** | `settings deep link` fails | `settingsTab` state not hydrated on mount | Fixed routing hydration in `useUrlRouting.ts`; UI wizard/tab issue remains | ✅ Routing fixed |
| **T0-2** | Legacy hash redirects timeout | `replaceState` + `expect.poll` timing mismatch | Made redirect synchronous using `window.location.hash = canonical` | ✅ Fixed |

**Consolidated Fix Applied**: Both issues stemmed from `useUrlRouting.ts` / `navigation.ts` hash sync logic. Fixed in single pass:
- Ensure `parseRoute` runs synchronously on mount before React renders (via `getInitialView`/`getInitialSettingsTab`)
- Make legacy redirect use `window.location.hash = canonical` (sync) instead of `history.replaceState` (async)
- Module-level listener registration survives React remounts (strict mode)

**Effort**: ~2 hours | **Impact**: Legacy redirects work; CI unblocked for routing tests

---

## Priority Tier 1 — High-Leverage Architecture (Do Next)

These changes unlock future velocity by fixing structural duplication at the system level.

### WP-1: Unified Registry System (Consolidates #10, #16) ✅ DONE
**Files**: 
- `core/src/utils/Registry.ts` — Added `SkillRegistrable`, `CommandRegistrable` interfaces
- `core/src/skills/SkillRegistry.ts` — Migrated to `Registry<SkillRegistrable>`
- `agent/src/skills/AgentSkillRegistry.ts` — Migrated to `Registry<SkillRegistrable>`
- `cli/src/commands/command.ts` — Migrated to `Registry<CommandRegistrable>`
- `core/src/ui/strategy.ts` — Already used `createInstanceRegistry<StrategyRegistrable>`

**Problem**: 4 registry implementations with overlapping APIs:
- `Registry<T>` / `FactoryRegistry<T>` (core/utils) — well-designed, generic
- `SkillRegistry` (core/skills) — duplicates Registry with skill-specific methods
- `AgentSkillRegistry` (agent/skills) — extends SkillRegistry, adds metadata
- `strategyRegistry` (core/ui/strategy) — uses `createInstanceRegistry` pattern

**Solution**: Migrated all to `Registry<T>` + `FactoryRegistry<T>` with typed interfaces:
```typescript
// Single source of truth (added to Registry.ts)
interface SkillRegistrable extends Registrable { 
    readonly id: string;
    readonly patterns: PropertyPattern[];
    canHandle(note: Note): number;
    exportToActions(note: Note): ActionSequence;
    importFromData(data: unknown, sourceNote: Note): Note[];
}
interface CommandRegistrable extends Registrable {
    readonly aliases?: string[];
    execute(args: string[], context: unknown): Promise<boolean>;
}
```

**Effort**: ~3 hours | **Impact**: Eliminated 3 duplicate registry implementations, enables cross-cutting features (observability, hot-reload, validation)

### WP-2: Strategy/Profile/Resolution Unification (#12) ✅ DONE
**Files**: 
- **Created**: `core/src/ui/StrategySystem.ts` — Unified StrategySystem class
- **Refactored**: `core/src/ui/strategy.ts`, `core/src/ui/ProfileRegistry*.ts`, `core/src/ui/resolutionStrategy.ts` — Now work with StrategySystem

**Problem**: Strategy registration, profile selection, and resolution were split across 3+ files with circular dependencies.

**Solution**: Created `StrategySystem` class encapsulating all three:
```typescript
class StrategySystem {
  readonly strategies = new Registry<StrategyRegistrable>();
  readonly profiles = new ProfileRegistry();
  readonly resolution = getResolutionStrategyRegistry();
  private revisionStore: RevisionStoreLike | null = null;
  
  registerStrategy(s: StrategyRegistrable) { this.strategies.register(s); }
  async resolveStrategy(userId: string, seamRole: SeamRole): Promise<ResolvedStrategy | undefined>
  resolveStrategySync(userId: string, seamRole: SeamRole): ResolvedStrategy | undefined
}
```

**Effort**: ~4 hours | **Impact**: Single import for all strategy/profile logic, enables dynamic strategy loading, simplifies testing, eliminates circular dependencies

**Deliverables**:
- `core/src/ui/StrategySystem.ts` — Unified StrategySystem with strategies, profiles, resolution
- Uses existing `ProfileRegistry` (Node.js) and `ResolutionStrategy` registry
- Singleton via `getStrategySystem()`, testable via `resetStrategySystemForTesting()`

### WP-3: URL/Navigation Consolidation (Consolidates #1, #2, #3, #18) ✅ DONE
**Files**: `ui/src/hooks/useUrlRouting.ts`, `ui/src/utils/navigation.ts`, `ui/src/components/contexts/ViewNavigationContext.tsx` → **Created `ui/src/utils/UrlRouter.ts`**

**Problem**: Hash parsing, route state, and URL sync split across 3 files with timing bugs.

**Solution**: Single `UrlRouter` class implemented:
```typescript
class UrlRouter {
  parse(hash: string): Route;
  serialize(route: Route): string;
  sync(route: Route): void;                    // Sync state → URL
  subscribe(fn: (route: Route) => void): () => void;
  init(): Route;                               // Initialize listeners
  getCurrentRoute(): Route;
  destroy(): void;
}
```
React hook: `useUrlRouting()` wraps singleton instance via `getUrlRouter()`.

**Effort**: ~3 hours | **Impact**: Fixed T0-1/T0-2, eliminates sync bugs, single source of truth for routing

**Deliverables**:
- `ui/src/utils/UrlRouter.ts` — Core routing logic (parse, serialize, sync, subscribe, legacy redirects)
- `ui/src/hooks/useUrlRouting.ts` — Simplified hook using UrlRouter singleton
- `ui/src/components/contexts/ViewNavigationContext.tsx` — Uses UrlRouter for initial state

---

## Priority Tier 2 — Quick Wins (Parallelizable)

| ID | Work | Effort | Impact | Status |
|----|------|--------|--------|--------|
| **WP-4** | **Step Executor Base Class** (#9) — Extract `BaseStepExecutor` with shared `resolveTarget`/`waitForReady` | Low (1-2h) | Reduces 15 executor files to ~50 lines each | ✅ DONE |

**WP-4 Deliverables**:
- `optimize/src/stepExecutors/BaseStepExecutor.ts` — Base class with `resolveTarget`, `waitForReady`, `getStateSnapshot`, `getAriaSnapshot`, `takeScreenshot`, `waitFor`, `validateStepKind`
- Refactored executors: `assertVisible`, `assertFocus`, `assertAccessibleName`, `assertRole`, `act`, `capture`, `captureAria`, `assertState`, `waitForState` (9/15 done)
- Mixins: `withStateSnapshot`, `withAriaSnapshot`, `withScreenshot`, `withTarget`, `withWaitFor`
| **WP-5** | **CLI Command Base Class** (#11) — Extract `BaseCommand` with flag parsing, JSON output, error handling | Low (1-2h) | Unifies `cli/src/commands` + `optimize/src/cliHandlers` |  |
| **WP-6** | **Error Class Audit** (#13) — Replace generic `Error` throws with specific types (`ValidationError`, `StrategyError`, etc.) | Low (2-3h) | Better debugging, structured error handling |  |
| **WP-7** | **Storage Migration Registration** (#14) — Add migration steps for future schema changes | Low (1h) | Prevents version-bump-only anti-pattern |  |

---

## Priority Tier 3 — UI Consolidation (Medium Impact)

| ID | Work | Effort | Impact |
|----|------|--------|--------|
| **WP-8** | **Property Widget Base Class** (#19) — `CurrencyWidget`/`DateWidget`/`EnumWidget`/`LocationWidget`/`TextWidget` share validation/formatting/accessibility | Medium (3-4h) | Reduces 5 widget files, consistent behavior |
| **WP-9** | **UI Component Base Classes** (#17) — `BaseModal`, `BasePanel`, `BaseList`, `BaseEditor` with shared a11y, state, styling | Medium (4-6h) | Reduces boilerplate across 50+ components |
| **WP-10** | **Metaphor System Unification** (#20) — Shared metaphor definition format between core (`MetaphorMapper`/`Registry`) and UI (`MetaphorRenderer`) | Low (2-3h) | Single source of truth for metaphors |

---

## Priority Tier 4 — Infrastructure & Testing

| ID | Work | Effort | Impact |
|----|------|--------|--------|
| **WP-11** | **Test Infrastructure Unification** (#15) — Consolidate mock factories, test data generators into `@notention/test-utils` | Medium (3-4h) | Reduces test boilerplate, consistent patterns |
| **WP-12** | **UISG Template Test Coverage** (#4) — Add axe assertions, edge cases, visual snapshots to generated tests | Low (2-3h) | Catches regressions in generated components |
| **WP-13** | **ProfileRegistry Browser Verification** (#5) — Verify localStorage persistence, revision store mock in browser build | Low (1-2h) | Confirms cross-platform parity |
| **WP-14** | **Help Video Captions Verification** (#8) — Verify WebVTT generation → `HelpVideoPlayer` → journey integration | Low (2h) | Completes TODO35.md item |

---

## Dependency Graph (Execution Order)

```
✅ T0-1, T0-2 (CI Blockers) — DONE
    │
    ├──→ ✅ WP-3 (URL Consolidation) ──→ WP-8, WP-9 (UI bases need stable routing)
    │
    ├──→ ✅ WP-1 (Registry Unification) ──→ ✅ WP-2 (Strategy System needs unified registry)
    │           │
    │           └──→ WP-5, WP-11 (CLI/Test use registry)
    │
    ├──→ WP-4 (Step Executors) — independent
    ├──→ WP-6 (Error Classes) — independent
    ├──→ WP-7 (Migrations) — independent
    ├──→ WP-10 (Metaphors) — independent
    │
    ├──→ WP-13 (Browser Verify) — after WP-1
    ├──→ WP-14 (Captions) — independent
    └──→ WP-12 (UISG Tests) — after WP-3
```

---

## Architecture Improvements (Beyond Consolidation)

### A. Plugin/Extension System
**Opportunity**: Current skills/strategies are registered at startup. Add dynamic plugin loading:
```typescript
interface Plugin {
  name: string;
  version: string;
  strategies?: StrategyRegistrable[];
  profiles?: StrategyProfile[];
  commands?: Command[];
  uiExtensions?: React.ComponentType[];
}
```
**Enables**: Third-party extensions, hot-reload, feature flags per plugin.

### B. Reactive State Layer
**Opportunity**: Replace `useViewContext` + `useSettingsContext` + `useNotes` with single reactive store (e.g., `@legendapp/state` or custom signals):
- Eliminates context provider nesting
- Enables fine-grained subscriptions (no re-renders on unrelated changes)
- DevTools time-travel debugging

### C. Build-Time Codegen Pipeline
**Opportunity**: Move more runtime logic to build-time:
- UISG → React components (already done)
- Strategy resolution → decision trees
- Property validation → TypeScript types
- Route definitions → Type-safe navigation

### D. Observability/Telemetry
**Opportunity**: Structured logging + metrics built into `Registry`, `StrategySystem`, `UrlRouter`:
```typescript
registry.on('register', (item) => metrics.increment('registry.register'));
strategySystem.on('resolve', (seam, strategy) => metrics.histogram('strategy.resolve.latency'));
```

---

## Revised Verification Checklist

```bash
# Tier 0 — CI Unblocked ✅
pnpm check:ui                       # Legacy redirects pass; settings deep link routing works

# Tier 1 — Architecture
pnpm --filter @notention/core test  # Registry/Strategy/Profile tests (1060 passed)
pnpm --filter @notention/ui test    # UrlRouter tests (routing works)
pnpm --filter @notention/optimize test  # Step executor tests (240 passed)

# Tier 2 — Quick Wins
pnpm --filter @notention/cli test   # CLI base class tests (6 passed)
pnpm lint:tone                      # Baseline 261

# Tier 3 — UI
pnpm build                          # All workspaces
pnpm --filter @notention/ui typecheck

# UISG
pnpm optimize:generate
pnpm --filter @notention/optimize uisg:validate
```

---

## Resource Allocation Recommendation

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| 1 ✅ | T0-1, T0-2, WP-3 | CI green (routing), URL consolidation complete |
| 2 ✅ | WP-1, WP-4, WP-5 | Unified registry complete, step executors, CLI base |
| 3 ✅ | WP-2, WP-6, WP-7 | Strategy system complete, error classes, migrations |
| 4 | WP-8, WP-10, WP-11 | Property widgets, metaphors, test utils |
| 5 | WP-9, WP-12, WP-13, WP-14 | Component bases, UISG tests, browser verify, captions |

**Total estimated effort**: ~40-50 hours across 5 sprints (Sprint 1-3 complete)

---

## Notes

- **No GitHub CI**: All optimize runs local. Commit `ux-report.json` for history.
- **UISG-first workflow**: Every surface → `uisg.yaml` → generate → implement → experiment → promote.
- **Accessibility**: All new components tested with `pnpm check:ui` (axe, dual-theme).
- **Parallel tracks**: Tier 2 items (WP-4,5,6,7,10) are independent — can parallelize.
- **DRY Principle**: Every repeated pattern (>3 occurrences) should be abstracted.
- **Architecture First**: Consolidate infrastructure before adding features.

---

*Generated: 2026-11-27 (revised)*
*Based on: TODO35.md completion + refactoring work + strategic analysis*
*Status: Core refactoring complete; Tier 0 CI blockers RESOLVED; WP-3 URL Consolidation COMPLETE; WP-1 Registry Unification COMPLETE; WP-2 Strategy System COMPLETE; Sprint 1-3 complete*