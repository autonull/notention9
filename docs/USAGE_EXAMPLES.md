# Usage Examples: Generalization Layer Plugins

This guide shows practical examples for common extension scenarios.

---

## Example 1: Swap Verdict Engine for A/B Testing

```typescript
import { getVerdictEngineRegistry } from '@notention/core/eval/verdictEngines';
import { BayesianVerdictEngine } from '@notention/core/eval/verdictEngines/bayesian.js';

// Default is McNemar - switch to Bayesian for different statistical properties
const registry = getVerdictEngineRegistry();

// At startup, register if not already present
if (!registry.has('bayesian')) {
    registry.register(new BayesianVerdictEngine());
}

// In optimizer config
const optimizerConfig = {
    verdictEngine: 'bayesian',  // or 'mcnemar', 'sequential', 'llm-judge', 'human-judge'
    verdictConfig: {
        primaryMetric: 'completion',
        mde: { completion: 0.05 },
        floors: { completion: 0.5 },
        minSampleSize: 30,
        // Bayesian-specific
        priorAlpha: 1,
        priorBeta: 1,
        ropeWidth: 0.01,
    }
};
```

---

## Example 2: Use LLM Judge for Fast Pre-Screening

```typescript
import { getVerdictEngineRegistry } from '@notention/core/eval/verdictEngines';
import { LLMJudgeVerdictEngine } from '@notention/core/eval/verdictEngines/llmJudge.js';

const registry = getVerdictEngineRegistry();
registry.register(new LLMJudgeVerdictEngine({
    modelProvider: async (prompt) => {
        // Your LLM integration (OpenAI, Anthropic, local, etc.)
        const response = await fetch('https://api.example.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.LLM_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] })
        });
        return (await response.json()).choices[0].message.content;
    },
    systemPrompt: 'You are an expert evaluator. Compare outputs and return JSON with "winner" and "confidence".'
}));

// In config - use for hypothesized pre-screening
const config = {
    verdictEngine: 'llm-judge',
    verdictConfig: {
        primaryMetric: 'quality',
        mde: { quality: 0.1 },
        floors: { quality: 0.3 },
        minSampleSize: 10,
    }
};

// Note: LLM judge produces 'hypothesized' evidence class - cannot auto-activate
// Requires explicit consent or promotion to measured evaluation
```

---

## Example 3: Stratified Split for Balanced Evaluation

```typescript
import { getSplitStrategyRegistry } from '@notention/core/eval/splitStrategies';
import { StratifiedSplitStrategy } from '@notention/core/eval/splitStrategies/stratified.js';

const registry = getSplitStrategyRegistry();
registry.register(new StratifiedSplitStrategy());

// In config - ensures balanced representation across intent categories
const config = {
    splitStrategy: 'stratified',
    splitConfig: {
        seed: 42,
        strataKey: 'intentCategory',  // Field to stratify by
        trainRatio: 0.7,
        validationRatio: 0.2,
        holdoutRatio: 0.1,
    }
};
```

---

## Example 4: SQLite Case Store for Large Datasets

```typescript
import { createSQLiteCaseStore } from '@notention/core/eval/caseStore';
import { getCaseStoreRegistry } from '@notention/core/eval/caseStore';

const caseStore = createSQLiteCaseStore('./data/cases.db');
await caseStore.init({});

// Register for dynamic selection
getCaseStoreRegistry().register('sqlite', () => createSQLiteCaseStore('./data/cases.db'), 'SQLite storage');

// In config
const config = {
    caseStore: 'sqlite',  // or 'filesystem', 'memory'
};
```

---

## Example 5: Custom Resolution Strategy for Enterprise Policy

```typescript
import { ResolutionStrategy, ResolutionContext, ResolvedStrategy, getResolutionStrategyRegistry } from '@notention/core/ui/resolutionStrategy';
import { z } from 'zod';

export class EnterprisePolicyStrategy implements ResolutionStrategy {
    readonly name = 'enterprise-policy';
    readonly description = 'Enforces enterprise-wide strategy policies';
    readonly configSchema = z.object({
        allowedStrategiesPerSeam: z.record(z.array(z.string())),
        requireApproval: z.boolean().default(true),
    });

    getName(): string { return this.name; }

    getDefaultConfig() {
        return {
            allowedStrategiesPerSeam: {
                extraction: ['baseline', 'enterprise-v1', 'enterprise-v2'],
                match: ['standard', 'strict'],
            },
            requireApproval: true,
        };
    }

    validateConfig(config: any) {
        const result = this.configSchema.safeParse(config);
        return { valid: result.success, errors: result.success ? [] : result.error.issues.map(i => i.message) };
    }

    async resolve(context: ResolutionContext): Promise<ResolvedStrategy | undefined> {
        const { seamRole, strategyRegistry, userConfig } = context;
        const allowed = (this.getDefaultConfig().allowedStrategiesPerSeam as Record<string, string[]>)[seamRole] ?? [];
        
        // Find first allowed strategy that exists
        for (const strategyId of allowed) {
            const strategy = strategyRegistry.get(seamRole, strategyId);
            if (strategy) {
                return {
                    strategy,
                    reason: { kind: 'enterprise-policy', strategyId },
                    resolvedParams: strategy.getDefaultProps(),
                    resolvedAt: new Date().toISOString(),
                    userId: context.userId,
                    seamRole,
                };
            }
        }
        return undefined; // Fall through to next strategy
    }
}

// Register
getResolutionStrategyRegistry().register(new EnterprisePolicyStrategy());
```

---

## Example 6: Composable Digest Pipeline

