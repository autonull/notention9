import { listFindings } from '../findingRepository.js';
import { isA11yFinding } from './utils.js';
import { BaseCliHandler } from './BaseCliHandler.js';

export async function handleFindings(args: string[]): Promise<number> {
    const parsed = BaseCliHandler.parseArgs(args, [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show only accessibility findings' },
        { name: 'status', type: 'string', description: 'Filter by status (open|fixed|verified)' }
    ]);

    const findings = await listFindings(BaseCliHandler.getStringFlag(parsed, 'status'));

    if (BaseCliHandler.getBooleanFlag(parsed, 'json')) {
        BaseCliHandler.printJson(findings);
        return BaseCliHandler.success();
    }

    if (BaseCliHandler.getBooleanFlag(parsed, 'a11y')) {
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
        return BaseCliHandler.success();
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

    const status = BaseCliHandler.getStringFlag(parsed, 'status');
    if (status) {
        console.log(`Filtered by status: ${status}`);
    }
    console.log(`Total: ${findings.length} finding(s)`);
    return BaseCliHandler.success();
}