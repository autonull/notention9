/**
 * Ontology Coverage Audit
 * Compares ontology keys vs eval cases property usage
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectOntologyKeys, DEFAULT_ONTOLOGY } from '@notention/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AuditResult {
    timestamp: string;
    ontologyKeys: string[];
    caseKeys: string[];
    gaps: string[];           // keys in cases but not in ontology
    unused: string[];         // keys in ontology but not in cases
    coverage: number;         // % of ontology keys used
    caseCoverage: number;     // % of case keys covered by ontology
    details: {
        ontologyKeyCount: number;
        caseKeyCount: number;
        gapCount: number;
        unusedCount: number;
    };
}

export function loadManifest(): any {
    const manifestPath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', 'manifest.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`Manifest not found at ${manifestPath}`);
    }
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

export function loadCase(casePath: string): any {
    const fullPath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', casePath);
    if (!existsSync(fullPath)) {
        console.warn(`Case file not found: ${fullPath}`);
        return null;
    }
    return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

export function extractKeysFromCase(data: any): string[] {
    const keys: string[] = [];
    if (data.expected && Array.isArray(data.expected)) {
        for (const prop of data.expected) {
            if (prop.key) keys.push(prop.key);
        }
    }
    if (data.forbidden && Array.isArray(data.forbidden)) {
        for (const prop of data.forbidden) {
            if (prop.key) keys.push(prop.key);
        }
    }
    return keys;
}

export function runAudit(): AuditResult {
    console.log('🔍 Running ontology coverage audit...\n');

    // 1. Get all ontology keys
    const ontologyKeySet = collectOntologyKeys(DEFAULT_ONTOLOGY);
    const ontologyKeys = Array.from(ontologyKeySet).sort();
    console.log(`Ontology keys: ${ontologyKeys.length}`);

    // 2. Get all keys used in eval cases
    const manifest = loadManifest();
    const caseKeySet = new Set<string>();

    for (const entry of manifest.cases) {
        const data = loadCase(entry.path);
        if (data) {
            const keys = extractKeysFromCase(data);
            keys.forEach(k => caseKeySet.add(k));
        }
    }

    const caseKeys = Array.from(caseKeySet).sort();
    console.log(`Keys used in eval cases: ${caseKeys.length}`);

    // 3. Find gaps (keys in cases but not in ontology)
    const gaps = caseKeys.filter(k => !ontologyKeySet.has(k));

    // 4. Find unused (keys in ontology but not in cases)
    const unused = ontologyKeys.filter(k => !caseKeySet.has(k));

    // 5. Calculate coverage
    const coverage = ontologyKeys.length > 0
        ? Math.round(((ontologyKeys.length - unused.length) / ontologyKeys.length) * 100)
        : 0;

    const caseCoverage = caseKeys.length > 0
        ? Math.round(((caseKeys.length - gaps.length) / caseKeys.length) * 100)
        : 0;

    const result: AuditResult = {
        timestamp: new Date().toISOString(),
        ontologyKeys,
        caseKeys,
        gaps,
        unused,
        coverage,
        caseCoverage,
        details: {
            ontologyKeyCount: ontologyKeys.length,
            caseKeyCount: caseKeys.length,
            gapCount: gaps.length,
            unusedCount: unused.length,
        }
    };

    return result;
}

export function printReport(result: AuditResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('ONTOLOGY COVERAGE AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${result.timestamp}`);
    console.log(`\n📊 SUMMARY`);
    console.log(`  Ontology keys:     ${result.details.ontologyKeyCount}`);
    console.log(`  Case keys:         ${result.details.caseKeyCount}`);
    console.log(`  Gaps (missing):    ${result.details.gapCount}`);
    console.log(`  Unused in cases:   ${result.details.unusedCount}`);
    console.log(`  Ontology coverage: ${result.coverage}%`);
    console.log(`  Case coverage:     ${result.caseCoverage}%`);

    if (result.gaps.length > 0) {
        console.log(`\n❌ GAPS (keys in cases but NOT in ontology):`);
        for (const gap of result.gaps) {
            console.log(`  - ${gap}`);
        }
    } else {
        console.log(`\n✅ No gaps: all case keys are in ontology`);
    }

    if (result.unused.length > 0) {
        console.log(`\n⚠️  UNUSED (keys in ontology but NOT in cases):`);
        // Group by domain prefix if possible
        for (const key of result.unused) {
            console.log(`  - ${key}`);
        }
    } else {
        console.log(`\n✅ All ontology keys are used in at least one case`);
    }

    console.log('\n' + '='.repeat(60));
}

export function writeReports(result: AuditResult): void {
    const outDir = join(__dirname, '..', '..', '..', 'data', 'eval', 'audit');
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    // JSON report
    const jsonPath = join(outDir, `ontology-audit-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON report: ${jsonPath}`);

    // Markdown report
    const mdPath = join(outDir, `ontology-audit-${Date.now()}.md`);
    let md = `# Ontology Coverage Audit\n\n`;
    md += `**Timestamp:** ${result.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Ontology keys | ${result.details.ontologyKeyCount} |\n`;
    md += `| Case keys | ${result.details.caseKeyCount} |\n`;
    md += `| Gaps (missing from ontology) | ${result.details.gapCount} |\n`;
    md += `| Unused in cases | ${result.details.unusedCount} |\n`;
    md += `| Ontology coverage | ${result.coverage}% |\n`;
    md += `| Case coverage | ${result.caseCoverage}% |\n\n`;

    if (result.gaps.length > 0) {
        md += `## ❌ Gaps (keys in cases but NOT in ontology)\n\n`;
        for (const gap of result.gaps) {
            md += `- \`${gap}\`\n`;
        }
        md += `\n`;
    }

    if (result.unused.length > 0) {
        md += `## ⚠️ Unused (keys in ontology but NOT in cases)\n\n`;
        for (const key of result.unused) {
            md += `- \`${key}\`\n`;
        }
        md += `\n`;
    }

    md += `## Full Ontology Keys\n\n`;
    for (const key of result.ontologyKeys) {
        const used = result.caseKeys.includes(key) ? '✅' : '❌';
        md += `- ${used} \`${key}\`\n`;
    }

    writeFileSync(mdPath, md);
    console.log(`📄 Markdown report: ${mdPath}`);
}

// Main (when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
    const result = runAudit();
    printReport(result);
    writeReports(result);

    // Exit with code 1 if there are gaps (missing keys in ontology)
    process.exit(result.gaps.length > 0 ? 1 : 0);
}

export function runAuditAndSave(outputDir?: string, options?: { includeGolden?: boolean }): AuditResult {
    const result = runAudit();
    printReport(result);
    
    const outDir = outputDir ?? join(__dirname, '..', '..', '..', 'data', 'eval', 'audit');
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }
    
    const jsonPath = join(outDir, `ontology-audit-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON report: ${jsonPath}`);
    
    const mdPath = join(outDir, `ontology-audit-${Date.now()}.md`);
    let md = `# Ontology Coverage Audit\n\n`;
    md += `**Timestamp:** ${result.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Ontology keys | ${result.details.ontologyKeyCount} |\n`;
    md += `| Case keys | ${result.details.caseKeyCount} |\n`;
    md += `| Gaps (missing from ontology) | ${result.details.gapCount} |\n`;
    md += `| Unused in cases | ${result.details.unusedCount} |\n`;
    md += `| Ontology coverage | ${result.coverage}% |\n`;
    md += `| Case coverage | ${result.caseCoverage}% |\n\n`;

    if (result.gaps.length > 0) {
        md += `## ❌ Gaps (keys in cases but NOT in ontology)\n\n`;
        for (const gap of result.gaps) {
            md += `- \`${gap}\`\n`;
        }
        md += `\n`;
    }

    if (result.unused.length > 0) {
        md += `## ⚠️ Unused (keys in ontology but NOT in cases)\n\n`;
        for (const key of result.unused) {
            md += `- \`${key}\`\n`;
        }
        md += `\n`;
    }

    md += `## Full Ontology Keys\n\n`;
    for (const key of result.ontologyKeys) {
        const used = result.caseKeys.includes(key) ? '✅' : '❌';
        md += `- ${used} \`${key}\`\n`;
    }

    writeFileSync(mdPath, md);
    console.log(`📄 Markdown report: ${mdPath}`);
    
    return result;
}

export function runOntologyAudit(options?: { includeGolden?: boolean }): AuditResult {
    return runAudit();
}