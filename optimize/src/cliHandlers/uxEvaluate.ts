import { UXEvaluationConfig } from '../uiuxEvaluator.js';
import { uxEvaluator } from '../uiuxEvaluator.js';

export async function handleUXEvaluate(args: string[]): Promise<number> {
    const scenarios = args.includes('--scenarios')
        ? args[args.indexOf('--scenarios') + 1]?.split(',').map((s: string) => s.trim())
        : undefined;

    const output = args.includes('--output')
        ? args[args.indexOf('--output') + 1]
        : './ux-evaluation-report.json';

    const noReport = args.includes('--no-report');

    const thresholds: UXEvaluationConfig['thresholds'] = {
        'match-relevance': { min: parseFloat(args[args.indexOf('--threshold-match-relevance') + 1] ?? '0.7') },
        'time-to-first-match': { max: parseFloat(args[args.indexOf('--threshold-time-to-match') + 1] ?? '30') },
        'match-acceptance-rate': { min: parseFloat(args[args.indexOf('--threshold-acceptance-rate') + 1] ?? '0.6') },
        'agent-engagement': { min: parseFloat(args[args.indexOf('--threshold-engagement') + 1] ?? '0.5') },
        'dashboard-clarity': { min: parseFloat(args[args.indexOf('--threshold-dashboard-clarity') + 1] ?? '0.7') },
    };

    const config: UXEvaluationConfig = {
        scenarios,
        thresholds,
        generateReport: !noReport,
        outputPath: output,
    };

    console.log('🔍 Starting UX evaluation...');
    if (scenarios) {
        console.log(`   Scenarios: ${scenarios.join(', ')}`);
    } else {
        console.log('   Scenarios: all available');
    }

    const reports = await uxEvaluator.evaluateAll();

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
        console.log(`\n💾 Report saved to ${config.outputPath}`);
    }

    if (criticalIssues > 0) {
        console.log('\n⚠️  Critical issues found - review before human testing');
        return 1;
    }

    console.log('\n✅ UX evaluation complete');
    return 0;
}