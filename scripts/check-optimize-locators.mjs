#!/usr/bin/env node
/**
 * Enforces AD-4 + §11.1: no CSS class selectors, no page.accessibility.snapshot()
 * Scans optimize/ and ui/test/optimize/ for violations.
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const TARGET_DIRS = [
    join(ROOT, 'optimize'),
    join(ROOT, 'ui/test/optimize'),
];

const FORBIDDEN_PATTERNS = [
    { regex: /locator\(['"`]\./, desc: 'CSS class selector in locator()' },
    { regex: /page\.accessibility\.snapshot\(/, desc: 'page.accessibility.snapshot() usage' },
];

function scanDir(dir) {
    const files = glob.sync('**/*.ts', { cwd: dir, absolute: true });
    let violations = 0;

    for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (const { regex, desc } of FORBIDDEN_PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    const relPath = file.replace(ROOT + '/', '');
                    console.error(`❌ ${relPath}:${i + 1}: ${desc}`);
                    console.error(`   ${lines[i].trim()}`);
                    violations++;
                }
            }
        }
    }

    return violations;
}

let totalViolations = 0;
for (const dir of TARGET_DIRS) {
    totalViolations += scanDir(dir);
}

if (totalViolations > 0) {
    console.error(`\n${totalViolations} violation(s) found.`);
    process.exit(1);
} else {
    console.log('✅ No forbidden locator patterns found.');
    process.exit(0);
}