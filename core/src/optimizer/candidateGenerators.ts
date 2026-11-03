/**
 * Candidate Generator Interface + Registry (R1)
 * Pluggable candidate generation strategies: grid, random, bayesian, LLM-proposed
 */

import { z } from 'zod';
import type { ParamSpec } from '../ui/strategy.js';
import { getSearchSpace, sampleSearchSpace, gridSearchSpace, type SearchSpace } from '../schemas/paramSpec.js';
import type { 
    StrategyParamConfig, 
    OptimizerCandidate, 
    CandidateProvenance, 
    GeneratorOptions, 
    BudgetConstraints,
    CandidateEvaluationResult 
} from './types.js';
import { createPluginRegistry, ValidationHelpers } from '../utils/Registry.js';
import { CandidateGeneratorPlugin as BaseCandidateGenerator } from '../utils/BasePlugin.js';

// --- SearchSpace from S1 (re-exported for convenience) ---
export { getSearchSpace, sampleSearchSpace, gridSearchSpace, type SearchSpace } from '../schemas/paramSpec.js';

// Re-export types
export type { 
    StrategyParamConfig, 
    OptimizerCandidate, 
    CandidateProvenance, 
    GeneratorOptions, 
    BudgetConstraints,
    CandidateEvaluationResult 
} from './types.js';

// --- Candidate Generator Interface ---
export interface CandidateGenerator {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    
    getName(): string;
    generate(strategy: StrategyParamConfig, options: GeneratorOptions): OptimizerCandidate[] | Promise<OptimizerCandidate[]>;
    getSearchSpace(strategy: StrategyParamConfig): SearchSpace;
    getDefaultConfig(): GeneratorOptions;
    validateConfig(config: GeneratorOptions): { valid: boolean; errors: string[] };
}

type RegistrableGenerator = CandidateGenerator & { getDefaultConfig(): GeneratorOptions; validateConfig(config: GeneratorOptions): { valid: boolean; errors: string[] } };

// --- Built-in Generators ---

/**
 * Grid search generator - exhaustive Cartesian product
 */
export class GridGenerator extends BaseCandidateGenerator implements RegistrableGenerator {
    readonly name = 'grid';
    readonly description = 'Exhaustive grid search over parameter space';

    getDefaultConfig(): GeneratorOptions {
        return { maxCandidates: 8, seed: 42 };
    }

    getSearchSpace(strategy: StrategyParamConfig): SearchSpace {
        return getSearchSpace(strategy.paramSpec);
    }

    generate(strategy: StrategyParamConfig, options: GeneratorOptions): OptimizerCandidate[] {
        const space = this.getSearchSpace(strategy);
        const gridPoints = gridSearchSpace(space, 5);
        const candidates: OptimizerCandidate[] = [];

        for (const point of gridPoints) {
            if (candidates.length >= options.maxCandidates) break;
            if (this.isDefaultPoint(strategy.paramSpec, strategy.defaultProps, point)) continue;
            candidates.push(this.createCandidate(strategy, point, 'grid', options.seed));
        }

        return candidates;
    }
}

/**
 * Random search generator - uniform sampling from search space
 */
export class RandomGenerator extends BaseCandidateGenerator implements RegistrableGenerator {
    readonly name = 'random';
    readonly description = 'Uniform random sampling from parameter space';

    getDefaultConfig(): GeneratorOptions {
        return { maxCandidates: 8, seed: 42 };
    }

    getSearchSpace(strategy: StrategyParamConfig): SearchSpace {
        return getSearchSpace(strategy.paramSpec);
    }

    generate(strategy: StrategyParamConfig, options: GeneratorOptions): OptimizerCandidate[] {
        const space = this.getSearchSpace(strategy);
        const candidates: OptimizerCandidate[] = [];
        const tried = new Set<string>();

        const random = createSeededRandom(options.seed ?? Date.now());

        while (candidates.length < options.maxCandidates) {
            const point = sampleSearchSpace(space, random);
            const hash = JSON.stringify(point);

            if (tried.has(hash)) continue;
            tried.add(hash);

            if (this.isDefaultPoint(strategy.paramSpec, strategy.defaultProps, point)) continue;

            candidates.push(this.createCandidate(strategy, point, 'random', options.seed));
        }

        return candidates;
    }
}

/**
 * Successive Halving generator - evaluates many candidates on small budget, promotes best
 * This wraps another generator and adds promotion logic
 */
export class SuccessiveHalvingGenerator extends BaseCandidateGenerator implements RegistrableGenerator {
    readonly name = 'successive-halving';
    readonly description = 'Successive halving: evaluate many on small budget, promote top fraction';

    constructor(
        private baseGenerator: CandidateGenerator = new RandomGenerator(),
        private initialFraction = 0.25,
        private minPromote = 2
    ) {
        super();
    }

    getDefaultConfig(): GeneratorOptions {
        return { maxCandidates: 8, seed: 42, initialFraction: 0.25, minPromote: 2 };
    }

