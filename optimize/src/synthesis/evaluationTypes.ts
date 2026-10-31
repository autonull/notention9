/**
 * Shared evaluation types - used by both fast evaluator and adoption system
 * Extracted from evaluator.ts to avoid dependency on Playwright
 */

export interface BaselineResult {
    taskId: string;
    successRate: number;
    medianDuration: number;
    p90Duration: number;
    medianSteps: number;
    p90Steps: number;
    errors: string[];
    isCorpusTest?: boolean;  // Flag for corpus-generated gap detection tests
}

export interface ResourceMetrics {
    totalLatencyMs: number;
    avgInferenceLatencyMs: number;
    peakMemoryMB: number;
    modelSizeMB: number;
    inferenceCount: number;
    tokensUsed: number;
}

export interface CandidateEvaluation {
    candidateId: string;
    taskResults: Map<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface SerializableCandidateEvaluation {
    candidateId: string;
    taskResults: Record<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface EvaluationReport {
    baseline: BaselineResult[];
    candidates: CandidateEvaluation[];
    timestamp: string;
}

export interface SerializableEvaluationReport {
    baseline: BaselineResult[];
    candidates: SerializableCandidateEvaluation[];
    timestamp: string;
}

/**
 * Resource monitor for collecting performance metrics during evaluation
 */
export class ResourceMonitor {
    private inferenceLatencies: number[] = [];
    private inferenceCount = 0;
    private tokensUsed = 0;
    private startMemory = 0;
    private peakMemory = 0;

    start(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            this.startMemory = process.memoryUsage().heapUsed;
            this.peakMemory = this.startMemory;
        }
    }

    recordInference(latencyMs: number, tokens: number = 0): void {
        this.inferenceLatencies.push(latencyMs);
        this.inferenceCount++;
        this.tokensUsed += tokens;
        this.updatePeakMemory();
    }

    private updatePeakMemory(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const current = process.memoryUsage().heapUsed;
            if (current > this.peakMemory) {
                this.peakMemory = current;
            }
        }
    }

    getMetrics(modelSizeMB: number = 0): ResourceMetrics {
        const totalLatency = this.inferenceLatencies.reduce((a, b) => a + b, 0);
        const avgLatency = this.inferenceCount > 0 ? totalLatency / this.inferenceCount : 0;
        const peakMemoryMB = (this.peakMemory - this.startMemory) / (1024 * 1024);

        return {
            totalLatencyMs: totalLatency,
            avgInferenceLatencyMs: avgLatency,
            peakMemoryMB: Math.max(0, peakMemoryMB),
            modelSizeMB,
            inferenceCount: this.inferenceCount,
            tokensUsed: this.tokensUsed,
        };
    }

    reset(): void {
        this.inferenceLatencies = [];
        this.inferenceCount = 0;
        this.tokensUsed = 0;
        this.startMemory = 0;
        this.peakMemory = 0;
    }
}