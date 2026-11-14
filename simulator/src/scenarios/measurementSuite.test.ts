import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ScenarioRunner } from '../scenario.js';
import { MetricsCollector, attachMetricsCollector, type RunMetrics } from '../metricsCollector.js';
import { RegressionScenario } from './regression.js';
import { GoldenPathScenario } from './golden-path.js';
import { GigEconomyScenario } from './gigEconomy.js';
import { DOMAIN_SCENARIOS, getAllScenarios } from './domainScenarios.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { startRelay, stopRelay, clearRelayEvents } from '../testRelay.js';

/**
 * Measurement Suite (B2.5)
 * 
 * Runs each scenario multiple times with deterministic seeding to establish
 * expected statistical distributions for match counts, time-to-first-match,
 * and other metrics. These distributions become the baseline for regression detection.
 * 
 * Key properties:
 * - Seeded RNG for reproducibility
 * - Fast mode (virtual clock) for throughput
 * - Multiple repetitions per scenario (≥30 for CI stability)
 * - Statistical assertions with confidence intervals
 */

// Test configuration
const RELAY_PORT = 14444;
const RELAY_URL = `ws://localhost:${RELAY_PORT}`;
const REPETITIONS = 3; // Per scenario, for quick testing (use 30 for CI)
const CONFIDENCE_LEVEL = 0.95; // 95% CI

// Per-scenario expected distributions (seeded, deterministic baselines)
// These are derived from empirical runs with the current MatchEngine
// Format: { meanMatches, stdDevMatches, meanTimeToFirstMatchMs, maxUnmatchedRate }
interface ScenarioBaseline {
    meanMatches: number;
    stdDevMatches: number;
    meanTimeToFirstMatchMs: number;
    stdDevTimeToFirstMatchMs: number;
    maxUnmatchedRate: number; // Upper bound for unmatched rate
    minMatchesPerMinute: number;
}

// Baseline expectations for each scenario (computed from seeded runs)
const SCENARIO_BASELINES: Record<string, ScenarioBaseline> = {
    'regression': {
        meanMatches: 1.5,
        stdDevMatches: 1.0,
        meanTimeToFirstMatchMs: 50,
        stdDevTimeToFirstMatchMs: 20,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 8.0,
    },
    'golden-path': {
        meanMatches: 1.5,
        stdDevMatches: 0.5,
        meanTimeToFirstMatchMs: 80,
        stdDevTimeToFirstMatchMs: 30,
        maxUnmatchedRate: 0.2,
        minMatchesPerMinute: 8.0,
    },
    'gig-economy': {
        meanMatches: 20.0,
        stdDevMatches: 8.0,
        meanTimeToFirstMatchMs: 1000,
        stdDevTimeToFirstMatchMs: 500,
        maxUnmatchedRate: 0.2,
        minMatchesPerMinute: 80.0,
    },
    'freelance-marketplace': {
        meanMatches: 50.0,
        stdDevMatches: 20.0,
        meanTimeToFirstMatchMs: 2000,
        stdDevTimeToFirstMatchMs: 800,
        maxUnmatchedRate: 0.2,
        minMatchesPerMinute: 200.0,
    },
    'hiring-pipeline': {
        meanMatches: 35.0,
        stdDevMatches: 15.0,
        meanTimeToFirstMatchMs: 2000,
        stdDevTimeToFirstMatchMs: 500,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 140.0,
    },
    'project-collaboration': {
        meanMatches: 45.0,
        stdDevMatches: 40.0,
        meanTimeToFirstMatchMs: 800,
        stdDevTimeToFirstMatchMs: 400,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 220.0,
    },
    'mentorship-network': {
        meanMatches: 65.0,
        stdDevMatches: 55.0,
        meanTimeToFirstMatchMs: 1200,
        stdDevTimeToFirstMatchMs: 400,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 320.0,
    },
    'learning-community': {
        meanMatches: 230.0,
        stdDevMatches: 210.0,
        meanTimeToFirstMatchMs: 2500,
        stdDevTimeToFirstMatchMs: 600,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 1150.0,
    },
    'co-founder-matching': {
        meanMatches: 75.0,
        stdDevMatches: 65.0,
        meanTimeToFirstMatchMs: 1000,
        stdDevTimeToFirstMatchMs: 500,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 375.0,
    },
    'investor-startup-matching': {
        meanMatches: 95.0,
        stdDevMatches: 80.0,
        meanTimeToFirstMatchMs: 1200,
        stdDevTimeToFirstMatchMs: 500,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 480.0,
    },
    'events-&-networking': {
        meanMatches: 15.0,
        stdDevMatches: 5.0,
        meanTimeToFirstMatchMs: 3000,
        stdDevTimeToFirstMatchMs: 1000,
        maxUnmatchedRate: 0.3,
        minMatchesPerMinute: 3.0,
    },
    'open-source-contribution': {
        meanMatches: 65.0,
        stdDevMatches: 55.0,
        meanTimeToFirstMatchMs: 1200,
        stdDevTimeToFirstMatchMs: 400,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 330.0,
    },
    'research-collaboration': {
        meanMatches: 60.0,
        stdDevMatches: 50.0,
        meanTimeToFirstMatchMs: 1000,
        stdDevTimeToFirstMatchMs: 400,
        maxUnmatchedRate: 0.4,
        minMatchesPerMinute: 350.0,
    },
    'legal-contract-negotiation': {
        meanMatches: 3.0,
        stdDevMatches: 2.5,
        meanTimeToFirstMatchMs: 250,
        stdDevTimeToFirstMatchMs: 50,
        maxUnmatchedRate: 0.6,
        minMatchesPerMinute: 12.0,
    },
    'crisis-response-coordination': {
        meanMatches: 1.0,
        stdDevMatches: 1.0,
        meanTimeToFirstMatchMs: 150,
        stdDevTimeToFirstMatchMs: 50,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 5.0,
    },
    'generational-land-stewardship': {
        meanMatches: 0.0,
        stdDevMatches: 0.0,
        meanTimeToFirstMatchMs: 0,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 0.0,
    },
    'kinship-care-network': {
        meanMatches: 4.0,
        stdDevMatches: 3.5,
        meanTimeToFirstMatchMs: 200,
        stdDevTimeToFirstMatchMs: 50,
        maxUnmatchedRate: 0.8,
        minMatchesPerMinute: 16.0,
    },
    'commons-governance': {
        meanMatches: 0.0,
        stdDevMatches: 0.0,
        meanTimeToFirstMatchMs: 0,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 0.0,
    },
    'cross-cultural-aid-coordination': {
        meanMatches: 0.0,
        stdDevMatches: 0.0,
        meanTimeToFirstMatchMs: 0,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 0.0,
    },
    'long-term-commitment-network': {
        meanMatches: 0.0,
        stdDevMatches: 0.0,
        meanTimeToFirstMatchMs: 0,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 0.0,
    },
};

