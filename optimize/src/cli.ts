#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateJourneyFile(journey: any): string {
    const stepsCode = journey.steps.map((step: any, i: number) => {
        const props = Object.entries(step)
            .filter(([k]) => k !== 'kind')
            .map(([k, v]) => `        ${k}: ${JSON.stringify(v)}`)
            .join(',\n');
        return `    { kind: '${step.kind}',\n${props}\n    }`;
    }).join(',\n');

    return `import { registerJourney } from '@notention/optimize/registry';
import type { JourneySpec } from '@notention/optimize/journey';

const journey: JourneySpec = {
    id: '${journey.id}',
    version: ${journey.version},
    intent: '${journey.intent}',
    journeysTouched: ${JSON.stringify(journey.journeysTouched)},
    seed: ${JSON.stringify(journey.seed, null, 4)},
    steps: [
${stepsCode}
    ],
    status: '${journey.status}',
};

registerJourney(journey);
`;
}

function generateTestFile(journey: any): string {
    // Build the test file with imports at the top
    const stepsCode = journey.steps.map((step: any, i: number) => {
        const props = Object.entries(step)
            .filter(([k]) => k !== 'kind')
            .map(([k, v]) => `        ${k}: ${JSON.stringify(v)}`)
            .join(',\n');
        return `    { kind: '${step.kind}',\n${props}\n    }`;
    }).join(',\n');

    return `import { registerJourney } from '@notention/optimize/registry';
import type { JourneySpec } from '@notention/optimize/journey';
import { test } from '@playwright/test';

const journey: JourneySpec = {
    id: '${journey.id}',
    version: ${journey.version},
    intent: '${journey.intent}',
    journeysTouched: ${JSON.stringify(journey.journeysTouched)},
    seed: ${JSON.stringify(journey.seed, null, 4)},
    steps: [
${stepsCode}
    ],
    status: '${journey.status}',
};

registerJourney(journey);

test('optimize: ${journey.id}', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    const { runJourneyTest } = await import('../support/journeyTest');
    await runJourneyTest('${journey.id}', page);
});
`;
}

interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings' | 'replay' | 'generate-test' | 'mark-fixed';
    journey?: string;
    target?: string;
    runId?: string;
    findingId?: string;
    json?: boolean;
    a11y?: boolean;
    status?: string;
    commitSha?: string;
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}

