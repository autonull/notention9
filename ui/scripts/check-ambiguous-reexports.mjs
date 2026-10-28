#!/usr/bin/env node
/**
 * Check for ambiguous re-exports in barrel files.
 * A re-export is ambiguous if the same module is re-exported from multiple barrel files.
 */

import {readFileSync, readdirSync} from 'fs';
import {join, extname} from 'path';

const BARREL_FILES = ['index.ts', 'index.tsx', 'Primitives.tsx', 'Primitives.ts'];
const TARGET_DIR = join(process.cwd(), 'src/components/ui');

function isBarrelFile(filename) {
    return BARREL_FILES.includes(filename);
}

function findExportAllDeclarations(content) {
    const exports = [];
    const regex = /export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        exports.push(match[1]);
    }
    return exports;
}

function main() {
    const files = readdirSync(TARGET_DIR).filter(f => isBarrelFile(f));
    const sourceToFiles = new Map();

    for (const file of files) {
        const content = readFileSync(join(TARGET_DIR, file), 'utf-8');
        const exports = findExportAllDeclarations(content);

        for (const source of exports) {
            if (!sourceToFiles.has(source)) {
                sourceToFiles.set(source, new Set());
            }
            sourceToFiles.get(source).add(file);
        }
    }

    let hasErrors = false;
    for (const [source, files] of sourceToFiles.entries()) {
        if (files.size > 1) {
            console.error(`❌ Ambiguous re-export: "${source}" is re-exported from multiple barrel files: ${Array.from(files).join(', ')}`);
            hasErrors = true;
        }
    }

    if (hasErrors) {
        console.error('\nThis can cause import ambiguity and break dependency scanning.');
        process.exit(1);
    } else {
        console.log('✅ No ambiguous re-exports found.');
    }
}

main();