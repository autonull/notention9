#!/usr/bin/env node
// Refresh one screenshot group without rebuilding the whole gallery.
// Usage: pnpm screenshot editor
//        pnpm screenshot "next-steps|suggestions"
//        SCREENSHOT_WORKERS=8 pnpm screenshots
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pattern = process.argv[2];

if (!pattern) {
    console.error('Usage: pnpm screenshot <scene grep pattern>');
    console.error('Example: pnpm screenshot editor');
    process.exit(1);
}

execFileSync('node', ['test/scripts/showcase.mjs', pattern], {
    cwd: resolve(root, 'ui'),
    stdio: 'inherit',
    env: process.env,
});
