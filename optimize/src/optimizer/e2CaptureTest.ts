/**
 * E2 Capture-flow Parameter A/B Test (S-UI)
 * 
 * Tests two capture parameter candidates on 10 validation intent cases × 3 reps:
 * - Candidate A: autoFocus=true + custom placeholder
 * - Candidate B: initialOp='contains' (enum hint)
 * 
 * Metrics: paired McNemar (completion), Wilcoxon (timeToCapture), corrections (guardrail)
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readManifest, readIntentCases, type IntentCase } from '@notention/core/eval/caseManifest.js';
import { ensurePreviewServer, stopPreviewServer } from '../server/previewServer.js';
import {
    INTENT_DEFAULT_VIEWPORT,
    INTENT_NAVIGATION_TIMEOUT_MS,
    DEFAULT_INTENT_EXTRACTION_WAIT_MS,
} from '../constants.js';
import { runIntentCase, applySeedRevisions, type IntentCaseRunResult, type RunIntentCaseConfig } from './intentCaseRunner.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CaptureTestConfig {
    headless?: boolean;
    repetitions?: number;
    viewport?: { width: number; height: number };
    output?: string;
}

interface ArmResult {
    armName: string;
    patch: Record<string, unknown>;
    caseResults: CaseArmResult[];
}

interface CaseArmResult {
    caseId: string;
    intent: string;
    repetition: number;
    success: boolean;
    metrics: {
        completion: number;
        steps: number;
        corrections: number;
        timeToCaptureMs: number;
    };
    details: string[];
    error?: string;
}

interface ComparisonResult {
    armA: ArmResult;
    armB: ArmResult;
    mcNemar: { pValue: number; significant: boolean };
    wilcoxon: { pValue: number; significant: boolean; medianDiff: number };
    correctionsDiff: number;
}

const E2_ARMS = {
    'A-autoFocus-placeholder': {
        // describe-it-composer params
        placeholder: 'What do you need? e.g. "I need a wheelchair ramp before Friday, budget 900"',
        autoFocus: true,
    },
    'B-initialOp-enumHint': {
        // property-form params  
        initialOp: 'contains',
    },
};

function loadValidationCaptureCases(): IntentCase[] {
    const manifest = readManifest();
    // Filter for validation split, capture intent
    const cases = manifest.cases.filter(c => 
        c.split === 'validation' && 
        c.intent === 'capture_need' &&
        c.path.includes('intent-capture')
    );
    
    console.log(`Loaded ${cases.length} validation capture intent cases`);
    return cases.slice(0, 10); // E2 specifies 10 cases
}

async function runArm(
    armName: string,
    patch: Record<string, unknown>,
    cases: IntentCase[],
    repetitions: number,
    headless: boolean = true
): Promise<ArmResult> {
    console.log(`\n🌐 Running ${armName} (${cases.length} cases × ${repetitions} reps)...`);
    
    const baseURL = await ensurePreviewServer();
    
    const browser = await chromium.launch({
        headless: headless !== false,
        args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
    });
    
    const caseResults: CaseArmResult[] = [];
    
    try {
        const context = await browser.newContext({
            viewport: INTENT_DEFAULT_VIEWPORT,
        });
        
        // Add init script to apply the parameter patch
        await context.addInitScript((patchData: Record<string, unknown>) => {
            localStorage.setItem('paramPatch', JSON.stringify(patchData));
        }, patch);
        
        const page = await context.newPage();
        
        const runConfig: RunIntentCaseConfig = {
            baseURL,
            navigationTimeoutMs: INTENT_NAVIGATION_TIMEOUT_MS,
            extractionWaitMs: DEFAULT_INTENT_EXTRACTION_WAIT_MS,
            extractionSelector: '[data-testid="extracted-property"]',
        };
        
        for (const caseData of cases) {
            for (let rep = 0; rep < repetitions; rep++) {
                const startTime = Date.now();
                let steps = 0;
                const details: string[] = [];
                let corrections = 0;
                
                try {
                    // Run the shared intent case logic
                    const result = await runIntentCase(page, caseData, runConfig);
                    
                    caseResults.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: result.success,
                        metrics: result.metrics,
                        details: result.details,
                    });
                    
                    console.log(`   ${caseData.id} rep${rep}: ${result.success ? '✓' : '✗'} completion=${result.metrics.completion} time=${result.metrics.timeToCaptureMs}ms`);
                    
                } catch (error) {
                    caseResults.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: false,
                        metrics: { 
                            completion: 0, 
                            steps, 
                            corrections, 
                            timeToCaptureMs: Date.now() - startTime 
                        },
                        details: [...details, `Error: ${error instanceof Error ? error.message : String(error)}`],
                        error: error instanceof Error ? error.message : String(error),
                    });
                    console.log(`   ${caseData.id} rep${rep}: ✗ ERROR`);
                }
            }
        }
    } finally {
        await browser.close();
        // Don't stop preview server - might be reused
    }
    
    return { armName, patch, caseResults };
}

// McNemar test for paired binary outcomes (completion success/failure)
function mcNemarTest(armAResults: CaseArmResult[], armBResults: CaseArmResult[]): { pValue: number; significant: boolean } {
    // Build paired table: for each case+rep, compare success
    let discordantAB = 0; // A success, B failure
    let discordantBA = 0; // A failure, B success
    
    const mapA = new Map<string, CaseArmResult>();
    const mapB = new Map<string, CaseArmResult>();
    
    for (const r of armAResults) {
        mapA.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    for (const r of armBResults) {
        mapB.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    
    for (const [key, a] of mapA) {
        const b = mapB.get(key);
        if (!b) continue;
        
        if (a.success && !b.success) discordantAB++;
        if (!a.success && b.success) discordantBA++;
    }
    
    // McNemar with continuity correction
    const n = discordantAB + discordantBA;
    if (n === 0) return { pValue: 1.0, significant: false };
    
    const chi2 = (Math.abs(discordantAB - discordantBA) - 1) ** 2 / n;
    // Chi-square with 1 df
    const pValue = 1 - chiSquareCDF(chi2, 1);
    
    return { pValue, significant: pValue < 0.05 };
}

// Approximate chi-square CDF
function chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df === 1) {
        // For df=1, chi-square is square of normal
        return erf(Math.sqrt(x / 2));
    }
    // Rough approximation for other df
    return 1 - Math.exp(-x / 2) * (1 + x / 2);
}

// Error function approximation
function erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    return sign * y;
}

// Wilcoxon signed-rank test for paired continuous outcomes (timeToCapture)
function wilcoxonTest(armAResults: CaseArmResult[], armBResults: CaseArmResult[]): { pValue: number; significant: boolean; medianDiff: number } {
    const diffs: number[] = [];
    
    const mapA = new Map<string, CaseArmResult>();
    const mapB = new Map<string, CaseArmResult>();
    
    for (const r of armAResults) {
        mapA.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    for (const r of armBResults) {
        mapB.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    
    for (const [key, a] of mapA) {
        const b = mapB.get(key);
        if (!b) continue;
        
        diffs.push(b.metrics.timeToCaptureMs - a.metrics.timeToCaptureMs);
    }
    
    if (diffs.length === 0) return { pValue: 1.0, significant: false, medianDiff: 0 };
    
    // Remove zero differences
    const nonZeroDiffs = diffs.filter(d => d !== 0);
    if (nonZeroDiffs.length === 0) return { pValue: 1.0, significant: false, medianDiff: 0 };
    
    // Rank absolute differences
    const absDiffs = nonZeroDiffs.map(d => Math.abs(d));
    const sorted = [...absDiffs].sort((a, b) => a - b);
    const ranks = absDiffs.map(d => {
        const idx = sorted.indexOf(d);
        // Handle ties - use average rank
        const count = sorted.filter(v => v === d).length;
        const firstIdx = sorted.indexOf(d);
        return firstIdx + 1 + (count - 1) / 2;
    });
    
    // Sum ranks for positive and negative differences
    let wPlus = 0;
    let wMinus = 0;
    for (let i = 0; i < nonZeroDiffs.length; i++) {
        if (nonZeroDiffs[i] > 0) wPlus += ranks[i];
        else wMinus += ranks[i];
    }
    
    const n = nonZeroDiffs.length;
    const w = Math.min(wPlus, wMinus);
    
    // Normal approximation for n > 10
    let pValue: number;
    if (n > 10) {
        const meanW = n * (n + 1) / 4;
        const stdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
        const z = (w - meanW) / stdW;
        pValue = 2 * (1 - normalCDF(Math.abs(z)));
    } else {
        // Exact test for small n - simplified
        pValue = 0.1; // Conservative
    }
    
    const medianDiff = sorted[Math.floor(sorted.length / 2)];
    
    return { pValue, significant: pValue < 0.05, medianDiff };
}

// Standard normal CDF
function normalCDF(x: number): number {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function compareArms(armA: ArmResult, armB: ArmResult): ComparisonResult {
    const mcNemar = mcNemarTest(armA.caseResults, armB.caseResults);
    const wilcoxon = wilcoxonTest(armA.caseResults, armB.caseResults);
    
    // Corrections difference
    const totalCorrectionsA = armA.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    const totalCorrectionsB = armB.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    const correctionsDiff = totalCorrectionsB - totalCorrectionsA;
    
    return {
        armA,
        armB,
        mcNemar,
        wilcoxon,
        correctionsDiff,
    };
}

function printComparison(result: ComparisonResult): void {
    console.log('\n' + '='.repeat(70));
    console.log('E2 CAPTURE-FLOW A/B TEST RESULTS');
    console.log('='.repeat(70));
    
    // Summary stats
    const statsA = summarizeArm(result.armA);
    const statsB = summarizeArm(result.armB);
    
    console.log('\n📊 ARM SUMMARY:');
    console.log('Metric'.padEnd(25) + `${result.armA.armName}`.padEnd(20) + `${result.armB.armName}`);
    console.log('-'.repeat(70));
    console.log('Completion rate'.padEnd(25) + `${(statsA.completionRate * 100).toFixed(1)}%`.padEnd(20) + `${(statsB.completionRate * 100).toFixed(1)}%`);
    console.log('Median timeToCapture (ms)'.padEnd(25) + `${statsA.medianTime}`.padEnd(20) + `${statsB.medianTime}`);
    console.log('Mean timeToCapture (ms)'.padEnd(25) + `${statsA.meanTime.toFixed(0)}`.padEnd(20) + `${statsB.meanTime.toFixed(0)}`);
    console.log('Total corrections'.padEnd(25) + `${statsA.totalCorrections}`.padEnd(20) + `${statsB.totalCorrections}`);
    console.log('Total runs'.padEnd(25) + `${statsA.totalRuns}`.padEnd(20) + `${statsB.totalRuns}`);
    
    console.log('\n⚖️  STATISTICAL TESTS:');
    console.log(`McNemar (completion): p=${result.mcNemar.pValue.toFixed(4)} ${result.mcNemar.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'}`);
    console.log(`Wilcoxon (timeToCapture): p=${result.wilcoxon.pValue.toFixed(4)} ${result.wilcoxon.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'} (median diff: ${result.wilcoxon.medianDiff}ms)`);
    console.log(`Corrections diff (B-A): ${result.correctionsDiff > 0 ? '+' : ''}${result.correctionsDiff} ${result.correctionsDiff > 5 ? '⚠️ GUARDRAIL TRIGGERED' : '✅ OK'}`);
    
    console.log('\n🏆 DECISION:');
    const aBetter = result.mcNemar.significant && result.armA.caseResults.filter(r => r.success).length > result.armB.caseResults.filter(r => r.success).length;
    const bBetter = result.mcNemar.significant && result.armB.caseResults.filter(r => r.success).length > result.armA.caseResults.filter(r => r.success).length;
    const timeBetter = result.wilcoxon.significant && result.wilcoxon.medianDiff > 0; // B faster if positive
    
    if (aBetter && !timeBetter) {
        console.log(`  Winner: ${result.armA.armName} (significantly higher completion)`);
    } else if (bBetter && timeBetter) {
        console.log(`  Winner: ${result.armB.armName} (significantly higher completion AND faster)`);
    } else if (bBetter) {
        console.log(`  Winner: ${result.armB.armName} (significantly higher completion, but time not significantly better)`);
    } else if (timeBetter) {
        console.log(`  Winner: ${result.armB.armName} (significantly faster, completion not significantly different)`);
    } else {
        console.log(`  No significant difference — retain incumbent`);
    }
    
    // Per-case breakdown
    console.log('\n📋 PER-CASE BREAKDOWN:');
    console.log('Case'.padEnd(30) + 'A completion'.padEnd(15) + 'B completion'.padEnd(15) + 'A time(ms)'.padEnd(12) + 'B time(ms)');
    console.log('-'.repeat(84));
    
    const mapA = new Map<string, CaseArmResult[]>();
    const mapB = new Map<string, CaseArmResult[]>();
    
    for (const r of result.armA.caseResults) {
        const arr = mapA.get(r.caseId) || [];
        arr.push(r);
        mapA.set(r.caseId, arr);
    }
    for (const r of result.armB.caseResults) {
        const arr = mapB.get(r.caseId) || [];
        arr.push(r);
        mapB.set(r.caseId, arr);
    }
    
    for (const caseId of mapA.keys()) {
        const aResults = mapA.get(caseId)!;
        const bResults = mapB.get(caseId) || [];
        
        const aSuccess = aResults.filter(r => r.success).length;
        const bSuccess = bResults.filter(r => r.success).length;
        const aTime = Math.round(aResults.reduce((s, r) => s + r.metrics.timeToCaptureMs, 0) / aResults.length);
        const bTime = bResults.length > 0 ? Math.round(bResults.reduce((s, r) => s + r.metrics.timeToCaptureMs, 0) / bResults.length) : 0;
        
        console.log(`${caseId.padEnd(30)} ${String(aSuccess).padEnd(15)} ${String(bSuccess).padEnd(15)} ${String(aTime).padEnd(12)} ${bTime}`);
    }
}

function summarizeArm(arm: ArmResult): { completionRate: number; medianTime: number; meanTime: number; totalCorrections: number; totalRuns: number } {
    const totalRuns = arm.caseResults.length;
    const successful = arm.caseResults.filter(r => r.success).length;
    const completionRate = totalRuns > 0 ? successful / totalRuns : 0;
    
    const times = arm.caseResults.map(r => r.metrics.timeToCaptureMs).sort((a, b) => a - b);
    const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
    const meanTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const totalCorrections = arm.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    
    return { completionRate, medianTime, meanTime, totalCorrections, totalRuns };
}

export async function runE2CaptureTest(config: CaptureTestConfig = {}): Promise<void> {
    console.log('🧪 E2 Capture-flow Parameter A/B Test (S-UI)');
    console.log('=============================================\n');
    
    const repetitions = config.repetitions ?? 3;
    const headless = config.headless !== false;
    const output = config.output;
    
    console.log(`Arms: ${Object.keys(E2_ARMS).join(' vs ')}`);
    console.log(`Repetitions: ${repetitions}`);
    console.log(`Headless: ${headless}`);
    
    // Load validation capture cases
    const cases = loadValidationCaptureCases();
    console.log(`Cases: ${cases.map(c => c.id).join(', ')}`);
    
    if (cases.length === 0) {
        console.log('❌ No validation capture cases found');
        return;
    }
    
    // Run both arms
    const armA = await runArm('A-autoFocus-placeholder', E2_ARMS['A-autoFocus-placeholder'], cases, repetitions, headless);
    const armB = await runArm('B-initialOp-enumHint', E2_ARMS['B-initialOp-enumHint'], cases, repetitions, headless);
    
    // Compare
    const comparison = compareArms(armA, armB);
    printComparison(comparison);
    
    // Save results
    if (output) {
        const saveData = {
            timestamp: new Date().toISOString(),
            config: { repetitions, headless },
            arms: {
                A: { name: armA.armName, patch: armA.patch, caseResults: armA.caseResults },
                B: { name: armB.armName, patch: armB.patch, caseResults: armB.caseResults },
            },
            comparison: {
                mcNemar: comparison.mcNemar,
                wilcoxon: comparison.wilcoxon,
                correctionsDiff: comparison.correctionsDiff,
            },
        };
        writeFileSync(output, JSON.stringify(saveData, null, 2));
        console.log(`\n💾 Results saved to ${output}`);
    }
}