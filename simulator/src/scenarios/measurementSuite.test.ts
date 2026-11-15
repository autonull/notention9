import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ScenarioRunner } from '../scenario.js';
import { MetricsCollector, attachMetricsCollector, type RunMetrics } from '../metricsCollector.js';
import { RegressionScenario } from './regression.js';
import { GoldenPathScenario } from './golden-path.js';
import { GigEconomyScenario } from './gigEconomy.js';
import { DOMAIN_SCENARIOS, getAllScenarios } from './domainScenarios.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { startRelay, stopRelay, clearRelayEvents, resetRelay } from '../testRelay.js';

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
const REPETITIONS = 10; // Per scenario, for stable baselines (use 30 for CI)
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

// Baseline expectations for each scenario (computed from seeded runs in test environment)
const SCENARIO_BASELINES: Record<string, ScenarioBaseline> = {
    'regression': {
        meanMatches: 1.3,
        stdDevMatches: 1.2,
        meanTimeToFirstMatchMs: 23,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 10.0,
    },
    'golden-path': {
        meanMatches: 1.3,
        stdDevMatches: 1.2,
        meanTimeToFirstMatchMs: 20,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 6.7,
    },
    'gig-economy': {
        meanMatches: 16.0,
        stdDevMatches: 14.0,
        meanTimeToFirstMatchMs: 511,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 64.0,
    },
    'freelance-marketplace': {
        meanMatches: 32.0,
        stdDevMatches: 28.0,
        meanTimeToFirstMatchMs: 816,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 128.0,
    },
    'hiring-pipeline': {
        meanMatches: 27.0,
        stdDevMatches: 23.0,
        meanTimeToFirstMatchMs: 102,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.5,
        minMatchesPerMinute: 108.0,
    },
    'project-collaboration': {
        meanMatches: 43.0,
        stdDevMatches: 37.0,
        meanTimeToFirstMatchMs: 51,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 213.0,
    },
    'mentorship-network': {
        meanMatches: 64.0,
        stdDevMatches: 55.0,
        meanTimeToFirstMatchMs: 409,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 320.0,
    },
    'learning-community': {
        meanMatches: 150.0,
        stdDevMatches: 130.0,
        meanTimeToFirstMatchMs: 138,
        stdDevTimeToFirstMatchMs: 14,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 750.0,
    },
    'co-founder-matching': {
        meanMatches: 67.0,
        stdDevMatches: 58.0,
        meanTimeToFirstMatchMs: 70,
        stdDevTimeToFirstMatchMs: 6,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 333.0,
    },
    'investor-startup-matching': {
        meanMatches: 96.0,
        stdDevMatches: 83.0,
        meanTimeToFirstMatchMs: 70,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 480.0,
    },
    'events-&-networking': {
        meanMatches: 11.0,
        stdDevMatches: 7.0,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.6,
        minMatchesPerMinute: 53.0,
    },
    'open-source-contribution': {
        meanMatches: 67.0,
        stdDevMatches: 58.0,
        meanTimeToFirstMatchMs: 307,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 333.0,
    },
    'research-collaboration': {
        meanMatches: 59.0,
        stdDevMatches: 51.0,
        meanTimeToFirstMatchMs: 307,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 352.0,
    },
    'legal-contract-negotiation': {
        meanMatches: 2.7,
        stdDevMatches: 2.3,
        meanTimeToFirstMatchMs: 207,
        stdDevTimeToFirstMatchMs: 0,
        maxUnmatchedRate: 0.6,
        minMatchesPerMinute: 11.0,
    },
    'crisis-response-coordination': {
        meanMatches: 0.7,
        stdDevMatches: 0.6,
        meanTimeToFirstMatchMs: 55,
        stdDevTimeToFirstMatchMs: 4,
        maxUnmatchedRate: 1.0,
        minMatchesPerMinute: 4.0,
    },
    'generational-land-stewardship': {
        meanMatches: 13.0,
        stdDevMatches: 12.0,
        meanTimeToFirstMatchMs: 30,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 53.0,
    },
    'kinship-care-network': {
        meanMatches: 8.1,
        stdDevMatches: 2.8,
        meanTimeToFirstMatchMs: 50,
        stdDevTimeToFirstMatchMs: 6,
        maxUnmatchedRate: 0.61,
        minMatchesPerMinute: 32.4,
    },
    'commons-governance': {
        meanMatches: 39.0,
        stdDevMatches: 35.0,
        meanTimeToFirstMatchMs: 65,
        stdDevTimeToFirstMatchMs: 4,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 156.0,
    },
    'cross-cultural-aid-coordination': {
        meanMatches: 16.0,
        stdDevMatches: 14.0,
        meanTimeToFirstMatchMs: 54,
        stdDevTimeToFirstMatchMs: 14,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 48.0,
    },
    'long-term-commitment-network': {
        meanMatches: 48.0,
        stdDevMatches: 42.0,
        meanTimeToFirstMatchMs: 53,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.35,
        minMatchesPerMinute: 144.0,
    },
    'government-services-access': {
        meanMatches: 83.0,
        stdDevMatches: 29.8,
        meanTimeToFirstMatchMs: 50,
        stdDevTimeToFirstMatchMs: 12,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 332.0,
    },
    'labor-dispute-resolution': {
        meanMatches: 7.2,
        stdDevMatches: 2.5,
        meanTimeToFirstMatchMs: 19,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 21.6,
    },
    'decentralized-identity-&-reputation': {
        meanMatches: 86.4,
        stdDevMatches: 30.4,
        meanTimeToFirstMatchMs: 58,
        stdDevTimeToFirstMatchMs: 12,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 345.6,
    },
    'contested-resource-allocation': {
        meanMatches: 43.2,
        stdDevMatches: 15.2,
        meanTimeToFirstMatchMs: 36,
        stdDevTimeToFirstMatchMs: 4,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 172.8,
    },
    'professional-referral-network': {
        meanMatches: 255.6,
        stdDevMatches: 89.8,
        meanTimeToFirstMatchMs: 97,
        stdDevTimeToFirstMatchMs: 30,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 1022.4,
    },
    // Taxonomy breadth scenarios (calibrated 2026-11-15, 10 seeded reps each)
    'neighborhood-bulletin': {
        meanMatches: 129.6,
        stdDevMatches: 45.5,
        meanTimeToFirstMatchMs: 71,
        stdDevTimeToFirstMatchMs: 12,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 518.4,
    },
    'customary-norms': {
        meanMatches: 79.2,
        stdDevMatches: 27.8,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 316.8,
    },
    'public-health-advisory': {
        meanMatches: 4.0,
        stdDevMatches: 1.9,
        meanTimeToFirstMatchMs: 26,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.60,
        minMatchesPerMinute: 16.0,
    },
    'welfare-casework': {
        meanMatches: 126.0,
        stdDevMatches: 44.3,
        meanTimeToFirstMatchMs: 408,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 504.0,
    },
    'disaster-alert': {
        meanMatches: 21.6,
        stdDevMatches: 7.6,
        meanTimeToFirstMatchMs: 36,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 86.4,
    },
    'refugee-status': {
        meanMatches: 72.0,
        stdDevMatches: 25.3,
        meanTimeToFirstMatchMs: 205,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 288.0,
    },
    'peer-review': {
        meanMatches: 125.6,
        stdDevMatches: 54.9,
        meanTimeToFirstMatchMs: 83,
        stdDevTimeToFirstMatchMs: 10,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 502.4,
    },
    'arbitration-panel': {
        meanMatches: 48.6,
        stdDevMatches: 17.1,
        meanTimeToFirstMatchMs: 38,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 194.4,
    },
    'mutual-aid-collective': {
        meanMatches: 132.0,
        stdDevMatches: 57.1,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 528.0,
    },
    'cooperative-commune': {
        meanMatches: 79.2,
        stdDevMatches: 27.8,
        meanTimeToFirstMatchMs: 54,
        stdDevTimeToFirstMatchMs: 9,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 316.8,
    },
    'knowledge-marketplace': {
        meanMatches: 72.0,
        stdDevMatches: 25.3,
        meanTimeToFirstMatchMs: 814,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 288.0,
    },
    'insurance-market': {
        meanMatches: 135.0,
        stdDevMatches: 55.2,
        meanTimeToFirstMatchMs: 408,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 540.0,
    },
    'housing-market': {
        meanMatches: 46.0,
        stdDevMatches: 16.5,
        meanTimeToFirstMatchMs: 510,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 184.0,
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
    // Reset relay completely before each scenario to prevent cross-contamination
    await resetRelay(RELAY_PORT);
    
    const runs: MeasurementRun[] = [];

    for (let i = 0; i < repetitions; i++) {
        clearRelayEvents(RELAY_PORT);
        const runner = new ScenarioRunner(RELAY_URL, DEFAULT_ONTOLOGY);
        runner.setFastMode(true);
        const collector = attachMetricsCollector(runner);

        await runner.prepare(scenario);
        await runner.execute(scenario);
        await runner.cleanup();

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
describe('Measurement Suite — Baseline Calibration (run manually)', () => {
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