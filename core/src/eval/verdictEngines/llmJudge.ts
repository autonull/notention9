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
    EvidenceClass,
    JudgeProvenance
} from './index.js';
import { 
    type CaseVerdict,
    type RunVerdict
} from '../verdict.js';
import { BaseVerdictEngine } from './baseVerdictEngine.js';

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

export class LLMJudgeVerdictEngine extends BaseVerdictEngine {
    readonly name = 'llm-judge';
    readonly description = 'LLM-as-judge for rapid candidate triage (hypothesized evidence)';
    readonly evidenceClass: EvidenceClass = 'hypothesized';
    readonly configSchema = llmJudgeConfigSchema;
    
    private modelProvider: (prompt: string) => Promise<string>;
    
    constructor(modelProvider?: (prompt: string) => Promise<string>) {
        super();
        this.modelProvider = modelProvider ?? this.defaultMockProvider;
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
        const baseVerdict = this.computeBaseCaseVerdict(caseId, paired, config);
        const llmConfig = config as any;
        
        // Get LLM judgment
        const llmJudgment = await this.getLLMJudgment(paired, config);
        
        // Override with LLM judgment (lower confidence)
        const enhancedVerdict = this.applyLLMJudgment(baseVerdict, llmJudgment, config);
        
        const provenance = this.createModelProvenance(
            llmConfig.modelId ?? 'gpt-4o',
            llmJudgment.confidence,
            { 
                prompt: llmJudgment.prompt,
                rawResponse: llmJudgment.rawResponse,
                temperature: llmConfig.temperature,
            }
        );
        
        return this.extendCaseVerdict(enhancedVerdict, provenance);
    }
    
    async computeRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: ExtendedCaseVerdict[],
        primaryMetric: string
    ): Promise<ExtendedRunVerdict> {
        const defaultConfig = this.getDefaultConfig() as any;
        const baseVerdicts = this.toBaseCaseVerdicts(caseVerdicts);
        
        const baseRunVerdict = this.computeBaseRunVerdict(runId, manifestHash, revisionId, baselineRevisionId, baseVerdicts, primaryMetric);
        
        const provenance = this.createModelProvenance(
            defaultConfig.modelId ?? 'gpt-4o',
            0.5, // Lower confidence for aggregate
            { method: 'llm-aggregate' }
        );
        
        return this.extendRunVerdict(baseRunVerdict, provenance);
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
        const llmConfig = config as any;
        // Map LLM verdict to our verdict types
        const verdictMap: Record<string, CaseVerdict['verdict']> = {
            'improved': 'improved',
            'degraded': 'degraded',
            'inconclusive': 'inconclusive',
        };
        
        const llmVerdict = verdictMap[judgment.verdict] ?? 'inconclusive';
        
        // Only override if confidence is above threshold
        const threshold = llmConfig.confidenceThreshold ?? 0.7;
        const finalVerdict = judgment.confidence >= threshold ? llmVerdict : baseVerdict.verdict;
        
        // Adjust p-value to reflect LLM confidence (not a real p-value)
        const direction: 'improved' | 'degraded' | 'no-change' = 
            llmVerdict === 'improved' ? 'improved' : (llmVerdict === 'degraded' ? 'degraded' : 'no-change');
        
        const primaryMetric = {
            ...baseVerdict.primaryMetric,
            pValue: judgment.confidence >= threshold ? (1 - judgment.confidence) : baseVerdict.primaryMetric.pValue,
            direction,
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