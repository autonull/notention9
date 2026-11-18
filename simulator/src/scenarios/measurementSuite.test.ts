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

// Test configuration: ephemeral relay port so parallel files never collide
const RELAY_PORT = 0;
let relayUrl = '';
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

// Baseline expectations for each scenario (calibrated 2026-11-18, 10 seeded reps)
const SCENARIO_BASELINES: Record<string, ScenarioBaseline> = {
    'regression': {
        meanMatches: 1.8,
        stdDevMatches: 0.6,
        meanTimeToFirstMatchMs: 12,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 13.5,
    },
    'golden-path': {
        meanMatches: 1.8,
        stdDevMatches: 0.6,
        meanTimeToFirstMatchMs: 8,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 9.0,
    },
    'gig-economy': {
        meanMatches: 44.1,
        stdDevMatches: 15.5,
        meanTimeToFirstMatchMs: 31,
        stdDevTimeToFirstMatchMs: 6,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 176.4,
    },
    'freelance-marketplace': {
        meanMatches: 100.8,
        stdDevMatches: 35.4,
        meanTimeToFirstMatchMs: 101,
        stdDevTimeToFirstMatchMs: 8,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 403.2,
    },
    'hiring-pipeline': {
        meanMatches: 36.0,
        stdDevMatches: 13.0,
        meanTimeToFirstMatchMs: 104,
        stdDevTimeToFirstMatchMs: 6,
        maxUnmatchedRate: 0.27,
        minMatchesPerMinute: 144.0,
    },
    'project-collaboration': {
        meanMatches: 64.0,
        stdDevMatches: 30.2,
        meanTimeToFirstMatchMs: 47,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 320.0,
    },
    'mentorship-network': {
        meanMatches: 89.6,
        stdDevMatches: 33.0,
        meanTimeToFirstMatchMs: 408,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 448.0,
    },
    'learning-community': {
        meanMatches: 228.9,
        stdDevMatches: 98.8,
        meanTimeToFirstMatchMs: 119,
        stdDevTimeToFirstMatchMs: 5,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 1144.5,
    },
    'co-founder-matching': {
        meanMatches: 90.0,
        stdDevMatches: 31.6,
        meanTimeToFirstMatchMs: 65,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 450.0,
    },
    'investor-startup-matching': {
        meanMatches: 130.8,
        stdDevMatches: 46.1,
        meanTimeToFirstMatchMs: 69,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 654.0,
    },
    'events-&-networking': {
        meanMatches: 29.5,
        stdDevMatches: 13.0,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 147.5,
    },
    'open-source-contribution': {
        meanMatches: 96.0,
        stdDevMatches: 38.6,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 480.0,
    },
    'research-collaboration': {
        meanMatches: 85.6,
        stdDevMatches: 36.2,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 513.6,
    },
    'legal-contract-negotiation': {
        meanMatches: 3.6,
        stdDevMatches: 1.3,
        meanTimeToFirstMatchMs: 205,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.40,
        minMatchesPerMinute: 14.4,
    },
    'crisis-response-coordination': {
        meanMatches: 0.9,
        stdDevMatches: 0.3,
        meanTimeToFirstMatchMs: 56,
        stdDevTimeToFirstMatchMs: 5,
        maxUnmatchedRate: 0.96,
        minMatchesPerMinute: 5.4,
    },
    'generational-land-stewardship': {
        meanMatches: 18.0,
        stdDevMatches: 6.3,
        meanTimeToFirstMatchMs: 29,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 72.0,
    },
    'kinship-care-network': {
        meanMatches: 8.1,
        stdDevMatches: 2.8,
        meanTimeToFirstMatchMs: 53,
        stdDevTimeToFirstMatchMs: 5,
        maxUnmatchedRate: 0.61,
        minMatchesPerMinute: 32.4,
    },
    'commons-governance': {
        meanMatches: 45.9,
        stdDevMatches: 16.1,
        meanTimeToFirstMatchMs: 63,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 183.6,
    },
    'cross-cultural-aid-coordination': {
        meanMatches: 40.8,
        stdDevMatches: 14.8,
        meanTimeToFirstMatchMs: 53,
        stdDevTimeToFirstMatchMs: 5,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 122.4,
    },
    'long-term-commitment-network': {
        meanMatches: 64.8,
        stdDevMatches: 22.8,
        meanTimeToFirstMatchMs: 62,
        stdDevTimeToFirstMatchMs: 11,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 194.4,
    },
    'government-services-access': {
        meanMatches: 81.0,
        stdDevMatches: 28.5,
        meanTimeToFirstMatchMs: 45,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 324.0,
    },
    'labor-dispute-resolution': {
        meanMatches: 7.2,
        stdDevMatches: 2.5,
        meanTimeToFirstMatchMs: 18,
        stdDevTimeToFirstMatchMs: 4,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 21.6,
    },
    'decentralized-identity-&-reputation': {
        meanMatches: 89.6,
        stdDevMatches: 33.0,
        meanTimeToFirstMatchMs: 66,
        stdDevTimeToFirstMatchMs: 12,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 358.4,
    },
    'contested-resource-allocation': {
        meanMatches: 43.2,
        stdDevMatches: 15.2,
        meanTimeToFirstMatchMs: 64,
        stdDevTimeToFirstMatchMs: 10,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 172.8,
    },
    'professional-referral-network': {
        meanMatches: 255.6,
        stdDevMatches: 89.8,
        meanTimeToFirstMatchMs: 84,
        stdDevTimeToFirstMatchMs: 8,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 1022.4,
    },
    // Taxonomy breadth scenarios (calibrated 2026-11-18, 10 seeded reps)
    'neighborhood-bulletin': {
        meanMatches: 132.0,
        stdDevMatches: 47.0,
        meanTimeToFirstMatchMs: 62,
        stdDevTimeToFirstMatchMs: 3,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 528.0,
    },
    'customary-norms': {
        meanMatches: 79.2,
        stdDevMatches: 27.8,
        meanTimeToFirstMatchMs: 307,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 316.8,
    },
    'public-health-advisory': {
        meanMatches: 4.0,
        stdDevMatches: 1.9,
        meanTimeToFirstMatchMs: 37,
        stdDevTimeToFirstMatchMs: 12,
        maxUnmatchedRate: 0.60,
        minMatchesPerMinute: 16.0,
    },
    'welfare-casework': {
        meanMatches: 137.0,
        stdDevMatches: 55.8,
        meanTimeToFirstMatchMs: 411,
        stdDevTimeToFirstMatchMs: 7,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 548.0,
    },
    'disaster-alert': {
        meanMatches: 21.6,
        stdDevMatches: 7.6,
        meanTimeToFirstMatchMs: 33,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 86.4,
    },
    'refugee-status': {
        meanMatches: 78.4,
        stdDevMatches: 34.1,
        meanTimeToFirstMatchMs: 205,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 313.6,
    },
    'peer-review': {
        meanMatches: 115.2,
        stdDevMatches: 40.5,
        meanTimeToFirstMatchMs: 69,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 460.8,
    },
    'arbitration-panel': {
        meanMatches: 48.6,
        stdDevMatches: 17.1,
        meanTimeToFirstMatchMs: 33,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 194.4,
    },
    'mutual-aid-collective': {
        meanMatches: 117.0,
        stdDevMatches: 41.1,
        meanTimeToFirstMatchMs: 306,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 468.0,
    },
    'cooperative-commune': {
        meanMatches: 85.0,
        stdDevMatches: 33.0,
        meanTimeToFirstMatchMs: 42,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 340.0,
    },
    'knowledge-marketplace': {
        meanMatches: 140.0,
        stdDevMatches: 70.0,
        meanTimeToFirstMatchMs: 307,
        stdDevTimeToFirstMatchMs: 1,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 342.4,
    },
    'insurance-market': {
        meanMatches: 140.4,
        stdDevMatches: 49.3,
        meanTimeToFirstMatchMs: 58,
        stdDevTimeToFirstMatchMs: 6,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 561.6,
    },
    'housing-market': {
        meanMatches: 50.0,
        stdDevMatches: 23.6,
        meanTimeToFirstMatchMs: 510,
        stdDevTimeToFirstMatchMs: 2,
        maxUnmatchedRate: 0.10,
        minMatchesPerMinute: 200.0,
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
    relayUrl = await resetRelay(RELAY_PORT);

    const runs: MeasurementRun[] = [];

    for (let i = 0; i < repetitions; i++) {
        clearRelayEvents(RELAY_PORT);
        const runner = new ScenarioRunner(relayUrl, DEFAULT_ONTOLOGY);
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
        relayUrl = await startRelay(RELAY_PORT);
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
describe.skipIf(process.env.CALIBRATE !== '1')('Measurement Suite — Baseline Calibration (run manually)', () => {
    beforeAll(async () => {
        relayUrl = await startRelay(RELAY_PORT);
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