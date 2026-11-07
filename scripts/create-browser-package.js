#!/usr/bin/env node
/**
 * Post-build script to create proper browser package for @notention/core
 * Creates dist/browser/ with package.json and proper exports
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'core', 'dist');
const browserDir = join(distDir, 'browser');

// Clean and create browser dir
if (existsSync(browserDir)) {
    rmSync(browserDir, { recursive: true });
}
mkdirSync(browserDir, { recursive: true });

// Create package.json for browser package
const browserPkg = {
    name: "@notention/core/browser",
    version: "1.0.0",
    description: "Browser-safe entry point for @notention/core",
    main: "index.js",
    module: "index.js",
    types: "index.d.ts",
    exports: {
        ".": "./index.js",
        "./types": "./types/index.js",
        "./notes": "./notes/index.js",
        "./matching": "./matching/index.js",
        "./ontology": "./ontology/index.js",
        "./network": "./network/index.js",
        "./skills": "./skills/index.js",
        "./extraction": "./extraction/index.js",
        "./constants": "./constants/index.js",
        "./tracing": "./tracing/index.js",
        "./prompts": "./prompts/index.js",
        "./policy": "./policy/index.js",
        "./export": "./export/index.js",
        "./utils": "./utils/index.js",
        "./patternRecognition": "./patternRecognition/index.js",
        "./security": "./security/index.js",
        "./config": "./config/index.js",
        "./config/NoteBasedConfig": "./config/NoteBasedConfig.js",
        "./storage": "./storage/index.js",
        "./storage/recovery": "./storage/recovery.js",
        "./templates": "./templates/index.js",
        "./fixtures": "./fixtures/index.js",
        "./feedback": "./feedback/index.js",
        "./suggestions": "./suggestions/index.js",
        "./test-utils": "./test-utils/index.js",
        "./validation": "./validation/index.js",
        "./events": "./events/index.js",
        "./ui": "./ui/index.js",
        "./ui/strategy": "./ui/strategy.js",
        "./ui/ProfileRegistry": "./ui/ProfileRegistry.js",
        "./ui/profile": "./ui/profile.js",
        "./ui/profileDefaults": "./ui/profileDefaults.js",
        "./network/nostr/nostr": "./network/nostr/nostr.js",
        "./network/nostr/privacy": "./network/nostr/privacy.js",
        "./network/nostr/discovery": "./network/nostr/discovery.js",
        "./network/nostr/relay": "./network/nostr/relay.js",
        "./network/nostr/protocol": "./network/nostr/protocol.js"
    },
    type: "module"
};

writeFileSync(join(browserDir, 'package.json'), JSON.stringify(browserPkg, null, 2));

// Copy all browser-safe files to browser dir
function copyBrowserFiles(srcDir, destDir) {
    if (!existsSync(srcDir)) return;
    mkdirSync(destDir, { recursive: true });
    for (const file of readdirSync(srcDir)) {
        const srcPath = join(srcDir, file);
        const destPath = join(destDir, file);
        if (file.endsWith('.js') || file.endsWith('.d.ts') || file.endsWith('.d.ts.map')) {
            copyFileSync(srcPath, destPath);
        }
    }
}

// Copy domain barrels
const domainBarrels = ['types', 'notes', 'matching', 'ontology', 'network', 'skills', 'extraction', 'constants', 'tracing', 'prompts', 'policy', 'export', 'utils', 'patternRecognition', 'security', 'templates', 'fixtures', 'feedback', 'test-utils', 'validation', 'events'];
for (const barrel of domainBarrels) {
    copyBrowserFiles(join(distDir, barrel), join(browserDir, barrel));
}

// Copy config (browser version)
copyBrowserFiles(join(distDir, 'config'), join(browserDir, 'config'));

// Copy storage (browser version)  
copyBrowserFiles(join(distDir, 'storage'), join(browserDir, 'storage'));

// Copy suggestions (browser version)
copyBrowserFiles(join(distDir, 'suggestions'), join(browserDir, 'suggestions'));

// Copy UI
copyBrowserFiles(join(distDir, 'ui'), join(browserDir, 'ui'));

// Copy network/nostr
mkdirSync(join(browserDir, 'network', 'nostr'), { recursive: true });
const nostrFiles = ['nostr.js', 'nostr.d.ts', 'privacy.js', 'privacy.d.ts', 'discovery.js', 'discovery.d.ts', 'relay.js', 'relay.d.ts', 'protocol.js', 'protocol.d.ts'];
for (const file of nostrFiles) {
    const srcPath = join(distDir, 'network', 'nostr', file);
    if (existsSync(srcPath)) {
        copyFileSync(srcPath, join(browserDir, 'network', 'nostr', file));
    }
}

// Create main index.js with explicit re-exports
const indexContent = `/**
 * Browser-safe entry point for @notention/core
 * Explicit re-exports for proper bundler resolution
 */

// Types
export * from './types/index.js';

// Domain barrels
export * from './notes/index.js';
export * from './matching/index.js';
export * from './ontology/index.js';
export * from './network/index.js';
export * from './skills/index.js';
export * from './extraction/index.js';
export * from './constants/index.js';
export * from './tracing/index.js';
export * from './prompts/index.js';
export * from './policy/index.js';
export * from './export/index.js';
export { DEFAULT_ONTOLOGY } from './ontology/ontology.default.js';
export { OntologyService } from './ontology/ontologyService.js';

// Utils
export * from './utils/index.js';
export * from './patternRecognition/index.js';
export * from './security/index.js';
export * from './config/index.js';
export * from './config/NoteBasedConfig.js';
export * from './storage/index.js';
export * from './storage/recovery.js';
export * from './templates/index.js';
export * from './fixtures/index.js';
export * from './feedback/index.js';

// New extensibility modules
export * from './ontology/index.js';
export * from './suggestions/index.js';
export * from './test-utils/index.js';
export * from './validation/index.js';
export * from './events/index.js';

// UI
export * from './ui/index.js';

// Nostr-specific
export * from './network/nostr/nostr.js';
export * from './network/nostr/privacy.js';
export * from './network/nostr/discovery.js';
export * from './network/nostr/relay.js';
export {
    PROTOCOL_VERSION,
    encodeEventToCBOR,
    decodeEventFromCBOR,
    computeNoteID,
    computeNoteIDFromSerialized,
    signEvent,
    verifyEventSignature,
    getPublicKeyFromSecret,
    generatePrivateKey,
    serializeEventForSigning,
    isValidEvent,
    verifiedSymbol,
} from './network/nostr/protocol.js';
`;

writeFileSync(join(browserDir, 'index.js'), indexContent);

// Copy index.d.ts
if (existsSync(join(distDir, 'index.browser.d.ts'))) {
    copyFileSync(join(distDir, 'index.browser.d.ts'), join(browserDir, 'index.d.ts'));
}

console.log('✅ Browser package created at dist/browser/');