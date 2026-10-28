import { createCommand } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent';
import { loadBundle, planReplay, verifyReplay } from '@notention/optimize/replay';
import { getEvidenceDir } from '@notention/core';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const ReproduceCommand = createCommand({
    name: 'reproduce',
    description: 'Reproduce a finding or run',
    usage: 'reproduce <findingId|runId>',
    validate: (args) => args.length > 0,
    async run(args, context) {
        const [target] = args;
        const intent = parseOptimizeIntent(['reproduce', target]);

        if (!intent.target) {
            console.error('Finding ID or runId required');
            return false;
        }

        // Try to load as runId first
        const bundle = await loadBundle(intent.target);
        if (bundle) {
            console.log(`🔁 Replaying run: ${intent.target}`);
            const { command, env } = planReplay(bundle);
            console.log(`Command: ${command}`);
            console.log(`Env: ${JSON.stringify(env)}`);
            return true;
        }

        // Try as finding ID - scan index.jsonl
        console.log(`🔁 Reproducing finding: ${intent.target}`);
        const evidenceDir = await getEvidenceDir();

        if (!existsSync(evidenceDir)) {
            console.error('No evidence directory found');
            return false;
        }

        const indexPath = join(evidenceDir, 'index.jsonl');
        let foundRunId: string | null = null;
        let foundFinding: any = null;

        if (existsSync(indexPath)) {
            const lines = readFileSync(indexPath, 'utf-8').trim().split('\n').filter(Boolean);
            for (const line of lines) {
                const entry = JSON.parse(line);
                if (entry.type === 'finding' && entry.finding.id === intent.target) {
                    foundRunId = entry.runId;
                    foundFinding = entry.finding;
                    break;
                }
            }
        }

        if (!foundRunId) {
            // Fallback: scan all findings.json files
            const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
                .filter(d => d.isDirectory() && d.name.startsWith('run_'))
                .map(d => d.name);

            for (const runId of runDirs) {
                const findingsPath = join(evidenceDir, runId, 'findings.json');
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
            return false;
        }

        console.log(`Found finding in run: ${foundRunId}`);
        console.log(`Journey: ${foundFinding.reproduction?.journeyId}, Version: ${foundFinding.reproduction?.version}`);

        const replayBundle = await loadBundle(foundRunId);
        if (!replayBundle) {
            console.error(`Bundle not found for run: ${foundRunId}`);
            return false;
        }

        const runId = `replay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        process.env.NOTENTION_REPLAY_RUN_ID = foundRunId;
        process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

        const { spawnSync } = await import('node:child_process');
        const result = spawnSync('pnpm', [
            '--filter', '@notention/ui',
            'test:e2e',
            '--project=optimize',
            `--grep=replay`
        ], {
            cwd: join(process.cwd(), '../..'),
            stdio: 'inherit',
            env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true' }
        });

        if (result.status === 0) {
            console.log(`✅ Reproduction completed. Replay Run ID: ${runId}`);
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
        return result.status === 0;
    }
});