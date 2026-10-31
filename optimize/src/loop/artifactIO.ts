/**
 * Shared artifact I/O utilities for CLI subcommands
 */

import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { loadOrRunFastBaseline, runFastEvaluation } from '../synthesis/fastEvaluator.js';
import type { BaselineResult } from '../synthesis/fastEvaluator.js';

export async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

export { loadOrRunFastBaseline, runFastEvaluation };

export async function readJsonArtifact<T>(path: string): Promise<T | null> {
    try {
        const content = await readFile(path, 'utf-8');
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

export async function writeJsonArtifact(path: string, data: unknown, dry: boolean): Promise<void> {
    if (!dry) {
        await ensureDir(join(path, '..'));
        await writeFile(path, JSON.stringify(data, null, 2));
    }
}

export async function writeJsonlArtifact(path: string, lines: string[], dry: boolean): Promise<void> {
    if (!dry) {
        await ensureDir(join(path, '..'));
        await writeFile(path, lines.join('\n') + '\n');
    }
}

export interface ArtifactPaths {
    outputDir: string;
    discovered: string;
    tasks: string;
    golden: string;
    gateReports: string;
    candidatesDir: string;
    baseline: string;
    evaluationReport: string;
    adoption: string;
    prioritized: string;
}

export function getArtifactPaths(outputDir: string): ArtifactPaths {
    return {
        outputDir,
        discovered: join(outputDir, 'discovered.json'),
        tasks: join(outputDir, 'tasks.json'),
        golden: join(outputDir, 'golden.jsonl'),
        gateReports: join(outputDir, 'gate-reports.json'),
        candidatesDir: join(outputDir, 'candidates'),
        baseline: join(outputDir, 'baseline.json'),
        evaluationReport: join(outputDir, 'evaluation-report.json'),
        adoption: join(outputDir, 'adoption.json'),
        prioritized: join(outputDir, 'prioritized.json'),
    };
}

export async function loadDiscoveredArtifact(outputDir: string): Promise<any | null> {
    return readJsonArtifact(join(outputDir, 'discovered.json'));
}

export async function loadGateReports(outputDir: string): Promise<any[] | null> {
    return readJsonArtifact(join(outputDir, 'gate-reports.json'));
}

export async function loadEvaluationReport(outputDir: string): Promise<any | null> {
    return readJsonArtifact(join(outputDir, 'evaluation-report.json'));
}

export async function loadBaseline(outputDir: string): Promise<BaselineResult[] | null> {
    return readJsonArtifact(join(outputDir, 'baseline.json'));
}

export async function loadCandidatesFromDir(candidatesDir: string): Promise<any> {
    const { loadCandidates } = await import('../synthesis/StrategySpec.js');
    return loadCandidates(candidatesDir);
}

export async function findLatestRunDir(baseDir: string): Promise<string | null> {
    try {
        const entries = await readdir(baseDir);
        const runDirs = entries
            .filter(e => e.startsWith('run-'))
            .sort()
            .reverse();
        if (runDirs.length > 0) {
            return join(baseDir, runDirs[0]);
        }
    } catch {
        // Ignore
    }
    return null;
}

export function printDryRunMessage(dry: boolean, json: boolean, data?: any): void {
    if (dry) {
        console.log('\n🔍 Dry run - no files written');
        if (json && data) console.log(JSON.stringify(data, null, 2));
    }
}

