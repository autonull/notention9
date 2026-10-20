# Future Cleanup Opportunities

This document outlines significant refactoring opportunities for future sessions, prioritized by impact (LOC reduced, modularity gained, testability improved).

---

## Generic Cleanup Strategies

Apply these patterns systematically across the codebase before tackling specific files.

### 1. **Single Responsibility Extraction**
```
IF a file > 200 lines OR a class > 5 public methods
THEN extract each distinct responsibility into its own module
```
- **Indicators**: Multiple `private` methods that could be `export`ed, `switch` on type discriminators, conditional logic branching on data shape
- **Pattern**: `LargeClass.ts` → `strategies/StrategyA.ts`, `strategies/StrategyB.ts`, `LargeClass.ts` (thin orchestrator)
- **Test**: Each strategy independently testable; orchestrator tests only composition

### 2. **Strategy Pattern for Conditional Logic**
```
IF you see: switch/case on string/enum OR if/else chains on type
THEN: Extract each case to a strategy implementing a common interface
```
```ts
// Before
function process(type: string, data: any) {
  switch (type) { case 'A': ... case 'B': ... }
}

// After
interface Processor { process(data: any): Result }
const processors: Record<string, Processor> = { A: new AProcessor(), B: new BProcessor() }
function process(type: string, data: any) { return processors[type].process(data) }
```
- **Benefit**: Open/closed principle, each strategy testable in isolation, easy to add new types

### 3. **Data-Driven Over Code-Driven**
```
IF you see: Large const objects (aliases, conversions, configs) OR magic strings scattered
THEN: Move to JSON/YAML + loader, or centralized registry
```
- **Targets**: `data/units.ts`, ontology domain files, feature flags, error codes
- **Pattern**: `config/units.json` → `loadUnits(): UnitConfig` (cached, validated at build)
- **Benefit**: Non-dev edits, smaller bundles, versionable data, easier testing with fixtures

### 4. **Pipeline Composition Over Monolithic Functions**
```
IF a function: does parse → transform → validate → format in sequence
THEN: Split into pure stages, compose with pipe()
```
```ts
// Before
function process(input) { return format(validate(transform(parse(input)))) }

// After
const pipeline = pipe(parse, transform, validate, format)
// Each stage: pure, testable, replaceable, memoizable
```

### 5. **Barrel File Hygiene**
```
IF index.ts re-exports > 20 items OR mixes domains
THEN: Split into domain barrels + root barrel
```
```
core/
  index.ts              # re-exports: notes, matching, ontology, network, skills
  notes/index.ts        # re-exports: parsing, properties, notes, quantities
  matching/index.ts     # re-exports: MatchEngine, MatchingService, matchers
  ...
```
- **Rule**: Each barrel exports ONE conceptual domain
- **Enforcement**: `eslint-plugin-import` with `no-restricted-paths`

### 6. **Error Type Hierarchy**
```
IF multiple error files with overlapping classes
THEN: Single hierarchy with base class carrying context
```
```ts
class NotentionError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>, public readonly cause?: Error)
}
class ValidationError extends NotentionError { ... }
class PropertyValidationError extends ValidationError { ... }
```
- **Benefit**: `catch (e) { if (e instanceof NotentionError) log(e.context) }`

### 7. **Test-Driven Refactoring Loop**
```
BEFORE refactoring: Ensure tests pass
1. Run tests → baseline
2. Extract smallest unit → run tests
3. If red: revert, write characterization test first
4. Repeat until all extracted
5. Delete original file
```
- **Characterization test**: Capture current behavior (even if buggy) before changing
- **Golden master**: Snapshot output for complex transformations

### 8. **Import Graph Analysis**
```bash
# Circular deps
pnpm dlx madge --circular core/src

# Unused exports
pnpm dlx ts-prune

# Fan-in/out (find god modules)
pnpm dlx madge --image graph.svg core/src
```
- **Target**: No cycles, max fan-in < 10, max fan-out < 5 per module

