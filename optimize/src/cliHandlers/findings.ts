import { listFindings } from '../findingRepository.js';
import { isA11yFinding } from './utils.js';

export async function handleFindings(json: boolean, a11y: boolean, status?: string): Promise<number> {
    const findings = await listFindings(status);

    if (json) {
        console.log(JSON.stringify(findings, null, 2));
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
        console.log(`Filtered by status: ${status}`);
    }
    console.log(`Total: ${findings.length} finding(s)`);
    return 0;
}