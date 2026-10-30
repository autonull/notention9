# TODO.10.md - High-Value Refactoring Opportunities (Post TODO.9)

## Overview
After completing TODO.9 (consolidated types, dynamic seam IDs, test cases), this document identifies the next batch of high-impact refactoring opportunities.

---

## 🔴 Critical (High Impact, High Complexity)

### 1. Consolidate AI Validation/Repair Logic
**Files:** `ui/src/services/ai/schema.ts`, `optimize/src/services/ai/extractionSchema.ts`, `ui/src/services/ai/inference.ts`

**Problem:** Three validation/repair systems:
- `ui/src/services/ai/schema.ts` - Zod schemas + `validateAndRepair`, `repairPropertyArray`, `repairTagArray`, `repairInferredAttributes`, `repairOntologyOptimization`
- `optimize/src/services/ai/extractionSchema.ts` - JSON Schema validation + `repairExtraction` with LLM-based repair loop
- `ui/src/services/ai/inference.ts` - `InferenceRouter` that uses schema.ts repair functions

**Opportunity:** Create unified validation library in `core/src/validation/`:
- Single `Validator<T>` interface with `validate()` and `repair()` methods
- Zod-based schemas as source of truth (already in schema.ts)
- LLM repair loop as optional strategy (from extractionSchema.ts)
- Heuristic repair functions as fallback (from schema.ts)
- All packages import from `@notention/core/validation`

**Impact:** Eliminates ~400 lines of duplicate validation logic, ensures consistent behavior across AI inference paths.

---

### 2. Unify Property Extraction Pipeline
**Files:** `core/src/notes/propertyExtractor/` (deterministic), `ui/src/services/ai/inference.ts` (AI-based), `optimize/src/services/ai/extractionSchema.ts` (schema-driven)

**Problem:** Three extraction approaches with overlapping goals:
- Core: Regex/pattern-based deterministic extraction (`patterns.ts`, `extractors.ts`)
- UI: AI provider-based with heuristic fallback (`InferenceRouter.alignToOntology`)
- Optimize: Schema-driven LLM extraction with repair loop

**Opportunity:** Create unified `ExtractorPipeline` in `core/src/extraction/`:
```typescript
interface ExtractionStage {
  name: string;
  extract(text: string, context: ExtractionContext): Property[];
  confidence: number;
}

const pipeline = [
  { name: 'deterministic', extract: deterministicExtractor, confidence: 0.9 },
  { name: 'pattern', extract: patternExtractor, confidence: 0.7 },
  { name: 'ai', extract: aiExtractor, confidence: 0.8 },
  { name: 'fuzzy', extract: fuzzyExtractor, confidence: 0.5 },
];
```
- Stages run in order, later stages only fill gaps
- Configurable per-use-case (capture vs tag suggestion vs ontology alignment)
- Shared ontology context (`OntologyService`)

**Impact:** Single source of truth for extraction, better accuracy via ensemble, ~300 lines deduplicated.

---

### 3. Consolidate Ontology Types & Operations
**Files:** `core/src/ontology/` (core), `optimize/src/services/ai/extractionSchema.ts` (imports from core but redefines some logic)

**Problem:** 
- `extractionSchema.ts` reimplements `findAttributeInOntology`, `isRequiredInOntology`, `attributeToSchema`
- Core already exports `collectOntologyKeys`, `findNodeWithAttribute`, `findAttributeDef` from `ontologyCore.ts`
- Widget metadata in `widgets.ts` overlaps with schema generation

**Opportunity:** Move schema generation to core:
- Add `generateExtractionSchema(ontology)` to `core/src/ontology/ontologyService.ts` or new `schema.ts`
- Export `ExtractionSchema`, `PropertySchema` types from core
- `extractionSchema.ts` becomes thin wrapper calling core function
- Widget type mapping (`WidgetType` enum) already in core, use it

**Impact:** Removes ~200 lines from optimize, single ontology truth.

---

## 🟠 High Value (Medium Impact, Medium Complexity)