### 9. **Dead Code Elimination**
```bash
# Find unreferenced exports
grep -r "export " core/src --include="*.ts" | grep -v ".test.ts" | \
  while read line; do
    name=$(echo "$line" | sed -E 's/.*export (class|function|const|type|interface) (\w+).*/\2/')
    if ! grep -r "\b$name\b" core/src --include="*.ts" | grep -v "^.*:.*export " | grep -q .; then
      echo "UNUSED: $name"
    fi
  done
```

### 10. **Performance-First Refactoring**
- **Memoize** pure functions in hot paths (`parseProperties`, `getCanonicalKey`, `haversineDistance`)
- **Lazy-load** heavy modules (`dynamic import()` for rarely-used features)
- **Structural sharing** instead of deep clone (`immer` or manual path copying)
- **Profile first**: `console.time` or `perf_hooks` before optimizing

---

## Core Package (High Impact)

### 1. `tasks/executor.ts` (414 lines) → **Split into strategies**
- **Current**: Monolithic `AutonomousTaskExecutor` with embedded scheduling, execution, retry logic
- **Split into**:
  - `TaskScheduler.ts` - cron/interval scheduling logic
  - `TaskRunner.ts` - execution pipeline with hooks
  - `RetryStrategy.ts` - exponential backoff, circuit breaker
  - `TaskQueue.ts` - priority queue, concurrency control
  - `executor/index.ts` - facade

### 2. `utils/validationFramework.ts` (275 lines) → **Extract domain logic**
- **Current**: A/B testing, metrics reporting, validation config all in one class
- **Split into**:
  - `ValidationConfig.ts` - types + defaults
  - `MetricsCollector.ts` - accuracy tracking, time-series
  - `ABTestManager.ts` - test lifecycle, statistical evaluation
  - `ValidationReporter.ts` - report generation
  - `ValidationFramework.ts` - thin orchestrator

### 3. `notes/quantities.ts` (235 lines) → **Modular parsing pipeline**
- **Current**: Single file with currency/suffix/simple parsing, conversions, comparisons
- **Split into**:
  - `parsers/currency.ts`, `parsers/suffix.ts`, `parsers/number.ts`
  - `converters/temperature.ts`, `converters/linear.ts`
  - `operators/compare.ts`, `operators/multiply.ts`, `operators/divide.ts`
  - `semantics/determineType.ts`
  - `quantities/index.ts` - facade

### 4. `ontology/ontologyService.ts` (185 lines) → **Extract index builders**
- **Current**: Builds attribute index, fuzzy matcher, usage tracker in constructor
- **Split into**:
  - `AttributeIndexBuilder.ts` - static buildIndex(ontology)
  - `FuzzyMatcher.ts` - already exists in ontologyService/matching.ts (consolidate)
  - `UsageTracker.ts` - already exists in ontologyService/statistics.ts (consolidate)
  - `OntologyService.ts` - compose via DI

### 5. `ontologyService/statistics.ts` (181 lines) → **Separate concerns**
- **Current**: UsageTracker + co-occurrence + suggestions in one class
- **Split into**:
  - `UsageRecorder.ts` - record(property[])
  - `FrequencyAnalyzer.ts` - getSuggestions(minFreq)
  - `CoOccurrenceAnalyzer.ts` - getContextualSuggestions(keys)
  - `GraphDataBuilder.ts` - getGraphData()

### 6. `notes/notes.ts` (162 lines) → **Pipeline already clean, but...**
- **Opportunity**: `NotePipeline` methods each re-parse content → add memoization
- **Extract**: `NoteIntentInferencer.ts` (33 lines) → own module

### 7. `notes/NoteFilter.ts` (161 lines) → **Strategy pattern for search/sort**
- **Current**: applySearch + applySort with hardcoded switch
- **Split into**:
  - `SearchStrategy.ts` - interface + SemanticSearch, TextSearch, TagSearch, PropSearch
  - `SortStrategy.ts` - interface + UpdatedAtSort, CreatedAtSort, SoonestSort, NearestSort, TagsSort
  - `NoteFilter.ts` - composes strategies

### 8. `patternRecognition/patternRecognition.ts` (146 lines) → **Extract strategies**
- **Current**: PatternRecognitionService with embedded sequential/co-occurrence
- **Already has**: strategies/sequential.ts, strategies/coOccurrence.ts, strategies/matching.ts
- **Finish**: Move remaining logic to strategies, make service a pure orchestrator

