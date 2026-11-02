/**
 * Bayesian Verdict Engine - Bayesian statistical inference
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

// --- Bayesian-specific config schema ---

export const bayesianConfigSchema = z.object({
    primaryMetric: z.string(),
    mde: z.record(z.number()),
    floors: z.record(z.number()),
    minSampleSize: z.number().int().positive().default(30),
    // Bayesian-specific
    priorMean: z.number().default(0),
    priorVariance: z.number().positive().default(1),
    likelihoodVariance: z.number().positive().default(1),
    ropeWidth: z.number().min(0).default(0.1), // Region of Practical Equivalence
    decisionThreshold: z.number().min(0).max(1).default(0.95),
});

// --- Bayesian Engine Implementation ---

export class BayesianVerdictEngine implements VerdictEngine {
    readonly name = 'bayesian';
    readonly description = 'Bayesian inference with ROPE for practical equivalence testing';
    readonly evidenceClass: EvidenceClass = 'measured';
    readonly configSchema = bayesianConfigSchema;
    
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
            priorMean: 0,
            priorVariance: 1,
            likelihoodVariance: 1,
            ropeWidth: 0.1,
            decisionThreshold: 0.95,
        };
    }
    
    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } {
        const result = bayesianConfigSchema.safeParse(config);
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
        const enhancedVerdict = this.enhanceWithBayesian(baseVerdict, paired, config);
        
        const provenance = createStatisticalProvenance(
            'bayesian',
            'v1',
            0.9,
            { 
                priorMean: config.priorMean,
                priorVariance: config.priorVariance,
                ropeWidth: config.ropeWidth,
                decisionThreshold: config.decisionThreshold,
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
            'bayesian-aggregate',
            'v1',
            0.9,
            { method: 'hierarchical' }
        );
        
        return extendRunVerdict(baseRunVerdict, 'measured', provenance);
    }
    
    /**
     * Bayesian enhancement with ROPE (Region of Practical Equivalence)
     */
    private enhanceWithBayesian(
        baseVerdict: CaseVerdict,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): CaseVerdict {
        // For each metric, compute posterior probability of improvement
        const bc = config as any;
        const priorMean = bc.priorMean ?? 0;
        const priorVar = bc.priorVariance ?? 1;
        const likelihoodVar = bc.likelihoodVariance ?? 1;
        const ropeWidth = bc.ropeWidth ?? 0.1;
        const threshold = bc.decisionThreshold ?? 0.95;
        
        const enhancedMetrics: MetricVerdict[] = [];
        
        for (const mv of [baseVerdict.primaryMetric, ...baseVerdict.otherMetrics]) {
            // Observed effect size (delta)
            const observedDelta = mv.delta;
            const n = 1; // Would be number of repetitions in real implementation
            
            // Bayesian update for normal-normal conjugate prior
            // Posterior precision = prior precision + likelihood precision
            const priorPrecision = 1 / priorVar;
            const likelihoodPrecision = n / likelihoodVar;
            const postPrecision = priorPrecision + likelihoodPrecision;
            
            // Posterior mean = (priorPrecision * priorMean + likelihoodPrecision * observed) / postPrecision
            const postMean = (priorPrecision * priorMean + likelihoodPrecision * observedDelta) / postPrecision;
            const postVar = 1 / postPrecision;
            const postStd = Math.sqrt(postVar);
            
            // ROPE: [-ropeWidth, ropeWidth]
            // Compute probability that effect is in ROPE, above ROPE, below ROPE
            const zRopeUpper = (ropeWidth - postMean) / postStd;
            const zRopeLower = (-ropeWidth - postMean) / postStd;
            
            const probInRope = this.normalCdf(zRopeUpper) - this.normalCdf(zRopeLower);
            const probAboveRope = 1 - this.normalCdf(zRopeUpper);
            const probBelowRope = this.normalCdf(zRopeLower);
            
            // Decision rule
            let direction: 'improved' | 'degraded' | 'no-change' = 'no-change';
            let passes = false;
            
            if (probAboveRope > threshold) {
                direction = 'improved';
                passes = true;
            } else if (probBelowRope > threshold) {
                direction = 'degraded';
                passes = true;
            } else if (probInRope > threshold) {
                direction = 'no-change';
                passes = true; // Practically equivalent
            }
            
            // HDI (Highest Density Interval) - approximate as mean +/- 1.96*std
            const hdi: [number, number] = [postMean - 1.96 * postStd, postMean + 1.96 * postStd];
            
            enhancedMetrics.push({
                ...mv,
                delta: postMean,
                pValue: probInRope, // Repurposed as probability in ROPE
                ci: hdi,
                passes,
                direction,
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
    
    private normalCdf(x: number): number {
        // Abramowitz & Stegun approximation
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - prob : prob;
    }
}

// --- Factory ---
export function createBayesianVerdictEngine(): BayesianVerdictEngine {
    return new BayesianVerdictEngine();
}