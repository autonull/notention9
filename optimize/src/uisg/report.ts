import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DecisionResult, VariantDecision, CellMetrics } from './decide.js';
import { ROOT } from './paths.js';


export interface ABReportOptions {
    experiment: string;
    baselineRunId: string;
    compareRunId: string;
    policyFile?: string;
}

export function loadMatrixResult(runId: string): { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean; status: string; durationMs: number }> } | null {
    try {
        const file = resolve(ROOT, `doc/uisg/matrix-${runId}.json`);
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

export function generateABReport(options: ABReportOptions): string {
    const baseline = loadMatrixResult(options.baselineRunId);
    const compare = loadMatrixResult(options.compareRunId);
    const decision = loadDecisionResult(options.experiment);

    if (!baseline || !compare) {
        throw new Error('Baseline or compare matrix result not found');
    }

    const baselineMap = new Map<string, CellMetrics>();
    for (const cell of baseline.cells) {
        if (!cell.variant) baselineMap.set(cell.journey, cell.metrics);
    }

    const compareMap = new Map<string, CellMetrics>();
    for (const cell of compare.cells) {
        if (cell.variant) compareMap.set(`${cell.journey}/${cell.variant}`, cell.metrics);
    }

    let markdown = `# A/B Report: ${options.experiment}\n\n`;
    markdown += `**Baseline:** ${options.baselineRunId}  \n`;
    markdown += `**Compare:** ${options.compareRunId}  \n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    markdown += `## Executive Summary\n\n`;
    if (decision) {
        markdown += `**Promoted:** ${decision.promoted.join(', ') || 'none'}  \n`;
        markdown += `**Rejected:** ${decision.rejected.join(', ') || 'none'}  \n`;
        markdown += `**Flagged for Review:** ${decision.flagged.join(', ') || 'none'}  \n\n`;
    }

    markdown += `## Metric Comparison\n\n`;
    markdown += `| Journey / Variant | Metric | Baseline | Variant | Delta | % Change |\n`;
    markdown += `|---|---|---|---|---|---|\n`;

    for (const [key, variantMetrics] of compareMap) {
        const [journey, variant] = key.split('/');
        const baseMetrics = baselineMap.get(journey);
        if (!baseMetrics) continue;

        const rows = formatMetricRows(journey, variant, baseMetrics, variantMetrics);
        markdown += rows.join('\n') + '\n';
    }

    markdown += `\n## Visual Diff Gallery\n\n`;
    markdown += `Visual diffs stored in \`doc/uisg/visual/${options.compareRunId}/\`\n\n`;

    markdown += `## Journey Pass/Fail Matrix\n\n`;
    markdown += `| Journey | Variant | Status | Duration (ms) |\n`;
    markdown += `|---|---|---|---|\n`;

    for (const cell of compare.cells) {
        if (!cell.variant) continue;
        const status = cell.status.toUpperCase();
        markdown += `| ${cell.journey} | ${cell.variant} | ${status} | ${cell.durationMs} |\n`;
    }

    markdown += `\n## Bundle Size Impact\n\n`;
    markdown += `| Journey / Variant | Baseline (KB) | Variant (KB) | Delta (KB) |\n`;
    markdown += `|---|---|---|---|\n`;

    for (const [key, variantMetrics] of compareMap) {
        const [journey, variant] = key.split('/');
        const baseMetrics = baselineMap.get(journey);
        if (!baseMetrics) continue;

        const delta = variantMetrics.bundleSizeKb - baseMetrics.bundleSizeKb;
        markdown += `| ${journey} / ${variant} | ${baseMetrics.bundleSizeKb} | ${variantMetrics.bundleSizeKb} | ${delta >= 0 ? '+' : ''}${delta} |\n`;
    }

    markdown += `\n## Recommendation\n\n`;
    if (decision) {
        if (decision.promoted.length > 0) {
            markdown += `✅ **Promote** the following variants: ${decision.promoted.join(', ')}\n\n`;
        }
        if (decision.flagged.length > 0) {
            markdown += `⚠️ **Review required** for: ${decision.flagged.join(', ')}\n\n`;
        }
        if (decision.rejected.length > 0) {
            markdown += `❌ **Reject** the following variants: ${decision.rejected.join(', ')}\n\n`;
        }
    } else {
        markdown += `Run \`pnpm uisg decide\` to generate a formal decision.\n\n`;
    }

    const outFile = resolve(ROOT, `doc/uisg/ab-${options.experiment}.md`);
    writeFileSync(outFile, markdown);

    return markdown;
}

function formatMetricRows(
    journey: string,
    variantId: string,
    base: CellMetrics,
    variantMetrics: CellMetrics
): string[] {
    const rows: string[] = [];

    const metrics: Array<{ name: string; base: number; var: number; unit: string }> = [
        { name: 'Task Time', base: base.taskTimeMs, var: variantMetrics.taskTimeMs, unit: 'ms' },
        { name: 'Interactions', base: base.interactionCount, var: variantMetrics.interactionCount, unit: '' },
        { name: 'Errors', base: base.errorCount, var: variantMetrics.errorCount, unit: '' },
        { name: 'Bundle Size', base: base.bundleSizeKb, var: variantMetrics.bundleSizeKb, unit: 'KB' },
        { name: 'Tone Violations', base: base.toneViolations, var: variantMetrics.toneViolations, unit: '' },
        { name: 'Type Errors', base: base.typeErrors, var: variantMetrics.typeErrors, unit: '' },
        { name: 'A11y Violations', base: base.accessibilityViolations, var: variantMetrics.accessibilityViolations, unit: '' },
    ];

    if (base.matchF1 !== undefined && variantMetrics.matchF1 !== undefined) {
        metrics.push(
            { name: 'Match F1', base: base.matchF1, var: variantMetrics.matchF1, unit: '' },
            { name: 'Match Precision', base: base.matchPrecision ?? 0, var: variantMetrics.matchPrecision ?? 0, unit: '' },
            { name: 'Match Recall', base: base.matchRecall ?? 0, var: variantMetrics.matchRecall ?? 0, unit: '' }
        );
    }

    for (const m of metrics) {
        const delta = m.var - m.base;
        const pct = m.base === 0 ? (m.var === 0 ? 0 : 100) : Math.round((delta / m.base) * 100);
        const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
        const pctStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
        rows.push(`| ${journey} / ${variantId} | ${m.name} | ${m.base}${m.unit} | ${m.var}${m.unit} | ${deltaStr}${m.unit} | ${pctStr} |`);
    }

    return rows;
}

function loadDecisionResult(experiment: string): DecisionResult | null {
    try {
        const files = readdirSync(resolve(ROOT, 'doc/uisg'));
        const decisionFile = files.find((f: string) => f.startsWith(`decision-`) && f.endsWith('.json'));
        if (decisionFile) {
            return JSON.parse(readFileSync(resolve(ROOT, 'doc/uisg', decisionFile), 'utf8'));
        }
    } catch {
        // ignore
    }
    return null;
}