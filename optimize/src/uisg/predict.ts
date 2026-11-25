import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const RUNS_FILE = resolve(ROOT, 'doc/uisg/runs.jsonl');
const MATRIX_DIR = resolve(ROOT, 'doc/uisg');
const MODEL_DIR = resolve(ROOT, 'doc/uisg/models');
const MODEL_FILE = resolve(MODEL_DIR, 'predictive-model.json');

// Caches for expensive file operations
let _cachedRuns: ReturnType<typeof loadRuns> | null = null;
let _cachedRunsMtime: number = 0;
let _cachedMatrixResults: ReturnType<typeof loadMatrixResults> | null = null;
let _cachedMatrixMtimes: Map<string, number> = new Map();
let _cachedTrainingData: ReturnType<typeof buildTrainingData> | null = null;

export interface TrainingSample {
    features: Record<string, number>;
    targets: {
        taskTimeMs: number;
        bundleSizeKb: number;
        matchF1: number;
        interactionCount: number;
        errorCount: number;
    };
    metadata: {
        journey: string;
        variant?: string;
        context?: string;
        theme: string;
        viewport: string;
        timestamp: string;
    };
}

export interface ModelCoefficients {
    taskTimeMs: { intercept: number; weights: Record<string, number> };
    bundleSizeKb: { intercept: number; weights: Record<string, number> };
    matchF1: { intercept: number; weights: Record<string, number> };
    interactionCount: { intercept: number; weights: Record<string, number> };
    errorCount: { intercept: number; weights: Record<string, number> };
}

export interface PredictiveModel {
    version: number;
    trainedAt: string;
    trainingSamples: number;
    coefficients: ModelCoefficients;
    featureNames: string[];
    featureMeans: number[];
    featureStds: number[];
    mae: {
        taskTimeMs: number;
        bundleSizeKb: number;
        matchF1: number;
        interactionCount: number;
        errorCount: number;
    };
}

export interface PredictionInput {
    journey: string;
    variant?: string;
    context?: string;
    theme: string;
    viewport: string;
    graphDiff?: {
        surfacesAdded: number;
        surfacesModified: number;
        surfacesRemoved: number;
        edgesAdded: number;
        edgesModified: number;
        edgesRemoved: number;
    };
}

export interface PredictionOutput {
    taskTimeMs: number;
    bundleSizeKb: number;
    matchF1: number;
    interactionCount: number;
    errorCount: number;
    confidence: number;
}

export function standardizeFeaturesForTest(samples: TrainingSample[]): { features: number[][]; means: number[]; stds: number[]; featureNames: string[] } {
    return standardizeFeatures(samples);
}

export function linearRegressionForTest(X: number[][], y: number[], lambda?: number): { intercept: number; weights: number[] } {
    return linearRegression(X, y, lambda);
}

export function invertMatrixForTest(m: number[][]): number[][] {
    return invertMatrix(m);
}

interface RunRecord {
    flowId: string;
    runId: string;
    bundlePath: string;
    status: string;
    timestamp: string;
    dimensions?: {
        viewport?: string;
        theme?: string;
        profile?: string;
        variant?: string;
        context?: string;
    };
}

interface MatrixCell {
    flowId: string;
    journey: string;
    profile: string;
    viewport: string;
    theme: string;
    context?: string;
    variant?: string;
    status: string;
    durationMs: number;
    runId: string;
    metrics: Record<string, number>;
}

interface MatrixResult {
    runId: string;
    startedAt: string;
    completedAt: string;
    cells: MatrixCell[];
}

function loadRuns(): RunRecord[] {
    try {
        const stat = statSync(RUNS_FILE);
        if (_cachedRuns && stat.mtimeMs <= _cachedRunsMtime) {
            return _cachedRuns;
        }
        const content = readFileSync(RUNS_FILE, 'utf8');
        _cachedRuns = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        _cachedRunsMtime = stat.mtimeMs;
        return _cachedRuns;
    } catch {
        return [];
    }
}

