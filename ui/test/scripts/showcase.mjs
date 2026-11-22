#!/usr/bin/env node
// Regenerate the screenshot gallery.
// Usage:
//   node test/scripts/showcase.mjs                 # all scenes, replace gallery
//   node test/scripts/showcase.mjs editor          # one grep pattern, merge gallery
//   SCREENSHOT_WORKERS=4 node test/scripts/showcase.mjs   # non-relay scenes only
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pattern = process.argv[2];
process.env.SCREENSHOT_ISOLATION = '1';
// One worker keeps the shared local relay deterministic: each scene clears it
// before seeding, so parallel workers would erase each other's public notes.
const workers = process.env.SCREENSHOT_WORKERS ?? '1';

const run = (command, args) => {
    execFileSync(command, args, {cwd: root, stdio: 'inherit'});
};

run('node', ['test/scripts/reset-screenshot.mjs']);
run('pnpm', [
    'exec',
    'playwright',
    'test',
    '--config',
    'test/playwright.config.ts',
    '--project=showcase',
    `--workers=${workers}`,
    ...(pattern ? ['-g', pattern] : []),
]);
run('node', ['test/scripts/build-index.mjs', ...(pattern ? ['--merge'] : [])]);
