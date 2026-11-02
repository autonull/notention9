/**
 * Calibration Tracker (E7)
 * Tracks LLM vs measured agreement rate in ledger
 * Enables calibration of LLM judge against ground truth
 */

import { z } from 'zod';
import type { LedgerEvent, LedgerPayload } from '../telemetry/ledger.js';
import type { EventStore } from '../telemetry/eventStore/index.js';
import type { ExtendedCaseVerdict, EvidenceClass } from '../schemas/verdictResult.js';
import type { JudgeProvenance } from '../schemas/evidence.js';
import { logWarn, logError } from '../utils/logging.js';

// --- Types ---

export interface CalibrationRecord {
    id: string;
    timestamp: string;
    caseId: string;
    revisionId: string;
    runId: string;
    // Measured verdict (ground truth)
    measuredVerdict: {
        verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
        primaryDelta: number;
        pValue: number;
        confidence: number;
    };
    // Hypothesized verdict (LLM prediction)
    hypothesizedVerdict: {
        verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
        confidence: number;
        modelId: string;
        judgeId: string;
    };
    // Agreement
    agrees: boolean;
    agreementType: 'full' | 'partial' | 'none'; // full=same verdict, partial=same direction, none=different
}

export interface CalibrationSummary {
    modelId: string;
    totalComparisons: number;
    fullAgreements: number;
    partialAgreements: number;
    disagreements: number;
    fullAgreementRate: number;
    partialAgreementRate: number;
    // By verdict type
    byVerdict: Record<string, { total: number; agree: number; rate: number }>;
    // Confidence calibration
    confidenceBins: Array<{
        bin: string; // e.g., "0.0-0.2"
        count: number;
        accuracy: number;
        avgConfidence: number;
    }>;
    // ECE (Expected Calibration Error)
    ece: number;
    lastUpdated: string;
}

export interface CalibrationConfig {
    minComparisonsForReport: number;
    confidenceBins: number;
    trackByModel: boolean;
    autoLogToLedger: boolean;
}

// --- Default Config ---

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
    minComparisonsForReport: 10,
    confidenceBins: 10,
    trackByModel: true,
    autoLogToLedger: true,
};

// --- Calibration Tracker Class ---

export class CalibrationTracker {
    private config: CalibrationConfig;
    private eventStore?: EventStore;
    private records: CalibrationRecord[] = [];
    private initialized = false;
    
    constructor(config: Partial<CalibrationConfig> = {}, eventStore?: EventStore) {
        this.config = { ...DEFAULT_CALIBRATION_CONFIG, ...config };
        this.eventStore = eventStore;
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        
        // Load existing records from event store if available
        if (this.eventStore) {
            await this.loadFromEventStore();
        }
        
        this.initialized = true;
    }
    
