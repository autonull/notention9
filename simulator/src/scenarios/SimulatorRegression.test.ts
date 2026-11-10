import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RegressionScenario } from './regression.js';
import { Scenario } from '../types.js';
import { ScenarioRunner } from '../scenario.js';
import { MetricsCollector, attachMetricsCollector, type RunMetrics } from '../metricsCollector.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { startRelay, stopRelay, withFreshRelay } from '../testRelay.js';

const BASE_PORT = 14445;
const STATISTICAL_REPS = 10;

/**
 * SimulatorRegression - Evolved from structural assert-equality into statistical assertion
 * (B2.5: match counts within CI)
 * 
 * This test now runs the regression scenario multiple times in fast mode
 * and asserts that match counts fall within the expected confidence interval.
 */

describe('SimulatorRegression — Structural Validity', () => {
    it('has valid scenario structure', () => {
        expect(RegressionScenario.name).toBe('Regression');
        expect(RegressionScenario.description).toContain('Regression test');
        expect(RegressionScenario.duration).toBe(8);
    });

    it('has correct agent configurations', () => {
        expect(RegressionScenario.agents).toHaveLength(2);

        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester');
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer');

        expect(requester).toBeDefined();
        expect(offerer).toBeDefined();

        expect(requester!.count).toBe(1);
        expect(offerer!.count).toBe(1);
    });

    it('requester has required properties', () => {
        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester')!;

        const roleProp = requester.properties.find(p => p.key === 'role');
        const skillsProp = requester.properties.find(p => p.key === 'skills');
        const locationProp = requester.properties.find(p => p.key === 'location');

        expect(roleProp).toEqual({ key: 'role', operator: 'is', values: ['developer'] });
        expect(skillsProp).toEqual({ key: 'skills', operator: 'contains', values: ['react', 'typescript'] });
        expect(locationProp).toEqual({ key: 'location', operator: 'is', values: ['Berlin'] });
    });

    it('offerer has required properties', () => {
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer')!;

        const jobProp = offerer.properties.find(p => p.key === 'job');
        const budgetProp = offerer.properties.find(p => p.key === 'budget');
        const remoteProp = offerer.properties.find(p => p.key === 'remote');
        const skillsProp = offerer.properties.find(p => p.key === 'skills');
        const locationProp = offerer.properties.find(p => p.key === 'location');

        expect(jobProp).toEqual({ key: 'job', operator: 'is', values: ['developer'] });
        expect(budgetProp).toEqual({ key: 'budget', operator: 'is', values: ['500'] });
        expect(remoteProp).toEqual({ key: 'remote', operator: 'is', values: ['true'] });
        expect(skillsProp).toEqual({ key: 'skills', operator: 'contains', values: ['react', 'typescript'] });
        expect(locationProp).toEqual({ key: 'location', operator: 'is', values: ['Berlin'] });
    });

    it('has correct interests for matching', () => {
        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester')!;
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer')!;

        const requesterJobInterest = requester.interests.find(p => p.key === 'job');
        const offererRoleInterest = offerer.interests.find(p => p.key === 'role');

        expect(requesterJobInterest).toEqual({ key: 'job', operator: 'is', values: ['developer'] });
        expect(offererRoleInterest).toEqual({ key: 'role', operator: 'is', values: ['developer'] });
    });

    it('has correct events sequence', () => {
        expect(RegressionScenario.events).toHaveLength(2);

        const publishJob = RegressionScenario.events[0];
        const publishOffer = RegressionScenario.events[1];

        expect(publishJob).toEqual({ at: 1, action: 'publish_job', actorRole: 'RegressRequester' });
        expect(publishOffer).toEqual({ at: 3, action: 'publish_offer', actorRole: 'RegressOfferer' });
    });

    it('is a valid Scenario type', () => {
        const scenario: Scenario = RegressionScenario;
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(Array.isArray(scenario.agents)).toBe(true);
        expect(Array.isArray(scenario.events)).toBe(true);
        expect(typeof scenario.duration).toBe('number');
    });
});