### 4. Strategy Component Base Class
**Files:** `ui/src/strategies/*.tsx` (DescribeItComposerStrategy, TagInputStrategy, PropertyFormStrategy, TemplateSelectorStrategy)

**Problem:** Each strategy reimplements:
- Prop handling (ontology, onSave, onCancel, etc.)
- Error boundary patterns
- Loading states
- Accessibility attributes

**Opportunity:** Create `BaseStrategy<P>` component:
```typescript
abstract class BaseStrategy<P extends StrategyProps> extends React.Component<P> {
  protected ontology: OntologyNode[];
  protected abstract renderStrategy(props: P): React.ReactElement;
  
  render() {
    return (
      <ErrorBoundary fallback={this.renderFallback}>
        <LoadingWrapper isLoading={this.state.isLoading}>
          {this.renderStrategy(this.props)}
        </LoadingWrapper>
      </ErrorBoundary>
    );
  }
}
```
- Common props interface: `ontology`, `onSave`, `onCancel`, `isLoading`, `error`
- Shared a11y patterns (ARIA labels, keyboard navigation)
- Consistent error/loading UI

**Impact:** ~150 lines deduplicated, consistent UX across strategies.

---

### 5. CLI Command Framework
**Files:** `optimize/src/cli.ts`, `optimize/src/cliHandlers/*.ts`

**Problem:** Each handler manually parses flags, handles errors, prints help. No shared structure.

**Opportunity:** Create `Command` base class in `optimize/src/cli/Command.ts`:
```typescript
abstract class Command {
  abstract name: string;
  abstract description: string;
  abstract options: Option[];
  abstract execute(args: ParsedArgs): Promise<number>;
  
  protected printHelp(): void;
  protected handleError(err: Error): number;
  protected requireArg(name: string): string;
}

// Each handler becomes:
export class OptimizeCommand extends Command {
  name = 'optimize';
  description = 'Run optimization journey';
  options = [{ name: '--json', type: 'boolean' }, ...];
  
  async execute(args) { return handleOptimize(...); }
}
```
- Auto-generated help from option definitions
- Consistent error handling, JSON output flag
- Easy to add new commands

**Impact:** ~100 lines deduplicated, extensible CLI.

---

### 6. Discovery Module Consolidation ✅ **COMPLETED**
**Files:** `optimize/src/discovery/*.ts` (20+ files reorganized)

**Problem:** Many small files with overlapping responsibilities:
- `seams.ts` - seam discovery
- `duplicates.ts` - duplicate analysis
- `componentScanner.ts` - component analysis
- `journeyGenerator.ts` - journey synthesis (template-based)
- `journeySynthesizer.ts` - journey synthesis (dynamic)
- `regressionGenerator.ts` - test generation
- `goldenCaseMiner.ts` - test case mining
- `intentBuilder.ts`, `stepBuilder.ts`, `seedBuilder.ts` - builder pattern fragments
- `stateSchema.ts`, `traceEmitterScanner.ts`, `tsAstScanner.ts`, `typeSchema.ts`, `astProject.ts` - scanning
- `eventFlowScanner.ts`, `selectorInference.ts`, `statePathRegistry.ts`, `ontologyAdapter.ts` - analysis
- `accessibilitySelector.ts`, `mcpContractScanner.ts` - specialized scanners
- `goalParser.ts` - goal parsing
- `simulatorScenarioGenerator.ts` - testgen

**Solution:** Reorganized into cohesive modules:
```
discovery/
├── index.ts              # Public API + DiscoveryEngine facade
├── scanner/
│   ├── componentScanner.ts
│   ├── tsAstScanner.ts
│   ├── mcpContractScanner.ts
│   ├── astProject.ts
│   ├── traceEmitterScanner.ts
│   ├── stateSchema.ts
│   ├── typeSchema.ts
│   └── accessibilitySelector.ts
├── analyzer/
│   ├── seamAnalyzer.ts       (was seams.ts)
│   ├── duplicateAnalyzer.ts  (was duplicates.ts)
│   ├── eventFlowScanner.ts
│   ├── statePathRegistry.ts
│   ├── selectorInference.ts
│   └── ontologyAdapter.ts
├── synthesizer/
│   ├── journeySynthesizer.ts
│   ├── journeyGenerator.ts   (template-based, kept separate from synthesizer)
│   ├── goalParser.ts
│   ├── intentBuilder.ts
│   ├── stepBuilder.ts
│   └── seedBuilder.ts
├── testgen/
│   ├── goldenCaseMiner.ts
│   ├── regressionGenerator.ts
│   └── simulatorScenarioGenerator.ts
```
- Clear separation: scan → analyze → synthesize → testgen
- `journeyGenerator.ts` (template-based) and `journeySynthesizer.ts` (dynamic) kept as separate approaches
- All imports updated across codebase
- Test file `componentScanner.test.ts` and `goldenCaseMiner.test.ts` updated

