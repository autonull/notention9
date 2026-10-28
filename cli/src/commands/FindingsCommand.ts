import { createCommand } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent';
import { getEvidenceDir } from '@notention/core/constants/paths';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const FindingsCommand = createCommand({
    name: 'findings',
    description: 'List findings from optimization runs',
    usage: 'findings [--json] [--a11y]',
    async run(args, context) {
        const json = args.includes('--json');
        const a11y = args.includes('--a11y');
        const evidenceDir = await getEvidenceDir();

        if (!existsSync(evidenceDir)) {
            console.log('No evidence directory found');
            return true;
        }

        const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name.startsWith('run_'))
            .map(d => d.name);

        if (runDirs.length === 0) {
            console.log('No optimization runs found');
            return true;
        }

        if (json) {
            const findings = runDirs.map(runId => {
                const findingsPath = join(evidenceDir, runId, 'findings.json');
                if (existsSync(findingsPath)) {
                    return JSON.parse(readFileSync(findingsPath, 'utf-8'));
                }
                return [];
            }).flat();
            console.log(JSON.stringify(findings, null, 2));
        } else if (a11y) {
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

        return true;
    }
});