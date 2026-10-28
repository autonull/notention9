#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings';
    journey?: string;
    target?: string;
    json?: boolean;
    a11y?: boolean;
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}

function parseOptimizeIntent(args: string[], json: boolean, a11y: boolean): OptimizeIntent {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
        case 'optimize': {
            const journey = rest[0];
            if (!journey) throw new Error('Journey ID required for optimize');
            return { action: 'optimize', journey, constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'reproduce': {
            const target = rest[0];
            if (!target) throw new Error('Finding ID or runId required for reproduce');
            return { action: 'reproduce', target, constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'findings': {
            return { action: 'findings', constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'help':
        case '--help':
        case '-h': {
            printHelp();
            process.exit(0);
        }
        default:
            throw new Error(`Unknown subcommand: ${subcommand}. Use: optimize, reproduce, findings, help`);
    }
}

function printHelp(): void {
    console.log(`
Usage: pnpm optimize <command> [args]

Commands:
  optimize <journeyId>     Run optimization journey
  reproduce <findingId>    Reproduce a finding
  findings                 List findings
  help                     Show this help

Options:
  --json                   Output as JSON
  --allow-draft            Allow draft journeys
  --replay <runId>         Replay a run
`);
}

async function main() {
    const rawArgs = process.argv.slice(2);

    // Handle --help before parseArgs
    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    // Extract flags before parseArgs
    const json = rawArgs.includes('--json');
    const a11y = rawArgs.includes('--a11y');
    const allowDraft = rawArgs.includes('--allow-draft');
    const filteredArgs = rawArgs.filter(r => r !== '--json' && r !== '--a11y' && r !== '--allow-draft');

    const { positionals } = parseArgs({ args: filteredArgs, allowPositionals: true });

    if (positionals.length === 0) {
        printHelp();
        process.exit(0);
    }

    try {
        const intent = parseOptimizeIntent(positionals, json, a11y);

        if (intent.action === 'optimize' && intent.journey) {
            // Check if journey exists and is ready (unless --allow-draft)
            const { getJourney } = await import('@notention/optimize');
            const journey = getJourney(intent.journey);
            if (!journey) {
                console.error(`Journey "${intent.journey}" not found`);
                const readyJourneys = (await import('@notention/optimize')).getReadyJourneys().map(j => j.id);
                console.error('Available ready journeys:', readyJourneys.join(', '));
                process.exit(1);
            }
            if (journey.status === 'draft' && !allowDraft) {
                console.error(`Journey "${intent.journey}" is a draft. Use --allow-draft to run it.`);
                process.exit(1);
            }

            console.log(`🔍 Running optimization journey: ${intent.journey}`);
            const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

            const result = spawnSync('pnpm', [
                '--filter', '@notention/ui',
                'test:e2e',
                '--project=optimize',
                `--grep=${intent.journey}`
            ], {
                cwd: join(__dirname, '../..'),
                stdio: 'inherit',
                env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true' }
            });

            if (result.status === 0) {
                console.log(`✅ Journey passed. Run ID: ${runId}`);
            } else {
                console.log(`❌ Journey failed. Run ID: ${runId}`);
            }
            process.exit(result.status ?? 1);
        } else if (intent.action === 'reproduce' && intent.target) {
            console.log(`🔁 Reproducing: ${intent.target}`);
            // TODO: implement replay
            process.exit(1);
        } else if (intent.action === 'findings') {
            const { getEvidenceDir } = await import('@notention/core');
            const { readFileSync, existsSync, readdirSync } = await import('fs');
            const { join } = await import('path');

            const evidenceDir = await getEvidenceDir();

            if (!existsSync(evidenceDir)) {
                console.log('No evidence directory found');
                process.exit(0);
            }

            const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
                .filter(d => d.isDirectory() && d.name.startsWith('run_'))
                .map(d => d.name);

            if (runDirs.length === 0) {
                console.log('No optimization runs found');
                process.exit(0);
            }

            if (intent.json) {
                const findings = runDirs.map(runId => {
                    const findingsPath = join(evidenceDir, runId, 'findings.json');
                    if (existsSync(findingsPath)) {
                        return JSON.parse(readFileSync(findingsPath, 'utf-8'));
                    }
                    return [];
                }).flat();
                console.log(JSON.stringify(findings, null, 2));
            } else if (intent.a11y) {
                console.log('Accessibility findings:');
                for (const runId of runDirs) {
                    const findingsPath = join(evidenceDir, runId, 'findings.json');
                    if (existsSync(findingsPath)) {
                        const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                        for (const finding of findings) {
                            if (finding.id?.startsWith('a11y-')) {
                                console.log(`  [${finding.severity.toUpperCase()}] ${finding.title}`);
                                console.log(`    Run: ${runId}`);
                                console.log(`    Location: ${finding.location}`);
                                console.log(`    WCAG: ${finding.wcagCriteria?.join(', ') || 'N/A'}`);
                                console.log(`    Impact: ${finding.userImpact}`);
                                console.log(`    Fix: ${finding.proposedFix}`);
                                console.log();
                            }
                        }
                    }
                }
            } else {
                console.log('Optimization runs:');
                for (const runId of runDirs) {
                    const findingsPath = join(evidenceDir, runId, 'findings.json');
                    let count = 0;
                    if (existsSync(findingsPath)) {
                        const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                        count = findings.length;
                    }
                    console.log(`  ${runId}: ${count} finding(s)`);
                }
            }
            process.exit(0);
        }
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}

main().catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});