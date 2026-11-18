/**
 * Ontology Coverage Audit — W2.1
 * Analyzes property usage across eval cases + fixtures vs ontology keys
 * Reports gaps, unused keys, coverage % — evidence base for W2.2-W2.4
 */

import { Command } from '../Command.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getOntology, collectOntologyKeysInTree, type OntologyNode } from '@notention/core';
import { readManifest } from '@notention/core/eval/caseManifest';
import { QUALITY_CASE_NOTES } from '@notention/core/fixtures';

interface OntologyAuditResult {
    timestamp: string;
    ontology: {
        totalKeys: number;
        keys: string[];
    };
    usage: {
        extractionCases: {
            casesAnalyzed: number;
            keysUsed: string[];
            keysUsedCount: number;
        };
        matchCases: {
            casesAnalyzed: number;
            keysUsed: string[];
            keysUsedCount: number;
        };
        qualityNotes: {
            notesAnalyzed: number;
            keysUsed: string[];
            keysUsedCount: number;
        };
        combined: {
            keysUsed: string[];
            keysUsedCount: number;
        };
    };
    gaps: {
        unusedOntologyKeys: string[];
        missingFromOntology: string[];
        coveragePercent: number;
    };
    recommendations: string[];
}

function getProjectRoot(): string {
    let root = process.cwd();
    while (root !== '/') {
        try {
            require.resolve(`${root}/pnpm-workspace.yaml`);
            break;
        } catch {
            root = join(root, '..');
        }
    }
    return root;
}

function flattenKeys(keys: Iterable<string>): string[] {
    return [...new Set([...keys].map(key => key.split('.').pop() ?? key))].sort();
}

function extractKeysFromProperties(properties: Array<{ key: string; operator?: string; values?: string[] }>): Set<string> {
    const keys = new Set<string>();
    for (const prop of properties) {
        if (prop.key) {
            // Use the leaf key (last segment after '.')
            const leafKey = prop.key.split('.').pop() ?? prop.key;
            keys.add(leafKey);
        }
    }
    return keys;
}

async function analyzeExtractionCases(): Promise<{ keysUsed: Set<string>; casesAnalyzed: number }> {
    const manifest = readManifest();
    const extractionCases = manifest.cases.filter((c: any) => c.qualityFamily === 'extraction');
    const projectRoot = getProjectRoot();
    
    const keysUsed = new Set<string>();
    let casesAnalyzed = 0;

    for (const caseRef of extractionCases) {
        const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
        if (!existsSync(casePath)) continue;
        
        try {
            const caseContent = await readFile(casePath, 'utf-8');
            const caseData = JSON.parse(caseContent);
            
            // Analyze expected properties
            if (caseData.expected) {
                for (const key of extractKeysFromProperties(caseData.expected)) {
                    keysUsed.add(key);
                }
            }
            // Analyze forbidden properties
            if (caseData.forbidden) {
                for (const key of extractKeysFromProperties(caseData.forbidden)) {
                    keysUsed.add(key);
                }
            }
            casesAnalyzed++;
        } catch (e) {
            console.warn(`Failed to parse ${caseRef.path}: ${e}`);
        }
    }

    return { keysUsed, casesAnalyzed };
}

async function analyzeMatchCases(): Promise<{ keysUsed: Set<string>; casesAnalyzed: number }> {
    const manifest = readManifest();
    const matchCases = manifest.cases.filter((c: any) => c.qualityFamily === 'match');
    const projectRoot = getProjectRoot();
    
    const keysUsed = new Set<string>();
    let casesAnalyzed = 0;

    for (const caseRef of matchCases) {
        const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
        if (!existsSync(casePath)) continue;
        
        try {
            const caseContent = await readFile(casePath, 'utf-8');
            const caseData = JSON.parse(caseContent);
            
            // Match cases have expected matches with noteIds, not properties directly
            // But we can analyze the expected note properties from the fixture
            if (caseData.expected) {
                // The expected array contains { noteId, minScore }
                // We need to look up the actual note properties from QUALITY_CASE_NOTES
                for (const exp of caseData.expected) {
                    const note = QUALITY_CASE_NOTES.find(n => n.id === exp.noteId);
                    if (note?.properties) {
                        for (const key of extractKeysFromProperties(note.properties)) {
                            keysUsed.add(key);
                        }
                    }
                }
            }
            casesAnalyzed++;
        } catch (e) {
            console.warn(`Failed to parse ${caseRef.path}: ${e}`);
        }
    }

    return { keysUsed, casesAnalyzed };
}