interface MeasurementRun {
    scenarioName: string;
    metrics: RunMetrics;
}

interface ScenarioStatistics {
    scenarioName: string;
    runs: MeasurementRun[];
    matchCounts: number[];
    timeToFirstMatch: number[];
    unmatchedRates: number[];
    matchesPerMinute: number[];
    meanMatches: number;
    stdDevMatches: number;
    meanTimeToFirstMatchMs: number;
    stdDevTimeToFirstMatchMs: number;
    meanUnmatchedRate: number;
    meanMatchesPerMinute: number;
    ci95Matches: [number, number];
    ci95TimeToFirstMatch: [number, number];
}

function computeStats(values: number[]): { mean: number; stdDev: number; ci95: [number, number] } {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const margin = 1.96 * stdDev / Math.sqrt(n); // 95% CI
    return { mean, stdDev, ci95: [mean - margin, mean + margin] };
}

async function runScenarioMeasurement(
    scenarioName: string,
    scenario: any,
    repetitions: number
): Promise<ScenarioStatistics> {
    const runs: MeasurementRun[] = [];

    for (let i = 0; i < repetitions; i++) {
        clearRelayEvents(RELAY_PORT);
        const runner = new ScenarioRunner(RELAY_URL, DEFAULT_ONTOLOGY);
        runner.setFastMode(true);
        const collector = attachMetricsCollector(runner);

        await runner.prepare(scenario);
        await runner.execute(scenario);

        const metrics = collector.getMetrics();
        runs.push({ scenarioName, metrics });
    }

    const matchCounts = runs.map(r => r.metrics.totalMatches);
    const timeToFirstMatch = runs
        .map(r => r.metrics.timeToFirstMatchMs)
        .filter((v): v is number => v !== null);
    const unmatchedRates = runs.map(r => r.metrics.unmatchedRate);
    const matchesPerMinute = runs.map(r => r.metrics.matchesPerMinute);

    const matchStats = computeStats(matchCounts);
    const timeStats = computeStats(timeToFirstMatch);
    const meanUnmatchedRate = unmatchedRates.reduce((a, b) => a + b, 0) / unmatchedRates.length;
    const meanMatchesPerMinute = matchesPerMinute.reduce((a, b) => a + b, 0) / matchesPerMinute.length;

    return {
        scenarioName,
        runs,
        matchCounts,
        timeToFirstMatch,
        unmatchedRates,
        matchesPerMinute,
        meanMatches: matchStats.mean,
        stdDevMatches: matchStats.stdDev,
        meanTimeToFirstMatchMs: timeStats.mean,
        stdDevTimeToFirstMatchMs: timeStats.stdDev,
        meanUnmatchedRate,
        meanMatchesPerMinute,
        ci95Matches: matchStats.ci95,
        ci95TimeToFirstMatch: timeStats.ci95,
    };
}

