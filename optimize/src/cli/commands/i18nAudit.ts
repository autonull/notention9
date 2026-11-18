/**
 * i18n Completeness Audit — W5.3
 * Analyzes translation coverage across all locales vs English base
 * Reports missing keys, orphan keys, pseudo-locale expansion, RTL layout leaks
 */

import { Command, ParsedArgs } from '../Command.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'ar'] as const;
const RTL_LOCALES = ['ar'] as const;
const BASE_LOCALE = 'en' as const;

type Locale = typeof SUPPORTED_LOCALES[number];

interface I18nAuditResult {
    timestamp: string;
    baseLocale: Locale;
    locales: Record<Locale, {
        totalKeys: number;
        missingKeys: string[];
        orphanKeys: string[];
    }>;
    pseudoLocale: {
        expansionRatio: number;
        maxExpansionKey: string;
        maxExpansionValue: string;
    };
    rtl: {
        localesChecked: Locale[];
        layoutIssues: string[];
    };
    summary: {
        totalMissing: number;
        totalOrphans: number;
        passed: boolean;
    };
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Map<string, string> {
    const result = new Map<string, string>();
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
            result.set(fullKey, value);
        } else if (value && typeof value === 'object') {
            const nested = flattenKeys(value as Record<string, unknown>, fullKey);
            for (const [k, v] of nested) {
                result.set(k, v);
            }
        }
    }
    return result;
}

async function loadLocale(locale: Locale): Promise<Map<string, string>> {
    // Find project root by looking for pnpm-workspace.yaml
    let root = process.cwd();
    while (root !== '/') {
        try {
            await import.meta.resolve(`${root}/pnpm-workspace.yaml`);
            break;
        } catch {
            root = join(root, '..');
        }
    }
    const localePath = join(root, 'ui', 'src', 'i18n', 'locales', `${locale}.json`);
    if (!existsSync(localePath)) {
        throw new Error(`Locale file not found: ${localePath}`);
    }
    const content = await readFile(localePath, 'utf-8');
    const data = JSON.parse(content);
    return flattenKeys(data);
}

function generatePseudoLocale(base: Map<string, string>): Map<string, string> {
    const pseudo = new Map<string, string>();
    let maxExpansion = 0;
    let maxKey = '';
    let maxValue = '';
    
    for (const [key, value] of base) {
        // Pseudo-localization: expand by ~30-40%, add brackets, replace vowels
        const expanded = `[${value
            .replace(/[aeiou]/gi, (m) => m + m)
            .replace(/[AEIOU]/g, (m) => m + m)
            .replace(/\s+/g, '  ')}]`;
        pseudo.set(key, expanded);
        
        const ratio = expanded.length / Math.max(value.length, 1);
        if (ratio > maxExpansion) {
            maxExpansion = ratio;
            maxKey = key;
            maxValue = expanded;
        }
    }
    
    return pseudo;
}

function checkRtlLayoutIssues(locale: Locale, keys: Map<string, string>): string[] {
    const issues: string[] = [];
    // Check for hardcoded LTR patterns that might break RTL
    // This is a basic heuristic - real RTL testing needs visual inspection
    for (const [key, value] of keys) {
        // Check for directional characters that might cause issues
        if (/\u200E|\u200F/.test(value)) {
            issues.push(`${key}: contains explicit LTR/RTL marks`);
        }
        // Check for hardcoded direction assumptions
        if (/(left|right|margin-left|margin-right|padding-left|padding-right|float:\s*(left|right))/i.test(key)) {
            // These are key names, not values - just a note
        }
    }
    return issues;
}

