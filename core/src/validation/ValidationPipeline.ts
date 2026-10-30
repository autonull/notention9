/**
 * Validation Pipeline Orchestrator
 * 
 * Coordinates validation and repair attempts
 */

import type {
    ValidationResult,
    ValidationIssue,
    RepairStrategy,
    RepairContext,
    Schema,
} from './types.js';
import { createValidator, type Validator } from './Validator.js';
import { CompositeRepairStrategy, defaultRepairStrategies, type PropertyItem, type InferredAttribute, type OntologyOptimization, buildStandardRepairPrompt, LLMBasedRepairStrategy } from './RepairStrategy.js';

export interface PipelineOptions<T> {
    readonly schema: Schema<T>;
    readonly repairStrategies?: RepairStrategy<T>[];
    readonly maxRepairAttempts?: number;
    readonly enableHeuristicRepair?: boolean;
    readonly enableLLMRepair?: boolean;
    readonly llmGenerate?: (prompt: string) => Promise<string>;
    readonly onRepairAttempt?: (attempt: number, result: ValidationResult<T>) => void;
}

export interface PipelineResult<T> extends ValidationResult<T> {
    readonly totalAttempts: number;
    readonly repairHistory: readonly ValidationResult<T>[];
}

export class ValidationPipeline<T> {
    private readonly validator: Validator<T>;
    private readonly repairStrategy: RepairStrategy<T>;
    private readonly maxRepairAttempts: number;
    private readonly enableHeuristicRepair: boolean;
    private readonly enableLLMRepair: boolean;
    private readonly llmGenerate?: (prompt: string) => Promise<string>;
    private readonly onRepairAttempt?: (attempt: number, result: ValidationResult<T>) => void;

    constructor(options: PipelineOptions<T>) {
        this.validator = createValidator(options.schema);
        this.maxRepairAttempts = options.maxRepairAttempts ?? 3;
        this.enableHeuristicRepair = options.enableHeuristicRepair ?? true;
        this.enableLLMRepair = options.enableLLMRepair ?? false;
        this.llmGenerate = options.llmGenerate;
        this.onRepairAttempt = options.onRepairAttempt;

        // Build composite repair strategy
        const strategies: RepairStrategy<T>[] = [];
        
        if (this.enableHeuristicRepair && options.repairStrategies) {
            strategies.push(...options.repairStrategies);
        }
        
        if (this.enableLLMRepair && this.llmGenerate) {
            // Add LLM-based repair as last resort
            strategies.push(new LLMBasedRepairStrategy<T>(this.llmGenerate, buildStandardRepairPrompt));
        }

        this.repairStrategy = strategies.length > 0 
            ? new CompositeRepairStrategy(strategies)
            : new NoOpRepairStrategy();
    }

    async validate(data: unknown): Promise<PipelineResult<T>> {
        const history: ValidationResult<T>[] = [];
        let currentData = data;

        // Initial validation
        let result = this.validator.validate(currentData);
        history.push(result);

        if (result.success) {
            return this.buildResult({ ...result, repaired: false, repairAttempts: 0 }, history, 1);
        }

        // Repair attempts
        for (let attempt = 1; attempt <= this.maxRepairAttempts; attempt++) {
            if (!this.repairStrategy.canRepair(this.buildContext(currentData, history))) {
                break;
            }

            const repaired = await this.repairStrategy.repair(this.buildContext(currentData, history));
            
            if (repaired === null || repaired === undefined) {
                break;
            }

            currentData = repaired;
            result = this.validator.validate(currentData);
            const historyEntry = { ...result, repaired: true, repairAttempts: attempt };
            history.push(historyEntry);

            this.onRepairAttempt?.(attempt, historyEntry);

            if (result.success) {
                return this.buildResult(historyEntry, history, attempt + 1);
            }
            // Validation still failed - continue to next repair attempt
        }

        // All attempts failed
        return this.buildResult(history[history.length - 1], history, history.length);
    }

    private buildContext(rawInput: unknown, history: ValidationResult<T>[]): RepairContext<T> {
        return {
            rawInput,
            schema: this.validator.schema,
            previousAttempts: history,
            maxAttempts: this.maxRepairAttempts,
        };
    }

    private buildResult(
        finalResult: ValidationResult<T>,
        history: ValidationResult<T>[],
        totalAttempts: number
    ): PipelineResult<T> {
        return {
            ...finalResult,
            totalAttempts,
            repairHistory: history,
        };
    }
}

class NoOpRepairStrategy<T> implements RepairStrategy<T> {
    readonly name = 'no-op';
    canRepair(): boolean { return false; }
    repair(): null { return null; }
}

/**
 * Create a pipeline for property extraction (common use case)
 */
export function createPropertyPipeline(
    options: Omit<PipelineOptions<PropertyItem[]>, 'schema' | 'repairStrategies'> & { schema: Schema<PropertyItem[]> }
): ValidationPipeline<PropertyItem[]> {
    return new ValidationPipeline<PropertyItem[]>({
        ...options,
        schema: options.schema,
        repairStrategies: [defaultRepairStrategies.properties],
    });
}

/**
 * Create a pipeline for tag suggestions
 */
export function createTagPipeline(
    options: Omit<PipelineOptions<string[]>, 'schema' | 'repairStrategies'> & { schema: Schema<string[]> }
): ValidationPipeline<string[]> {
    return new ValidationPipeline<string[]>({
        ...options,
        schema: options.schema,
        repairStrategies: [defaultRepairStrategies.tags],
    });
}

/**
 * Create a pipeline for inferred attributes
 */
export function createInferredAttributesPipeline(
    options: Omit<PipelineOptions<InferredAttribute[]>, 'schema' | 'repairStrategies'> & { schema: Schema<InferredAttribute[]> }
): ValidationPipeline<InferredAttribute[]> {
    return new ValidationPipeline<InferredAttribute[]>({
        ...options,
        schema: options.schema,
        repairStrategies: [defaultRepairStrategies.inferredAttributes],
    });
}

/**
 * Create a pipeline for ontology optimization
 */
export function createOntologyOptimizationPipeline(
    options: Omit<PipelineOptions<OntologyOptimization>, 'schema' | 'repairStrategies'> & { schema: Schema<OntologyOptimization> }
): ValidationPipeline<OntologyOptimization> {
    return new ValidationPipeline<OntologyOptimization>({
        ...options,
        schema: options.schema,
        repairStrategies: [defaultRepairStrategies.ontologyOptimization],
    });
}

// Re-export types for convenience
export type { PropertyItem, InferredAttribute, OntologyOptimization } from './RepairStrategy.js';