function parseOptimizeIntent(args: string[], json: boolean, a11y: boolean, status?: string, commitSha?: string): OptimizeIntent {
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
            return { action: 'findings', constraints: { privacy: 'private' }, mode: 'report-only', json, a11y, status };
        }
        case 'replay': {
            const runId = rest[0];
            if (!runId) throw new Error('Run ID required for replay');
            return { action: 'replay', runId, constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'generate-test': {
            const findingId = rest[0];
            if (!findingId) throw new Error('Finding ID required for generate-test');
            return { action: 'generate-test', findingId, constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'mark-fixed': {
            const findingId = rest[0];
            if (!findingId) throw new Error('Finding ID required for mark-fixed');
            const sha = rest[1] || commitSha || 'manual';
            return { action: 'mark-fixed', findingId, commitSha: sha, constraints: { privacy: 'private' }, mode: 'report-only', json, a11y };
        }
        case 'help':
        case '--help':
        case '-h': {
            printHelp();
            process.exit(0);
        }
        default:
            throw new Error(`Unknown subcommand: ${subcommand}. Use: optimize, reproduce, findings, replay, generate-test, mark-fixed, help`);
    }
}

function printHelp(): void {
    console.log(`
Usage: pnpm optimize <command> [args]

Commands:
  optimize <journeyId>         Run optimization journey
  reproduce <findingId|runId>  Reproduce a finding or replay a run
  findings [--status <status>] List findings (filter by status: open, fixed, verified)
  replay <runId>               Replay a run from evidence bundle
  generate-test <findingId>    Generate regression test from finding
  mark-fixed <findingId> [sha] Mark a finding as fixed (optional commit SHA)
  help                         Show this help

Options:
  --json                   Output as JSON
  --allow-draft            Allow draft journeys
  --a11y                   Show accessibility findings
  --status <status>        Filter findings by status (open|fixed|verified)
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
    
    // Handle --status flag (both --status=value and --status value formats)
    let status: string | undefined;
    const statusIndex = rawArgs.findIndex(r => r === '--status');
    if (statusIndex !== -1 && statusIndex + 1 < rawArgs.length) {
        status = rawArgs[statusIndex + 1];
    } else {
        const statusFlag = rawArgs.find(r => r.startsWith('--status='));
        if (statusFlag) {
            status = statusFlag.split('=')[1];
        }
    }
    
    // Handle --commit flag for mark-fixed
    let commitSha: string | undefined;
    const commitIndex = rawArgs.findIndex(r => r === '--commit');
    if (commitIndex !== -1 && commitIndex + 1 < rawArgs.length) {
        commitSha = rawArgs[commitIndex + 1];
    } else {
        const commitFlag = rawArgs.find(r => r.startsWith('--commit='));
        if (commitFlag) {
            commitSha = commitFlag.split('=')[1];
        }
    }
    
    const filteredArgs = rawArgs.filter((r, i) => 
        r !== '--json' && 
        r !== '--a11y' && 
        r !== '--allow-draft' && 
        r !== '--status' && 
        r !== '--commit' &&
        !r.startsWith('--status=') &&
        !r.startsWith('--commit=') &&
        !(i === statusIndex + 1 && rawArgs[statusIndex] === '--status') &&
        !(i === commitIndex + 1 && rawArgs[commitIndex] === '--commit')
    );

    const { positionals } = parseArgs({ args: filteredArgs, allowPositionals: true });

    if (positionals.length === 0) {
        printHelp();
        process.exit(0);
    }

    try {
        const intent = parseOptimizeIntent(positionals, json, a11y, status, commitSha);

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
        } else if (intent.action === 'replay' && intent.runId) {
            console.log(`🔁 Replaying run: ${intent.runId}`);

            const { loadBundle } = await import('@notention/optimize');
            const bundle = await loadBundle(intent.runId);
            if (!bundle) {
                console.error(`Bundle not found for run: ${intent.runId}`);
                process.exit(1);
            }

            const runId = `replay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            process.env.NOTENTION_REPLAY_RUN_ID = intent.runId;
            process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

            const result = spawnSync('pnpm', [
                '--filter', '@notention/ui',
                'test:e2e',
                '--project=optimize',
                `--grep=replay`
            ], {
                cwd: join(__dirname, '../..'),
                stdio: 'inherit',
                env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true' }
            });

            if (result.status === 0) {
                console.log(`✅ Replay completed. Replay Run ID: ${runId}`);
            } else {
                console.log(`❌ Replay failed. Replay Run ID: ${runId}`);
            }
            process.exit(result.status ?? 1);
        } else if (intent.action === 'generate-test' && intent.findingId) {
            console.log(`🧪 Generating regression test for finding: ${intent.findingId}`);
            const { getEvidenceDir } = await import('@notention/core');
            const { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } = await import('fs');
            const { join } = await import('path');
            const { loadBundle: loadBundleReplay } = await import('@notention/optimize/replay');
            const { validateFinding } = await import('@notention/optimize/finding');

            const evidenceDir = await getEvidenceDir();

            if (!existsSync(evidenceDir)) {
                console.error('No evidence directory found');
                process.exit(1);
            }

            // Find the finding
            const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
                .filter(d => d.isDirectory() && d.name.startsWith('run_'))
                .map(d => d.name);

            let foundFinding: any = null;
            let foundRunId: string | null = null;

            for (const runId of runDirs) {
                const findingsPath = join(evidenceDir, runId, 'findings.json');
                if (existsSync(findingsPath)) {
                    const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                    const finding = findings.find((f: any) => f.id === intent.findingId);
                    if (finding) {
                        foundFinding = finding;
                        foundRunId = runId;
                        break;
                    }
                }
            }

            if (!foundFinding || !foundRunId) {
                console.error(`Finding not found: ${intent.findingId}`);
                process.exit(1);
            }

            console.log(`Found finding in run: ${foundRunId}`);
            const finding = validateFinding(foundFinding);

            // Extract journeyId from reproduction (handle both old string format and new object format)
            const reproductionJourneyId = typeof finding.reproduction === 'object'
                ? finding.reproduction.journeyId
                : finding.journey; // Use the finding's journey field
            
            // Use the runId where the finding was found as the bundle
            const reproductionBundle = foundRunId;
            
            if (!reproductionBundle) {
                console.error(`Finding has no reproduction bundle`);
                process.exit(1);
            }

            // Generate regression test directly (without JourneySynthesizer to avoid DiscoveryEngine)
            const bundle = await loadBundleReplay(reproductionBundle);
            if (!bundle) {
                console.error(`Bundle not found for run: ${reproductionBundle}`);
                process.exit(1);
            }

            // Extract the state path from the finding location
            const statePath = finding.location; // e.g., "note.propertyIndex.framework"
            
            // Find the expected value from the original bundle's snapshots
            let expectedValue: unknown = null;
            function resolvePath(obj: unknown, path: string): unknown {
                if (obj === null || obj === undefined) return undefined;
                const parts = path.split('.');
                let current: unknown = obj;
                for (const part of parts) {
                    if (current === null || current === undefined) return undefined;
                    if (typeof current === 'object' && current !== null) {
                        current = (current as Record<string, unknown>)[part];
                    } else {
                        return undefined;
                    }
                }
                return current;
            }

            for (const snapshot of bundle.snapshots) {
                const value = resolvePath(snapshot.state, statePath);
                if (value !== undefined) {
                    expectedValue = value;
                    break;
                }
            }

            // Known journeys - return minimal data without triggering full module load
            const knownJourneys: Record<string, any> = {
                'capture-and-edit': {
                    seed: { 
                        notes: [{
                            id: 'scene-editor-note',
                            title: 'Scene Editor Note',
                            content: 'Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React, TypeScript"></span>',
                            tags: ['development'],
                            properties: [{ key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] }],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                            privacy: 'private',
                            priority: 1,
                        }], 
                        settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } }
                    },
                    steps: [
                        { kind: 'seed', notes: [], settings: {} },
                        { kind: 'navigate', hash: 'notes/scene-editor-note' },
                        { kind: 'act', target: { testId: 'add-detail' }, action: 'click' },
                        { kind: 'act', target: { testId: 'property-key-input', modal: 'Add detail' }, action: 'fill', value: 'framework' },
                        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'select', value: 'contains' },
                        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
                        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'click' },
                        { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
                        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
                        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
                        { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
                        { kind: 'capture', label: 'after-edit' },
                    ],
                },
                'capture-and-edit-keyboard': {
                    seed: { 
                        notes: [{
                            id: 'scene-editor-note',
                            title: 'Scene Editor Note',
                            content: 'Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React, TypeScript"></span>',
                            tags: ['development'],
                            properties: [{ key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] }],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                            privacy: 'private',
                            priority: 1,
                        }], 
                        settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } }
                    },
                    steps: [
                        { kind: 'seed', notes: [], settings: {} },
                        { kind: 'navigate', hash: 'notes/scene-editor-note' },
                        { kind: 'act', target: { testId: 'add-detail' }, action: 'press', value: 'Enter' },
                        { kind: 'script', code: 'new Promise(r => setTimeout(r, 500))' },
                        { kind: 'act', target: { testId: 'property-key-input', modal: 'Add detail' }, action: 'fill', value: 'framework' },
                        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Tab' },
                        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'ArrowDown' },
                        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Enter' },
                        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'press', value: 'Tab' },
                        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
                        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Tab' },
                        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Enter' },
                        { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
                        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
                        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
                        { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
                        { kind: 'capture', label: 'after-edit-keyboard' },
                    ],
                },
                'publish-gate': {
                    seed: { notes: [], settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } } },
                    steps: [
                        { kind: 'seed', notes: [], settings: {} },
                        { kind: 'navigate', hash: 'notes/private-note-for-publish' },
                        { kind: 'act', target: { role: 'button', name: 'publish' }, action: 'click' },
                        { kind: 'assertState', path: 'pendingConfirmations.0.action', equals: 'publish' },
                        { kind: 'act', target: { role: 'button', name: 'cancel' }, action: 'click' },
                        { kind: 'assertState', path: 'note.privacy', equals: 'private' },
                        { kind: 'capture', label: 'after-cancel' },
                        { kind: 'assertNoConsoleErrors' },
                    ],
                },
            };

            const originalJourney = knownJourneys[reproductionJourneyId];
            
            // Build steps for the regression test
            const steps: any[] = [];

            // 1. Seed from the original journey's seed
            if (originalJourney) {
                steps.push({ kind: 'seed', notes: originalJourney.seed.notes, settings: originalJourney.seed.settings });
            } else {
                steps.push({ kind: 'seed', notes: [], settings: { theme: 'dark', ontology: [] } });
            }

            // 2. Navigate to the note (use the original journey's navigation if available)
            if (originalJourney) {
                for (const step of originalJourney.steps) {
                    if (step.kind === 'navigate') {
                        steps.push(step);
                        break;
                    }
                }
            } else {
                steps.push({ kind: 'navigate', hash: 'notes/scene-editor-note' });
            }

            // 3. Add initial assertion - state should exist
            const expectAny = { __expectAny: true, type: String };
            steps.push({ kind: 'assertState', path: 'note.id', equals: expectAny });

            // 4. Add the specific regression assertion - this is the key part
            steps.push({ 
                kind: 'assertState', 
                path: statePath, 
                equals: expectedValue ?? [] // Expected value from bundle
            });

            // 5. Console errors check
            steps.push({ kind: 'assertNoConsoleErrors' });

            const regressionJourney = {
                id: `regression-${finding.id}`,
                version: 1,
                intent: `Regression test for finding: ${finding.title}`,
                journeysTouched: ['regression', finding.journey],
                seed: originalJourney?.seed ?? { notes: [], settings: { theme: 'dark', ontology: [] } },
                steps,
                status: 'ready',
            };

            // Write to regressions directory
            const regressionsDir = join(__dirname, '../../ui/test/optimize/regressions');
            if (!existsSync(regressionsDir)) {
                mkdirSync(regressionsDir, { recursive: true });
            }

            const testCode = generateTestFile(regressionJourney);
            const outputPath = join(regressionsDir, `${finding.id}.journey.ts`);
            writeFileSync(outputPath, testCode);

            console.log(`✅ Generated regression test: ${outputPath}`);
            console.log(`Journey ID: ${regressionJourney.id}`);
            console.log(`Status: ${regressionJourney.status}`);
            process.exit(0);
        } else if (intent.action === 'reproduce' && intent.target) {
            console.log(`🔁 Reproducing: ${intent.target}`);
            // Delegate to CLI reproduce command which handles finding ID lookup
            const { loadBundle, planReplay } = await import('@notention/optimize');

            // Try to load as runId first
            const bundle = await loadBundle(intent.target);
            if (bundle) {
                console.log(`🔁 Replaying run: ${intent.target}`);
                const { command, env } = planReplay(bundle);
                console.log(`Command: ${command}`);
                console.log(`Env: ${JSON.stringify(env)}`);

                const runId = `replay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                process.env.NOTENTION_REPLAY_RUN_ID = intent.target;
                process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

                const result = spawnSync('pnpm', [
                    '--filter', '@notention/ui',
                    'test:e2e',
                    '--project=optimize',
                    `--grep=replay`
                ], {
                    cwd: join(__dirname, '../..'),
                    stdio: 'inherit',
                    env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true', ...env }
                });

                if (result.status === 0) {
                    console.log(`✅ Replay completed. Replay Run ID: ${runId}`);
                } else {
                    console.log(`❌ Replay failed. Replay Run ID: ${runId}`);
                }
                process.exit(result.status ?? 1);
            }

            // Try as finding ID - scan index.jsonl
            console.log(`🔁 Reproducing finding: ${intent.target}`);
            const { getEvidenceDir } = await import('@notention/core');
            const { readFileSync, existsSync, readdirSync } = await import('fs');
            const { join: pathJoin } = await import('path');

            const evidenceDir = await getEvidenceDir();

            if (!existsSync(evidenceDir)) {
                console.error('No evidence directory found');
                process.exit(1);
            }

            const indexPath = pathJoin(evidenceDir, 'index.jsonl');
            let foundRunId: string | null = null;
            let foundFinding: any = null;

            if (existsSync(indexPath)) {
                const lines = readFileSync(indexPath, 'utf-8').trim().split('\n').filter(Boolean);
                // Search from most recent to oldest
                for (let i = lines.length - 1; i >= 0; i--) {
                    const entry = JSON.parse(lines[i]);
                    if (entry.type === 'finding' && entry.finding.id === intent.target) {
                        foundRunId = entry.runId;
                        foundFinding = entry.finding;
                        break;
                    }
                }
            }

            if (!foundRunId) {
                // Fallback: scan all findings.json files (most recent first)
                const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
                    .filter(d => d.isDirectory() && d.name.startsWith('run_'))
                    .map(d => d.name)
                    .sort()
                    .reverse();

                for (const runId of runDirs) {
                    const findingsPath = pathJoin(evidenceDir, runId, 'findings.json');
                    if (existsSync(findingsPath)) {
                        const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                        const finding = findings.find((f: any) => f.id === intent.target);
                        if (finding) {
                            foundRunId = runId;
                            foundFinding = finding;
                            break;
                        }
                    }
                }
            }

            if (!foundRunId || !foundFinding) {
                console.error(`Finding not found: ${intent.target}`);
                process.exit(1);
            }

            console.log(`Found finding in run: ${foundRunId}`);
            console.log(`Journey: ${foundFinding.reproduction?.journeyId}, Version: ${foundFinding.reproduction?.version}`);

            const replayBundle = await loadBundle(foundRunId);
            if (!replayBundle) {
                console.error(`Bundle not found for run: ${foundRunId}`);
                process.exit(1);
            }

            const runId = `replay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            process.env.NOTENTION_REPLAY_RUN_ID = foundRunId;
            process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

            const result = spawnSync('pnpm', [
                '--filter', '@notention/ui',
                'test:e2e',
                '--project=optimize',
                `--grep=replay`
            ], {
                cwd: join(__dirname, '../..'),
                stdio: 'inherit',
                env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true' }
            });

            if (result.status === 0) {
                console.log(`✅ Reproduction completed. Replay Run ID: ${runId}`);
                // Check if the finding was reproduced
                const { verifyReplay } = await import('@notention/optimize/replay');
                const actualReplayRunId = `replay_${foundRunId}`;
                const verification = await verifyReplay(foundRunId, actualReplayRunId);
                if (verification.reproduced) {
                    console.log('REPRODUCED');
                } else if (verification.verifiedFix) {
                    console.log('VERIFIED');
                } else if (verification.passed) {
                    console.log('PASSED');
                } else {
                    console.log('UNEXPECTED');
                }
            } else {
                console.log(`❌ Reproduction failed. Replay Run ID: ${runId}`);
            }
            process.exit(result.status ?? 1);
        } else if (intent.action === 'mark-fixed' && intent.findingId) {
            console.log(`🔧 Marking finding as fixed: ${intent.findingId}`);
            const { getEvidenceDir } = await import('@notention/core');
            const { readFileSync, existsSync, readdirSync } = await import('fs');
            const { join } = await import('path');
            const { updateFindingStatus } = await import('@notention/optimize/replay');

            const evidenceDir = await getEvidenceDir();

            if (!existsSync(evidenceDir)) {
                console.error('No evidence directory found');
                process.exit(1);
            }

            // Try index.jsonl first for fast lookup
            const indexPath = join(evidenceDir, 'index.jsonl');
            let foundRunId: string | null = null;
            let foundFinding: any = null;

            if (existsSync(indexPath)) {
                const lines = readFileSync(indexPath, 'utf-8').trim().split('\n').filter(Boolean);
                // Search from most recent to oldest
                for (let i = lines.length - 1; i >= 0; i--) {
                    const entry = JSON.parse(lines[i]);
                    if (entry.type === 'finding' && entry.finding.id === intent.findingId) {
                        foundRunId = entry.runId;
                        foundFinding = entry.finding;
                        break;
                    }
                }
            }

            // Fallback: scan all findings.json files (most recent first)
            if (!foundRunId) {
                const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
                    .filter(d => d.isDirectory() && d.name.startsWith('run_'))
                    .map(d => d.name)
                    .sort()
                    .reverse();

                for (const runId of runDirs) {
                    const findingsPath = join(evidenceDir, runId, 'findings.json');
                    if (existsSync(findingsPath)) {
                        const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                        const finding = findings.find((f: any) => f.id === intent.findingId);
                        if (finding) {
                            foundRunId = runId;
                            foundFinding = finding;
                            break;
                        }
                    }
                }
            }

            if (!foundRunId || !foundFinding) {
                console.error(`Finding not found: ${intent.findingId}`);
                process.exit(1);
            }

            console.log(`Found finding in run: ${foundRunId}`);
            const commitSha = intent.commitSha || 'manual';
            const updated = await updateFindingStatus(foundRunId, intent.findingId, 'fixed', commitSha);
            if (updated) {
                console.log(`✅ Finding ${intent.findingId} marked as fixed (commit: ${commitSha})`);
            } else {
                console.error(`Failed to mark finding as fixed`);
                process.exit(1);
            }
            process.exit(0);
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

            const allFindings = runDirs.map(runId => {
                const findingsPath = join(evidenceDir, runId, 'findings.json');
                if (existsSync(findingsPath)) {
                    const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                    return findings.map((f: any) => ({ ...f, runId }));
                }
                return [];
            }).flat();

            const filteredFindings = intent.status
                ? allFindings.filter((f: any) => f.status === intent.status)
                : allFindings;

            if (intent.json) {
                console.log(JSON.stringify(filteredFindings, null, 2));
            } else if (intent.a11y) {
                console.log('Accessibility findings:');
                for (const finding of filteredFindings) {
                    if (finding.id?.startsWith('a11y-')) {
                        console.log(`  [${finding.severity.toUpperCase()}] ${finding.title}`);
                        console.log(`    Run: ${finding.runId}`);
                        console.log(`    Location: ${finding.location}`);
                        console.log(`    WCAG: ${finding.wcagCriteria?.join(', ') || 'N/A'}`);
                        console.log(`    Impact: ${finding.userImpact}`);
                        console.log(`    Fix: ${finding.proposedFix}`);
                        console.log(`    Status: ${finding.status || 'open'}`);
                        console.log();
                    }
                }
            } else {
                console.log('Findings:');
                for (const finding of filteredFindings) {
                    console.log(`  [${finding.id}] ${finding.title}`);
                    console.log(`    Run: ${finding.runId}`);
                    console.log(`    Journey: ${finding.journey}`);
                    console.log(`    Location: ${finding.location}`);
                    console.log(`    Severity: ${finding.severity}`);
                    console.log(`    Status: ${finding.status || 'open'}`);
                    if (finding.fixedAt) console.log(`    Fixed: ${finding.fixedAt} (${finding.fixedBy})`);
                    if (finding.verifiedAt) console.log(`    Verified: ${finding.verifiedAt} (run: ${finding.verifiedRunId})`);
                    console.log();
                }

                if (intent.status) {
                    console.log(`Filtered by status: ${intent.status}`);
                }
                console.log(`Total: ${filteredFindings.length} finding(s)`);
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