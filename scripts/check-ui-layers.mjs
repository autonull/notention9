#!/usr/bin/env node
// Guard one-way layers: primitives never call app state; patterns never call contexts.
import {readFile, readdir} from 'node:fs/promises';
import {join, relative} from 'node:path';

const ROOT = join(process.cwd(), 'ui/src/components');
const PRIMITIVE_DIR = join(ROOT, 'ui');
const PATTERN_DIR = join(ROOT, 'patterns');
const FORBIDDEN_PRIMITIVE = /from\s+['"][^'"]*(?:\/hooks\/|\/contexts\/|\/services\/)['"]/;
const FORBIDDEN_PATTERN = /from\s+['"][^'"]*\/contexts\/[^'"]*['"]/;
const CSS_MODULE = /\.module\.css$/;
// Legacy modules predate the layer guard; new ones are not allowed.
const LEGACY_CSS_MODULES = new Set([
    'ui/src/components/next-steps/NextStepCard.module.css',
    'ui/src/components/next-steps/NextStepStrip.module.css',
    'ui/src/components/next-steps/NextStepsDrawer.module.css',
]);

const walk = async (directory) => {
    let entries;
    try {
        entries = await readdir(directory, {withFileTypes: true});
    } catch {
        return [];
    }
    const files = await Promise.all(entries.map(entry => {
        const full = join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }));
    return files.flat();
};

const codeFiles = (await walk(ROOT)).filter(file => /\.(ts|tsx)$/.test(file));
const violations = [];
const large = [];

for (const file of codeFiles) {
    const source = await readFile(file, 'utf8');
    const name = relative(process.cwd(), file);
    if (file.startsWith(PRIMITIVE_DIR) && FORBIDDEN_PRIMITIVE.test(source)) {
        violations.push(`${name}: primitive imports app state`);
    }
    if (file.startsWith(PATTERN_DIR) && FORBIDDEN_PATTERN.test(source)) {
        violations.push(`${name}: pattern imports context`);
    }
    if (file.split('\n').length > 250) large.push(`${name}: ${file.split('\n').length} lines`);
}

for (const file of await walk(ROOT)) {
    const name = relative(process.cwd(), file);
    if (CSS_MODULE.test(file) && !LEGACY_CSS_MODULES.has(name)) {
        violations.push(`${name}: CSS module under components`);
    }
}

if (large.length > 0) {
    console.warn('UI layer note: files over 250 lines should split when touched.');
    for (const file of large) console.warn(`  ${file}`);
}

if (violations.length > 0) {
    console.error('UI layer violation: one-way imports are required.');
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
}

console.log(`UI layers OK (${codeFiles.length} files).`);
