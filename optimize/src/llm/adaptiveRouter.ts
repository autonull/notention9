/**
 * Adaptive Model Router (ensemble-lite)
 * Routes short/simple notes to smaller models (2B), long/governance notes to larger models (4B/9B).
 * Measures blended F1 vs latency.
 */

import type { Property, OntologyNode } from '@notention/core';
import { extractWithLlamaCpp, type LlamaCppBridgeOptions } from './llamaCppBridge.js';

export type ModelSize = '2B' | '4B' | '9B';

export interface ModelConfig {
    size: ModelSize;
    modelPath: string;
    contextSize: number;
    gpuLayers: number | 'auto' | 'max';
    maxTokens: number;
    temperature: number;
    description: string;
}

export interface RoutingDecision {
    modelSize: ModelSize;
    modelPath: string;
    reason: string;
    complexityScore: number;
}

export interface ExtractionResult {
    properties: Property[];
    modelUsed: ModelSize;
    latencyMs: number;
    routingReason: string;
}

/**
 * Default model configurations for different sizes.
 * These should be updated with actual model paths.
 */
export const DEFAULT_MODEL_CONFIGS: ModelConfig[] = [
    {
        size: '2B',
        modelPath: '/home/me/notention9/models/Qwen_Qwen3.5-2B-Q4_K_M.gguf',
        contextSize: 4096,
        gpuLayers: 'max',
        maxTokens: 512,
        temperature: 0,
        description: 'Fast extraction for simple notes',
    },
    {
        size: '4B',
        modelPath: '/home/me/notention9/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf',
        contextSize: 8192,
        gpuLayers: 'max',
        maxTokens: 512,
        temperature: 0,
        description: 'Balanced extraction for standard notes',
    },
    {
        size: '9B',
        modelPath: '/home/me/notention9/models/Qwen_Qwen3.5-9B-Q4_K_M.gguf',
        contextSize: 8192,
        gpuLayers: 'max',
        maxTokens: 1024,
        temperature: 0,
        description: 'High-quality extraction for complex/governance notes',
    },
];

/**
 * Complexity thresholds for routing decisions.
 * - Below SIMPLE_THRESHOLD: route to 2B
 * - Above GOVERNANCE_THRESHOLD: route to 9B
 * - Between: route to 4B
 */
const SIMPLE_THRESHOLD = 30;
const GOVERNANCE_THRESHOLD = 70;

/**
 * Governance-related keywords that increase complexity score.
 */
const GOVERNANCE_KEYWORDS = [
    'budget', 'contract', 'legal', 'compliance', 'policy', 'regulation',
    'approval', 'authorize', 'mandate', 'requirement', 'specification',
    'deadline', 'milestone', 'deliverable', 'governance', 'audit',
    'risk', 'liability', 'warranty', 'indemnification', 'confidential',
];

/**
 * Simple note indicators that decrease complexity score.
 */
const SIMPLE_INDICATORS = [
    'todo', 'note', 'reminder', 'idea', 'thought', 'quick',
    'simple', 'basic', 'draft', 'scratch',
];

/**
 * Analyzes text complexity to determine routing.
 * Returns a score 0-100 where higher = more complex.
 */