**Impact:** Better maintainability, clearer architecture, all 568 tests pass.

---

### 7. Test Infrastructure Unification ✅ **COMPLETED**
**Files:** Multiple test utilities across packages

**Problem:** 
- `optimize/src/tests/loop-config.test.ts` - config testing helpers
- `optimize/src/tests/goldenCaseMiner.test.ts` - golden case testing
- `core/src/tests/` - core tests
- `ui/src/components/settings/DataTab.test.tsx` - component tests

**Solution:** Created shared test infrastructure in `core/src/test-utils/`:
- `testSetup.ts` - shared environment setup (localStorage, matchMedia, ResizeObserver, memory guard)
- `vitestSetup.ts` - ready-to-use vitest setup file with afterEach/afterAll cleanup
- `index.ts` - re-exports all utilities including `setupTestEnvironment`, `cleanupTestEnvironment`, `initMemoryGuard`, `withMemoryGuard`, `MEMORY_THRESHOLD_MB/BYTES`
- Updated `ui/src/tests/setup.ts` to use shared setup
- Updated `optimize/vitest.config.ts` to use shared setup
- UI-specific `renderWithProviders` kept in `ui/src/tests/utils/testProviders.tsx` (depends on UI contexts)

**Impact:** Consistent test patterns across packages, centralized environment setup, all 568 tests pass.

---

## 🟡 Medium Value (Lower Impact, Lower Complexity)

### 8. Constants/Configuration Centralization
**Files:** Scattered constants in `core/src/constants/`, `ui/src/constants/`, `optimize/src/utils/loopConfig.ts`, `optimize/src/config.ts`

**Opportunity:** Single `config.ts` at workspace root or in core:
- Environment-specific config (dev/prod/test)
- Feature flags
- Default timeouts, retries, limits
- Ontology version pinning

### 9. Error Type Hierarchy
**Files:** Error handling scattered, inconsistent error types

**Opportunity:** Define error hierarchy in `core/src/errors/`:
```typescript
class NotentionError extends Error { code: string }
class ValidationError extends NotentionError { }
class ExtractionError extends NotentionError { }
class StrategyError extends NotentionError { }
class ProviderError extends NotentionError { }
```
- Replace generic `Error` throws
- Enable typed catch blocks
- Better error reporting/monitoring

### 10. Event/Telemetry System
**Files:** `core/src/tracing/`, ad-hoc console.log throughout

**Opportunity:** Unified event emitter in `core/src/events/`:
- Structured events (extraction, match, strategy-switch, error)
- Pluggable sinks (console, file, remote)
- Sampling/configurable verbosity
- Replace ad-hoc logging

---

## 📋 Suggested Execution Order

| Priority | Task | Est. Effort | Dependencies | Status |
|----------|------|-------------|--------------|--------|
| 1 | Consolidate AI Validation/Repair | 2-3 days | None | ✅ Done |
| 2 | Unify Property Extraction Pipeline | 3-4 days | Task 1 | ✅ Done |
| 3 | Consolidate Ontology Types | 1-2 days | None | ✅ Done |
| 4 | **Strategy Component Base Class** | 1-2 days | None | ✅ Done |
| 5 | CLI Command Framework | 1 day | None | ✅ Done |
| 6 | **Discovery Module Consolidation** | 2-3 days | None | ✅ Done |
| 7 | **Test Infrastructure Unification** | 1-2 days | None | ✅ Done |
| 8 | Constants Centralization | 0.5 day | None | ⏳ Next |
| 9 | Error Type Hierarchy | 1 day | None | ⏳ |
| 10 | Event/Telemetry System | 2 days | Task 9 | ⏳ |

