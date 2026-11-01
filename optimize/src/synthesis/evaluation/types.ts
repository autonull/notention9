export interface BaselineResult {
    taskId: string;
    successRate: number;
    medianDuration: number;
    p90Duration: number;
    medianSteps: number;
    p90Steps: number;
    errors: string[];
    isCorpusTest?: boolean;
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