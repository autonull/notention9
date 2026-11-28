import { BaseCommand, type CommandContext } from './command.js';
import { getEvidenceDir } from '@notention/core/constants/paths';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const FindingsCommand = BaseCommand.create({
    name: 'findings',
    description: 'List findings from optimization runs',
    usage: 'findings [--json] [--a11y] [--status <open|fixed|verified>]',
    flags: [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show only accessibility findings' },
        { name: 'status', type: 'string', description: 'Filter by status (open|fixed|verified)' }
    ],
    execute: async function(this: BaseCommand, parsed, _context: CommandContext) {
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

        const status = this.getStringFlag(parsed, 'status');
        const filteredFindings = status
            ? allFindings.filter((f: any) => f.status === status)
            : allFindings;

        if (this.getBooleanFlag(parsed, 'json')) {
            this.printJson(filteredFindings);
        } else if (this.getBooleanFlag(parsed, 'a11y')) {
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