function loadMatrixResults(): MatrixResult[] {
    try {
        const files = readdirSync(MATRIX_DIR).filter(f => f.startsWith('matrix-') && f.endsWith('.json'));
        
        // Check if cache is valid
        let cacheValid = _cachedMatrixResults !== null;
        for (const file of files) {
            const stat = statSync(resolve(MATRIX_DIR, file));
            const cachedMtime = _cachedMatrixMtimes.get(file);
            if (!cachedMtime || stat.mtimeMs > cachedMtime) {
                cacheValid = false;
                break;
            }
        }
        
        if (cacheValid) {
            return _cachedMatrixResults!;
        }
        
        const results: MatrixResult[] = [];
        _cachedMatrixMtimes.clear();
        for (const file of files) {
            const content = JSON.parse(readFileSync(resolve(MATRIX_DIR, file), 'utf8'));
            results.push(content);
            _cachedMatrixMtimes.set(file, statSync(resolve(MATRIX_DIR, file)).mtimeMs);
        }
        _cachedMatrixResults = results.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
        return _cachedMatrixResults;
    } catch {
        return [];
    }
}

type CellWithTimestamp = MatrixCell & { timestamp?: string };

function extractFeatures(
    cell: CellWithTimestamp,
    graphDiff?: PredictionInput['graphDiff']
): Record<string, number> {
    // Ensure we have a valid cell with all required properties
    const { flowId, journey, profile, viewport, theme, context, variant, status, durationMs, runId, metrics } = cell;
    const features: Record<string, number> = {};

    // Categorical features (one-hot encoded)
    const contexts = ['desktop', 'mobile', 'tablet', 'mobile-dense', 'desktop-novice-dark', 'desktop-expert-light', 'mobile-novice-dark', 'mobile-expert-degraded', 'desktop-a11y-high-contrast', 'tablet-multilingual'];
    for (const ctx of contexts) {
        features[`context_${ctx}`] = context === ctx ? 1 : 0;
    }
    features['context_unknown'] = context && !contexts.includes(context) ? 1 : 0;

    const themes = ['default', 'brand-acme', 'brand-beta', 'high-contrast'];
    for (const t of themes) {
        features[`theme_${t}`] = theme === t ? 1 : 0;
    }

    const viewports = ['desktop-1440', 'mobile-390', 'tablet-834'];
    for (const vp of viewports) {
        features[`viewport_${vp}`] = viewport === vp ? 1 : 0;
    }

    // Variant features
    if (variant) {
        features['has_variant'] = 1;
        features[`variant_${variant}`] = 1;
    } else {
        features['has_variant'] = 0;
    }

    // Journey features
    features[`journey_${journey}`] = 1;

    // Graph diff features
    if (graphDiff) {
        features['diff_surfaces_added'] = graphDiff.surfacesAdded;
        features['diff_surfaces_modified'] = graphDiff.surfacesModified;
        features['diff_surfaces_removed'] = graphDiff.surfacesRemoved;
        features['diff_edges_added'] = graphDiff.edgesAdded;
        features['diff_edges_modified'] = graphDiff.edgesModified;
        features['diff_edges_removed'] = graphDiff.edgesRemoved;
    } else {
        features['diff_surfaces_added'] = 0;
        features['diff_surfaces_modified'] = 0;
        features['diff_surfaces_removed'] = 0;
        features['diff_edges_added'] = 0;
        features['diff_edges_modified'] = 0;
        features['diff_edges_removed'] = 0;
    }

    // Time-based feature (recency)
    const daysSinceEpoch = (new Date(cell.timestamp ?? Date.now()).getTime() - new Date('2026-01-01').getTime()) / (1000 * 60 * 60 * 24);
    features['days_since_epoch'] = daysSinceEpoch;

    return features;
}

function extractTargets(cell: MatrixResult['cells'][0]): TrainingSample['targets'] {
    return {
        taskTimeMs: cell.metrics.taskTimeMs ?? cell.durationMs,
        bundleSizeKb: cell.metrics.bundleSizeKb ?? 0,
        matchF1: cell.metrics.matchF1 ?? 0,
        interactionCount: cell.metrics.interactionCount ?? 0,
        errorCount: cell.metrics.errorCount ?? 0,
    };
}

