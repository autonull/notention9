/**
 * LLM Telemetry CLI Command
 * Generates a report of LLM call metrics (latency, tokens, success rate)
 */

import { Command, registerCommand } from '../Command.js';
import { getLLMTelemetry } from '@notention/core/telemetry/llmTelemetry';

export class LLMTelemetryCommand extends Command {
    readonly name = 'llm:telemetry';
    readonly description = 'Generate LLM call telemetry report (latency, tokens, success rate)';
    readonly options = [
        { name: 'days', type: 'number' as const, short: 'd', description: 'Lookback period in days (default: 30)' },
        { name: 'json', type: 'boolean' as const, description: 'Output as JSON' },
        { name: 'model', type: 'string' as const, short: 'm', description: 'Filter by model name' },
        { name: 'mode', type: 'string' as const, description: 'Filter by mode: grammar, fallback, unconstrained' },
    ];

    async execute(args: { days?: number; json?: boolean; model?: string; mode?: string; positionals: string[] }): Promise<number> {
        try {
            const telemetry = getLLMTelemetry();

            if (!telemetry.isEnabled()) {
                this.printWarning('LLM telemetry is disabled. No data to report.');
                return 0;
            }

            // Flush any pending events
            await telemetry.flush();

            const report = telemetry.generateReport(args.days ?? 30);

            // Apply filters
            let models = report.models;
            if (args.model) {
                models = models.filter((m: { model: string }) => m.model.toLowerCase().includes(args.model!.toLowerCase()));
            }
            if (args.mode) {
                models = models.filter((m: { mode: string }) => m.mode === args.mode);
            }

            if (models.length === 0 && report.overall.totalCalls > 0) {
                this.printInfo('No data matches the specified filters.');
                return 0;
            }

            if (report.overall.totalCalls === 0) {
                this.printInfo('No LLM calls recorded in the specified period.');
                return 0;
            }

            if (args.json) {
                console.log(JSON.stringify({
                    ...report,
                    models,
                }, null, 2));
            } else {
                // Generate filtered text report
                const filteredReport = { ...report, models };
                console.log(this.formatTextReport(filteredReport));
            }

            return 0;
        } catch (error) {
            return this.handleError(error, 'Failed to generate LLM telemetry report');
        }
    }

    private formatTextReport(report: { generatedAt: string; periodDays: number; models: Array<{ model: string; mode: string; callCount: number; p50LatencyMs: number; p95LatencyMs: number; avgLatencyMs: number; avgPromptTokens: number; avgCompletionTokens: number; avgTotalTokens: number; successRate: number; periodStart: string; periodEnd: string }>; overall: { totalCalls: number; overallP50LatencyMs: number; overallP95LatencyMs: number; overallSuccessRate: number } }): string {
        let text = `📊 LLM Telemetry Report — ${report.generatedAt.split('T')[0]} (last ${report.periodDays}d)\n\n`;

        text += `Overall: ${report.overall.totalCalls} calls | p50: ${report.overall.overallP50LatencyMs}ms | p95: ${report.overall.overallP95LatencyMs}ms | success: ${(report.overall.overallSuccessRate * 100).toFixed(1)}%\n\n`;

        for (const model of report.models) {
            text += `## ${model.model} (${model.mode})\n`;
            text += `  Calls: ${model.callCount} | Success: ${(model.successRate * 100).toFixed(1)}%\n`;
            text += `  Latency: p50=${model.p50LatencyMs}ms p95=${model.p95LatencyMs}ms avg=${Math.round(model.avgLatencyMs)}ms\n`;
            if (model.avgTotalTokens > 0) {
                text += `  Tokens: prompt≈${Math.round(model.avgPromptTokens)} completion≈${Math.round(model.avgCompletionTokens)} total≈${Math.round(model.avgTotalTokens)}\n`;
            }
            text += `  Period: ${model.periodStart} → ${model.periodEnd}\n\n`;
        }

        const telemetry = getLLMTelemetry();
        const config = telemetry.getConfig();
        text += `---\nRetention: ${config.retentionDays}d | Sampling: ${(config.sampleRate * 100).toFixed(0)}% | Enabled: ${config.enabled ? 'ON' : 'OFF'}\n`;

        return text;
    }
}

registerCommand(LLMTelemetryCommand);