    validateConfig(config: GeneratorOptions): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.positiveInt(config.maxCandidates, 'maxCandidates'),
            ValidationHelpers.numberInRange(config.initialFraction, 'initialFraction', 0, 1),
            ValidationHelpers.positiveInt(config.minPromote, 'minPromote'),
        );
    }

    getSearchSpace(strategy: StrategyParamConfig): SearchSpace {
        return this.baseGenerator.getSearchSpace(strategy);
    }

    async generate(strategy: StrategyParamConfig, options: GeneratorOptions): Promise<OptimizerCandidate[]> {
        // For now, delegate to base generator
        // The halving logic is applied in the optimizer loop, not here
        return this.baseGenerator.generate(strategy, options) as OptimizerCandidate[];
    }
}

/**
 * LLM-proposed generator - uses LLM to suggest promising candidates
 * Requires model integration
 */
export class LLMGenerator extends BaseCandidateGenerator implements RegistrableGenerator {
    readonly name = 'llm';
    readonly description = 'LLM-proposed candidates based on prior results';

    constructor(
        private modelProvider: (prompt: string) => Promise<string>,
        private systemPrompt?: string
    ) {
        super();
    }

    getDefaultConfig(): GeneratorOptions {
        return { maxCandidates: 8, seed: 42 };
    }

    getSearchSpace(strategy: StrategyParamConfig): SearchSpace {
        return getSearchSpace(strategy.paramSpec);
    }

    async generate(strategy: StrategyParamConfig, options: GeneratorOptions): Promise<OptimizerCandidate[]> {
        if (!options.previousResults || options.previousResults.length === 0) {
            return new RandomGenerator().generate(strategy, options) as OptimizerCandidate[];
        }

        const prompt = this.buildPrompt(strategy, options.previousResults);
        const response = await this.modelProvider(prompt);

        try {
            const parsed = JSON.parse(response);
            const candidates: OptimizerCandidate[] = [];

            for (const patch of parsed.candidates ?? []) {
                if (candidates.length >= options.maxCandidates) break;
                const validation = this.validatePatch(strategy.paramSpec, patch);
                if (validation.valid) {
                    candidates.push(this.createCandidate(strategy, patch, 'model', options.seed, { model: 'llm' }));
                }
            }

            if (candidates.length < options.maxCandidates) {
                const random = new RandomGenerator();
                const remaining = random.generate(strategy, { 
                    ...options, 
                    maxCandidates: options.maxCandidates - candidates.length 
                });
                candidates.push(...remaining);
            }

            return candidates;
        } catch {
            return new RandomGenerator().generate(strategy, options) as OptimizerCandidate[];
        }
    }

    private buildPrompt(strategy: StrategyParamConfig, results: CandidateEvaluationResult[]): string {
        const space = this.getSearchSpace(strategy);
        const dims = space.dimensions.map(d => `${d.name} (${d.scale})`).join(', ');

        const resultsSummary = results
            .sort((a, b) => b.primaryDelta - a.primaryDelta)
            .slice(0, 5)
            .map(r => `  Candidate ${r.candidateId}: delta=${r.primaryDelta.toFixed(3)}, verdict=${r.verdict}`)
            .join('\n');

        return `${this.systemPrompt ?? 'You are an optimization expert.'}

Strategy: ${strategy.id} (${strategy.seam.role})
Parameters: ${dims}

Previous results (best first):
${resultsSummary}

Propose ${Math.min(5, results.length)} new promising parameter combinations as JSON:
{
  "candidates": [
    { "param1": value1, "param2": value2, ... },
    ...
  ]
}

Only return valid JSON.`;
    }

    private validatePatch(paramSpec: ParamSpec, patch: Record<string, unknown>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        for (const [key, value] of Object.entries(patch)) {
            const def = paramSpec[key];
            if (!def) {
                errors.push(`Unknown parameter: ${key}`);
                continue;
            }
            switch (def.type) {
                case 'number':
                    if (typeof value !== 'number') errors.push(`${key} must be a number`);
                    else {
                        if (def.min !== undefined && value < def.min) errors.push(`${key} below minimum ${def.min}`);
                        if (def.max !== undefined && value > def.max) errors.push(`${key} above maximum ${def.max}`);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`);
                    break;
                case 'enum':
                    if (!def.options?.includes(value as string)) errors.push(`${key} must be one of ${def.options?.join(', ')}`);
                    break;
                case 'string':
                    if (typeof value !== 'string') errors.push(`${key} must be a string`);
                    break;
            }
        }
        return { valid: errors.length === 0, errors };
    }
}

// --- Candidate Generator Registry ---

const { registry: candidateGeneratorRegistry, get: getCandidateGeneratorRegistry, reset: resetCandidateGeneratorRegistry } = 
    createPluginRegistry<RegistrableGenerator>('CandidateGenerator', [
        new GridGenerator(),
        new RandomGenerator(),
        new SuccessiveHalvingGenerator(),
    ]);

// --- Singleton instance ---
export { candidateGeneratorRegistry, getCandidateGeneratorRegistry, resetCandidateGeneratorRegistry };