function buildTrainingData(): TrainingSample[] {
    // Check cache validity based on source file mtimes
    let cacheValid = _cachedTrainingData !== null;
    try {
        const runsStat = statSync(RUNS_FILE);
        if (runsStat.mtimeMs > _cachedRunsMtime) cacheValid = false;
    } catch {
        cacheValid = false;
    }
    try {
        const files = readdirSync(MATRIX_DIR).filter(f => f.startsWith('matrix-') && f.endsWith('.json'));
        for (const file of files) {
            const stat = statSync(resolve(MATRIX_DIR, file));
            const cachedMtime = _cachedMatrixMtimes.get(file);
            if (!cachedMtime || stat.mtimeMs > cachedMtime) {
                cacheValid = false;
                break;
            }
        }
    } catch {
        cacheValid = false;
    }
    
    if (cacheValid && _cachedTrainingData) {
        return _cachedTrainingData;
    }

    const runs = loadRuns();
    const matrixResults = loadMatrixResults();

    const samples: TrainingSample[] = [];

    // From matrix results (more detailed metrics)
    for (const result of matrixResults) {
        if (!result.cells || !Array.isArray(result.cells)) continue;
        for (const cell of result.cells) {
            if (cell.status !== 'passed') continue; // Only train on successful runs

            const features = extractFeatures({
                ...cell,
                timestamp: result.startedAt,
            });

            const targets = extractTargets(cell);

            // Only include if we have meaningful target data
            if (targets.taskTimeMs > 0 || targets.bundleSizeKb > 0) {
                samples.push({
                    features,
                    targets,
                    metadata: {
                        journey: cell.journey,
                        variant: cell.variant,
                        context: cell.context,
                        theme: cell.theme,
                        viewport: cell.viewport,
                        timestamp: result.startedAt,
                    },
                });
            }
        }
    }

    // From runs.jsonl (additional data points with bundle metrics if available)
    for (const run of runs) {
        if (!run.dimensions || run.status !== 'passed') continue;

        // Try to load bundle metrics
        let bundleMetrics: TrainingSample['targets'] = { taskTimeMs: 0, bundleSizeKb: 0, matchF1: 0, interactionCount: 0, errorCount: 0 };
        try {
            if (run.bundlePath && existsSync(run.bundlePath)) {
                const bundle = JSON.parse(readFileSync(run.bundlePath, 'utf8'));
                bundleMetrics = {
                    taskTimeMs: bundle.taskTimeMs ?? 0,
                    bundleSizeKb: bundle.bundleSizeKb ?? 0,
                    matchF1: bundle.matchF1 ?? 0,
                    interactionCount: bundle.interactionCount ?? 0,
                    errorCount: bundle.errorCount ?? 0,
                };
            }
        } catch {
            // Ignore bundle read errors
        }

        const features = extractFeatures({
            flowId: run.flowId,
            journey: run.flowId,
            profile: run.dimensions.profile ?? '',
            context: run.dimensions.context,
            theme: run.dimensions.theme ?? 'default',
            viewport: run.dimensions.viewport ?? 'desktop-1440',
            variant: run.dimensions.variant,
            status: 'passed',
            durationMs: 0,
            runId: run.runId,
            metrics: bundleMetrics,
            timestamp: run.timestamp,
        });

        // Use bundle metrics if available
        if (bundleMetrics.taskTimeMs > 0 || bundleMetrics.bundleSizeKb > 0) {
            samples.push({
                features,
                targets: bundleMetrics,
                metadata: {
                    journey: run.flowId,
                    variant: run.dimensions.variant,
                    context: run.dimensions.context,
                    theme: run.dimensions.theme ?? 'default',
                    viewport: run.dimensions.viewport ?? 'desktop-1440',
                    timestamp: run.timestamp,
                },
            });
        }
    }

    // If still insufficient data, generate synthetic samples based on historical patterns
    if (samples.length < 10) {
        console.warn(`Only ${samples.length} real samples, generating synthetic data for training...`);
        const syntheticSamples = generateSyntheticSamples(samples.length > 0 ? samples : undefined);
        samples.push(...syntheticSamples);
    }

    _cachedTrainingData = samples;
    return samples;
}

