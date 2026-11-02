# Generalization Layer: Plugin Architecture Guide

This document describes the pluggable architecture introduced in TODO.13, enabling extension of search algorithms, seam types, statistical models, judges, and storage backends without kernel changes.

## Overview

The generalization layer extracts interfaces for all core mechanisms, making them swappable plugins:

| Mechanism | Interface | Built-in Implementations | Plugin Point |
|-----------|-----------|-------------------------|--------------|
| **Verdict Computation** | `VerdictEngine` | McNemar, Bayesian, Sequential, LLM-Judge, Human-Judge | `core/src/eval/verdictEngines/` |
| **Case Splitting** | `SplitStrategy` | Fixed, Temporal, Stratified, Adversarial, Holdout-Rotation | `core/src/eval/splitStrategies/` |
| **Case Storage** | `CaseStore` | FileSystem, InMemory, SQLite | `core/src/eval/caseStore/` |
| **Event Storage** | `EventStore` | JSONL, SQLite | `core/src/telemetry/eventStore/` |
| **Candidate Generation** | `CandidateGenerator` | Grid, Random, Bayesian, LLM | `core/src/optimizer/candidateGenerators.ts` |
| **Strategy Resolution** | `ResolutionStrategy` | Override, Experiment, Revision, Manual-Profile, Policy, Default-Profile, Fallback | `core/src/ui/resolutionStrategy.ts` |
| **Revision Storage** | `RevisionDriver` | JSONL, InMemory, SQLite (stub) | `core/src/telemetry/revisionDriver.ts` |
| **Digest Generation** | `DigestPipeline` | Composable stages (filter→aggregate→rank→render) | `core/src/telemetry/digestPipeline.ts` |

---

## Quick Start: Adding a New Plugin

### 1. Implement the Interface

Create a new class implementing the desired interface:

```typescript
// core/src/eval/verdictEngines/myCustomEngine.ts
import { z } from 'zod';
import type { VerdictEngine, VerdictEngineConfig, ExtendedCaseVerdict, ExtendedRunVerdict, PairedRunResult } from '../index.js';

export class MyCustomVerdictEngine implements VerdictEngine {
    readonly name = 'my-custom';
    readonly description = 'Custom verdict engine for specialized use cases';
    readonly evidenceClass = 'measured' as const;
    readonly configSchema = z.object({
        customThreshold: z.number().default(0.05),
    });

    getName(): string { return this.name; }

    getDefaultConfig(): VerdictEngineConfig {
        return {
            primaryMetric: 'completion',
            mde: { completion: 0.05 },
            floors: { completion: 0.5 },
            minSampleSize: 30,
            customThreshold: 0.05,
        };
    }

    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } {
        const result = this.configSchema?.safeParse(config);
        if (!result?.success) {
            return { valid: false, errors: result.error.issues.map(i => i.message) };
        }
        return { valid: true, errors: [] };
    }

    async computeCaseVerdict(caseId: string, paired: PairedRunResult, config: VerdictEngineConfig): Promise<ExtendedCaseVerdict> {
        // Your custom logic here
        const pValue = this.computePValue(paired);
        return {
            caseId,
            verdict: pValue < (config.customThreshold ?? 0.05) ? 'pass' : 'fail',
            primaryMetric: { /* ... */ },
            // ...
        };
    }

    async computeRunVerdict(/* ... */): Promise<ExtendedRunVerdict> {
        // Aggregate case verdicts
    }

    private computePValue(paired: PairedRunResult): number {
        // Custom statistical test
        return 0.03;
    }
}
```

### 2. Register the Plugin

Register at application startup (e.g., in your bootstrap code):

```typescript
import { getVerdictEngineRegistry } from '@notention/core/eval/verdictEngines';
import { MyCustomVerdictEngine } from './myCustomEngine.js';

const registry = getVerdictEngineRegistry();
registry.register(new MyCustomVerdictEngine());
```

### 3. Use via Configuration

Reference the plugin by name in declarative config:

```json
{
  "optimizer": {
    "verdictEngine": "my-custom",
    "verdictConfig": {
      "customThreshold": 0.01
    }
  }
}
```

---

## Plugin Development Patterns

### Configuration Validation

All plugins should provide a Zod schema for config validation:

```typescript
import { z } from 'zod';

readonly configSchema = z.object({
    param1: z.number().min(0).max(1).default(0.5),
    param2: z.string().optional(),
    param3: z.array(z.string()).default([]),
});
```

### Async Operations