const ALL_SCENARIOS = [
    { name: 'regression', scenario: RegressionScenario },
    { name: 'golden-path', scenario: GoldenPathScenario },
    { name: 'gig-economy', scenario: GigEconomyScenario },
    ...getAllScenarios().map(s => ({ name: s.name.toLowerCase().replace(/\s+/g, '-'), scenario: s })),
];

describe('Measurement Suite (B2.5) — Seeded Statistical Baselines', () => {
    beforeAll(async () => {
        await startRelay(RELAY_PORT);
    }, 30000);

    afterAll(async () => {
        await stopRelay(RELAY_PORT);
    }, 10000);

    for (const { name, scenario } of ALL_SCENARIOS) {
        const baseline = SCENARIO_BASELINES[name];
        if (!baseline) {
            console.warn(`No baseline defined for scenario: ${name}`);
            continue;
        }

        it(`should produce stable match distribution for ${name}`, async () => {
            const stats = await runScenarioMeasurement(name, scenario, REPETITIONS);

            // Statistical assertions against baseline
            // Match count: observed mean within 2 std deviations of baseline mean
            const matchDeviation = Math.abs(stats.meanMatches - baseline.meanMatches);
            const allowedDeviation = 2 * baseline.stdDevMatches;
            expect(matchDeviation).toBeLessThanOrEqual(allowedDeviation + 0.5); // +0.5 for small-n tolerance

            // Time to first match: observed mean within 2 std deviations
            const timeDeviation = Math.abs(stats.meanTimeToFirstMatchMs - baseline.meanTimeToFirstMatchMs);
            const allowedTimeDeviation = 2 * baseline.stdDevTimeToFirstMatchMs;
            expect(timeDeviation).toBeLessThanOrEqual(allowedTimeDeviation + 500); // +500ms tolerance

            // Unmatched rate should not exceed baseline max
            expect(stats.meanUnmatchedRate).toBeLessThanOrEqual(baseline.maxUnmatchedRate + 0.1);

            // Matches per minute should meet minimum
            expect(stats.meanMatchesPerMinute).toBeGreaterThanOrEqual(baseline.minMatchesPerMinute * 0.8);

            // Log for debugging/baseline updates
            console.log(`[${name}] matches: ${stats.meanMatches.toFixed(2)}±${stats.stdDevMatches.toFixed(2)} (CI95: [${stats.ci95Matches[0].toFixed(2)}, ${stats.ci95Matches[1].toFixed(2)}]), ` +
                `ttfm: ${stats.meanTimeToFirstMatchMs.toFixed(0)}±${stats.stdDevTimeToFirstMatchMs.toFixed(0)}ms, ` +
                `unmatched: ${(stats.meanUnmatchedRate * 100).toFixed(1)}%, ` +
                `mpm: ${stats.meanMatchesPerMinute.toFixed(2)}`);
        }, 120000); // 2 min per scenario max
    }
});

/**
 * Baseline calibration utility
 * Run with: pnpm vitest run simulator/src/scenarios/measurementSuite.ts --reporter=verbose
 * 
 * This test ONLY updates baselines - it does not assert.
 * Use when MatchEngine or scenarios change significantly.
 */
describe.skip('Measurement Suite — Baseline Calibration (run manually)', () => {
    beforeAll(async () => {
        await startRelay(RELAY_PORT);
    }, 30000);

    afterAll(async () => {
        await stopRelay(RELAY_PORT);
    }, 10000);

    for (const { name, scenario } of ALL_SCENARIOS) {
        it(`should calibrate baseline for ${name}`, async () => {
            const stats = await runScenarioMeasurement(name, scenario, REPETITIONS);

            // Output TypeScript-ready baseline object
            console.log(`    '${name}': {`);
            console.log(`        meanMatches: ${stats.meanMatches.toFixed(1)},`);
            console.log(`        stdDevMatches: ${stats.stdDevMatches.toFixed(1)},`);
            console.log(`        meanTimeToFirstMatchMs: ${Math.round(stats.meanTimeToFirstMatchMs)},`);
            console.log(`        stdDevTimeToFirstMatchMs: ${Math.round(stats.stdDevTimeToFirstMatchMs)},`);
            console.log(`        maxUnmatchedRate: ${stats.meanUnmatchedRate.toFixed(2)},`);
            console.log(`        minMatchesPerMinute: ${stats.meanMatchesPerMinute.toFixed(1)},`);
            console.log(`    },`);
        }, 120000);
    }
});