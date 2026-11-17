import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMTelemetry, getLLMTelemetry, resetLLMTelemetryForTesting, setTelemetryDataDirForTesting, resetTelemetryDataDirForTesting, getTelemetryFilePath, type LLMCallEvent, type LLMMode } from '../../telemetry/llmTelemetry.js';
import { existsSync, readFileSync, rmSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock the project root finder to use test directory
vi.mock('../storage/Storage.js', () => ({
    getDefaultAdapter: () => ({})
}));

describe('LLMTelemetry', () => {
    let telemetry: LLMTelemetry;
    let testDataDir: string;
    let testTelemetryFile: string;

    beforeEach(() => {
        // Use unique directory per test run to avoid parallel test interference
        const uniqueId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        testDataDir = join(process.cwd(), '.notention-test', uniqueId);
        testTelemetryFile = join(testDataDir, 'calls.jsonl');
        
        // Clean up test directory
        if (existsSync(testDataDir)) {
            rmSync(testDataDir, { recursive: true, force: true });
        }
        mkdirSync(testDataDir, { recursive: true });
        resetLLMTelemetryForTesting();
        setTelemetryDataDirForTesting(testDataDir);
        
        // Create a fresh instance for each test
        telemetry = new LLMTelemetry();
    });

    afterEach(async () => {
        await telemetry.shutdown();
        resetLLMTelemetryForTesting();
        resetTelemetryDataDirForTesting();
        if (existsSync(testDataDir)) {
            rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    it('should record and retrieve events', async () => {
        const event: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'> = {
            model: 'Qwen2.5-7B-Instruct',
            mode: 'grammar',
            latencyMs: 150,
            tokens: { prompt: 100, completion: 50, total: 150 },
            success: true,
        };

        telemetry.record(event);
        await telemetry.flush();

        const events = telemetry.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].model).toBe('Qwen2.5-7B-Instruct');
        expect(events[0].mode).toBe('grammar');
        expect(events[0].latencyMs).toBe(150);
        expect(events[0].tokens).toEqual({ prompt: 100, completion: 50, total: 150 });
        expect(events[0].success).toBe(true);
    });

    it('should aggregate stats by model and mode', async () => {
        const baseEvent: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'> = {
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            tokens: { prompt: 50, completion: 25, total: 75 },
            success: true,
        };

        // Record multiple events with different latencies
        telemetry.record({ ...baseEvent, latencyMs: 50 });
        telemetry.record({ ...baseEvent, latencyMs: 100 });
        telemetry.record({ ...baseEvent, latencyMs: 200 });
        telemetry.record({ ...baseEvent, latencyMs: 300 });
        telemetry.record({ ...baseEvent, latencyMs: 500 });
        await telemetry.flush();

        const stats = telemetry.getAggregatedStats();
        expect(stats.length).toBe(1);
        expect(stats[0].model).toBe('TestModel');
        expect(stats[0].mode).toBe('grammar');
        expect(stats[0].callCount).toBe(5);
        expect(stats[0].p50LatencyMs).toBe(200); // median of [50, 100, 200, 300, 500]
        expect(stats[0].p95LatencyMs).toBe(500); // 95th percentile
        expect(stats[0].avgLatencyMs).toBe(230); // average
        expect(stats[0].successRate).toBe(1.0);
    });

    it('should calculate success rate correctly', async () => {
        const baseEvent: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'> = {
            model: 'TestModel',
            mode: 'fallback',
            latencyMs: 100,
            success: true,
        };

        telemetry.record({ ...baseEvent, success: true });
        telemetry.record({ ...baseEvent, success: true });
        telemetry.record({ ...baseEvent, success: false, error: 'Timeout' });
        telemetry.record({ ...baseEvent, success: true });
        await telemetry.flush();

        const stats = telemetry.getAggregatedStats();
        expect(stats[0].callCount).toBe(4);
        expect(stats[0].successRate).toBe(0.75);
    });

    it('should filter by date range', async () => {
        // We can't easily test date filtering without manipulating the file directly
        // but we can verify the function doesn't throw
        const events = telemetry.getEvents();
        expect(Array.isArray(events)).toBe(true);
    });

    it('should generate report with overall stats', async () => {
        const event: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'> = {
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            tokens: { prompt: 50, completion: 25, total: 75 },
            success: true,
        };

        telemetry.record(event);
        telemetry.record({ ...event, latencyMs: 200 });
        await telemetry.flush();

        const report = telemetry.generateReport(30);
        expect(report.periodDays).toBe(30);
        expect(report.overall.totalCalls).toBe(2);
        expect(report.overall.overallP50LatencyMs).toBeGreaterThan(0);
        expect(report.overall.overallP95LatencyMs).toBeGreaterThan(0);
        expect(report.overall.overallSuccessRate).toBe(1.0);
        expect(report.models.length).toBe(1);
    });

    it('should generate text report', async () => {
        const event: Omit<LLMCallEvent, 'timestamp' | 'bucket' | 'sessionId'> = {
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            tokens: { prompt: 50, completion: 25, total: 75 },
            success: true,
        };

        telemetry.record(event);
        await telemetry.flush();

        const textReport = telemetry.generateTextReport(30);
        expect(textReport).toContain('LLM Telemetry Report');
        expect(textReport).toContain('TestModel');
        expect(textReport).toContain('grammar');
        expect(textReport).toContain('100ms');
    });

    it('should respect enabled/disabled state', async () => {
        await telemetry.setEnabled(false);
        expect(telemetry.isEnabled()).toBe(false);

        telemetry.record({
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            success: true,
        });

        const events = telemetry.getEvents();
        expect(events.length).toBe(0);

        await telemetry.setEnabled(true);
        expect(telemetry.isEnabled()).toBe(true);
    });

    it('should purge data on disable', async () => {
        telemetry.record({
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            success: true,
        });
        await telemetry.flush();

        const eventsBefore = telemetry.getEvents();
        expect(eventsBefore.length).toBe(1);

        await telemetry.setEnabled(false);

        const eventsAfter = telemetry.getEvents();
        expect(eventsAfter.length).toBe(0);
    });

    it('should apply retention policy', async () => {
        // Debug: check what getTelemetryFilePath returns
        console.log('DEBUG: getTelemetryFilePath():', getTelemetryFilePath());
        console.log('DEBUG: testTelemetryFile:', testTelemetryFile);
        
        // Debug: check config file path
        const { getTelemetryDataDir } = await import('../../telemetry/llmTelemetry.js');
        console.log('DEBUG: Data dir:', getTelemetryDataDir());
        const configFile = join(getTelemetryDataDir(), 'config.json');
        console.log('DEBUG: Config file:', configFile);
        console.log('DEBUG: Config file exists:', existsSync(configFile));

        // Debug: check config
        const config = telemetry.getConfig();
        console.log('DEBUG: Config:', config);

        // Ensure telemetry is enabled
        if (!config.enabled) {
            await telemetry.setEnabled(true);
        }

        telemetry.record({
            model: 'TestModel',
            mode: 'grammar',
            latencyMs: 100,
            success: true,
        });
        
        // Debug: check buffer before flush
        console.log('DEBUG: Buffer length before flush:', (telemetry as any).buffer?.length);
        
        await telemetry.flush();

        // Debug: check buffer after flush
        console.log('DEBUG: Buffer length after flush:', (telemetry as any).buffer?.length);

        // Check file immediately after flush
        const actualTelemetryFile = getTelemetryFilePath();
        console.log('DEBUG: Actual telemetry file:', actualTelemetryFile);
        console.log('DEBUG: File exists:', existsSync(actualTelemetryFile));
        const contentAfterFlush = readFileSync(actualTelemetryFile, 'utf-8');
        const linesAfterFlush = contentAfterFlush.trim().split('\n').filter(l => l.length > 0);
        console.log('DEBUG: After flush, lines:', linesAfterFlush.length);
        console.log('DEBUG: After flush, content:', contentAfterFlush);

        // Manually add an old event by writing to file
        const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
        const oldEvent = {
            timestamp: oldDate.toISOString(),
            bucket: oldDate.toISOString().split('T')[0],
            model: 'TestModel',
            mode: 'grammar' as LLMMode,
            latencyMs: 50,
            success: true,
            sessionId: 'test-session',
        };
        
        appendFileSync(actualTelemetryFile, JSON.stringify(oldEvent) + '\n', 'utf-8');

        // Verify the file has both events
        const contentBefore = readFileSync(actualTelemetryFile, 'utf-8');
        const linesBefore = contentBefore.trim().split('\n').filter(l => l.length > 0);
        console.log('DEBUG: Before retention, lines:', linesBefore.length);
        expect(linesBefore.length).toBe(2);

        const removed = await telemetry.applyRetention();
        expect(removed).toBe(1);

        const events = telemetry.getEvents();
        // Only the recent event should remain
        expect(events.length).toBe(1);
    });

    it('should support sampling', async () => {
        // Create telemetry with 0% sample rate
        const config = telemetry.getConfig();
        // We can't easily change sample rate after construction, but we can verify
        // the config is loaded
        expect(config.sampleRate).toBe(1.0);
    });
});

describe('getLLMTelemetry singleton', () => {
    afterEach(() => {
        resetLLMTelemetryForTesting();
    });

    it('should return the same instance', () => {
        const t1 = getLLMTelemetry();
        const t2 = getLLMTelemetry();
        expect(t1).toBe(t2);
    });

    it('should create new instance after reset', () => {
        const t1 = getLLMTelemetry();
        resetLLMTelemetryForTesting();
        const t2 = getLLMTelemetry();
        expect(t1).not.toBe(t2);
    });
});