Interfaces support both sync and async implementations:

```typescript
// Sync (for pure computations)
computeCaseVerdict(caseId, paired, config): ExtendedCaseVerdict { ... }

// Async (for I/O, LLM calls, etc.)
async computeCaseVerdict(caseId, paired, config): Promise<ExtendedCaseVerdict> { ... }
```

### Evidence Class & Governance

Verdict engines must declare their evidence class:

```typescript
readonly evidenceClass = 'measured' | 'observed' | 'hypothesized' | 'asserted';
```

- **measured**: Auto-activates (McNemar, Bayesian, Sequential)
- **observed**: Requires explicit consent (Human judge)
- **hypothesized**: Never auto-activates, 15-day half-life decay (LLM judge)
- **asserted**: Lowest trust, manual review only

---

## Registry Usage

All registries follow the same pattern:

```typescript
import { getVerdictEngineRegistry } from '@notention/core/eval/verdictEngines';

const registry = getVerdictEngineRegistry();

// List available engines
console.log(registry.listNames()); // ['mcnemar', 'bayesian', 'sequential', 'llm-judge', 'human-judge', 'my-custom']

// Get specific engine
const engine = registry.get('bayesian');

// Get all engines
const allEngines = registry.getAll();

// Check if registered
registry.has('my-custom'); // true

// Unregister (for testing)
registry.unregister('my-custom');
```

---

## Configuration-Driven Plugin Selection

### Optimizer Config (Declarative)

```json
{
  "optimizer": {
    "targetSeams": ["extraction", "match"],
    "candidateGenerator": "bayesian",
    "budgetAllocator": "successive-halving",
    "verdictEngine": "bayesian",
    "splitStrategy": "stratified",
    "caseStore": "sqlite",
    "eventStore": "jsonl",
    "budget": {
      "maxCycles": 20,
      "maxCandidatesPerCycle": 10
    }
  }
}
```

### ProfileRegistry Resolution Steps

Resolution steps are now data-driven from seam definitions:

```typescript
// In seam definition (generated from source)
{
  "role": "extraction",
  "paramSpec": { ... },
  "resolutionSteps": ["override", "experiment", "revision", "manual-profile", "policy", "default-profile", "fallback"],
  "governanceLevel": "structure"
}
```

---

## Testing Plugins

### Matrix Testing

The matrix test runner validates cross-product combinations:

```bash
pnpm --filter @notention/core test -- tests/matrix.test.ts
```

Tests: 5 VerdictEngines × 5 SplitStrategies × 3 CaseStores × 2 EventStores = 150 combinations

### Contract Linting

Validate plugin interfaces:

```bash
pnpm lint:contracts
```

Checks:
- Required methods implemented
- Config schema provided
- Max 3 plugins per interface (guardrail)

### Schema Linting

Validate emitted definitions:

```bash
pnpm lint:schemas
```

Checks:
- Seam definitions match Zod schema
- Case manifest hash integrity
- Event schemas valid

---

## Performance Benchmarks

Run benchmarks to detect regressions:

```bash
pnpm bench:plugins
```

Guardrail: No plugin > 2x slower than baseline within its complexity class:
- **simple**: Sync, pure functions (fixed split, grid generator, memory stores)
- **complex**: More computation (stratified, filesystem, bayesian)
- **async**: I/O bound (LLM judge, human judge, JSONL event store)

---

## Examples by Category

### Adding a New Search Algorithm

```typescript
// core/src/optimizer/candidateGenerators.ts
export class SimulatedAnnealingGenerator implements CandidateGenerator {
    readonly name = 'simulated-annealing';
    readonly description = 'Simulated annealing for global optimization';
    
    getName() { return this.name; }
    getSearchSpace(strategy) { return getSearchSpace(strategy.paramSpec); }
    
    generate(strategy, options) {
        // Simulated annealing logic
        return candidates;
    }
}

// Register
getCandidateGeneratorRegistry().register(new SimulatedAnnealingGenerator());
```

### Adding a New Seam Type

1. Create component with `ParamSpec` in `ui/src/strategies/`
2. Run `pnpm generate:definitions` → emits `seam-definitions.json`
3. Strategy auto-registered via `StrategyRegistry`
4. Resolution steps from seam definition
5. Optimizer targets via declarative config

### Adding a Custom Case Store (e.g., PostgreSQL)

