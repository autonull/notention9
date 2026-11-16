/**
 * Progressive Extraction with Latency Budget
 * 
 * Runs extraction in stages with time budgets:
 * - Stage 1 (heuristic): < 300ms p50 - deterministic, pattern, ontology-key
 * - Stage 2 (AI): < 800ms p50 - LLM-based refinement
 * 
 * Returns incremental results via callbacks.
 */

import type { OntologyNode, Property } from '../types/index.js';
import type { ExtractionOptions } from './ExtractionPipeline.js';
import { ExtractionPipeline, defaultStages, createExtractionPipeline, AIExtractionProvider } from './ExtractionPipeline.js';
import { OntologyService } from '../ontology/ontologyService.js';

export interface ProgressiveExtractionOptions {
    /** Max time for heuristic stages (ms). Default: 300ms */
    heuristicBudgetMs?: number;
    /** Max time for AI stage (ms). Default: 800ms */
    aiBudgetMs?: number;
    /** Called when heuristic results are ready */
    onHeuristicResults?: (properties: Property[]) => void;
    /** Called when AI results are ready (or timeout) */
    onCompleteResults?: (properties: Property[]) => void;
    /** Called on any error */
    onError?: (error: Error) => void;
    /** Extraction options passed to pipeline */
    extractionOptions?: ExtractionOptions;
}

export interface ProgressiveExtractionResult {
    heuristicProperties: Property[];
    aiProperties: Property[];
    allProperties: Property[];
    heuristicLatencyMs: number;
    aiLatencyMs: number;
    totalLatencyMs: number;
    heuristicBudgetExceeded: boolean;
    aiBudgetExceeded: boolean;
}

/**
 * Runs heuristic extraction stages (deterministic, pattern, ontology-key, fuzzy)
 * without AI. Target: < 300ms p50.
 */
export async function runHeuristicExtraction(
    text: string,
    ontology: OntologyNode[],
    options?: ExtractionOptions
): Promise<Property[]> {
    const pipeline = new ExtractionPipeline(defaultStages);
    const result = await pipeline.extract(text, ontology, options);
    return result.properties;
}

/**
 * Runs AI extraction stage with timeout.
 * Propagates AI provider errors, catches only timeout errors.
 */
export async function runAIExtraction(
    text: string,
    ontology: OntologyNode[],
    aiProvider: AIExtractionProvider,
    timeoutMs: number,
    existingProperties: Property[],
    options?: ExtractionOptions
): Promise<Property[]> {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<Property[]>((_, reject) => {
        setTimeout(() => reject(new Error('AI extraction timeout')), timeoutMs);
    });

    // Call provider directly to allow error propagation
    // AIStage.extract catches all errors, so we bypass it
    const extractPromise = aiProvider.extract(text, ontology).then(properties =>
        properties.map(p => ({
            ...p,
            confidence: p.confidence ?? 0.8,
            provenance: p.provenance ?? 'ai',
        }))
    );

    try {
        const aiProperties = await Promise.race([
            extractPromise,
            timeoutPromise,
        ]);
        return aiProperties;
    } catch (error) {
        // Re-throw AI provider errors, but swallow timeout errors
        if (error instanceof Error && error.message !== 'AI extraction timeout') {
            throw error;
        }
        return [];
    }
}

/**
 * Progressive extraction with latency budgets.
 * 
 * Runs heuristic stages first (target < 300ms), then AI refinement (target < 800ms p50).
 * Calls callbacks with incremental results.
 */
export async function progressiveExtract(
    text: string,
    ontology: OntologyNode[],
    aiProvider: AIExtractionProvider,
    progressiveOptions: ProgressiveExtractionOptions = {}
): Promise<ProgressiveExtractionResult> {
    const {
        heuristicBudgetMs = 300,
        aiBudgetMs = 800,
        onHeuristicResults,
        onCompleteResults,
        onError,
        extractionOptions,
    } = progressiveOptions;

    const startTime = Date.now();
    let heuristicLatencyMs = 0;
    let aiLatencyMs = 0;
    let heuristicBudgetExceeded = false;
    let aiBudgetExceeded = false;

    // Stage 1: Heuristic extraction with timeout
    const heuristicPromise = (async () => {
        const heuristicStart = Date.now();
        try {
            // Run with timeout
            const heuristicProperties = await Promise.race([
                runHeuristicExtraction(text, ontology, extractionOptions),
                new Promise<Property[]>((_, reject) =>
                    setTimeout(() => reject(new Error('Heuristic timeout')), heuristicBudgetMs)
                ),
            ]);
            heuristicLatencyMs = Date.now() - heuristicStart;
            heuristicBudgetExceeded = heuristicLatencyMs >= heuristicBudgetMs;

            if (onHeuristicResults) {
                onHeuristicResults(heuristicProperties);
            }

            return heuristicProperties;
        } catch (error) {
            heuristicLatencyMs = Date.now() - heuristicStart;
            heuristicBudgetExceeded = true;
            if (onError) onError(error as Error);
            return [];
        }
    })();

    const heuristicProperties = await heuristicPromise;

    // Stage 2: AI extraction with timeout
    const aiPromise = (async () => {
        const aiStart = Date.now();
        try {
            const aiProperties = await runAIExtraction(
                text,
                ontology,
                aiProvider,
                aiBudgetMs,
                heuristicProperties,
                extractionOptions
            );
            aiLatencyMs = Date.now() - aiStart;
            aiBudgetExceeded = aiLatencyMs >= aiBudgetMs;

            // Merge with heuristic (AI properties override heuristic for same key+operator)
            const allProperties = mergeProperties(heuristicProperties, aiProperties);

            if (onCompleteResults) {
                onCompleteResults(allProperties);
            }

            return { aiProperties, allProperties };
        } catch (error) {
            aiLatencyMs = Date.now() - aiStart;
            aiBudgetExceeded = true;
            if (onError) onError(error as Error);

            if (onCompleteResults) {
                onCompleteResults(heuristicProperties);
            }

            return { aiProperties: [], allProperties: heuristicProperties };
        }
    })();

    const { aiProperties, allProperties } = await aiPromise;
    const totalLatencyMs = Date.now() - startTime;

    return {
        heuristicProperties,
        aiProperties,
        allProperties,
        heuristicLatencyMs,
        aiLatencyMs,
        totalLatencyMs,
        heuristicBudgetExceeded,
        aiBudgetExceeded,
    };
}

/**
 * Merges heuristic and AI properties.
 * AI properties take precedence for same key+operator.
 */
export function mergeProperties(heuristic: Property[], ai: Property[]): Property[] {
    const map = new Map<string, Property>();

    // Add heuristic properties first
    for (const prop of heuristic) {
        const id = `${prop.key}\u0000${prop.operator}`;
        map.set(id, prop);
    }

    // AI properties override
    for (const prop of ai) {
        const id = `${prop.key}\u0000${prop.operator}`;
        map.set(id, { ...prop, provenance: 'ai' });
    }

    return Array.from(map.values());
}

/**
 * Creates a progressive extractor with a specific AI provider.
 * Useful for creating reusable extractor instances.
 */
export function createProgressiveExtractor(
    aiProvider: AIExtractionProvider,
    defaultOptions: ProgressiveExtractionOptions = {}
) {
    return async (
        text: string,
        ontology: OntologyNode[],
        options?: ProgressiveExtractionOptions
    ) => progressiveExtract(text, ontology, aiProvider, { ...defaultOptions, ...options });
}