---

## 🎯 Quick Wins (Do First)

1. **Move schema generation to core** - ~30 min, immediate dedup ✅ **COMPLETED**
2. **Create `BaseStrategy` component** - ~1 hour, visible UI consistency ✅ **COMPLETED**
3. **Extract test utilities to shared location** - ~1 hour, helps all future tests ✅ **COMPLETED**
4. **Unify CLI handlers with base class** - ~1 hour, cleaner CLI ✅ **COMPLETED**

---

## 📝 Notes

- All refactoring must preserve behavior (run full test suite after each)
- Follow AGENTS.md: DRY, modular, parameterized, modern JS
- Prefer composition over inheritance (except BaseStrategy which is React pattern)
- Keep core as the "source of truth" - optimize and ui import from core
- Update exports in package.json when moving functions between files

---

## 🚀 Development Plan

### Guiding Principles
1. **Test-first consolidation**: Write/adapt tests for the new unified API before removing old implementations
2. **Incremental migration**: One package at a time, verify at each step
3. **Zero-downtime**: Keep all tests passing throughout
4. **Core as source of truth**: All shared logic lives in `core/`, others import from it

---

### Phase 1: Quick Wins (Week 1, ~4 hours)

#### QW1: Move Schema Generation to Core (30 min) ✅ **COMPLETED**
**Goal:** Eliminate ~200 lines in `optimize/src/services/ai/extractionSchema.ts`

**Steps:**
1. ✅ Add `generateExtractionSchema()` to `core/src/ontology/schema.ts` (new file)
2. ✅ Export `ExtractionSchema`, `PropertySchema` types from `core/src/ontology/index.ts`
3. ✅ Update `optimize/src/services/ai/extractionSchema.ts` to import and delegate
4. ✅ Run tests: `pnpm test --filter=core && pnpm test --filter=optimize`

**Validation:** All extraction schema tests pass, optimize bundle size reduced

#### QW2: Create BaseStrategy Component (1 hour) ✅ **COMPLETED**
**Goal:** Deduplicate 4 strategy components (~150 lines)

**Steps:**
1. ✅ Create `core/src/ui/BaseStrategy.tsx` with:
   - `BaseStrategy` abstract class component with error boundary, loading, a11y
   - `useBaseStrategy` hook for functional components
   - `withBaseStrategy` HOC for wrapping components
   - `createBaseStrategy` function integrating with existing `createComponentStrategy`
   - Common props interface (`ontology`, `onSave`, `onCancel`, `isLoading`, `error`)
2. ✅ Export from `core/src/ui/index.ts`
3. ✅ Run tests: `pnpm test` - all 568 pass

**Validation:** All tests pass, BaseStrategy ready for incremental adoption by strategy components

**Note:** Strategy components in `ui/src/strategies/` use `createComponentStrategy` pattern. They can be migrated to `createBaseStrategy` incrementally for error boundary, loading, and a11y features.

#### QW3: Extract Test Utilities (1 hour) ✅ **COMPLETED**
**Goal:** Shared test factories across packages

**Steps:**
1. ✅ Create `core/src/test-utils/index.ts` with:
   - `createMockOntology()`
   - `createMockNote(overrides?)`
   - `createMockProperty(key, operator, values)`
   - `createMockStrategy(seamRole, overrides?)`
   - `renderWithProviders(ui)` - not needed, components use standard React testing
   - `assertPropertyMatch(actual, expected)`
   - `withTimeout()` - re-exported from `utils/async.ts`
2. ✅ Export from `core/src/test-utils/index.ts` and add to `core/package.json` exports
3. ✅ Update one test file in each package to use new utilities (can be done incrementally)
4. ✅ Run all tests: `pnpm test`

**Validation:** Tests pass, reduced boilerplate in updated test files

