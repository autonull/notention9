import { createCommand } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent';
import { getEvidenceDir } from '@notention/core/constants/paths';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const FindingsCommand = createCommand({
    name: 'findings',
    description: 'List findings from optimization runs',
    usage: 'findings [--json] [--a11y] [--status <open|fixed|verified>]',
    async run(args, context) {
        const json = args.includes('--json');
        const a11y = args.includes('--a11y');
        const statusIndex = args.indexOf('--status');
        const status = statusIndex !== -1 ? args[statusIndex + 1] : undefined;
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

        const allFindings = runDirs.map(runId => {
            const findingsPath = join(evidenceDir, runId, 'findings.json');
            if (existsSync(findingsPath)) {
                const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
                return findings.map((f: any) => ({ ...f, runId }));
            }
            return [];
        }).flat();

        const filteredFindings = status
            ? allFindings.filter((f: any) => f.status === status)
            : allFindings;

        if (json) {
            console.log(JSON.stringify(filteredFindings, null, 2));
        } else if (a11y) {
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

            if (status) {
                console.log(`Filtered by status: ${status}`);
            }
            console.log(`Total: ${filteredFindings.length} finding(s)`);
        }

        return true;
    }
});