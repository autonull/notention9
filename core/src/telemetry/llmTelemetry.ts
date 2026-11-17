/**
 * LLM Call Telemetry — Records model, tokens, latency, mode per call; aggregates p50/p95.
 * Local-only, opt-in by default. No PII.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultAdapter } from '../storage/Storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Find project root by searching for pnpm-workspace.yaml */
function findProjectRoot(startDir: string): string {
    let current = startDir;
    while (current !== '/') {
        if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
            return current;
        }
        const pkgPath = join(current, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (pkg.workspaces || pkg.private === true) {
                    return current;
                }
            } catch {
                // Ignore parse errors
            }
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return join(__dirname, '..', '..');
}

let _dataDirOverride: string | null = null;

function getDataDir(): string {
    if (_dataDirOverride) return _dataDirOverride;
    const projectRoot = findProjectRoot(__dirname);
    return join(projectRoot, '.notention', 'llm-telemetry');
}

function getTelemetryFile(): string {
    const dir = getDataDir();
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return join(dir, 'calls.jsonl');
}

function getConfigFile(): string {
    const dir = getDataDir();
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return join(dir, 'config.json');
}

/** Override data directory for testing. Call before any telemetry operations. */
export function setTelemetryDataDirForTesting(dir: string): void {
    _dataDirOverride = dir;
}

/** Reset data directory override. */
export function resetTelemetryDataDirForTesting(): void {
    _dataDirOverride = null;
}

/** Get the telemetry file path (for testing). */
export function getTelemetryFilePath(): string {
    return getTelemetryFile();
}

/** Get the data directory path (for testing). */
export function getTelemetryDataDir(): string {
    return getDataDir();
}

// --- Types ---

export type LLMMode = 'grammar' | 'unconstrained' | 'fallback';

export interface LLMCallEvent {
    /** ISO timestamp */
    timestamp: string;
    /** Model identifier (e.g., "Qwen2.5-7B-Instruct", "gemma-4-4b") */
    model: string;
    /** Inference mode */
    mode: LLMMode;
    /** Latency in milliseconds */
    latencyMs: number;
    /** Token usage (if available) */
    tokens?: {
        prompt: number;
        completion: number;
        total: number;
    };
    /** Session identifier */
    sessionId: string;
    /** Bucket for daily aggregation (YYYY-MM-DD) */
    bucket: string;
    /** Optional: prompt hash for deduplication */
    promptHash?: string;
    /** Optional: success/failure */
    success: boolean;
    /** Optional: error message if failed */
    error?: string;
}

export interface LLMTelemetryConfig {
    enabled: boolean;
    retentionDays: number;
    sampleRate: number; // 0-1, fraction of calls to record
}

export interface LLMAggregatedStats {
    model: string;
    mode: LLMMode;
    callCount: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    avgLatencyMs: number;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    avgTotalTokens: number;
    successRate: number;
    periodStart: string;
    periodEnd: string;
}

export interface LLMTelemetryReport {
    generatedAt: string;
    periodDays: number;
    models: LLMAggregatedStats[];
    overall: {
        totalCalls: number;
        overallP50LatencyMs: number;
        overallP95LatencyMs: number;
        overallSuccessRate: number;
    };
}

const DEFAULT_TELEMETRY_CONFIG: LLMTelemetryConfig = {
    enabled: true,
    retentionDays: 90,
    sampleRate: 1.0,
};