function analyzeQualityNotes(): { keysUsed: Set<string>; notesAnalyzed: number } {
    const keysUsed = new Set<string>();
    let notesAnalyzed = 0;

    for (const note of QUALITY_CASE_NOTES) {
        if (note.properties) {
            for (const key of extractKeysFromProperties(note.properties)) {
                keysUsed.add(key);
            }
        }
        notesAnalyzed++;
    }

    return { keysUsed, notesAnalyzed };
}

function generateRecommendations(
    unusedOntologyKeys: string[],
    missingFromOntology: string[],
    coveragePercent: number
): string[] {
    const recommendations: string[] = [];

    if (coveragePercent < 50) {
        recommendations.push('⚠️ Low ontology coverage (<50%). Consider expanding ontology to match real usage.');
    } else if (coveragePercent < 80) {
        recommendations.push('⚠️ Moderate ontology coverage. Some real-world keys are not in ontology.');
    } else {
        recommendations.push('✅ Good ontology coverage (≥80%).');
    }

    if (unusedOntologyKeys.length > 0) {
        const topUnused = unusedOntologyKeys.slice(0, 10).join(', ');
        const more = unusedOntologyKeys.length > 10 ? ` and ${unusedOntologyKeys.length - 10} more` : '';
        recommendations.push(`📋 ${unusedOntologyKeys.length} ontology keys never used in eval/fixtures: ${topUnused}${more}. Consider deprecating or adding test cases.`);
    }

    if (missingFromOntology.length > 0) {
        const topMissing = missingFromOntology.slice(0, 10).join(', ');
        const more = missingFromOntology.length > 10 ? ` and ${missingFromOntology.length - 10} more` : '';
        recommendations.push(`🔑 ${missingFromOntology.length} keys used in eval/fixtures but missing from ontology: ${topMissing}${more}. Add to ontology for proper validation and matching.`);
    }

    // Suggest custom key support (W2.2)
    if (missingFromOntology.length > 0) {
        recommendations.push('💡 Implement W2.2 (User-defined properties) to capture keys not in shipped ontology.');
    }

    // Suggest cross-key inference (W2.3)
    if (missingFromOntology.some(k => k.includes('schedule') || k.includes('frequency') || k.includes('role'))) {
        recommendations.push('💡 Implement W2.3 (Cross-key inference) to derive schedule/frequency/role from need text.');
    }

    // Suggest backlinks (W2.4)
    if (coveragePercent > 60) {
        recommendations.push('💡 Implement W2.4 (Related notes & backlinks) using shared ontology keys for "See also" panel.');
    }

    return recommendations;
}

export class OntologyAuditCommand extends Command {
    readonly name = 'ontology:audit';
    readonly description = 'Audit ontology coverage vs eval cases + fixtures; reports gaps, unused keys, coverage %';
    readonly options = [
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output directory (default: data/eval/ontology)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
        { name: 'markdown', type: 'boolean' as const, description: 'Also write Markdown report' },
    ];

