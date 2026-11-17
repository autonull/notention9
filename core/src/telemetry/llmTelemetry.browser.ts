/**
 * Browser-safe LLM Telemetry - stub for compatibility
 * Full implementation is Node-only (uses file system)
 */

import type { LLMTelemetryConfig, LLMAggregatedStats, LLMTelemetryReport, LLMMode } from './llmTelemetry.js';

export function getLLMTelemetry(): {
    record: (event: Omit<{ model: string; mode: LLMMode; latencyMs: number; tokens?: { prompt: number; completion: number; total: number }; success: boolean; error?: string }, 'timestamp' | 'bucket' | 'sessionId'>) => void;
    getStats: (model?: string, mode?: string) => LLMAggregatedStats | null;
    getConfig: () => LLMTelemetryConfig;
    setConfig: (config: Partial<LLMTelemetryConfig>) => void;
    shutdown: () => Promise<void>;
    generateReport: (days?: number) => LLMTelemetryReport;
} {
    return {
        record: () => {},
        getStats: () => null,
        getConfig: () => ({ enabled: false, retentionDays: 30, sampleRate: 1 }),
        setConfig: () => {},
        shutdown: async () => {},
        generateReport: () => ({ generatedAt: '', periodDays: 0, models: [], overall: { totalCalls: 0, overallP50LatencyMs: 0, overallP95LatencyMs: 0, overallSuccessRate: 0 } }),
    };
}