const SESSION_ID = createHash('sha256').update(`${process.pid}-${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16);

// --- Config management ---

function loadConfig(): LLMTelemetryConfig {
    const configFile = getConfigFile();
    if (!existsSync(configFile)) {
        saveConfig(DEFAULT_TELEMETRY_CONFIG);
        return DEFAULT_TELEMETRY_CONFIG;
    }
    try {
        return JSON.parse(readFileSync(configFile, 'utf-8')) as LLMTelemetryConfig;
    } catch {
        saveConfig(DEFAULT_TELEMETRY_CONFIG);
        return DEFAULT_TELEMETRY_CONFIG;
    }
}

function saveConfig(config: LLMTelemetryConfig): void {
    writeFileSync(getConfigFile(), JSON.stringify(config, null, 2), 'utf-8');
}

// --- Percentile helper ---

function percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(p / 100 * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
}

// --- Telemetry class (Node.js) ---

export class LLMTelemetry {
    private config: LLMTelemetryConfig;
    private buffer: LLMCallEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private readonly FLUSH_INTERVAL_MS = 5000;

    constructor() {
        this.config = loadConfig();
        this.startAutoFlush();
    }

    private startAutoFlush(): void {
        this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
        this.flushInterval.unref?.();
    }

    /**
     * Enable or disable telemetry (opt-in/opt-out)
     * On disable, immediately purges all data.
     */
    async setEnabled(enabled: boolean): Promise<void> {
        this.config.enabled = enabled;
        if (!enabled) {
            await this.purge();
        }
        saveConfig(this.config);
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    getConfig(): LLMTelemetryConfig {
        return { ...this.config };
    }

    /**
     * Record an LLM call event (fire-and-forget, buffered with sampling)
     */
    record(event: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'>): void {
        if (!this.config.enabled) return;

        // Sampling
        if (Math.random() > this.config.sampleRate) return;

        const now = new Date();
        const bucket = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const fullEvent: LLMCallEvent = {
            ...event,
            timestamp: now.toISOString(),
            bucket,
            sessionId: SESSION_ID,
        };

        this.buffer.push(fullEvent);

        // Flush immediately on errors for debugging
        if (!fullEvent.success) {
            this.flush();
        }
    }

    /**
     * Flush buffer to disk
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const lines = this.buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
        appendFileSync(getTelemetryFile(), lines, 'utf-8');
        this.buffer = [];
    }

    /**
     * Load events for a date range
     */
    getEvents(since?: string, until?: string): LLMCallEvent[] {
        const telemetryFile = getTelemetryFile();
        if (!existsSync(telemetryFile)) return [];

        const content = readFileSync(telemetryFile, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);

        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;

        const events: LLMCallEvent[] = [];
        for (const line of lines) {
            try {
                const event = JSON.parse(line) as LLMCallEvent;
                const eventTime = new Date(event.bucket).getTime();

                if (eventTime < sinceTime || eventTime > untilTime) continue;
                events.push(event);
            } catch {
                // Skip malformed lines
            }
        }
        return events;
    }

    /**
     * Aggregate events into per-model, per-mode statistics with p50/p95
     */
    getAggregatedStats(since?: string, until?: string): LLMAggregatedStats[] {
        const events = this.getEvents(since, until);
        if (events.length === 0) return [];

        // Group by model + mode
        const groups = new Map<string, LLMCallEvent[]>();
        for (const event of events) {
            const key = `${event.model}|${event.mode}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(event);
        }

        const stats: LLMAggregatedStats[] = [];
        for (const [key, groupEvents] of groups) {
            const [model, mode] = key.split('|') as [string, LLMMode];

            const successful = groupEvents.filter(e => e.success);
            const latencies = successful.map(e => e.latencyMs).sort((a, b) => a - b);
            const promptTokens = successful.map(e => e.tokens?.prompt ?? 0).filter(t => t > 0);
            const completionTokens = successful.map(e => e.tokens?.completion ?? 0).filter(t => t > 0);
            const totalTokens = successful.map(e => e.tokens?.total ?? 0).filter(t => t > 0);

            const periodStart = groupEvents[0]?.bucket ?? '';
            const periodEnd = groupEvents[groupEvents.length - 1]?.bucket ?? '';

            stats.push({
                model,
                mode,
                callCount: groupEvents.length,
                p50LatencyMs: percentile(latencies, 50),
                p95LatencyMs: percentile(latencies, 95),
                avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
                avgPromptTokens: promptTokens.length > 0 ? promptTokens.reduce((a, b) => a + b, 0) / promptTokens.length : 0,
                avgCompletionTokens: completionTokens.length > 0 ? completionTokens.reduce((a, b) => a + b, 0) / completionTokens.length : 0,
                avgTotalTokens: totalTokens.length > 0 ? totalTokens.reduce((a, b) => a + b, 0) / totalTokens.length : 0,
                successRate: groupEvents.length > 0 ? successful.length / groupEvents.length : 0,
                periodStart,
                periodEnd,
            });
        }

        return stats.sort((a, b) => b.callCount - a.callCount);
    }

    /**
     * Generate a full telemetry report
     */
    generateReport(days: number = 30): LLMTelemetryReport {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const stats = this.getAggregatedStats(since);

        const allEvents = this.getEvents(since);
        const allSuccessful = allEvents.filter(e => e.success);
        const allLatencies = allSuccessful.map(e => e.latencyMs).sort((a, b) => a - b);

        return {
            generatedAt: new Date().toISOString(),
            periodDays: days,
            models: stats,
            overall: {
                totalCalls: allEvents.length,
                overallP50LatencyMs: percentile(allLatencies, 50),
                overallP95LatencyMs: percentile(allLatencies, 95),
                overallSuccessRate: allEvents.length > 0 ? allSuccessful.length / allEvents.length : 0,
            },
        };
    }

    /**
     * Generate human-readable report
     */
    generateTextReport(days: number = 30): string {
        const report = this.generateReport(days);

        let text = `📊 LLM Telemetry Report — ${report.generatedAt.split('T')[0]} (last ${report.periodDays}d)\n\n`;

        text += `Overall: ${report.overall.totalCalls} calls | p50: ${report.overall.overallP50LatencyMs}ms | p95: ${report.overall.overallP95LatencyMs}ms | success: ${(report.overall.overallSuccessRate * 100).toFixed(1)}%\n\n`;

        for (const model of report.models) {
            text += `## ${model.model} (${model.mode})\n`;
            text += `  Calls: ${model.callCount} | Success: ${(model.successRate * 100).toFixed(1)}%\n`;
            text += `  Latency: p50=${model.p50LatencyMs}ms p95=${model.p95LatencyMs}ms avg=${Math.round(model.avgLatencyMs)}ms\n`;
            if (model.avgTotalTokens > 0) {
                text += `  Tokens: prompt≈${Math.round(model.avgPromptTokens)} completion≈${Math.round(model.avgCompletionTokens)} total≈${Math.round(model.avgTotalTokens)}\n`;
            }
            text += `  Period: ${model.periodStart} → ${model.periodEnd}\n\n`;
        }

        text += `---\nRetention: ${this.config.retentionDays}d | Sampling: ${(this.config.sampleRate * 100).toFixed(0)}% | Enabled: ${this.config.enabled ? 'ON' : 'OFF'}\n`;

        return text;
    }

    /**
     * Purge all telemetry data (on opt-out or retention expiry)
     */
    async purge(): Promise<number> {
        await this.flush();

        const telemetryFile = getTelemetryFile();
        if (!existsSync(telemetryFile)) return 0;

        const content = readFileSync(telemetryFile, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        const removed = lines.length;

        writeFileSync(telemetryFile, '', 'utf-8');
        return removed;
    }

    /**
     * Apply retention policy (remove events older than retentionDays)
     */
    async applyRetention(): Promise<number> {
        const telemetryFile = getTelemetryFile();
        if (!existsSync(telemetryFile)) return 0;

        const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const content = readFileSync(telemetryFile, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);

        const kept: string[] = [];
        let removed = 0;

        for (const line of lines) {
            try {
                const event = JSON.parse(line) as LLMCallEvent;
                if (event.bucket >= cutoff) {
                    kept.push(line);
                } else {
                    removed++;
                }
            } catch {
                // Keep malformed lines to avoid data loss
                kept.push(line);
            }
        }

        if (removed > 0) {
            writeFileSync(telemetryFile, kept.join('\n') + (kept.length > 0 ? '\n' : ''), 'utf-8');
        }

        return removed;
    }

    /**
     * Shutdown - flush and clear interval
     */
    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
    }
}

// --- Singleton accessor ---

let telemetryInstance: LLMTelemetry | null = null;

export function getLLMTelemetry(): LLMTelemetry {
    if (!telemetryInstance) {
        telemetryInstance = new LLMTelemetry();
    }
    return telemetryInstance;
}

export function resetLLMTelemetryForTesting(): void {
    if (telemetryInstance) {
        telemetryInstance.shutdown();
        telemetryInstance = null;
    }
}

/**
 * Convenience function to record an LLM call with timing
 */
export async function recordLLMCall<T>(
    model: string,
    mode: LLMMode,
    fn: () => Promise<{ result: T; tokens?: { prompt: number; completion: number; total: number } }>
): Promise<T> {
    const telemetry = getLLMTelemetry();
    const start = performance.now();

    try {
        const { result, tokens } = await fn();
        const latencyMs = Math.round(performance.now() - start);

        telemetry.record({
            model,
            mode,
            latencyMs,
            tokens,
            success: true,
        });

        return result;
    } catch (error) {
        const latencyMs = Math.round(performance.now() - start);
        const message = error instanceof Error ? error.message : 'Unknown error';

        telemetry.record({
            model,
            mode,
            latencyMs,
            success: false,
            error: message,
        });

        throw error;
    }
}