#### QW4: Unify CLI Handlers (1 hour) ✅ **COMPLETED**
**Goal:** Common command structure for 7 handlers

**Steps:**
1. ✅ Create `optimize/src/cli/Command.ts` base class
2. ✅ Refactor `optimize.ts`, `replay.ts`, `generateTest.ts`, `reproduce.ts`, `markFixed.ts`, `findings.ts`, `uxEvaluate.ts` to extend `Command`
3. ✅ Update `cli.ts` to use command registry
4. ✅ Run tests: `pnpm test --filter=optimize`

**Validation:** All CLI commands work, help output consistent

---

### Phase 2: Critical Consolidation (Week 2-3, ~10 days)

#### C1: Consolidate AI Validation/Repair (3-4 days) ✅ **COMPLETED**
**Goal:** Single validation library replacing 3 systems

**Approach:** Strangler Fig pattern
1. ✅ **Week 2 Day 1-2**: Create `core/src/validation/` with:
   - `Validator<T>` interface + `ZodValidator`, `JsonSchemaValidator`, `CustomValidator`
   - `RepairStrategy` interface + `HeuristicRepair` (JsonFence, PropertyArray, TagArray, InferredAttributes, OntologyOptimization), `LLMRepair` implementations
   - `ValidationPipeline` orchestrator with configurable repair attempts
   - Factory functions: `createPropertyPipeline`, `createTagPipeline`, `createInferredAttributesPipeline`, `createOntologyOptimizationPipeline`
2. ✅ **Week 2 Day 3**: Add comprehensive tests for new validation library (80 tests)
3. ✅ **Week 2 Day 4**: Migrate `ui/src/services/ai/inference.ts` to use new library
4. ✅ **Week 3 Day 1**: Migrate `ui/src/services/ai/schema.ts` (deleted old repair functions - removed ~150 lines)
5. ✅ **Week 3 Day 2**: Migrate `core/src/ontology/schema.ts` to use new ValidationPipeline (replaced custom validateAgainstSchema and repairExtraction)
6. ✅ **Week 3 Day 3-4**: Remove dead code, run full test suite

**Risk Mitigation:** Keep old implementations until new ones pass all existing tests

**Results:** 
- Consolidated 3 validation/repair systems into 1 unified library
- Reduced code duplication by ~400 lines
- All 568+ tests pass across monorepo

#### C2: Unify Property Extraction Pipeline (3-4 days) ✅ **COMPLETED**
**Depends on:** C1 (validation library)

**Approach:** Pipeline composition
1. ✅ **Day 1**: Create `core/src/extraction/ExtractionPipeline.ts` with stage interface
2. ✅ **Day 2**: Implement stages: `DeterministicStage`, `PatternStage`, `OntologyKeyStage`, `FuzzyStage`, `AIStage`
3. ✅ **Day 3**: Wire into `PropertyExtractor` (replace current monolithic extract)
4. ✅ **Day 4**: Update `InferenceRouter.alignToOntology` to use pipeline (LocalProvider already uses it)
5. ✅ **Day 5**: Tests + benchmark accuracy

**Results:**
- Created unified pipeline with 5 composable stages in `core/src/extraction/ExtractionPipeline.ts`
- `LocalProvider` migrated to use new pipeline
- `PropertyExtractor` updated to use full pipeline with async extraction
- Backward compatibility maintained via `alignToOntology` function
- All 568+ tests pass

#### C3: Consolidate Ontology Types (1-2 days) ✅ **COMPLETED (in QW1)**
**Can parallelize with C1**

**Steps:**
1. ✅ Move `generateExtractionSchema`, `attributeToSchema`, `mapType` to `core/src/ontology/schema.ts`
2. ✅ Export from `core/src/ontology/index.ts`
3. ✅ Update `optimize/src/services/ai/extractionSchema.ts` to import from core
4. ✅ Delete duplicate functions from optimize
5. ✅ Run tests

**Completed in QW1** - Schema generation moved to core, optimize delegates to core.

---

### Phase 3: Structural Improvements (Week 3-4, ~5 days)

