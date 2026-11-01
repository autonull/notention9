import type { ResourceMetrics } from './types.js';

/**
 * Resource Monitor - tracks inference latency, memory, and token usage
 */
export class ResourceMonitor {
    private inferenceLatencies: number[] = [];
    private inferenceCount = 0;
    private tokensUsed = 0;
    private startMemory = 0;
    private peakMemory = 0;

    start(): void {
        const memoryUsage = process?.memoryUsage?.();
        if (memoryUsage) {
            this.startMemory = memoryUsage.heapUsed;
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
        const memoryUsage = process?.memoryUsage?.();
        if (memoryUsage) {
            const current = memoryUsage.heapUsed;
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