```typescript
// core/src/eval/caseStore/postgres.ts
export class PostgresCaseStore implements CaseStore {
    constructor(private pool: Pool) {}
    
    async init() { /* CREATE TABLE IF NOT EXISTS... */ }
    async readManifest() { /* SELECT * FROM manifests... */ }
    async readIntentCases(split) { /* SELECT * FROM cases WHERE family='intent'... */ }
    async upsertCase(case) { /* INSERT ... ON CONFLICT... */ }
    // ... implement all CaseStore methods
}

// Register
getCaseStoreRegistry().register('postgres', () => new PostgresCaseStore(pool), 'PostgreSQL storage');
```

### Adding a Custom Digest Stage

```typescript
import { PipelineContext, PipelineStage } from '@notention/core/telemetry/digestPipeline';

export const myCustomStage: PipelineStage = async (context) => {
    // Transform context
    return {
        ...context,
        signals: context.signals.map(s => ({
            ...s,
            customField: computeCustomMetric(s)
        }))
    };
};

// Use in custom pipeline
const pipeline = DigestPipeline.createCustom([
    filterStage,
    aggregateStage,
    rankStage,
    myCustomStage,  // Inserted before render
    renderStage,
]);
```

---

## Guardrails Enforced by Tooling

| Guardrail | Enforcement |
|-----------|-------------|
| Max 3 plugins/interface | `pnpm lint:contracts` warns if exceeded |
| Interface compliance | `pnpm lint:contracts` validates methods |
| Schema compliance | `pnpm lint:schemas` validates emitted JSON |
| Performance regression | `pnpm bench:plugins` fails if > 2x baseline |
| Governance gate | Unit test in `RevisionStore` enforces evidence class |
| LLM judge decay | Ledger config + gate test enforces 15-day half-life |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      KERNEL (Stable)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │Optimizer │ │ Profile  │ │ Revision │ │   Telemetry    │ │
│  │ Pipeline │ │ Registry │ │  Driver  │ │   Pipeline     │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘ │
└───────┼─────────────┼───────────┼───────────────┼──────────┘
        │             │           │               │
        ▼             ▼           ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PLUGIN LAYER (Swappable)                 │
│  ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ │
│  │CandidateGen  │ │  Verdict   │ │  Split   │ │ CaseStore│ │
│  │  (grid,      │ │  Engine    │ │ Strategy │ │ (fs,     │ │
│  │  random,     │ │ (mcnemar,  │ │ (fixed,  │ │  sqlite, │ │
│  │  bayesian)   │ │  bayesian, │ │  temp,   │ │  memory) │ │
│  └──────────────┘ │  llm,      │ │  strat)  │ └──────────┘ │
│  ┌──────────────┐ │  human)    │ └──────────┘ ┌──────────┐ │
│  │ResolutionStr │ └────────────┘ ┌──────────┐ │EventStore│ │
│  │ategy         │ ┌────────────┐ │Revision  │ │ (jsonl,  │ │
│  │(override,    │ │BudgetAlloc │ │Driver    │ │  sqlite) │ │
│  │ exp, rev...) │ │(halving,   │ │(jsonl,   │ └──────────┘ │
│  └──────────────┘ │  hyperband)│ │ memory)  │ ┌──────────┐ │
│  ┌──────────────┐ └────────────┘ └──────────┘ │DigestPipe│ │
│  │  SearchSpace │                             │  (stages)│ │
│  │ (from ParamS)│                             └──────────┘ │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration from Hardcoded to Pluggable

### Before (Hardcoded)

```typescript
// Old: Direct imports and hardcoded logic
import { McNemarVerdict } from './verdict.js';
import { FixedSplit } from './splitStrategies.js';

function runEvaluation() {
    const verdict = new McNemarVerdict();
    const split = new FixedSplit();
    // ...
}
```

### After (Pluggable)

```typescript
// New: Registry-based, config-driven
import { getVerdictEngineRegistry, getSplitStrategyRegistry } from '@notention/core/eval';

function runEvaluation(config: OptimizerConfig) {
    const verdict = getVerdictEngineRegistry().get(config.verdictEngine);
    const split = getSplitStrategyRegistry().get(config.splitStrategy);
    // ...
}
```

---

## Resources

- **Source**: `core/src/*/` - All plugin implementations
- **Tests**: `core/src/tests/matrix.test.ts` - Matrix test runner
- **Scripts**: `scripts/bench-plugins.ts` - Benchmark runner
- **Linting**: `scripts/lint-contracts.ts`, `scripts/lint-schemas.ts`
- **Generated**: `core/src/schemas/generated/seam-definitions.json` - Seam definitions