    async execute(args: {
        output?: string;
        json?: boolean;
        markdown?: boolean;
        positionals: string[];
    }): Promise<number> {
        try {
            const outputDir = args.output ?? join(process.cwd(), 'data', 'eval', 'ontology');
            const projectRoot = getProjectRoot();

            this.printInfo('📊 Running ontology coverage audit...');

            // Get all ontology keys
            const ontology = getOntology();
            const allOntologyKeys = new Set(flattenKeys(collectOntologyKeysInTree(ontology.nodes)));
            this.printInfo(`Ontology has ${allOntologyKeys.size} leaf keys`);

            // Analyze extraction cases
            this.printInfo('Analyzing extraction quality cases...');
            const extractionAnalysis = await analyzeExtractionCases();
            this.printInfo(`  ${extractionAnalysis.casesAnalyzed} cases, ${extractionAnalysis.keysUsed.size} unique keys`);

            // Analyze match cases
            this.printInfo('Analyzing match quality cases...');
            const matchAnalysis = await analyzeMatchCases();
            this.printInfo(`  ${matchAnalysis.casesAnalyzed} cases, ${matchAnalysis.keysUsed.size} unique keys`);

            // Analyze quality notes
            this.printInfo('Analyzing quality note fixtures...');
            const notesAnalysis = analyzeQualityNotes();
            this.printInfo(`  ${notesAnalysis.notesAnalyzed} notes, ${notesAnalysis.keysUsed.size} unique keys`);

            // Combined usage
            const combinedKeysUsed = new Set([
                ...extractionAnalysis.keysUsed,
                ...matchAnalysis.keysUsed,
                ...notesAnalysis.keysUsed,
            ]);

            // Find gaps
            const unusedOntologyKeys = [...allOntologyKeys].filter(k => !combinedKeysUsed.has(k)).sort();
            const missingFromOntology = [...combinedKeysUsed].filter(k => !allOntologyKeys.has(k)).sort();
            const coveragePercent = allOntologyKeys.size > 0
                ? Math.round((combinedKeysUsed.size / allOntologyKeys.size) * 1000) / 10
                : 0;

            this.printInfo(`Combined keys used: ${combinedKeysUsed.size}`);
            this.printInfo(`Unused ontology keys: ${unusedOntologyKeys.length}`);
            this.printInfo(`Missing from ontology: ${missingFromOntology.length}`);
            this.printInfo(`Coverage: ${coveragePercent}%`);

            const recommendations = generateRecommendations(unusedOntologyKeys, missingFromOntology, coveragePercent);

            const result: OntologyAuditResult = {
                timestamp: new Date().toISOString(),
                ontology: {
                    totalKeys: allOntologyKeys.size,
                    keys: [...allOntologyKeys].sort(),
                },
                usage: {
                    extractionCases: {
                        casesAnalyzed: extractionAnalysis.casesAnalyzed,
                        keysUsed: [...extractionAnalysis.keysUsed].sort(),
                        keysUsedCount: extractionAnalysis.keysUsed.size,
                    },
                    matchCases: {
                        casesAnalyzed: matchAnalysis.casesAnalyzed,
                        keysUsed: [...matchAnalysis.keysUsed].sort(),
                        keysUsedCount: matchAnalysis.keysUsed.size,
                    },
                    qualityNotes: {
                        notesAnalyzed: notesAnalysis.notesAnalyzed,
                        keysUsed: [...notesAnalysis.keysUsed].sort(),
                        keysUsedCount: notesAnalysis.keysUsed.size,
                    },
                    combined: {
                        keysUsed: [...combinedKeysUsed].sort(),
                        keysUsedCount: combinedKeysUsed.size,
                    },
                },
                gaps: {
                    unusedOntologyKeys,
                    missingFromOntology,
                    coveragePercent,
                },
                recommendations,
            };

            // Write JSON report
            await import('node:fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));
            const reportPath = join(outputDir, `ontology-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
            await import('node:fs/promises').then(fs => fs.writeFile(reportPath, JSON.stringify(result, null, 2)));

            // Write Markdown report if requested
            if (args.markdown) {
                const mdPath = join(outputDir, `ontology-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
                await this.writeMarkdownReport(result, mdPath);
                this.printInfo(`Markdown report: ${mdPath}`);
            }

            if (args.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.printSummary(result);
            }

            this.printInfo(`JSON report: ${reportPath}`);
            return 0;

        } catch (error) {
            return this.handleError(error, 'Ontology audit failed');
        }
    }

    private printSummary(result: OntologyAuditResult): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ONTOLOGY COVERAGE AUDIT');
        console.log('='.repeat(60));
        console.log(`Timestamp: ${result.timestamp}`);
        console.log('');

        console.log('ONTOLOGY');
        console.log(`  Total leaf keys: ${result.ontology.totalKeys}`);
        console.log('');

        console.log('USAGE BY SOURCE');
        console.log(`  Extraction cases: ${result.usage.extractionCases.casesAnalyzed} cases, ${result.usage.extractionCases.keysUsedCount} keys`);
        console.log(`  Match cases:      ${result.usage.matchCases.casesAnalyzed} cases, ${result.usage.matchCases.keysUsedCount} keys`);
        console.log(`  Quality notes:    ${result.usage.qualityNotes.notesAnalyzed} notes, ${result.usage.qualityNotes.keysUsedCount} keys`);
        console.log(`  Combined:         ${result.usage.combined.keysUsedCount} unique keys`);
        console.log('');

        console.log('GAPS');
        console.log(`  Unused ontology keys:     ${result.gaps.unusedOntologyKeys.length}`);
        console.log(`  Missing from ontology:    ${result.gaps.missingFromOntology.length}`);
        console.log(`  Coverage:                 ${result.gaps.coveragePercent}%`);
        console.log('');

        if (result.gaps.unusedOntologyKeys.length > 0) {
            console.log('UNUSED ONTOLOGY KEYS (top 20):');
            for (const key of result.gaps.unusedOntologyKeys.slice(0, 20)) {
                console.log(`  - ${key}`);
            }
            if (result.gaps.unusedOntologyKeys.length > 20) {
                console.log(`  ... and ${result.gaps.unusedOntologyKeys.length - 20} more`);
            }
            console.log('');
        }

        if (result.gaps.missingFromOntology.length > 0) {
            console.log('KEYS MISSING FROM ONTOLOGY (top 20):');
            for (const key of result.gaps.missingFromOntology.slice(0, 20)) {
                console.log(`  + ${key}`);
            }
            if (result.gaps.missingFromOntology.length > 20) {
                console.log(`  ... and ${result.gaps.missingFromOntology.length - 20} more`);
            }
            console.log('');
        }

        console.log('RECOMMENDATIONS');
        for (const rec of result.recommendations) {
            console.log(`  ${rec}`);
        }
        console.log('='.repeat(60));
    }