export class I18nAuditCommand extends Command {
    readonly name = 'i18n:audit';
    readonly description = 'Audit i18n completeness: missing keys, orphan keys, pseudo-locale expansion, RTL layout';
    readonly options = [
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output directory (default: data/eval/i18n)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
        { name: 'fail-on-gaps', type: 'boolean' as const, description: 'Exit with code 1 if missing/orphan keys found (default: true)' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        try {
            const outputDir = this.getStringFlag(args, 'output', join(process.cwd(), 'data', 'eval', 'i18n'));
            const outputJson = this.getBooleanFlag(args, 'json');
            const failOnGaps = this.getBooleanFlag(args, 'fail-on-gaps', true);

            console.log('🔍 Running i18n completeness audit...');
            console.log(`   Base locale: ${BASE_LOCALE}`);
            console.log(`   Target locales: ${SUPPORTED_LOCALES.filter(l => l !== BASE_LOCALE).join(', ')}`);
            console.log('');

            // Load all locales
            const localeMaps = new Map<Locale, Map<string, string>>();
            for (const locale of SUPPORTED_LOCALES) {
                localeMaps.set(locale, await loadLocale(locale));
            }

            const baseMap = localeMaps.get(BASE_LOCALE)!;
            const baseKeys = new Set(baseMap.keys());

            const result: I18nAuditResult = {
                timestamp: new Date().toISOString(),
                baseLocale: BASE_LOCALE,
                locales: {} as Record<Locale, any>,
                pseudoLocale: { expansionRatio: 0, maxExpansionKey: '', maxExpansionValue: '' },
                rtl: { localesChecked: [], layoutIssues: [] },
                summary: { totalMissing: 0, totalOrphans: 0, passed: true },
            };

            // Analyze each target locale
            for (const locale of SUPPORTED_LOCALES) {
                const localeMap = localeMaps.get(locale)!;
                const localeKeys = new Set(localeMap.keys());

                const missingKeys = [...baseKeys].filter(k => !localeKeys.has(k)).sort();
                const orphanKeys = [...localeKeys].filter(k => !baseKeys.has(k)).sort();

                result.locales[locale] = {
                    totalKeys: localeMap.size,
                    missingKeys,
                    orphanKeys,
                };

                result.summary.totalMissing += missingKeys.length;
                result.summary.totalOrphans += orphanKeys.length;

                console.log(`📋 ${locale.toUpperCase()}: ${localeMap.size} keys`);
                if (missingKeys.length > 0) {
                    console.log(`   ❌ Missing: ${missingKeys.length} keys`);
                    for (const key of missingKeys.slice(0, 10)) {
                        console.log(`      - ${key}`);
                    }
                    if (missingKeys.length > 10) {
                        console.log(`      ... and ${missingKeys.length - 10} more`);
                    }
                } else {
                    console.log(`   ✅ No missing keys`);
                }
                if (orphanKeys.length > 0) {
                    console.log(`   ⚠️  Orphans: ${orphanKeys.length} keys`);
                    for (const key of orphanKeys.slice(0, 10)) {
                        console.log(`      + ${key}`);
                    }
                    if (orphanKeys.length > 10) {
                        console.log(`      ... and ${orphanKeys.length - 10} more`);
                    }
                } else {
                    console.log(`   ✅ No orphan keys`);
                }
                console.log('');
            }

            // Pseudo-locale expansion test
            console.log('🔬 Pseudo-locale expansion test...');
            const pseudoMap = generatePseudoLocale(baseMap);
            let maxExpansion = 0;
            let maxKey = '';
            let maxValue = '';
            
            for (const [key, value] of pseudoMap) {
                const baseValue = baseMap.get(key) ?? '';
                const ratio = value.length / Math.max(baseValue.length, 1);
                if (ratio > maxExpansion) {
                    maxExpansion = ratio;
                    maxKey = key;
                    maxValue = value;
                }
            }

            result.pseudoLocale = {
                expansionRatio: Math.round(maxExpansion * 100) / 100,
                maxExpansionKey: maxKey,
                maxExpansionValue: maxValue,
            };

            console.log(`   Max expansion ratio: ${result.pseudoLocale.expansionRatio}x`);
            console.log(`   Key: ${maxKey}`);
            console.log(`   Value: ${maxValue.slice(0, 80)}${maxValue.length > 80 ? '...' : ''}`);
            console.log('');

            // RTL layout check
            console.log('🔄 RTL layout check...');
            const rtlLocales = SUPPORTED_LOCALES.filter(l => RTL_LOCALES.includes(l as typeof RTL_LOCALES[number]));
            const allRtlIssues: string[] = [];
            
            for (const locale of rtlLocales) {
                const issues = checkRtlLayoutIssues(locale, localeMaps.get(locale)!);
                allRtlIssues.push(...issues);
            }

            result.rtl = {
                localesChecked: rtlLocales,
                layoutIssues: allRtlIssues,
            };

            if (allRtlIssues.length > 0) {
                console.log(`   ⚠️  Found ${allRtlIssues.length} potential RTL issues:`);
                for (const issue of allRtlIssues.slice(0, 10)) {
                    console.log(`      - ${issue}`);
                }
            } else {
                console.log(`   ✅ No obvious RTL issues detected (visual verification still needed)`);
            }
            console.log('');

            // Summary
            result.summary.passed = result.summary.totalMissing === 0 && result.summary.totalOrphans === 0;

            console.log('='.repeat(60));
            console.log('📊 I18N AUDIT SUMMARY');
            console.log('='.repeat(60));
            console.log(`Total missing keys: ${result.summary.totalMissing}`);
            console.log(`Total orphan keys:  ${result.summary.totalOrphans}`);
            console.log(`Pseudo expansion:   ${result.pseudoLocale.expansionRatio}x max`);
            console.log(`RTL issues:         ${result.rtl.layoutIssues.length}`);
            console.log(`Overall:            ${result.summary.passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('='.repeat(60));

            // Write reports
            await mkdir(outputDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const jsonPath = join(outputDir, `i18n-audit-${timestamp}.json`);
            const mdPath = join(outputDir, `i18n-audit-${timestamp}.md`);

            await writeFile(jsonPath, JSON.stringify(result, null, 2));
            await this.writeMarkdownReport(result, mdPath);

            if (outputJson) {
                this.printJson(result);
            } else {
                this.printInfo(`JSON report: ${jsonPath}`);
                this.printInfo(`Markdown report: ${mdPath}`);
            }

            if (failOnGaps && !result.summary.passed) {
                this.printError('i18n audit failed: gaps found');
                return 1;
            }

            return 0;
        } catch (error) {
            return this.handleError(error, 'i18n audit failed');
        }
    }

    private async writeMarkdownReport(result: I18nAuditResult, path: string): Promise<void> {
        const lines: string[] = [];
        lines.push('# i18n Completeness Audit');
        lines.push('');
        lines.push(`**Timestamp:** ${result.timestamp}`);
        lines.push(`**Base locale:** ${result.baseLocale}`);
        lines.push('');

        lines.push('## Locale Summary');
        lines.push('');
        lines.push('| Locale | Total Keys | Missing | Orphans | Status |');
        lines.push('|--------|------------|---------|---------|--------|');
        
        for (const locale of SUPPORTED_LOCALES) {
            const data = result.locales[locale];
            const status = data.missingKeys.length === 0 && data.orphanKeys.length === 0 ? '✅' : '❌';
            lines.push(`| ${locale} | ${data.totalKeys} | ${data.missingKeys.length} | ${data.orphanKeys.length} | ${status} |`);
        }
        lines.push('');

        // Missing keys detail
        for (const locale of SUPPORTED_LOCALES) {
            const data = result.locales[locale];
            if (data.missingKeys.length > 0) {
                lines.push(`## Missing Keys in ${locale.toUpperCase()}`);
                lines.push('');
                for (const key of data.missingKeys) {
                    lines.push(`- \`${key}\``);
                }
                lines.push('');
            }
        }

        // Orphan keys detail
        for (const locale of SUPPORTED_LOCALES) {
            const data = result.locales[locale];
            if (data.orphanKeys.length > 0) {
                lines.push(`## Orphan Keys in ${locale.toUpperCase()}`);
                lines.push('');
                for (const key of data.orphanKeys) {
                    lines.push(`- \`${key}\``);
                }
                lines.push('');
            }
        }

        // Pseudo-locale
        lines.push('## Pseudo-Locale Expansion Test');
        lines.push('');
        lines.push(`- **Max expansion ratio:** ${result.pseudoLocale.expansionRatio}x`);
        lines.push(`- **Key:** \`${result.pseudoLocale.maxExpansionKey}\``);
        lines.push(`- **Expanded value:** \`${result.pseudoLocale.maxExpansionValue}\``);
        lines.push('');

        // RTL
        lines.push('## RTL Layout Check');
        lines.push('');
        lines.push(`**Locales checked:** ${result.rtl.localesChecked.join(', ')}`);
        lines.push('');
        if (result.rtl.layoutIssues.length > 0) {
            lines.push('**Potential issues:**');
            for (const issue of result.rtl.layoutIssues) {
                lines.push(`- ${issue}`);
            }
        } else {
            lines.push('No obvious RTL issues detected by static analysis. Visual verification with NVDA/VoiceOver recommended.');
        }
        lines.push('');

        // Recommendations
        lines.push('## Recommendations');
        lines.push('');
        if (result.summary.totalMissing > 0) {
            lines.push('- Add missing translation keys to all target locales');
        }
        if (result.summary.totalOrphans > 0) {
            lines.push('- Remove or migrate orphan keys (keys not present in base locale)');
        }
        if (result.pseudoLocale.expansionRatio > 1.5) {
            lines.push('- High pseudo-locale expansion detected; ensure UI layouts handle 50%+ text growth');
        }
        if (result.rtl.layoutIssues.length > 0) {
            lines.push('- Review RTL layout issues; test with Arabic locale and screen readers');
        }
        if (result.summary.passed) {
            lines.push('- All checks passed! ✅');
        }

        await writeFile(path, lines.join('\n'));
    }
}