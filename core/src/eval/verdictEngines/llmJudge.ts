/**
 * LLM Judge Verdict Engine - LLM-as-judge for rapid triage
 * Evidence class: 'hypothesized' (never auto-activates)
 */

import { z } from 'zod';
import type { 
    PairedRunResult, 
    VerdictConfig 
} from '../verdict.js';
import type { 
    ExtendedCaseVerdict, 
    ExtendedRunVerdict, 
    VerdictEngineConfig,
    VerdictEngine 
} from './index.js';
import type { EvidenceClass, JudgeProvenance } from '../../schemas/evidence.js';
import { 
    computeCaseVerdict as baseComputeCaseVerdict,
    computeRunVerdict as baseComputeRunVerdict,
    type CaseVerdict,
    type RunVerdict
} from '../verdict.js';
import { 
    extendCaseVerdict, 
    extendRunVerdict 
} from '../../schemas/verdictResult.js';
import { 
    createModelProvenance, 
    EvidenceClass 
} from '../../schemas/evidence.js';

// --- LLM Judge config schema ---

export const llmJudgeConfigSchema = z.object({
    primaryMetric: z.string(),
    mde: z.record(z.number()),
    floors: z.record(z.number()),
    minSampleSize: z.number().int().positive().default(30),
    // LLM Judge specific
    modelId: z.string().default('gpt-4o'),
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.1),
    maxTokens: z.number().int().positive().default(500),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    // Decay config (hypothesized verdicts decay 2x faster)
    decayHalfLifeDays: z.number().positive().default(15), // 15 days vs 30 for measured
});

// --- LLM Judge Engine Implementation ---

export class LLMJudgeVerdictEngine implements VerdictEngine {
    readonly name = 'llm-judge';
    readonly description = 'LLM-as-judge for rapid candidate triage (hypothesized evidence)';
    readonly evidenceClass: EvidenceClass = 'hypothesized';
    readonly configSchema = llmJudgeConfigSchema;
    
    private modelProvider: (prompt: string) => Promise<string>;
    