    private async writeMarkdownReport(result: OntologyAuditResult, path: string): Promise<void> {
        const lines: string[] = [];
        lines.push('# Ontology Coverage Audit');
        lines.push('');
        lines.push(`**Timestamp:** ${result.timestamp}`);
        lines.push('');
        lines.push('## Ontology');
        lines.push(`- **Total leaf keys:** ${result.ontology.totalKeys}`);
        lines.push('');
        lines.push('## Usage by Source');
        lines.push(`| Source | Cases/Notes | Keys Used |`);
        lines.push(`|--------|-------------|-----------|`);
        lines.push(`| Extraction cases | ${result.usage.extractionCases.casesAnalyzed} | ${result.usage.extractionCases.keysUsedCount} |`);
        lines.push(`| Match cases | ${result.usage.matchCases.casesAnalyzed} | ${result.usage.matchCases.keysUsedCount} |`);
        lines.push(`| Quality notes | ${result.usage.qualityNotes.notesAnalyzed} | ${result.usage.qualityNotes.keysUsedCount} |`);
        lines.push(`| **Combined** | — | **${result.usage.combined.keysUsedCount}** |`);
        lines.push('');
        lines.push('## Gaps');
        lines.push(`- **Unused ontology keys:** ${result.gaps.unusedOntologyKeys.length}`);
        lines.push(`- **Missing from ontology:** ${result.gaps.missingFromOntology.length}`);
        lines.push(`- **Coverage:** ${result.gaps.coveragePercent}%`);
        lines.push('');

        if (result.gaps.unusedOntologyKeys.length > 0) {
            lines.push('## Unused Ontology Keys');
            for (const key of result.gaps.unusedOntologyKeys) {
                lines.push(`- ${key}`);
            }
            lines.push('');
        }

        if (result.gaps.missingFromOntology.length > 0) {
            lines.push('## Keys Missing from Ontology');
            for (const key of result.gaps.missingFromOntology) {
                lines.push(`- ${key}`);
            }
            lines.push('');
        }

        lines.push('## Recommendations');
        for (const rec of result.recommendations) {
            lines.push(`- ${rec}`);
        }

        await import('node:fs/promises').then(fs => fs.writeFile(path, lines.join('\n')));
    }
}