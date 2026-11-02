/**
 * Human Judge Verdict Engine - Human expert review
 * Evidence class: 'observed' (can override measured with consent)
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
    createHumanProvenance, 
    EvidenceClass 
} from '../../schemas/evidence.js';

// --- Human Judge config schema ---

export const humanJudgeConfigSchema = z.object({
    primaryMetric: z.string(),
    mde: z.record(z.number()),
    floors: z.record(z.number()),
    minSampleSize: z.number().int().positive().default(30),
    // Human Judge specific
    reviewerId: z.string(),
    requiresConsent: z.boolean().default(true), // observed can override measured with consent
    reviewTimeoutMs: z.number().int().positive().default(86400000), // 24 hours
    allowPartialReview: z.boolean().default(true),
});

// --- Human Judge Engine Implementation ---

export class HumanJudgeVerdictEngine implements VerdictEngine {
    readonly name = 'human-judge';
    readonly description = 'Human expert review for high-stakes decisions (observed evidence)';
    readonly evidenceClass: EvidenceClass = 'observed';
    readonly configSchema = humanJudgeConfigSchema;
    
    private reviewCallback?: (caseId: string, paired: PairedRunResult, config: VerdictEngineConfig) => Promise<HumanReview>;
    
    constructor(reviewCallback?: (caseId: string, paired: PairedRunResult, config: VerdictEngineConfig) => Promise<HumanReview>) {
        this.reviewCallback = reviewCallback;
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
            reviewerId: 'default-reviewer',
            requiresConsent: true,
            reviewTimeoutMs: 86400000,
            allowPartialReview: true,
        };
    }
    
    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } {
        const result = humanJudgeConfigSchema.safeParse(config);
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
        
        // Get human review
        const review = await this.getHumanReview(caseId, paired, config);
        
        // Apply human judgment
        const enhancedVerdict = this.applyHumanJudgment(baseVerdict, review, config);
        
        const provenance = createHumanProvenance(
            config.reviewerId ?? 'unknown',
            review.confidence,
            { 
                reviewId: review.id,
                reasoning: review.reasoning,
                overridesMeasured: review.overridesMeasured ?? false,
                timestamp: review.timestamp,
            }
        );
        
        return extendCaseVerdict(enhancedVerdict, 'observed', provenance);
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
        
        const provenance = createHumanProvenance(
            config.reviewerId ?? 'unknown',
            0.8, // High confidence for human aggregate review
            { method: 'human-aggregate-review' }
        );
        
        return extendRunVerdict(baseRunVerdict, 'observed', provenance);
    }
    
    private async getHumanReview(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): Promise<HumanReview> {
        if (this.reviewCallback) {
            return this.reviewCallback(caseId, paired, config);
        }
        
        // Mock review for testing
        return this.mockReview(caseId, paired, config);
    }
    
    private mockReview(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): HumanReview {
        const baselineScore = paired.baseline.metrics[config.primaryMetric] ?? 0;
        const candidateScore = paired.candidate.metrics[config.primaryMetric] ?? 0;
        const delta = candidateScore - baselineScore;
        
        return {
            id: `review_${caseId}_${Date.now()}`,
            caseId,
            reviewerId: config.reviewerId ?? 'mock-reviewer',
            verdict: delta > 0 ? 'improved' : (delta < 0 ? 'degraded' : 'inconclusive'),
            confidence: 0.9,
            reasoning: `Human review: baseline=${baselineScore.toFixed(3)}, candidate=${candidateScore.toFixed(3)}, delta=${delta.toFixed(3)}`,
            overridesMeasured: false,
            timestamp: new Date().toISOString(),
        };
    }
    
    private applyHumanJudgment(
        baseVerdict: CaseVerdict,
        review: HumanReview,
        config: VerdictEngineConfig
    ): CaseVerdict {
        const verdictMap: Record<string, CaseVerdict['verdict']> = {
            'improved': 'improved',
            'degraded': 'degraded',
            'inconclusive': 'inconclusive',
        };
        
        const humanVerdict = verdictMap[review.verdict] ?? 'inconclusive';
        
        // Human judgment overrides statistical verdict
        const primaryMetric = {
            ...baseVerdict.primaryMetric,
            pValue: review.confidence >= 0.8 ? 0.01 : 0.05, // Very low p-value for confident human judgment
            direction: humanVerdict === 'improved' ? 'improved' : (humanVerdict === 'degraded' ? 'degraded' : 'no-change'),
            passes: humanVerdict === 'improved',
        };
        
        const otherMetrics = baseVerdict.otherMetrics.map(m => ({
            ...m,
            pValue: review.confidence >= 0.8 ? 0.01 : m.pValue,
        }));
        
        return {
            ...baseVerdict,
            verdict: humanVerdict,
            primaryMetric,
            otherMetrics,
        };
    }
    
    /**
     * Set custom review callback (for UI integration)
     */
    setReviewCallback(callback: (caseId: string, paired: PairedRunResult, config: VerdictEngineConfig) => Promise<HumanReview>): void {
        this.reviewCallback = callback;
    }
}

export interface HumanReview {
    id: string;
    caseId: string;
    reviewerId: string;
    verdict: 'improved' | 'degraded' | 'inconclusive';
    confidence: number;
    reasoning: string;
    overridesMeasured?: boolean;
    timestamp: string;
}

// --- Factory ---
export function createHumanJudgeVerdictEngine(reviewCallback?: (caseId: string, paired: PairedRunResult, config: VerdictEngineConfig) => Promise<HumanReview>): HumanJudgeVerdictEngine {
    return new HumanJudgeVerdictEngine(reviewCallback);
}