    constructor(modelProvider?: (prompt: string) => Promise<string>) {
        this.modelProvider = modelProvider ?? this.defaultMockProvider;
    }
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): VerdictEngineConfig {
        return {
            primaryMetric: 'completion',
            mde: {
                completion: 0.10,
                steps: -0.5,
                corrections: -0.2,
                precision: 0.05,
                recall: 0.05,
                f1: 0.05,
            },
            floors: {
                completion: 0.7,
                schemaValidity: 1.0,
            },
            minSampleSize: 30,
            modelId: 'gpt-4o',
            temperature: 0.1,
            maxTokens: 500,
            confidenceThreshold: 0.7,
            decayHalfLifeDays: 15,
        };
    }
    
    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } {
        const result = llmJudgeConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        return { valid: true, errors: [] };
    }
    
    async computeCaseVerdict(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): Promise<ExtendedCaseVerdict> {
        const baseVerdict = baseComputeCaseVerdict(caseId, paired, config as VerdictConfig);
        
        // Get LLM judgment
        const llmJudgment = await this.getLLMJudgment(paired, config);
        
        // Override with LLM judgment (lower confidence)
        const enhancedVerdict = this.applyLLMJudgment(baseVerdict, llmJudgment, config);
        
        const provenance = createModelProvenance(
            config.modelId ?? 'gpt-4o',
            llmJudgment.confidence,
            { 
                prompt: llmJudgment.prompt,
                rawResponse: llmJudgment.rawResponse,
                temperature: config.temperature,
            }
        );
        
        return extendCaseVerdict(enhancedVerdict, 'hypothesized', provenance);
    }
    
    async computeRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: ExtendedCaseVerdict[],
        primaryMetric: string
    ): Promise<ExtendedRunVerdict> {
        const baseVerdicts: CaseVerdict[] = caseVerdicts.map(cv => ({
            caseId: cv.caseId,
            verdict: cv.verdict,
            primaryMetric: {
                metric: cv.primaryMetric.metric,
                baselineMean: cv.primaryMetric.baselineMean,
                candidateMean: cv.primaryMetric.candidateMean,
                delta: cv.primaryMetric.delta,
                deltaPercent: cv.primaryMetric.deltaPercent,
                pValue: cv.primaryMetric.pValue,
                ci: cv.primaryMetric.ci,
                mde: cv.primaryMetric.mde,
                passes: cv.primaryMetric.passes,
                direction: cv.primaryMetric.direction,
            },
            otherMetrics: cv.otherMetrics.map(om => ({
                metric: om.metric,
                baselineMean: om.baselineMean,
                candidateMean: om.candidateMean,
                delta: om.delta,
                deltaPercent: om.deltaPercent,
                pValue: om.pValue,
                ci: om.ci,
                mde: om.mde,
                passes: om.passes,
                direction: om.direction,
            })),
            floors: cv.floors,
            excluded: cv.excluded,
            excludeReason: cv.excludeReason,
        }));
        
        const baseRunVerdict = baseComputeRunVerdict(runId, manifestHash, revisionId, baselineRevisionId, baseVerdicts, primaryMetric);
        
        const provenance = createModelProvenance(
            config.modelId ?? 'gpt-4o',
            0.5, // Lower confidence for aggregate
            { method: 'llm-aggregate' }
        );
        
        return extendRunVerdict(baseRunVerdict, 'hypothesized', provenance);
    }
    
    private async getLLMJudgment(
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): Promise<{ verdict: string; confidence: number; reasoning: string; prompt: string; rawResponse: string }> {
        const prompt = this.buildPrompt(paired, config);
        
        try {
            const response = await this.modelProvider(prompt);
            return this.parseResponse(response, prompt);
        } catch (e) {
            // Fallback to conservative judgment
            return {
                verdict: 'inconclusive',
                confidence: 0,
                reasoning: `LLM call failed: ${e}`,
                prompt,
                rawResponse: '',
            };
        }
    }
    
    private buildPrompt(paired: PairedRunResult, config: VerdictEngineConfig): string {
        const baselineMetrics = JSON.stringify(paired.baseline.metrics, null, 2);
        const candidateMetrics = JSON.stringify(paired.candidate.metrics, null, 2);
        
        const systemPrompt = config.systemPrompt ?? `You are an expert evaluator comparing two system outputs.
Evaluate whether the CANDIDATE is meaningfully better than the BASELINE.
Consider: task completion, efficiency, quality, user experience.
Return JSON only.`;
        
        return `${systemPrompt}

BASELINE METRICS:
${baselineMetrics}

CANDIDATE METRICS:
${candidateMetrics}

PRIMARY METRIC: ${config.primaryMetric}
MDE (Minimum Detectable Effect): ${config.mde[config.primaryMetric] ?? 'N/A'}

Respond with ONLY this JSON:
{
  "verdict": "improved" | "degraded" | "inconclusive",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
    }
    
    private parseResponse(response: string, prompt: string): { verdict: string; confidence: number; reasoning: string; prompt: string; rawResponse: string } {
        try {
            const parsed = JSON.parse(response);
            return {
                verdict: parsed.verdict ?? 'inconclusive',
                confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
                reasoning: parsed.reasoning ?? '',
                prompt,
                rawResponse: response,
            };
        } catch {
            return {
                verdict: 'inconclusive',
                confidence: 0,
                reasoning: 'Failed to parse LLM response',
                prompt,
                rawResponse: response,
            };
        }
    }
    
    private applyLLMJudgment(
        baseVerdict: CaseVerdict,
        judgment: { verdict: string; confidence: number; reasoning: string },
        config: VerdictEngineConfig
    ): CaseVerdict {
        // Map LLM verdict to our verdict types
        const verdictMap: Record<string, CaseVerdict['verdict']> = {
            'improved': 'improved',
            'degraded': 'degraded',
            'inconclusive': 'inconclusive',
        };
        
        const llmVerdict = verdictMap[judgment.verdict] ?? 'inconclusive';
        
        // Only override if confidence is above threshold
        const threshold = config.confidenceThreshold ?? 0.7;
        const finalVerdict = judgment.confidence >= threshold ? llmVerdict : baseVerdict.verdict;
        
        // Adjust p-value to reflect LLM confidence (not a real p-value)
        const primaryMetric = {
            ...baseVerdict.primaryMetric,
            pValue: judgment.confidence >= threshold ? (1 - judgment.confidence) : baseVerdict.primaryMetric.pValue,
            direction: llmVerdict === 'improved' ? 'improved' : (llmVerdict === 'degraded' ? 'degraded' : 'no-change'),
            passes: judgment.confidence >= threshold && llmVerdict === 'improved',
        };
        
        const otherMetrics = baseVerdict.otherMetrics.map(m => ({
            ...m,
            pValue: judgment.confidence >= threshold ? (1 - judgment.confidence) : m.pValue,
        }));
        
        return {
            ...baseVerdict,
            verdict: finalVerdict,
            primaryMetric,
            otherMetrics,
        };
    }
    
    // Mock provider for testing
    private async defaultMockProvider(prompt: string): Promise<string> {
        // Deterministic mock based on prompt hash
        const hash = prompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const verdict = hash % 3 === 0 ? 'improved' : (hash % 3 === 1 ? 'degraded' : 'inconclusive');
        const confidence = 0.5 + (hash % 50) / 100;
        
        return JSON.stringify({
            verdict,
            confidence: Math.round(confidence * 100) / 100,
            reasoning: `Mock LLM judgment based on prompt hash ${hash}`,
        });
    }
}

// --- Factory ---
export function createLLMJudgeVerdictEngine(modelProvider?: (prompt: string) => Promise<string>): LLMJudgeVerdictEngine {
    return new LLMJudgeVerdictEngine(modelProvider);
}