### 9. `data/units.ts` (304 lines) → **Data-driven, not code-driven**
- **Current**: Massive const objects (UNIT_ALIASES, CONVERSIONS, CATEGORIES)
- **Replace with**: JSON/YAML files + `loadUnits()` at build time
- **Benefit**: Non-devs can extend units, smaller bundle, easier testing

### 10. `templates/TemplateGenerator.ts` (check size) → **Template engine**
- **Current**: String concatenation for HTML generation
- **Replace with**: Tiny template function or tagged template literals

---

## Cross-Cutting Concerns

### Duplicate Utilities (Search & Consolidate)
```bash
# Run to find duplicates
grep -r "deepClone\|debounce\|throttle\|memoize\|groupBy\|partition\|chunk" core/src --include="*.ts" | grep "export const"
```

**Targets**:
- `common.ts` has: deepClone, debounce, throttle, sleep, memoize, timeExecution, retryAsync, uniqueByKey, groupBy, pluck, sum/avg/max/min, round, formatPercentage, isEmpty, isDefined, isNotEmpty, flatten, chunk, partition, Mutex
- Check UI/utils for duplicates (e.g., `ui/src/utils/performance.ts` has own PerformanceMonitor)

### Error Type Consolidation
**Current**: Two files with overlapping error classes:
- `utils/errors.ts` (8 classes): PredictionError, ValidationError, TaskExecutionError, AuthorizationError, ConfigurationError, DataIntegrityError, RateLimitError, TimeoutError
- `utils/errorTypes.ts` (4 classes): OntologyError, PropertyValidationError, SkillExecutionError, NetworkTransmissionError

**Action**: Merge into single `errors/` directory with hierarchy:
```
errors/
  base.ts          # NotentionError (base class with context, cause)
  validation.ts    # ValidationError, PropertyValidationError
  execution.ts     # TaskExecutionError, SkillExecutionError
  auth.ts          # AuthorizationError
  config.ts        # ConfigurationError
  network.ts       # NetworkTransmissionError, RateLimitError, TimeoutError
  data.ts          # DataIntegrityError
  prediction.ts    # PredictionError
  ontology.ts      # OntologyError
  index.ts         # re-export all
```

### Logging Abstraction
- `utils/logging.ts` + `utils/agentLogging.ts` → consolidate
- `cli/src/utils.ts` has custom logger setup → use core Logger

---

## UI Package (High Impact)

### 1. `components/SmartNoteAssistant.tsx` (466 lines) → **Split by responsibility**
- **Current**: Assistant UI + suggestion logic + note analysis + property insertion
- **Split into**:
  - `SmartNoteAssistant.tsx` - UI only
  - `hooks/useNoteSuggestions.ts` - suggestion logic
  - `hooks/useNoteAnalysis.ts` - analysis (already exists, consolidate)
  - `components/SuggestionItem.tsx` - already separate

### 2. Large Hooks (>150 lines) → **Extract sub-hooks**
| Hook | Lines | Split Into |
|------|-------|------------|
| `useNetworkView.ts` | 155 | `useNetworkData`, `useNetworkFilters`, `useNetworkActions` |
| `useMapView.ts` | 153 | `useMapMarkers`, `useMapFilters`, `useMapInteractions` |
| `useCommands.tsx` | 146 | `useCommandRegistry`, `useCommandPalette`, `useCommandExecution` |
| `useFilteredNotes.ts` | 142 | `useNoteSearch`, `useNoteSort`, `useNoteCache` |
| `useOntologyView.ts` | 132 | `useOntologyTree`, `useOntologySearch`, `useOntologyEditor` |
| `useEditorLogic.ts` | 118 | `useNoteContent`, `useNoteProperties`, `useNoteValidation` |
| `useEditorPublishing.ts` | 116 | `usePublishFlow`, `useExportFormats` |

