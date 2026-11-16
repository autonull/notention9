/**
 * Confidence Calibration Evaluation CLI Command
 * Runs calibration against quality set and reports ECE
 * Outputs calibration map for use in UI confidence bucketing
 */

import { Command } from '../Command.js';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { runConfidenceCalibration, type CalibrationResult, DEFAULT_CALIBRATION_CONFIG } from '@notention/core/extraction';

export class EvalConfidenceCommand extends Command {
    readonly name = 'eval:confidence';
    readonly description = 'Run confidence calibration against quality cases; reports ECE and generates calibration map';
    readonly options = [
        { name: 'bins', type: 'number' as const, short: 'b', description: `Number of confidence bins (default: ${DEFAULT_CALIBRATION_CONFIG.numBins})` },
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output directory (default: data/eval/confidence)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
    ];

    async execute(args: {
        bins?: number;
        output?: string;
        json?: boolean;
        positionals: string[];
    }): Promise<number> {
        try {
            const numBins = args.bins ?? DEFAULT_CALIBRATION_CONFIG.numBins;
            const outputDir = args.output ?? join(process.cwd(), 'data', 'eval', 'confidence');

            this.printInfo(`Running confidence calibration (${numBins} bins)...`);

            const result = await runConfidenceCalibration({ numBins });

            // Write report
            await mkdir(outputDir, { recursive: true });
            const reportPath = join(outputDir, `confidence-calibration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
            await writeFile(reportPath, JSON.stringify(result, null, 2));

            if (args.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.printSummary(result, reportPath);
            }

            // Exit with error code if ECE is high (poor calibration)
            return result.ece > 0.15 ? 1 : 0;
        } catch (error) {
            return this.handleError(error, 'Confidence calibration failed');
        }
    }

    private printSummary(result: CalibrationResult, reportPath: string): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 CONFIDENCE CALIBRATION REPORT');
        console.log('='.repeat(60));
        console.log(`Report: ${reportPath}`);
        console.log(`Total samples: ${result.totalSamples}`);
        console.log('');
        console.log(`Overall Accuracy:    ${(result.overallAccuracy * 100).toFixed(1)}%`);
        console.log(`Overall Avg Confidence: ${(result.overallAvgConfidence * 100).toFixed(1)}%`);
        console.log(`ECE (Expected Calibration Error): ${(result.ece * 100).toFixed(1)}%`);
        console.log('');
        
        if (result.ece <= 0.05) {
            console.log('✅ Excellent calibration (ECE ≤ 5%)');
        } else if (result.ece <= 0.10) {
            console.log('✅ Good calibration (ECE ≤ 10%)');
        } else if (result.ece <= 0.15) {
            console.log('⚠️  Fair calibration (ECE ≤ 15%)');
        } else {
            console.log('❌ Poor calibration (ECE > 15%)');
        }
        
        console.log('');
        console.log('Confidence Bins:');
        console.log('  Bin         Count  Accuracy  Avg Conf  |Acc-Conf|');
        console.log('  ─────────────────────────────────────────────');
        for (const bin of result.bins) {
            if (bin.count >= 5) {
                const diff = Math.abs(bin.accuracy - bin.avgConfidence);
                const bar = '█'.repeat(Math.round(diff * 20));
                console.log(`  ${(bin.binStart * 100).toFixed(0)}-${(bin.binEnd * 100).toFixed(0)}%   ${String(bin.count).padStart(4)}  ${(bin.accuracy * 100).toFixed(1)}%     ${(bin.avgConfidence * 100).toFixed(1)}%     ${bar} ${(diff * 100).toFixed(1)}%`);
            }
        }
        
        console.log('');
        console.log('Per-Stage ECE:');
        for (const [stage, stageResult] of Object.entries(result.byStage)) {
            console.log(`  ${stage.padEnd(12)} ECE: ${(stageResult.ece * 100).toFixed(1)}% (${stageResult.totalSamples} samples)`);
        }
        
        console.log('='.repeat(60));
        
        if (result.ece > 0.15) {
            console.log('\n⚠️  High ECE indicates confidence scores are poorly calibrated.');
            console.log('   Consider: improving extraction quality, adding more training data,');
            console.log('   or adjusting stage confidence constants in extractionConstants.ts');
        }
    }
}