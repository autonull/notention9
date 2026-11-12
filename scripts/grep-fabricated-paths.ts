#!/usr/bin/env node
// scripts/grep-fabricated-paths.ts - CI guard against fabricated/hardcoded test paths in production code

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
    {pattern: 'runCompare', description: 'Reference to deleted runCompare function'},
    {pattern: 'compare\.ts', description: 'Reference to deleted compare.ts (excluding docs)'},
    {pattern: 'FAKE_', description: 'FAKE_ constant in production code'},
    {pattern: 'MOCK_', description: 'MOCK_ constant in production code'},
    {pattern: 'TEST_DATA', description: 'TEST_DATA constant in production code'},
    {pattern: '/tmp/test', description: 'Hardcoded /tmp/test path'},
    {pattern: '/var/test', description: 'Hardcoded /var/test path'},
];

const EXCLUDE_PATTERNS = [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/test/**',
    '**/tests/**',
    '**/__mocks__/**',
    '**/fixtures/**',
    '**/test-data/**',
    '**/*.tsbuildinfo',
    '**/*.md',
    '**/*.json',
    'scripts/grep-fabricated-paths.ts',
];

interface Violation {
    file: string;
    line: number;
    pattern: string;
    description: string;
}

function checkForbiddenPatterns(): Violation[] {
    const violations: Violation[] = [];

    for (const {pattern, description} of FORBIDDEN_PATTERNS) {
        const args = [
            '--line-number',
            '--no-heading',
            ...EXCLUDE_PATTERNS.map(exclude => `--glob=!${exclude}`),
            pattern,
            rootDir,
        ];
        const result = spawnSync('rg', args, {cwd: rootDir, encoding: 'utf-8'});

        if (result.error) {
            throw new Error(`ripgrep could not run for pattern "${pattern}": ${result.error.message}`);
        }
        if (result.status === 1) continue;
        if (result.status !== 0) {
            throw new Error(`ripgrep failed for pattern "${pattern}": ${result.stderr?.trim() || `exit ${result.status}`}`);
        }

        for (const line of result.stdout.trim().split('\n')) {
            const match = line.match(/^([^:]+):(\d+):(.+)$/);
            if (!match) continue;

            violations.push({
                file: match[1].replace(`${rootDir}/`, ''),
                line: Number.parseInt(match[2], 10),
                pattern,
                description,
            });
        }
    }

    return violations;
}

function main(): void {
    console.log('🔍 Checking for fabricated paths in production code...');
    console.log('==========================================');

    const violations = checkForbiddenPatterns();
    if (violations.length === 0) {
        console.log('✅ No fabricated paths found in production code');
        console.log('==========================================');
        return;
    }

    console.log('\n❌ FORBIDDEN PATTERNS FOUND:');
    console.log('==========================================');
    for (const violation of violations) {
        console.log(`  ${violation.file}:${violation.line}`);
        console.log(`    Pattern: ${violation.pattern}`);
        console.log(`    Reason: ${violation.description}`);
        console.log('');
    }
    console.log('==========================================');
    console.log('Fix: Remove hardcoded test paths from production code.');
    console.log('If this is a legitimate test file, add it to EXCLUDE_PATTERNS in this script.');
    process.exit(1);
}

try {
    main();
} catch (error) {
    console.error(`❌ Fabricated-path guard failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
}