### 3. `services/NostrService.ts` (186 lines) → **Protocol-agnostic**
- **Current**: Nostr-specific mixed with generic relay logic
- **Split into**:
  - `interfaces/RelayProvider.ts` - connect, publish, subscribe, query
  - `providers/NostrProvider.ts` - Nostr implementation
  - `services/RelayService.ts` - manages providers, connection pooling

---

## CLI Package

### 1. `cli/src/commands/*.ts` → **Command pattern**
- **Current**: Each command file exports functions
- **Refactor**: Base `Command` class with `execute()`, `validate()`, `help()`
- **Auto-register**: Scan `commands/` directory, build CLI dynamically

### 2. `cli/src/providers/*.ts` → **Strategy pattern**
- **Current**: factory + transformers + openai-compatible + base
- **Consolidate**: Single `Provider` interface, config-driven selection

---

## Testing Improvements

### 1. Fix Pre-existing Failures (15 tests)
- `quantities`: compound unit semanticType expects "ratio" not "other"
- `ontology`: attribute index missing price/product nodes
- `propertyExtractor`: parseQuantityValue integration
- `TemplateGenerator`: expects bracket syntax `[key is value]` but gets HTML spans
- `string.test`: escapeAttribute expects HTML entities (fixed in core, test needs update)

### 2. Add Integration Tests
- NoteFilter + MatchEngine + OntologyService flow
- PropertyExtractor → parsing → serialization roundtrip
- TemplateGenerator → parsing → NotePipeline

### 3. Property-Based Testing
- `quantities.ts`: test parseQuantity/parseQuantity roundtrip
- `matching`: test symmetry/transitivity properties
- `parsing`: test formatPropertyTag/parseProperties roundtrip

---

## Architecture Debt

### 1. Circular Dependency Risks
```
notes/parsing → utils/composition (expandMacro)
utils/composition → notes/parsing? (check)
```
- Audit import graph: `pnpm dlx madge --circular core/src`

### 2. Barrel File Explosion
- `core/src/index.ts` exports 88+ items
- Split into domain barrels: `core/notes`, `core/matching`, `core/ontology`, `core/network`, `core/skills`

### 3. Type Definitions in Wrong Places
- `types/index.ts` has 236 lines mixing domain types (Note, Property) with infra types (MCPServer, Workflow, Tool)
- **Split**: `types/domain.ts`, `types/infra.ts`, `types/ui.ts`

### 4. Ontology Domain Files
- `ontology/domains/*.ts` (5 files) → consider single `ontology/domains.ts` with named exports

---

## Quick Wins (< 30 min each)

| Task | Effort | Impact |
|------|--------|--------|
| Remove `core/src/notes/parsing.ts` barrel (now 1 line re-export) | 5m | Cleaner imports |
| Remove `core/src/notes/propertyExtractor.ts` barrel | 5m | Cleaner imports |
| Fix `string.test.ts` to match new escapeAttribute output | 10m | Green tests |
| Fix `TemplateGenerator.test.ts` to match HTML output | 10m | Green tests |
| Consolidate `utils/errors.ts` + `utils/errorTypes.ts` | 30m | Single source |
| Move `data/units.ts` to JSON + loader | 30m | Extensible data |
| Delete unused exports from `core/src/index.ts` | 20m | Smaller bundle |

---

## Priority Order for Next Session

1. **Fix failing tests** (30 min) - immediate confidence
2. **Consolidate error types** (30 min) - cross-cutting
3. **Split `tasks/executor.ts`** (2 hrs) - largest file, high churn
4. **Modularize `notes/quantities.ts`** (1.5 hrs) - complex logic, many bugs
5. **Strategy pattern for `NoteFilter`** (1 hr) - testable search/sort
6. **Data-driven units** (1 hr) - remove 300 LOC of const objects
7. **UI hook extraction** (2 hrs) - improves component testability

---

## Commands for Analysis

```bash
# Find largest files
wc -l core/src/**/*.ts | sort -rn | head -20

# Find circular deps
pnpm dlx madge --circular core/src

# Find duplicate functions
grep -r "export const" core/src/utils --include="*.ts" | cut -d: -f2 | sort | uniq -d

# Check bundle size impact
pnpm build && ls -lh core/dist/

# Test coverage gaps
pnpm test --coverage
```