#### S1: Discovery Module Reorganization (2-3 days) ✅ **COMPLETED**
**Goal:** Clear scan→analyze→synthesize→testgen flow

**Steps:**
1. ✅ Create new directory structure
2. ✅ Move files, update imports
3. ✅ Kept `journeyGenerator.ts` (template-based) and `journeySynthesizer.ts` (dynamic) as separate approaches
4. ✅ Updated `optimize/src/discovery/index.ts` exports
5. ✅ Updated test imports (`componentScanner.test.ts`, `goldenCaseMiner.test.ts`)
6. ✅ Run tests - all 568 pass

#### S2: Error Type Hierarchy (1 day)
**Goal:** Typed errors across codebase

**Steps:**
1. Create `core/src/errors/` with hierarchy
2. Replace `throw new Error()` in core packages
3. Add error codes for monitoring

#### S3: Constants Centralization (0.5 day)
**Goal:** Single config source

**Steps:**
1. Create `core/src/config.ts` with env-aware config
2. Migrate constants from `core/src/constants/`, `ui/src/constants/`, `optimize/src/utils/loopConfig.ts`, `optimize/src/config.ts`
3. Update imports

---

### Phase 4: Observability (Week 4, ~2 days)

#### O1: Event/Telemetry System (2 days)
**Goal:** Replace ad-hoc logging

**Steps:**
1. Create `core/src/events/EventEmitter.ts` with pluggable sinks
2. Define event types: `ExtractionEvent`, `MatchEvent`, `StrategyEvent`, `ErrorEvent`
3. Add sinks: `ConsoleSink`, `FileSink`, `RemoteSink`
4. Instrument key paths in core, ui, optimize
5. Add sampling/config via `core/src/config.ts`

---

### Test Strategy per Phase

| Phase | Test Approach |
|-------|---------------|
| Quick Wins | Existing tests sufficient; add 1-2 integration tests per change |
| Critical | **Write new tests first** for unified API, then migrate implementations |
| Structural | Regression tests; verify no behavior change |
| Observability | Integration tests for event emission; snapshot tests for event shapes |

---

### Rollback Plan per Task
| Task | Rollback Trigger | Rollback Action |
|------|------------------|-----------------|
| Any | Tests fail after migration | `git revert` single commit; old code intact until verified |
| C1/C2 | Accuracy regression >5% | Feature flag to disable new pipeline; compare metrics |
| S1 | Import errors | Keep old structure in parallel during transition |

---

### Definition of Done per Task
- [ ] All existing tests pass
- [ ] New tests added for unified API (critical tasks)
- [ ] No TypeScript errors
- [ ] Bundle size same or smaller
- [ ] No console errors in dev
- [ ] Documentation updated (JSDoc on public APIs)

---

### Parallelization Opportunities
- QW1, QW2, QW3, QW4: **Independent** - can run in parallel by different people
- QW1, QW2, QW3, QW4: ✅ **COMPLETED**
- C1 and C3: **Independent** - different code areas
- C1, C2, C3: ✅ **COMPLETED**
- Priority 6, 7, 8: **Independent** - can parallelize

---

### Estimated Timeline

```
Week 1:  QW1 ✅ → QW2 ✅ → QW3 ✅ → QW4 ✅  (sequential, 1 person, 4 hrs)
         └─ or parallel with 4 people

Week 2:  C1 ✅ (Days 1-4) + C3 ✅ (Days 1-2, parallel)
         
Week 3:  C2 ✅ (Days 1-5) 
         
Week 4:  Priority 6 ✅, 7 ✅, 8 ⏳, 9 ⏳  (sequential, 3.5 days)
Week 5:  Priority 10 ⏳ (2 days)
```

**Total: ~4 weeks for 1 person, ~2 weeks with 2-3 people**
**Completed: Priorities 1-7 (7/10 tasks)**

---

### Success Metrics
- **Lines deduplicated**: Target >1000 lines removed
- **Test coverage**: Maintain or improve current 522 tests passing
- **Bundle size**: Reduce optimize + ui by >10%
- **Build time**: Improve via reduced duplication
- **Developer experience**: Single import paths, consistent APIs