/**
 * Sequential Verdict Engine - Sequential probability ratio test (SPRT)
 * Evidence class: 'measured'
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
    VerdictEngine,
    EvidenceClass,
    JudgeProvenance
} from './index.js';
import { 
    pairedTTest, 
    pairedConfidenceInterval, 
    mean, 
    std,
    computeCaseVerdict as baseComputeCaseVerdict,
    computeRunVerdict as baseComputeRunVerdict,
    type MetricVerdict,
    type CaseVerdict,
    type RunVerdict
} from '../verdict.js';
import { 
    extendCaseVerdict, 
    extendRunVerdict 
} from '../../schemas/verdictResult.js';
import { 
    createStatisticalProvenance 
} from '../../schemas/evidence.js';

// --- Sequential-specific config schema ---

export const sequentialConfigSchema = z.object({
    primaryMetric: z.string(),
    mde: z.record(z.number()),
    floors: z.record(z.number()),
    minSampleSize: z.number().int().positive().default(30),
    // Sequential-specific
    alpha: z.number().min(0).max(1).default(0.05),
    beta: z.number().min(0).max(1).default(0.2),
    minEffectSize: z.number().default(0.2),
    maxSampleSize: z.number().int().positive().default(1000),
    indifferenceRegion: z.number().min(0).default(0.1),
});

// --- Sequential Engine Implementation ---

export class SequentialVerdictEngine implements VerdictEngine {
    readonly name = 'sequential';
    readonly description = 'Sequential Probability Ratio Test (SPRT) for early stopping';
    readonly evidenceClass: EvidenceClass = 'measured';
    readonly configSchema = sequentialConfigSchema;
    
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
            alpha: 0.05,
            beta: 0.2,
            minEffectSize: 0.2,
            maxSampleSize: 1000,
            indifferenceRegion: 0.1,
        };
    }
    
    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } {
        const result = sequentialConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        return { valid: true, errors: [] };
    }
    
    computeCaseVerdict(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): ExtendedCaseVerdict {
        const baseVerdict = baseComputeCaseVerdict(caseId, paired, config as VerdictConfig);
        
        // For sequential, we'd need multiple observations
        // This computes what the decision would be with current data
        const enhancedVerdict = this.applySequentialTest(baseVerdict, paired, config);
        
        const provenance = createStatisticalProvenance(
            'sequential-sprt',
            'v1',
            0.9,
            { 
                alpha: config.alpha,
                beta: config.beta,
                minEffectSize: config.minEffectSize,
            }
        );
        
        return extendCaseVerdict(enhancedVerdict, 'measured', provenance);
    }
    
    computeRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: ExtendedCaseVerdict[],
        primaryMetric: string
    ): ExtendedRunVerdict {
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
        
        const provenance = createStatisticalProvenance(
            'sequential-aggregate',
            'v1',
            0.9,
            { method: 'sprt-combined' }
        );
        
        return extendRunVerdict(baseRunVerdict, 'measured', provenance);
    }
    
    /**
     * Apply Sequential Probability Ratio Test (SPRT)
     * Returns early stopping boundaries
     */
    private applySequentialTest(
        baseVerdict: CaseVerdict,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): CaseVerdict {
        const seqConfig = config as any;
        const alpha = seqConfig.alpha ?? 0.05;
        const beta = seqConfig.beta ?? 0.2;
        const effectSize = seqConfig.minEffectSize ?? 0.2;
        const indifference = seqConfig.indifferenceRegion ?? 0.1;
        
        // SPRT boundaries (Wald's approximation)
        const A = Math.log((1 - beta) / alpha);
        const B = Math.log(beta / (1 - alpha));
        
        const enhancedMetrics: MetricVerdict[] = [];
        
        for (const mv of [baseVerdict.primaryMetric, ...baseVerdict.otherMetrics]) {
            // With single observation, we can't do true sequential
            // This computes the log-likelihood ratio for the observed effect
            const observedEffect = mv.delta;
            const n = 1; // Would be cumulative observations
            
            // Simplified: log LR for normal with known variance
            // H0: delta = 0, H1: delta = effectSize
            const sigma = 1; // Assumed known variance
            const logLR = n * effectSize * observedEffect / (sigma * sigma) - n * effectSize * effectSize / (2 * sigma * sigma);
            
            let decision: 'improved' | 'degraded' | 'no-change' = 'no-change';
            let passes = false;
            
            if (logLR >= A) {
                decision = observedEffect > 0 ? 'improved' : 'degraded';
                passes = true;
            } else if (logLR <= B) {
                decision = 'no-change';
                passes = true; // Accept null
            }
            // else: continue sampling (inconclusive) - direction stays 'no-change'
            
            // CI for sequential (wider to account for multiple looks)
            const ci = pairedConfidenceInterval([mv.baselineMean], [mv.candidateMean], 0.99); // Wider CI
            
            enhancedMetrics.push({
                ...mv,
                pValue: logLR >= A ? alpha : (logLR <= B ? 1 - beta : 0.5), // Approximate
                ci,
                passes,
                direction: decision,
            });
        }
        
        const primaryMetric = enhancedMetrics.find(m => m.metric === config.primaryMetric) ?? enhancedMetrics[0];
        const otherMetrics = enhancedMetrics.filter(m => m.metric !== config.primaryMetric);
        
        const allFloorsPass = baseVerdict.floors.every(f => f.pass);
        const primaryPasses = primaryMetric.passes;
        
        let verdict: CaseVerdict['verdict'] = 'inconclusive';
        if (!allFloorsPass) {
            verdict = 'degraded';
        } else if (primaryPasses && primaryMetric.direction === 'improved') {
            verdict = 'improved';
        } else if (primaryPasses && primaryMetric.direction === 'degraded') {
            verdict = 'degraded';
        }
        
        return {
            ...baseVerdict,
            verdict,
            primaryMetric,
            otherMetrics,
        };
    }
}

// --- Factory ---
export function createSequentialVerdictEngine(): SequentialVerdictEngine {
    return new SequentialVerdictEngine();
}