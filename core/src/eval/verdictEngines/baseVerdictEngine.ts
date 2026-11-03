/**
 * Base Verdict Engine Class
 * Shared logic for converting between base and extended verdicts with evidence tracking
 */

import { z } from 'zod';
import type { 
    CaseVerdict, 
    RunVerdict, 
    MetricVerdict, 
    PairedRunResult, 
    VerdictConfig,
    VerdictEngineConfig 
} from '../verdict.js';
import type { ExtendedCaseVerdict, ExtendedRunVerdict, ExtendedMetricVerdict } from '../../schemas/verdictResult.js';
import type { EvidenceClass, JudgeProvenance } from '../../schemas/evidence.js';
import { 
    extendCaseVerdict, 
    extendRunVerdict, 
    extendMetricVerdict 
} from '../../schemas/verdictResult.js';
import { 
    createStatisticalProvenance,
    createHumanProvenance,
    createModelProvenance,
    createAssertedProvenance,
    passesGovernanceGate,
    highestEvidenceClass 
} from '../../schemas/evidence.js';
import { computeCaseVerdict as baseComputeCaseVerdict, computeRunVerdict as baseComputeRunVerdict } from '../verdict.js';
import type { VerdictEngine } from './index.js';

// --- Base VerdictEngine abstract class ---

export abstract class BaseVerdictEngine implements VerdictEngine {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly evidenceClass: EvidenceClass;
    abstract readonly configSchema?: z.ZodSchema;

    /**
     * Compute case verdict - to be implemented by subclasses
     */
    abstract computeCaseVerdict(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): ExtendedCaseVerdict | Promise<ExtendedCaseVerdict>;

    /**
     * Compute run verdict - to be implemented by subclasses
     */
    abstract computeRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: ExtendedCaseVerdict[],
        primaryMetric: string
    ): ExtendedRunVerdict | Promise<ExtendedRunVerdict>;

    /**
     * Get default configuration
     */
    abstract getDefaultConfig(): VerdictEngineConfig;

    /**
     * Validate engine-specific configuration
     */
    abstract validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] };

    /**
     * Compute base case verdict using shared logic
     * Subclasses can override this or call it and enhance the result
     */
    protected computeBaseCaseVerdict(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): CaseVerdict {
        return baseComputeCaseVerdict(caseId, paired, config as VerdictConfig);
    }

    /**
     * Compute base run verdict using shared logic
     */
    protected computeBaseRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: CaseVerdict[],
        primaryMetric: string
    ): RunVerdict {
        return baseComputeRunVerdict(runId, manifestHash, revisionId, baselineRevisionId, caseVerdicts, primaryMetric);
    }

    /**
     * Convert base CaseVerdict to ExtendedCaseVerdict with evidence tracking
     */
    protected extendCaseVerdict(
        baseVerdict: CaseVerdict,
        provenance: JudgeProvenance
    ): ExtendedCaseVerdict {
        return extendCaseVerdict(baseVerdict, this.evidenceClass, provenance);
    }

    /**
     * Convert base RunVerdict to ExtendedRunVerdict with evidence tracking
     */
    protected extendRunVerdict(
        baseVerdict: RunVerdict,
        provenance: JudgeProvenance,
        explicitConsent = false
    ): ExtendedRunVerdict {
        return extendRunVerdict(baseVerdict, this.evidenceClass, provenance, explicitConsent);
    }

    /**
     * Convert ExtendedCaseVerdict array back to base CaseVerdict array for aggregation
     */
    protected toBaseCaseVerdicts(caseVerdicts: ExtendedCaseVerdict[]): CaseVerdict[] {
        return caseVerdicts.map(cv => ({
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
    }

    /**
     * Create statistical provenance with engine-specific metadata
     */
    protected createStatisticalProvenance(
        testName: string,
        version: string,
        confidence?: number,
        metadata?: Record<string, unknown>
    ): JudgeProvenance {
        return createStatisticalProvenance(testName, version, confidence, metadata);
    }

    /**
     * Create human provenance
     */
    protected createHumanProvenance(
        userId: string,
        confidence?: number,
        metadata?: Record<string, unknown>
    ): JudgeProvenance {
        return createHumanProvenance(userId, confidence, metadata);
    }

    /**
     * Create model (LLM) provenance
     */
    protected createModelProvenance(
        modelId: string,
        confidence?: number,
        metadata?: Record<string, unknown>
    ): JudgeProvenance {
        return createModelProvenance(modelId, confidence, metadata);
    }

    /**
     * Create asserted provenance
     */
    protected createAssertedProvenance(
        source: string,
        metadata?: Record<string, unknown>
    ): JudgeProvenance {
        return createAssertedProvenance(source, metadata);
    }

    /**
     * Check if evidence class passes governance gate
     */
    protected checkGovernanceGate(evidenceClass: EvidenceClass, explicitConsent = false): boolean {
        return passesGovernanceGate(evidenceClass, explicitConsent);
    }

    /**
     * Get highest evidence class from a list
     */
    protected getHighestEvidenceClass(classes: EvidenceClass[]): EvidenceClass {
        return highestEvidenceClass(classes);
    }
}

// --- Type exports for convenience ---

export type { 
    VerdictEngineConfig 
} from '../verdict.js';

export type { 
    ExtendedCaseVerdict, 
    ExtendedRunVerdict, 
    ExtendedMetricVerdict 
} from '../../schemas/verdictResult.js';

export type { 
    EvidenceClass, 
    JudgeProvenance 
} from '../../schemas/evidence.js';