    /**
     * Record a calibration comparison
     * Called when both measured and hypothesized verdicts exist for same case
     */
    async recordComparison(
        caseId: string,
        revisionId: string,
        runId: string,
        measured: ExtendedCaseVerdict,
        hypothesized: ExtendedCaseVerdict
    ): Promise<CalibrationRecord> {
        await this.init();
        
        // Extract measured verdict data
        const measuredVerdict = {
            verdict: measured.verdict,
            primaryDelta: measured.primaryMetric.delta,
            pValue: measured.primaryMetric.pValue,
            confidence: 1 - measured.primaryMetric.pValue, // Convert p-value to confidence
        };
        
        // Extract hypothesized verdict data
        const hypProv = hypothesized.primaryMetric.judgeProvenance as JudgeProvenance & { model?: string };
        const hypothesizedVerdict = {
            verdict: hypothesized.verdict,
            confidence: hypothesized.primaryMetric.judgeProvenance.confidence ?? 0.5,
            modelId: hypProv.model ?? hypProv.judgeId.replace('model:', ''),
            judgeId: hypProv.judgeId,
        };
        
        // Determine agreement
        const agrees = measuredVerdict.verdict === hypothesizedVerdict.verdict;
        let agreementType: 'full' | 'partial' | 'none' = 'none';
        
        if (agrees) {
            agreementType = 'full';
        } else {
            // Check for partial agreement (same direction)
            const measuredDir = measured.primaryMetric.direction;
            const hypDir = hypothesized.primaryMetric.direction;
            if ((measuredDir === 'improved' && hypDir === 'improved') ||
                (measuredDir === 'degraded' && hypDir === 'degraded') ||
                (measuredDir === 'no-change' && hypDir === 'no-change')) {
                agreementType = 'partial';
            }
        }
        
        const record: CalibrationRecord = {
            id: `cal_${caseId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date().toISOString(),
            caseId,
            revisionId,
            runId,
            measuredVerdict,
            hypothesizedVerdict,
            agrees,
            agreementType,
        };
        
        this.records.push(record);
        
        // Log to ledger if configured
        if (this.config.autoLogToLedger && this.eventStore) {
            await this.logToLedger(record);
        }
        
        return record;
    }
    
    /**
     * Get calibration summary for a model (or all)
     */
    getSummary(modelId?: string): CalibrationSummary | Record<string, CalibrationSummary> {
        const relevantRecords = modelId 
            ? this.records.filter(r => r.hypothesizedVerdict.modelId === modelId)
            : this.records;
        
        if (modelId) {
            return this.computeSummary(modelId, relevantRecords);
        }
        
        // Group by model
        const byModel = new Map<string, CalibrationRecord[]>();
        for (const r of relevantRecords) {
            const arr = byModel.get(r.hypothesizedVerdict.modelId) ?? [];
            arr.push(r);
            byModel.set(r.hypothesizedVerdict.modelId, arr);
        }
        
        const summaries: Record<string, CalibrationSummary> = {};
        for (const [model, records] of byModel) {
            summaries[model] = this.computeSummary(model, records);
        }
        
        return summaries;
    }
    
    /**
     * Get calibration records for a specific case
     */
    getRecordsForCase(caseId: string): CalibrationRecord[] {
        return this.records.filter(r => r.caseId === caseId);
    }
    
    /**
     * Get all records
     */
    getAllRecords(): CalibrationRecord[] {
        return [...this.records];
    }
    
    /**
     * Check if model is well-calibrated
     */
    isWellCalibrated(modelId: string, eceThreshold = 0.1): boolean {
        const summary = this.getSummary(modelId) as CalibrationSummary;
        return summary.ece <= eceThreshold && summary.totalComparisons >= this.config.minComparisonsForReport;
    }
    
    /**
     * Get agreement rate for a model
     */
    getAgreementRate(modelId: string): { full: number; partial: number; total: number } {
        const summary = this.getSummary(modelId) as CalibrationSummary;
        return {
            full: summary.fullAgreementRate,
            partial: summary.partialAgreementRate,
            total: summary.totalComparisons,
        };
    }
    
    // --- Private methods ---
    
    private computeSummary(modelId: string, records: CalibrationRecord[]): CalibrationSummary {
        const total = records.length;
        const fullAgreements = records.filter(r => r.agreementType === 'full').length;
        const partialAgreements = records.filter(r => r.agreementType === 'partial').length;
        const disagreements = records.filter(r => r.agreementType === 'none').length;
        
        // By verdict type
        const verdicts = ['improved', 'degraded', 'inconclusive', 'invalid'];
        const byVerdict: Record<string, { total: number; agree: number; rate: number }> = {};
        
        for (const v of verdicts) {
            const vRecords = records.filter(r => r.measuredVerdict.verdict === v);
            const vAgree = vRecords.filter(r => r.agrees).length;
            byVerdict[v] = {
                total: vRecords.length,
                agree: vAgree,
                rate: vRecords.length > 0 ? vAgree / vRecords.length : 0,
            };
        }
        
        // Confidence calibration bins
        const bins = this.config.confidenceBins;
        const confidenceBins: CalibrationSummary['confidenceBins'] = [];
        
        for (let i = 0; i < bins; i++) {
            const binStart = i / bins;
            const binEnd = (i + 1) / bins;
            const binRecords = records.filter(r => 
                r.hypothesizedVerdict.confidence >= binStart && 
                r.hypothesizedVerdict.confidence < (i === bins - 1 ? 1.001 : binEnd)
            );
            
            if (binRecords.length > 0) {
                const accuracy = binRecords.filter(r => r.agrees).length / binRecords.length;
                const avgConfidence = binRecords.reduce((sum, r) => sum + r.hypothesizedVerdict.confidence, 0) / binRecords.length;
                
                confidenceBins.push({
                    bin: `${(binStart * 100).toFixed(0)}-${(binEnd * 100).toFixed(0)}%`,
                    count: binRecords.length,
                    accuracy,
                    avgConfidence,
                });
            }
        }
        
        // ECE (Expected Calibration Error)
        const ece = confidenceBins.reduce((sum, bin) => 
            sum + (bin.count / total) * Math.abs(bin.accuracy - bin.avgConfidence), 0
        );
        
        return {
            modelId,
            totalComparisons: total,
            fullAgreements,
            partialAgreements,
            disagreements,
            fullAgreementRate: total > 0 ? fullAgreements / total : 0,
            partialAgreementRate: total > 0 ? (fullAgreements + partialAgreements) / total : 0,
            byVerdict,
            confidenceBins,
            ece,
            lastUpdated: new Date().toISOString(),
        };
    }
    
    private async loadFromEventStore(): Promise<void> {
        if (!this.eventStore) return;
        
        try {
            // Query for calibration events
            const events = await this.eventStore.query({
                type: 'calibration:recorded',
                limit: 10000,
            });
            
            for (const event of events) {
                const payload = event.payload as any;
                if (payload.record) {
                    this.records.push(payload.record);
                }
            }
        } catch (e) {
            logWarn('Failed to load calibration records from event store', e);
        }
    }
    
    private async logToLedger(record: CalibrationRecord): Promise<void> {
        if (!this.eventStore) return;
        
        try {
            await this.eventStore.append({
                type: 'calibration:recorded',
                runId: record.runId,
                caseId: record.caseId,
                revisionId: record.revisionId,
                actor: 'system',
                payload: { type: 'calibration:recorded' as const, record },
            });
        } catch (e) {
            logWarn('Failed to log calibration record to ledger', e);
        }
    }
    
    /**
     * Clear all records (for testing)
     */
    clear(): void {
        this.records = [];
    }
    
    /**
     * Export records as JSON
     */
    export(): string {
        return JSON.stringify({
            config: this.config,
            records: this.records,
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
    
    /**
     * Import records from JSON
     */
    import(json: string): number {
        try {
            const data = JSON.parse(json);
            if (data.records && Array.isArray(data.records)) {
                this.records = data.records;
                return this.records.length;
            }
        } catch (e) {
            logError('Failed to import calibration records', e instanceof Error ? e : new Error(String(e)));
        }
        return 0;
    }
}

// --- Factory ---

export function createCalibrationTracker(config?: Partial<CalibrationConfig>, eventStore?: EventStore): CalibrationTracker {
    return new CalibrationTracker(config, eventStore);
}

// --- Zod schema for validation ---

export const calibrationRecordSchema = z.object({
    id: z.string(),
    timestamp: z.string().datetime(),
    caseId: z.string(),
    revisionId: z.string(),
    runId: z.string(),
    measuredVerdict: z.object({
        verdict: z.enum(['improved', 'degraded', 'inconclusive', 'invalid']),
        primaryDelta: z.number(),
        pValue: z.number(),
        confidence: z.number().min(0).max(1),
    }),
    hypothesizedVerdict: z.object({
        verdict: z.enum(['improved', 'degraded', 'inconclusive', 'invalid']),
        confidence: z.number().min(0).max(1),
        modelId: z.string(),
        judgeId: z.string(),
    }),
    agrees: z.boolean(),
    agreementType: z.enum(['full', 'partial', 'none']),
});

export const calibrationSummarySchema = z.object({
    modelId: z.string(),
    totalComparisons: z.number().int().nonnegative(),
    fullAgreements: z.number().int().nonnegative(),
    partialAgreements: z.number().int().nonnegative(),
    disagreements: z.number().int().nonnegative(),
    fullAgreementRate: z.number().min(0).max(1),
    partialAgreementRate: z.number().min(0).max(1),
    byVerdict: z.record(z.object({
        total: z.number().int().nonnegative(),
        agree: z.number().int().nonnegative(),
        rate: z.number().min(0).max(1),
    })),
    confidenceBins: z.array(z.object({
        bin: z.string(),
        count: z.number().int().nonnegative(),
        accuracy: z.number().min(0).max(1),
        avgConfidence: z.number().min(0).max(1),
    })),
    ece: z.number().min(0).max(1),
    lastUpdated: z.string().datetime(),
});