import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { UXEvaluationConfig } from '../../uiuxEvaluator.js';
import { uxEvaluator } from '../../uiuxEvaluator.js';

function getThresholdArg(args: ParsedArgs, flag: string): { min?: number; max?: number; target?: number } | undefined {
    const val = args[flag];
    if (val === undefined) return undefined;
    const num = parseFloat(String(val));
    if (isNaN(num)) return undefined;
    if (flag.includes('min') || flag.includes('match-relevance') || flag.includes('acceptance') || flag.includes('engagement') || flag.includes('dashboard')) {
        return { min: num };
    }
    if (flag.includes('max') || flag.includes('time-to-match')) {
        return { max: num };
    }
    return { target: num };
}

export class UXEvaluateCommand extends Command {
    readonly name = 'ux-evaluate';
    readonly description = 'Evaluate UX metrics across simulator scenarios';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'scenarios', type: 'string', description: 'Comma-separated scenario names' },
        { name: 'output', type: 'string', description: 'Output path for JSON report' },
        { name: 'no-report', type: 'boolean', description: 'Disable report generation' },
        { name: 'threshold-match-relevance', type: 'number', description: 'Minimum match relevance threshold' },
        { name: 'threshold-time-to-match', type: 'number', description: 'Maximum time to first match threshold' },
        { name: 'threshold-acceptance-rate', type: 'number', description: 'Minimum acceptance rate threshold' },
        { name: 'threshold-engagement', type: 'number', description: 'Minimum engagement threshold' },
        { name: 'threshold-dashboard-clarity', type: 'number', description: 'Minimum dashboard clarity threshold' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const scenarios = this.getStringFlag(args, 'scenarios')
            ? this.getStringFlag(args, 'scenarios').split(',').map((s) => s.trim())
            : undefined;

        const output = this.getStringFlag(args, 'output', './ux-evaluation-report.json');
        const noReport = this.getBooleanFlag(args, 'no-report');

        const thresholds: UXEvaluationConfig['thresholds'] = {};
        const matchRel = getThresholdArg(args, 'threshold-match-relevance');
        if (matchRel) thresholds['match-relevance'] = matchRel;
        const timeToMatch = getThresholdArg(args, 'threshold-time-to-match');
        if (timeToMatch) thresholds['time-to-first-match'] = timeToMatch;
        const acceptance = getThresholdArg(args, 'threshold-acceptance-rate');
        if (acceptance) thresholds['match-acceptance-rate'] = acceptance;
        const engagement = getThresholdArg(args, 'threshold-engagement');
        if (engagement) thresholds['agent-engagement'] = engagement;
        const dashboard = getThresholdArg(args, 'threshold-dashboard-clarity');
        if (dashboard) thresholds['dashboard-clarity'] = dashboard;

        const config: UXEvaluationConfig = {
            scenarios,
            thresholds,
            generateReport: !noReport,
            outputPath: output,
        };

        try {
            this.printInfo('Starting UX evaluation...');
            if (scenarios) {
                this.printInfo(`Scenarios: ${scenarios.join(', ')}`);
            } else {
                this.printInfo('Scenarios: all available');
            }

            const reports = await uxEvaluator.evaluateAll(config);

            console.log('\n📊 UX Evaluation Results:\n');
            for (const report of reports) {
                console.log(`  ${report.scenarioName} (${report.domain})`);
                console.log(`    Agents: ${report.agentCount} | Events: ${report.eventCount} | Duration: ${report.duration}s`);
                console.log(`    Overall Score: ${(report.overallScore * 100).toFixed(1)}%`);

                for (const metric of report.metrics) {
                    const status = metric.threshold ? (
                        (metric.threshold.min !== undefined && metric.value < metric.threshold.min) ||
                        (metric.threshold.max !== undefined && metric.value > metric.threshold.max)
                            ? '❌' : '✅'
                    ) : '➖';
                    console.log(`    ${status} ${metric.name}: ${metric.value.toFixed(2)} ${metric.unit} - ${metric.description}`);
                }

                if (report.issues.length > 0) {
                    console.log(`    Issues: ${report.issues.length}`);
                    for (const issue of report.issues) {
                        const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'major' ? '🟠' : issue.severity === 'minor' ? '🟡' : '🔵';
                        console.log(`      ${severityIcon} [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}`);
                    }
                }

                if (report.recommendations.length > 0) {
                    console.log(`    Recommendations:`);
                    for (const rec of report.recommendations) {
                        console.log(`      → ${rec}`);
                    }
                }
                console.log('');
            }

            const avgScore = reports.reduce((sum: number, r: { overallScore: number }) => sum + r.overallScore, 0) / reports.length;
            const totalIssues = reports.reduce((sum: number, r: { issues: unknown[] }) => sum + r.issues.length, 0);
            const criticalIssues = reports.reduce((sum: number, r: { issues: Array<{ severity: string }> }) => sum + r.issues.filter((i) => i.severity === 'critical').length, 0);

            console.log('📈 Summary:');
            console.log(`   Average Score: ${(avgScore * 100).toFixed(1)}%`);
            console.log(`   Total Issues: ${totalIssues} (${criticalIssues} critical)`);
            console.log(`   Scenarios Evaluated: ${reports.length}`);

            if (config.generateReport) {
                const fs = await import('fs');
                const reportData = {
                    timestamp: new Date().toISOString(),
                    summary: {
                        averageScore: avgScore,
                        totalIssues,
                        criticalIssues,
                        scenariosEvaluated: reports.length,
                    },
                    reports,
                };
                fs.writeFileSync(config.outputPath!, JSON.stringify(reportData, null, 2));
                this.printInfo(`Report saved to ${config.outputPath}`);
            }

            if (criticalIssues > 0) {
                this.printWarning('Critical issues found - review before human testing');
                return 1;
            }

            this.printSuccess('UX evaluation complete');
            return 0;
        } catch (e) {
            return this.handleError(e);
        }
    }
}