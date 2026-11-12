#!/usr/bin/env tsx
/**
 * Purity check: ensures no workspace declares a runtime dependency with
 * native bindings outside the explicit allowlist. Run via `pnpm verify` (L0 gate).
 *
 * Only flags packages known to require native compilation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Packages with native bindings (require node-gyp, cmake, etc.)
const NATIVE_PACKAGES = new Set([
    'better-sqlite3',
    'sqlite3',
    'bcrypt',
    'argon2',
    'canvas',
    'node-pty',
    'ffi-napi',
    'ref-napi',
    'sharp',
    'sodium-native',
    'leveldown',
    'rocksdb',
    'ffi',
    'ref',
]);

// Workspaces allowed to have native deps (node-only bundles)
const NATIVE_ALLOWED_WORKSPACES = new Set(['core']);

async function main() {
    const workspacePaths = await fs.readdir(ROOT, { withFileTypes: true });
    let hasErrors = false;

    for (const entry of workspacePaths) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        const pkgPath = path.join(ROOT, entry.name, 'package.json');
        let pkg: any;
        try {
            pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        } catch {
            continue; // Not a package
        }

        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const isNativeAllowed = NATIVE_ALLOWED_WORKSPACES.has(entry.name);

        for (const dep of Object.keys(deps)) {
            if (NATIVE_PACKAGES.has(dep)) {
                if (!isNativeAllowed) {
                    console.error(`❌ ${entry.name}: native dependency "${dep}" not allowed (only core may use native deps)`);
                    hasErrors = true;
                }
            }
        }
    }

    if (hasErrors) {
        console.error('\nPurity check failed. Native dependencies found outside allowed workspaces.');
        process.exit(1);
    }

    console.log('✅ No unexpected native dependencies found');
}

main();