describe('SimulatorRegression — Statistical Baselines (B2.5)', () => {
    beforeAll(async () => {
        await startRelay(BASE_PORT);
    }, 30000);

    afterAll(async () => {
        await stopRelay(BASE_PORT);
    }, 10000);

    function computeStats(values: number[]): { mean: number; stdDev: number; ci95: [number, number] } {
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        const margin = 1.96 * stdDev / Math.sqrt(n);
        return { mean, stdDev, ci95: [mean - margin, mean + margin] };
    }

    async function runRegressionOnce(): Promise<RunMetrics> {
        return withFreshRelay(BASE_PORT + 100, async (url) => {
            const runner = new ScenarioRunner(url, DEFAULT_ONTOLOGY);
            runner.setFastMode(true);
            const collector = attachMetricsCollector(runner);

            await runner.prepare(RegressionScenario);
            // Allow time for agent subscriptions to establish on fresh relay
            await new Promise(r => setTimeout(r, 1000));
            await runner.execute(RegressionScenario);
            // Allow event loop to process WebSocket messages (match detection)
            // Relay delivery and agent processing is async; wait longer
            await new Promise(r => setTimeout(r, 1500));

            return collector.getMetrics();
        });
    }

    it('should produce exactly 1 match per run (deterministic)', async () => {
        const matchCounts: number[] = [];
        const timeToFirstMatch: number[] = [];

        for (let i = 0; i < STATISTICAL_REPS; i++) {
            const metrics = await runRegressionOnce();
            matchCounts.push(metrics.totalMatches);
            if (metrics.timeToFirstMatchMs !== null) {
                timeToFirstMatch.push(metrics.timeToFirstMatchMs);
            }
        }

        // All runs should produce exactly 1 match (deterministic scenario)
        const uniqueCounts = [...new Set(matchCounts)];
        expect(uniqueCounts).toEqual([1]);

        // Time to first match in fast mode measures real processing time, not virtual time
        // Just verify it's reasonable (non-negative, not extremely large)
        const stats = computeStats(timeToFirstMatch);
        expect(stats.mean).toBeGreaterThanOrEqual(0);
        expect(stats.mean).toBeLessThan(5000); // Should complete quickly in fast mode

        console.log(`[Regression] matches: ${matchCounts[0]} (all runs), ttfm (real): ${stats.mean.toFixed(0)}±${stats.stdDev.toFixed(0)}ms (CI95: [${stats.ci95[0].toFixed(0)}, ${stats.ci95[1].toFixed(0)}])`);
    }, 120000);

    it('should emit match:found events with correct structure', async () => {
        await withFreshRelay(BASE_PORT + 200, async (url) => {
            const runner = new ScenarioRunner(url, DEFAULT_ONTOLOGY);
            runner.setFastMode(true);
            const events: any[] = [];
            runner.runEventSink = (e) => events.push(e);

            await runner.prepare(RegressionScenario);
            // Allow time for agent subscriptions to establish on fresh relay
            await new Promise(r => setTimeout(r, 1000));
            await runner.execute(RegressionScenario);
            // Allow event loop to process WebSocket messages (match detection)
            // Relay delivery and agent processing is async; wait longer
            await new Promise(r => setTimeout(r, 1500));

            const matchEvents = events.filter(e => e.type === 'match:found');
            expect(matchEvents).toHaveLength(1);

            const match = matchEvents[0];
            expect(match.data.agentId).toBeDefined();
            expect(match.data.agentName).toBeDefined();
            expect(match.data.matchedEventId).toBeDefined();
            expect(match.data.matchedPubkey).toBeDefined();
            expect(match.data.score).toBeGreaterThan(0.5); // Above threshold
            expect(match.data.matches).toBeInstanceOf(Array);
            expect(match.data.matches.length).toBeGreaterThan(0);
        });
    }, 30000);

    it('should have zero errors in clean run', async () => {
        const metrics = await runRegressionOnce();
        expect(metrics.totalErrors).toBe(0);
    }, 30000);

    it('should complete within scenario duration', async () => {
        const metrics = await runRegressionOnce();
        // Scenario duration is 8s, fast mode should complete almost instantly
        // but virtual time advances to 8s
        expect(metrics.scenarioDuration).toBe(8000);
    }, 30000);
});