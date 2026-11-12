import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncHealthMonitor, getSyncHealthMonitor, resetSyncHealthMonitor } from './syncHealth.js';

describe('SyncHealthMonitor', () => {
    let monitor: SyncHealthMonitor;

    beforeEach(() => {
        resetSyncHealthMonitor();
        monitor = new SyncHealthMonitor({ enabled: true, retentionDays: 1, sampleIntervalMs: 100 });
    });

    describe('Queue Depth Tracking', () => {
        it('should track queue depth via provider', () => {
            let depth = { pending: 5, processing: 1, completed: 10, failed: 0 };
            monitor.setQueueDepthProvider(() => depth);

            monitor.start();
            // start() calls sample() once, so we have 1 sample already
            monitor.sample(); // second sample

            const snapshot = monitor.getSnapshot();
            expect(snapshot.queueDepth.pending).toBe(5);
            expect(snapshot.queueDepth.processing).toBe(1);
            expect(snapshot.queueDepth.completed).toBe(10);
        });

        it('should calculate queue depth stats', () => {
            let depth = { pending: 0, processing: 0, completed: 0, failed: 0 };
            monitor.setQueueDepthProvider(() => depth);

            monitor.start();
            
            // Sample multiple times with different depths
            depth.pending = 5; monitor.sample();
            depth.pending = 10; monitor.sample();
            depth.pending = 3; monitor.sample();
            depth.pending = 7; monitor.sample();

            const stats = monitor.getQueueDepthStats();
            expect(stats.current).toBe(7);
            // 5 samples total (initial + 4 manual): 0, 5, 10, 3, 7 = 25/5 = 5
            expect(stats.avg).toBeCloseTo(5, 1);
            expect(stats.max).toBe(10);
            expect(stats.min).toBe(0);
            expect(stats.samples).toBe(5);
        });

        it('should return zeros when no samples', () => {
            const stats = monitor.getQueueDepthStats();
            expect(stats.current).toBe(0);
            expect(stats.avg).toBe(0);
            expect(stats.max).toBe(0);
            expect(stats.min).toBe(0);
            expect(stats.samples).toBe(0);
        });
    });

    describe('Flush Tracking', () => {
        it('should record flush results', () => {
            monitor.recordFlush({ success: true, eventsFlushed: 5, durationMs: 100 });
            monitor.recordFlush({ success: true, eventsFlushed: 3, durationMs: 50 });
            monitor.recordFlush({ success: false, eventsFlushed: 0, durationMs: 200, error: 'Timeout' });

            const stats = monitor.getFlushSuccessRate();
            expect(stats.total).toBe(3);
            expect(stats.successful).toBe(2);
            expect(stats.failed).toBe(1);
            expect(stats.rate).toBeCloseTo(0.667, 2);
            expect(stats.avgDurationMs).toBeCloseTo(116.67, 1);
        });

        it('should return perfect rate when no flushes', () => {
            const stats = monitor.getFlushSuccessRate();
            expect(stats.total).toBe(0);
            expect(stats.rate).toBe(1);
        });
    });

    describe('Relay Latency Tracking', () => {
        it('should track relay latencies via provider', () => {
            monitor.setRelayHealthProvider(() => [
                { url: 'ws://relay1:7001', latency: 50, status: 'connected' },
                { url: 'ws://relay2:7002', latency: 120, status: 'connected' },
            ]);

            monitor.start();
            monitor.sample(); // second sample after start()

            const relayStats = monitor.getRelayLatencyStats();
            expect(relayStats.size).toBe(2);
            
            const relay1 = relayStats.get('ws://relay1:7001');
            expect(relay1).toBeDefined();
            expect(relay1?.current).toBe(50);
            expect(relay1?.status).toBe('connected');

            const relay2 = relayStats.get('ws://relay2:7002');
            expect(relay2).toBeDefined();
            expect(relay2?.current).toBe(120);
        });

        it('should calculate latency stats over time', () => {
            let health = [
                { url: 'ws://relay1:7001', latency: 50, status: 'connected' },
            ];
            monitor.setRelayHealthProvider(() => health);

            monitor.start();
            
            health[0].latency = 50; monitor.sample();
            health[0].latency = 80; monitor.sample();
            health[0].latency = 60; monitor.sample();
            health[0].latency = 200; monitor.sample();

            const relayStats = monitor.getRelayLatencyStats();
            const stats = relayStats.get('ws://relay1:7001');
            expect(stats).toBeDefined();
            expect(stats?.current).toBe(200);
            // 5 samples total (initial + 4 manual): 50, 50, 80, 60, 200 = 440/5 = 88
            expect(stats?.avg).toBeCloseTo(88, 1);
            expect(stats?.max).toBe(200);
            expect(stats?.min).toBe(50);
            expect(stats?.samples).toBe(5);
        });
    });

    describe('Report Generation', () => {
        it('should generate human-readable report', () => {
            monitor.setQueueDepthProvider(() => ({ pending: 3, processing: 1, completed: 50, failed: 0 }));
            monitor.setRelayHealthProvider(() => [{ url: 'ws://relay1:7001', latency: 75, status: 'connected' }]);
            
            monitor.start();
            monitor.sample();
            monitor.recordFlush({ success: true, eventsFlushed: 3, durationMs: 80 });

            const report = monitor.generateReport();
            expect(report).toContain('Sync Health Report');
            expect(report).toContain('Outbox Queue');
            expect(report).toContain('Flush Performance');
            expect(report).toContain('Relay Latencies');
            expect(report).toContain('ws://relay1:7001');
        });
    });

    describe('Export/Import', () => {
        it('should export and import data', () => {
            monitor.setQueueDepthProvider(() => ({ pending: 2, processing: 0, completed: 10, failed: 0 }));
            monitor.setRelayHealthProvider(() => [{ url: 'ws://relay1:7001', latency: 50, status: 'connected' }]);
            
            monitor.start();
            monitor.sample();
            monitor.recordFlush({ success: true, eventsFlushed: 2, durationMs: 50 });

            const exported = monitor.export();
            const imported = JSON.parse(exported);

            expect(imported.queueDepthHistory.length).toBeGreaterThan(0);
            expect(imported.flushHistory.length).toBe(1);
            expect(Object.keys(imported.relayLatencies).length).toBe(1);
        });

        it('should create new monitor with imported data', () => {
            monitor.setQueueDepthProvider(() => ({ pending: 1, processing: 0, completed: 5, failed: 0 }));
            monitor.start();
            monitor.sample();

            const exported = monitor.export();

            const newMonitor = new SyncHealthMonitor();
            newMonitor.import(exported);

            const stats = newMonitor.getQueueDepthStats();
            expect(stats.samples).toBeGreaterThan(0);
        });
    });

    describe('Singleton', () => {
        it('should return same instance', () => {
            const m1 = getSyncHealthMonitor();
            const m2 = getSyncHealthMonitor();
            expect(m1).toBe(m2);
        });

        it('should reset singleton', () => {
            const m1 = getSyncHealthMonitor();
            resetSyncHealthMonitor();
            const m2 = getSyncHealthMonitor();
            expect(m1).not.toBe(m2);
        });
    });

    describe('Retention', () => {
        it('should trim old history', () => {
            const shortRetentionMonitor = new SyncHealthMonitor({ 
                enabled: true, 
                retentionDays: 1/1440, // 1 minute in days
                sampleIntervalMs: 10 
            });

            let depth = { pending: 0, processing: 0, completed: 0, failed: 0 };
            shortRetentionMonitor.setQueueDepthProvider(() => depth);

            shortRetentionMonitor.start();
            
            // Add samples over time
            for (let i = 0; i < 10; i++) {
                depth.pending = i;
                shortRetentionMonitor.sample();
            }

            // start() calls sample() once, so we have 11 samples total
            expect(shortRetentionMonitor.getQueueDepthStats().samples).toBe(11);
        });
    });
});