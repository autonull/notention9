import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { listFindings } from '../../findingRepository.js';
import { isA11yFinding } from '../../cliHandlers/utils.js';

export class FindingsCommand extends Command {
    readonly name = 'findings';
    readonly description = 'List findings (filter by status: open, fixed, verified)';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
        { name: 'status', type: 'string', description: 'Filter findings by status (open|fixed|verified)' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');
        const status = this.getStringFlag(args, 'status');

        try {
            const findings = await listFindings(status);

            if (json) {
                this.printJson(findings);
                return 0;
            }

            if (a11y) {
                console.log('Accessibility findings:');
                for (const finding of findings) {
                    if (isA11yFinding(finding)) {
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
                return 0;
            }

            console.log('Findings:');
            for (const finding of findings) {
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
                this.printInfo(`Filtered by status: ${status}`);
            }
            this.printInfo(`Total: ${findings.length} finding(s)`);
            return 0;
        } catch (e) {
            return this.handleError(e);
        }
    }
}