```typescript
import { DigestPipeline, filterStage, aggregateStage, rankStage, renderJsonStage, DEFAULT_DIGEST_CONFIG } from '@notention/core/telemetry/digestPipeline';
import type { FrictionEvent } from '@notention/core/telemetry/journal';

// Custom stage: enrich with external data
async function enrichStage(context: any) {
    const enriched = await Promise.all(context.signals.map(async (signal: any) => {
        const externalData = await fetchExternalMetrics(signal.seam);
        return { ...signal, externalMetrics: externalData };
    }));
    return { ...context, signals: enriched };
}

// Custom stage: filter by team
function teamFilterStage(teamId: string) {
    return (context: any) => ({
        ...context,
        signals: context.signals.filter((s: any) => s.team === teamId)
    });
}

// Build custom pipeline
const pipeline = DigestPipeline.createCustom([
    filterStage,
    aggregateStage,
    teamFilterStage('team-alpha'),  // Custom filter
    enrichStage,                     // Custom enrichment
    rankStage,
    renderJsonStage,                 // JSON output instead of text
]);

// Run
const events: FrictionEvent[] = [/* ... */];
const result = await pipeline.run(events, { lookbackDays: 30 });
console.log(result.metadata.jsonDigest);
```

---

## Example 7: Bayesian Candidate Generator with History

```typescript
import { getCandidateGeneratorRegistry } from '@notention/core/optimizer/candidateGenerators';
import { BayesianGenerator } from '@notention/core/optimizer/candidateGenerators';

const registry = getCandidateGeneratorRegistry();
registry.register(new BayesianGenerator());

// In optimizer config
const optimizerConfig = {
    candidateGenerator: 'bayesian',
    generatorConfig: {
        maxCandidates: 20,
        explorationWeight: 0.3,
    }
};

// The generator automatically uses previous results from optimizer history
// to build a surrogate model and propose promising candidates
```

---

## Example 8: In-Memory Stores for Testing

```typescript
import { createInMemoryCaseStore, createInMemoryRevisionDriver } from '@notention/core/eval/caseStore';
import { createInMemoryEventStore } from '@notention/core/telemetry/eventStore'; // if available

// Fast, isolated stores for unit tests
const caseStore = createInMemoryCaseStore();
await caseStore.init({});

const revisionDriver = createInMemoryRevisionDriver();
await revisionDriver.init({});

// Use in tests - no filesystem or database dependencies
await caseStore.upsertCase(testCase);
const revision = await revisionDriver.create({ seamRole: 'test', strategy: { id: 't', seamId: 't', version: '1', params: {} }, author: 'human' });
```

---

## Example 9: Human Judge for Gold Standard Evaluation

```typescript
import { getVerdictEngineRegistry } from '@notention/core/eval/verdictEngines';
import { HumanJudgeVerdictEngine } from '@notention/core/eval/verdictEngines/humanJudge.js';

const registry = getVerdictEngineRegistry();
registry.register(new HumanJudgeVerdictEngine());

// In config - for high-stakes decisions requiring human review
const config = {
    verdictEngine: 'human-judge',
    verdictConfig: {
        primaryMetric: 'quality',
        mde: { quality: 0.05 },
        floors: { quality: 0.7 },
        minSampleSize: 20,
        // Human judge specific
        reviewerPool: ['expert-1', 'expert-2', 'expert-3'],
        requireConsensus: true,
    }
};

// Note: Produces 'observed' evidence class - requires explicit consent to activate
// Can override measured verdicts (governance: observed > measured with consent)
```

---

## Example 10: Full Declarative Optimizer Configuration

```json
{
  "optimizer": {
    "targetSeams": ["extraction", "match", "layout"],
    "candidateGenerator": "bayesian",
    "budgetAllocator": "successive-halving",
    "verdictEngine": "bayesian",
    "splitStrategy": "stratified",
    "caseStore": "sqlite",
    "eventStore": "jsonl",
    "revisionDriver": "jsonl",
    "budget": {
      "maxCycles": 30,
      "maxCandidatesPerCycle": 15,
      "maxWallTimeMinutes": 60
    },
    "verdictConfig": {
      "primaryMetric": "completion",
      "mde": { "completion": 0.03, "precision": 0.02 },
      "floors": { "completion": 0.6, "precision": 0.5 },
      "minSampleSize": 50
    },
    "splitConfig": {
      "seed": 12345,
      "strataKey": "domain",
      "trainRatio": 0.6,
      "validationRatio": 0.2,
      "holdoutRatio": 0.2
    },
    "generatorConfig": {
      "explorationWeight": 0.25,
      "maxCandidates": 15
    }
  }
}
```

Load and use:

```typescript
import { readFileSync } from 'node:fs';
import { runOptimizer } from '@notention/core/optimizer';

const config = JSON.parse(readFileSync('optimizer.config.json', 'utf-8'));
await runOptimizer(config);
```

---

## Running Tests for Your Plugin

```bash
# Run matrix tests (all combinations)
pnpm --filter @notention/core test -- tests/matrix.test.ts

# Run contract linting
pnpm lint:contracts

# Run schema linting
pnpm lint:schemas

# Run benchmarks
pnpm bench:plugins
```

---

## Debugging Tips

```typescript
// Enable verbose logging
import { setLogLevel } from '@notention/core/utils/logging';
setLogLevel('debug');

// Inspect registry state
const registry = getVerdictEngineRegistry();
console.log('Available:', registry.listNames());
console.log('Bayesian config:', registry.get('bayesian')?.getDefaultConfig());

// Test single plugin in isolation
const engine = registry.get('bayesian')!;
const result = await engine.computeCaseVerdict('test-case', pairedData, engine.getDefaultConfig());
console.log('Verdict:', result.verdict, 'Evidence:', result.primaryMetric.evidenceClass);
```