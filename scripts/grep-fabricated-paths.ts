#!/usr/bin/env node
// scripts/grep-fabricated-paths.ts - CI guard against fabricated/hardcoded test paths in production code

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Patterns that indicate fabricated/fake paths in production code
// These are SPECIFIC patterns that indicate bad practices, not legitimate test infrastructure
const FORBIDDEN_PATTERNS = [
    // Fabricated comparison (from deleted compare.ts)
    { pattern: 'runCompare', description: 'Reference to deleted runCompare function' },
    { pattern: 'compare\.ts', description: 'Reference to deleted compare.ts (excluding docs)' },
    
    // Hardcoded fake/mock data in production logic (not test infrastructure)
    { pattern: 'FAKE_', description: 'FAKE_ constant in production code' },
    { pattern: 'MOCK_', description: 'MOCK_ constant in production code' },
    { pattern: 'TEST_DATA', description: 'TEST_DATA constant in production code' },
    
    // Hardcoded absolute paths that look like test paths
    { pattern: '/tmp/test', description: 'Hardcoded /tmp/test path' },
    { pattern: '/var/test', description: 'Hardcoded /var/test path' },
];

// Files to exclude from checks entirely
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
    '**/*.tsbuildinfo',  // Build artifacts
    '**/*.md',           // Markdown/docs
    '**/*.json',         // Config files (may reference test paths legitimately)
    'scripts/grep-fabricated-paths.ts', // This file itself
];

// Legitimate test-data imports in evaluation infrastructure (allowed)
const ALLOWED_TEST_DATA_IMPORTS = [
    'optimize/src/synthesis/evaluation.ts',
    'optimize/src/synthesis/builtinSpecs.ts',
    'optimize/src/constants.ts',
    'optimize/src/loop/subcommands/discover.ts',
    'core/src/index.ts',
];

function checkForbiddenPatterns(): { found: boolean; violations: Array<{ file: string; line: number; pattern: string; description: string }> } {
    const violations: Array<{ file: string; line: number; pattern: string; description: string }> = [];
    
    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
        try {
            const excludeGlobs = EXCLUDE_PATTERNS.map(p => `--glob='!${p}'`).join(' ');
            const cmd = `rg --line-number --no-heading ${excludeGlobs} "${pattern}" ${rootDir}`;
            const output = execSync(cmd, { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            
            if (output.trim()) {
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    const match = line.match(/^([^:]+):(\d+):(.+)$/);
                    if (match) {
                        const file = match[1].replace(rootDir + '/', '');
                        const lineNum = parseInt(match[2], 10);
                        
                        // Check if this is an allowed test-data import
                        const isAllowed = ALLOWED_TEST_DATA_IMPORTS.some(allowed => file.startsWith(allowed));
                        if (isAllowed && pattern === 'test-data/') {
                            continue; // Skip allowed test-data imports
                        }
                        
                        violations.push({
                            file,
                            line: lineNum,
                            pattern,
                            description,
                        });
                    }
                }
            }
        } catch (e) {
            // rg returns non-zero exit code when no matches found - that's expected
            if (e instanceof Error && !e.message.includes('exit code 1')) {
                console.warn(`Warning: grep failed for pattern "${pattern}": ${e.message}`);
            }
        }
    }
    
    return { found: violations.length > 0, violations };
}

function main(): void {
    console.log('🔍 Checking for fabricated paths in production code...');
    console.log('==========================================');
    
    const { found, violations } = checkForbiddenPatterns();
    
    if (found) {
        console.log('\n❌ FORBIDDEN PATTERNS FOUND:');
        console.log('==========================================');
        for (const v of violations) {
            console.log(`  ${v.file}:${v.line}`);
            console.log(`    Pattern: ${v.pattern}`);
            console.log(`    Reason: ${v.description}`);
            console.log('');
        }
        console.log('==========================================');
        console.log('Fix: Remove hardcoded test paths from production code.');
        console.log('If this is a legitimate test file, add it to EXCLUDE_PATTERNS in this script.');
        process.exit(1);
    } else {
        console.log('✅ No fabricated paths found in production code');
        console.log('==========================================');
    }
}

main();