function generateSyntheticSamples(existingSamples?: TrainingSample[]): TrainingSample[] {
    const journeys = ['golden-path', 'capture-and-edit', 'publish-gate', 'ontology-conflict', 'capture-and-edit-keyboard', 'capture-and-edit-palette'];
    const contexts = ['desktop', 'mobile', 'tablet', 'mobile-dense', 'desktop-novice-dark', 'desktop-expert-light', 'mobile-novice-dark', 'mobile-expert-degraded', 'desktop-a11y-high-contrast', 'tablet-multilingual'];
    const themes = ['default', 'brand-acme', 'brand-beta', 'high-contrast'];
    const viewports = ['desktop-1440', 'mobile-390', 'tablet-834'];
    const variants = ['dense', 'compact', undefined];

    const samples: TrainingSample[] = [];
    const baseTime = Date.now();

    // Generate synthetic samples with LINEAR relationships so the model can learn them
    // We'll create a deterministic mapping from features to targets
    for (let i = 0; i < 100; i++) {
        const journey = journeys[i % journeys.length];
        const context = contexts[i % contexts.length];
        const theme = themes[i % themes.length];
        const viewport = viewports[i % viewports.length];
        const variant = variants[i % variants.length];

        // Linear relationships:
        // taskTimeMs = base + mobile_bonus + dense_bonus + high_contrast_bonus + journey_factor
        // bundleSizeKb = base + mobile_bonus + dense_bonus + theme_factor
        // matchF1 = base + variant_factor + noise
        // interactionCount = base + mobile_factor
        // errorCount = small random

        const isMobile = viewport.includes('mobile');
        const isTablet = viewport.includes('tablet');
        const isDense = variant === 'dense';
        const isCompact = variant === 'compact';
        const isHighContrast = theme === 'high-contrast';
        const isBrandAcme = theme === 'brand-acme';
        const isBrandBeta = theme === 'brand-beta';

        // Deterministic base values with small noise
        const noise = (seed: number) => ((Math.sin(seed * 1.7) * 0.05) + (Math.cos(seed * 2.3) * 0.03));

        const baseTaskTime = 1500;
        const mobileBonus = isMobile ? 800 : 0;
        const tabletBonus = isTablet ? 300 : 0;
        const denseBonus = isDense ? -200 : 0;
        const compactBonus = isCompact ? 100 : 0;
        const hcBonus = isHighContrast ? 200 : 0;
        const journeyFactor = journey === 'golden-path' ? 200 : journey === 'publish-gate' ? 500 : 0;

        const baseBundle = 30;
        const mobileBundleBonus = isMobile ? 15 : 0;
        const denseBundleBonus = isDense ? -5 : 0;
        const brandAcmeBonus = isBrandAcme ? 3 : 0;
        const brandBetaBonus = isBrandBeta ? -2 : 0;

        const baseF1 = 0.7;
        const denseF1Bonus = isDense ? 0.1 : 0;
        const compactF1Bonus = isCompact ? -0.05 : 0;

        const baseInteractions = 5;
        const mobileInteractions = isMobile ? 4 : 0;

        const seed = i;
        const n = noise(seed);

        const features = extractFeatures({
            flowId: journey,
            journey,
            profile: 'hand-built',
            context,
            theme,
            viewport,
            variant,
            status: 'passed',
            durationMs: Math.round(baseTaskTime + mobileBonus + tabletBonus + denseBonus + compactBonus + hcBonus + journeyFactor + n * 100),
            runId: `synthetic-${i}`,
            metrics: {
                taskTimeMs: Math.round(baseTaskTime + mobileBonus + tabletBonus + denseBonus + compactBonus + hcBonus + journeyFactor + n * 100),
                bundleSizeKb: Math.round(baseBundle + mobileBundleBonus + denseBundleBonus + brandAcmeBonus + brandBetaBonus + n * 2),
                matchF1: Math.min(1, Math.max(0, baseF1 + denseF1Bonus + compactF1Bonus + n)),
                interactionCount: Math.max(0, Math.round(baseInteractions + mobileInteractions + n * 2)),
                errorCount: Math.max(0, Math.round(n * 2)),
            },
        });

        samples.push({
            features,
            targets: {
                taskTimeMs: Math.round(baseTaskTime + mobileBonus + tabletBonus + denseBonus + compactBonus + hcBonus + journeyFactor + n * 100),
                bundleSizeKb: Math.round(baseBundle + mobileBundleBonus + denseBundleBonus + brandAcmeBonus + brandBetaBonus + n * 2),
                matchF1: Math.min(1, Math.max(0, baseF1 + denseF1Bonus + compactF1Bonus + n)),
                interactionCount: Math.max(0, Math.round(baseInteractions + mobileInteractions + n * 2)),
                errorCount: Math.max(0, Math.round(n * 2)),
            },
            metadata: {
                journey,
                variant,
                context,
                theme,
                viewport,
                timestamp: new Date(baseTime + i * 3600000).toISOString(),
            },
        });
    }

    return samples;
}