export function analyzeComplexity(text: string): number {
    let score = 50; // Base score

    const lowerText = text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;
    const charCount = text.length;

    // Length-based scoring
    if (wordCount < 20) score -= 20;
    else if (wordCount < 50) score -= 10;
    else if (wordCount > 200) score += 20;
    else if (wordCount > 100) score += 10;

    // Character count
    if (charCount < 100) score -= 10;
    else if (charCount > 1000) score += 15;

    // Governance keywords
    for (const keyword of GOVERNANCE_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            score += 5;
        }
    }

    // Simple indicators
    for (const indicator of SIMPLE_INDICATORS) {
        if (lowerText.includes(indicator)) {
            score -= 5;
        }
    }

    // Number of sentences (more sentences = more complex)
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentenceCount > 5) score += 10;
    else if (sentenceCount > 2) score += 5;

    // Presence of structured data patterns (dates, amounts, references)
    if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) score += 5; // Dates
    if (/\$\d+|\d+\.\d{2}/.test(text)) score += 5; // Money
    if (/#[A-Z]+-\d+/i.test(text)) score += 5; // Issue/ticket refs

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Makes a routing decision based on text complexity and available models.
 */
export function makeRoutingDecision(
    text: string,
    availableModels: ModelConfig[] = DEFAULT_MODEL_CONFIGS
): RoutingDecision {
    const complexityScore = analyzeComplexity(text);

    let modelSize: ModelSize;
    let reason: string;

    if (complexityScore <= SIMPLE_THRESHOLD) {
        modelSize = '2B';
        reason = `Simple note (complexity: ${complexityScore}) → 2B model`;
    } else if (complexityScore >= GOVERNANCE_THRESHOLD) {
        modelSize = '9B';
        reason = `Complex/governance note (complexity: ${complexityScore}) → 9B model`;
    } else {
        modelSize = '4B';
        reason = `Standard note (complexity: ${complexityScore}) → 4B model`;
    }

    // Find the model config
    const modelConfig = availableModels.find(m => m.size === modelSize);
    const modelPath = modelConfig?.modelPath ?? availableModels[0]?.modelPath ?? '';

    return {
        modelSize,
        modelPath,
        reason,
        complexityScore,
    };
}

/**
 * Adaptive extraction that routes to the appropriate model based on complexity.
 */
export async function adaptiveExtract(
    text: string,
    ontology: OntologyNode[] = [],
    availableModels: ModelConfig[] = DEFAULT_MODEL_CONFIGS,
    baseOptions: Partial<LlamaCppBridgeOptions> = {}
): Promise<ExtractionResult> {
    const startTime = Date.now();

    const decision = makeRoutingDecision(text, availableModels);
    const modelConfig = availableModels.find(m => m.size === decision.modelSize) ?? availableModels[0];

    const options: LlamaCppBridgeOptions = {
        modelPath: modelConfig.modelPath,
        contextSize: modelConfig.contextSize,
        gpuLayers: modelConfig.gpuLayers,
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        ...baseOptions,
    };

    try {
        const properties = await extractWithLlamaCpp(text, ontology, options);
        const latencyMs = Date.now() - startTime;

        return {
            properties,
            modelUsed: decision.modelSize,
            latencyMs,
            routingReason: decision.reason,
        };
    } catch (error) {
        // Fallback to smallest available model on error
        const fallbackConfig = availableModels[0];
        const fallbackOptions: LlamaCppBridgeOptions = {
            modelPath: fallbackConfig.modelPath,
            contextSize: fallbackConfig.contextSize,
            gpuLayers: fallbackConfig.gpuLayers,
            maxTokens: fallbackConfig.maxTokens,
            temperature: fallbackConfig.temperature,
            ...baseOptions,
        };

        const properties = await extractWithLlamaCpp(text, ontology, fallbackOptions);
        const latencyMs = Date.now() - startTime;

        return {
            properties,
            modelUsed: fallbackConfig.size,
            latencyMs,
            routingReason: `${decision.reason} (fallback to ${fallbackConfig.size} due to error: ${error})`,
        };
    }
}

/**
 * Batch adaptive extraction for multiple texts.
 * Returns results with model routing info for analysis.
 */
export async function adaptiveExtractBatch(
    texts: string[],
    ontology: OntologyNode[] = [],
    availableModels: ModelConfig[] = DEFAULT_MODEL_CONFIGS,
    baseOptions: Partial<LlamaCppBridgeOptions> = {}
): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    for (const text of texts) {
        const result = await adaptiveExtract(text, ontology, availableModels, baseOptions);
        results.push(result);
    }
    return results;
}

/**
 * Computes blended metrics from adaptive extraction results.
 */
export function computeBlendedMetrics(results: ExtractionResult[]): {
    avgLatencyMs: number;
    p95LatencyMs: number;
    modelDistribution: Record<ModelSize, number>;
    totalExtractions: number;
} {
    const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
    const p95Index = Math.ceil(latencies.length * 0.95) - 1;

    const modelDistribution: Record<ModelSize, number> = {
        '2B': 0,
        '4B': 0,
        '9B': 0,
    };

    for (const r of results) {
        modelDistribution[r.modelUsed]++;
    }

    return {
        avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95LatencyMs: latencies[Math.max(0, p95Index)],
        modelDistribution,
        totalExtractions: results.length,
    };
}

/**
 * Validates that required models are available.
 * Returns list of missing model sizes.
 */
export function validateModelsAvailable(availableModels: ModelConfig[]): ModelSize[] {
    const requiredSizes: ModelSize[] = ['2B', '4B', '9B'];
    const availableSizes = new Set(availableModels.map(m => m.size));
    return requiredSizes.filter(size => !availableSizes.has(size));
}