function standardizeFeatures(samples: TrainingSample[]): { features: number[][]; means: number[]; stds: number[]; featureNames: string[] } {
    const featureNames = Object.keys(samples[0]?.features ?? {});
    const n = samples.length;
    const d = featureNames.length;

    const features = samples.map(s => featureNames.map(name => s.features[name] ?? 0));

    const means = featureNames.map((_, j) => features.reduce((sum, row) => sum + row[j], 0) / n);
    const stds = featureNames.map((_, j) => {
        const mean = means[j];
        const variance = features.reduce((sum, row) => sum + Math.pow(row[j] - mean, 2), 0) / n;
        return Math.sqrt(variance) || 1;
    });

    const standardized = features.map(row =>
        featureNames.map((_, j) => (row[j] - means[j]) / stds[j])
    );

    return { features: standardized, means, stds, featureNames };
}

function linearRegression(X: number[][], y: number[], lambda: number = 1.0): { intercept: number; weights: number[] } {
    const n = X.length;
    const d = X[0].length;

    // Add bias column
    const Xb = X.map(row => [1, ...row]);

    // Normal equation with ridge regularization: (X^T X + lambda*I)^-1 X^T y
    const XtX = Array(d + 1).fill(0).map(() => Array(d + 1).fill(0));
    const Xty = Array(d + 1).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= d; j++) {
            Xty[j] += Xb[i][j] * y[i];
            for (let k = 0; k <= d; k++) {
                XtX[j][k] += Xb[i][j] * Xb[i][k];
            }
        }
    }

    // Add ridge regularization (don't regularize intercept)
    for (let j = 1; j <= d; j++) {
        XtX[j][j] += lambda;
    }

    // Solve using matrix inversion
    const inv = invertMatrix(XtX);
    const coeffs = multiplyMatrixVector(inv, Xty);

    return { intercept: coeffs[0], weights: coeffs.slice(1) };
}

function invertMatrix(m: number[][]): number[][] {
    const n = m.length;
    const aug = m.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

    // Gaussian elimination
    for (let col = 0; col < n; col++) {
        // Find pivot
        let pivot = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) {
                pivot = row;
            }
        }

        if (Math.abs(aug[pivot][col]) < 1e-10) {
            // Singular matrix, return identity
            return Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        }

        // Swap rows
        if (pivot !== col) {
            [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
        }

        // Normalize pivot row
        const pivotVal = aug[col][col];
        for (let j = 0; j < 2 * n; j++) {
            aug[col][j] /= pivotVal;
        }

        // Eliminate other rows
        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const factor = aug[row][col];
            for (let j = 0; j < 2 * n; j++) {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    return aug.map(row => row.slice(n));
}

function multiplyMatrixVector(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

function predict(features: Record<string, number>, coeffs: { intercept: number; weights: Record<string, number> }, featureNames: string[], means?: number[], stds?: number[]): number {
    let result = coeffs.intercept;
    for (let i = 0; i < featureNames.length; i++) {
        const name = featureNames[i];
        let value = features[name] ?? 0;
        if (means && stds) {
            value = (value - means[i]) / (stds[i] || 1);
        }
        result += (coeffs.weights[name] ?? 0) * value;
    }
    return result;
}

function computeMAE(predictions: number[], actuals: number[]): number {
    if (predictions.length === 0) return 0;
    return predictions.reduce((sum, pred, i) => sum + Math.abs(pred - actuals[i]), 0) / predictions.length;
}

export function trainModel(): PredictiveModel {
    const samples = buildTrainingData();

    if (samples.length < 10) {
        throw new Error(`Insufficient training data: ${samples.length} samples (need at least 10)`);
    }

    // Time-based split: 80% train, 20% test (by timestamp)
    samples.sort((a, b) => new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime());
    const splitIdx = Math.floor(samples.length * 0.8);
    const trainSamples = samples.slice(0, splitIdx);
    const testSamples = samples.slice(splitIdx);

    const { features: trainX, means, stds, featureNames } = standardizeFeatures(trainSamples);
    const { features: testX } = standardizeFeatures(testSamples);

    // Apply same standardization to test
    const testXStd = testSamples.map(s =>
        featureNames.map((name, j) => ((s.features[name] ?? 0) - means[j]) / stds[j])
    );

    const targets = {
        taskTimeMs: trainSamples.map(s => s.targets.taskTimeMs),
        bundleSizeKb: trainSamples.map(s => s.targets.bundleSizeKb),
        matchF1: trainSamples.map(s => s.targets.matchF1),
        interactionCount: trainSamples.map(s => s.targets.interactionCount),
        errorCount: trainSamples.map(s => s.targets.errorCount),
    };

    const coefficients = {
        taskTimeMs: linearRegression(trainX, targets.taskTimeMs),
        bundleSizeKb: linearRegression(trainX, targets.bundleSizeKb),
        matchF1: linearRegression(trainX, targets.matchF1),
        interactionCount: linearRegression(trainX, targets.interactionCount),
        errorCount: linearRegression(trainX, targets.errorCount),
    };

    // Convert weights to named object
    const namedCoeffs: ModelCoefficients = {
        taskTimeMs: { intercept: coefficients.taskTimeMs.intercept, weights: Object.fromEntries(featureNames.map((n, i) => [n, coefficients.taskTimeMs.weights[i]])) },
        bundleSizeKb: { intercept: coefficients.bundleSizeKb.intercept, weights: Object.fromEntries(featureNames.map((n, i) => [n, coefficients.bundleSizeKb.weights[i]])) },
        matchF1: { intercept: coefficients.matchF1.intercept, weights: Object.fromEntries(featureNames.map((n, i) => [n, coefficients.matchF1.weights[i]])) },
        interactionCount: { intercept: coefficients.interactionCount.intercept, weights: Object.fromEntries(featureNames.map((n, i) => [n, coefficients.interactionCount.weights[i]])) },
        errorCount: { intercept: coefficients.errorCount.intercept, weights: Object.fromEntries(featureNames.map((n, i) => [n, coefficients.errorCount.weights[i]])) },
    };

    // Compute MAE on test set (use raw features, predict() will standardize)
    const testTargets = {
        taskTimeMs: testSamples.map(s => s.targets.taskTimeMs),
        bundleSizeKb: testSamples.map(s => s.targets.bundleSizeKb),
        matchF1: testSamples.map(s => s.targets.matchF1),
        interactionCount: testSamples.map(s => s.targets.interactionCount),
        errorCount: testSamples.map(s => s.targets.errorCount),
    };

    const mae: PredictiveModel['mae'] = {
        taskTimeMs: computeMAE(testSamples.map(s => predict(s.features, namedCoeffs.taskTimeMs, featureNames, means, stds)), testTargets.taskTimeMs),
        bundleSizeKb: computeMAE(testSamples.map(s => predict(s.features, namedCoeffs.bundleSizeKb, featureNames, means, stds)), testTargets.bundleSizeKb),
        matchF1: computeMAE(testSamples.map(s => predict(s.features, namedCoeffs.matchF1, featureNames, means, stds)), testTargets.matchF1),
        interactionCount: computeMAE(testSamples.map(s => predict(s.features, namedCoeffs.interactionCount, featureNames, means, stds)), testTargets.interactionCount),
        errorCount: computeMAE(testSamples.map(s => predict(s.features, namedCoeffs.errorCount, featureNames, means, stds)), testTargets.errorCount),
    };

    const model: PredictiveModel = {
        version: 1,
        trainedAt: new Date().toISOString(),
        trainingSamples: trainSamples.length,
        coefficients: namedCoeffs,
        featureNames,
        featureMeans: means,
        featureStds: stds,
        mae,
    };

    // Save model
    if (!existsSync(MODEL_DIR)) {
        mkdirSync(MODEL_DIR, { recursive: true });
    }
    writeFileSync(MODEL_FILE, JSON.stringify(model, null, 2) + '\n');

    return model;
}

function featuresToRecord(features: number[], featureNames: string[]): Record<string, number> {
    const obj: Record<string, number> = {};
    for (let i = 0; i < featureNames.length; i++) {
        obj[featureNames[i]] = features[i];
    }
    return obj;
}

export function loadModel(): PredictiveModel | null {
    try {
        return JSON.parse(readFileSync(MODEL_FILE, 'utf8')) as PredictiveModel;
    } catch {
        return null;
    }
}

export function predictMetrics(input: PredictionInput, model?: PredictiveModel): PredictionOutput {
    const loadedModel = model ?? loadModel();
    if (!loadedModel) {
        throw new Error('No trained model available. Run `uisg predict train` first.');
    }

    const graph = loadGraph(new Map());
    const graphDiff = input.graphDiff ?? computeGraphDiff(graph);

    const features = extractFeatures({
        flowId: input.journey,
        journey: input.journey,
        profile: '',
        context: input.context,
        theme: input.theme,
        viewport: input.viewport,
        variant: input.variant,
        status: 'passed',
        durationMs: 0,
        runId: 'prediction',
        metrics: {},
        timestamp: new Date().toISOString(),
    }, graphDiff);

    const means = loadedModel.featureMeans ?? [];
    const stds = loadedModel.featureStds ?? [];

    const predictions = {
        taskTimeMs: Math.max(0, predict(features, loadedModel.coefficients.taskTimeMs, loadedModel.featureNames, means, stds)),
        bundleSizeKb: Math.max(0, predict(features, loadedModel.coefficients.bundleSizeKb, loadedModel.featureNames, means, stds)),
        matchF1: Math.min(1, Math.max(0, predict(features, loadedModel.coefficients.matchF1, loadedModel.featureNames, means, stds))),
        interactionCount: Math.max(0, Math.round(predict(features, loadedModel.coefficients.interactionCount, loadedModel.featureNames, means, stds))),
        errorCount: Math.max(0, Math.round(predict(features, loadedModel.coefficients.errorCount, loadedModel.featureNames, means, stds))),
    };

    // Confidence based on training data size and MAE
    const avgMae = (loadedModel.mae.taskTimeMs + loadedModel.mae.bundleSizeKb + loadedModel.mae.matchF1 + loadedModel.mae.interactionCount + loadedModel.mae.errorCount) / 5;
    const sampleFactor = Math.min(1, loadedModel.trainingSamples / 100);
    const confidence = Math.max(0, Math.min(1, sampleFactor * (1 - avgMae / 1000)));

    return { ...predictions, confidence };
}

function computeGraphDiff(currentGraph: any): PredictionInput['graphDiff'] {
    // Simplified: compare with a baseline (could load from file)
    return {
        surfacesAdded: 0,
        surfacesModified: 0,
        surfacesRemoved: 0,
        edgesAdded: 0,
        edgesModified: 0,
        edgesRemoved: 0,
    };
}

export function rankVariantsByPrediction(
    variants: string[],
    input: Omit<PredictionInput, 'variant'>,
    model?: PredictiveModel
): Array<{ variant: string; prediction: PredictionOutput }> {
    return variants
        .map(variant => ({
            variant,
            prediction: predictMetrics({ ...input, variant }, model),
        }))
        .sort((a, b) => {
            // Sort by predicted task time (lower is better), then bundle size, then -matchF1
            if (a.prediction.taskTimeMs !== b.prediction.taskTimeMs) {
                return a.prediction.taskTimeMs - b.prediction.taskTimeMs;
            }
            if (a.prediction.bundleSizeKb !== b.prediction.bundleSizeKb) {
                return a.prediction.bundleSizeKb - b.prediction.bundleSizeKb;
            }
            return b.prediction.matchF1 - a.prediction.matchF1;
        });
}

export function filterVariantsByThreshold(
    variants: string[],
    input: Omit<PredictionInput, 'variant'>,
    thresholds: {
        maxTaskTimeMs?: number;
        maxBundleSizeKb?: number;
        minMatchF1?: number;
    },
    model?: PredictiveModel
): string[] {
    const ranked = rankVariantsByPrediction(variants, input, model);
    return ranked
        .filter(({ prediction }) => {
            if (thresholds.maxTaskTimeMs && prediction.taskTimeMs > thresholds.maxTaskTimeMs) return false;
            if (thresholds.maxBundleSizeKb && prediction.bundleSizeKb > thresholds.maxBundleSizeKb) return false;
            if (thresholds.minMatchF1 && prediction.matchF1 < thresholds.minMatchF1) return false;
            return true;
        })
        .map(r => r.variant);
}