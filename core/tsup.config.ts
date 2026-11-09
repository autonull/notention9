import { defineConfig } from 'tsup';
import { dirname, resolve } from 'node:path';

// Rewrite relative imports to sibling `.browser.ts` twins in the browser build
// (entries re-export node variants via plain `./module.js` paths, e.g. profile.ts).
// Only the twin set whose browser variant is a complete replacement — other
// `.browser.ts` files (config, etc.) are functional stubs, not replacements.
const BROWSER_TWINS = [
    'telemetry/journal',
    'telemetry/revisionStore',
    'telemetry/ledger',
    'ui/ProfileRegistry',
    'utils/common',
];
const browserVariantRewrite = {
    name: 'browser-variant-rewrite',
    setup(build) {
        build.onResolve({ filter: /^\.{1,2}\/.+\.js$/ }, (args) => {
            const base = resolve(dirname(args.importer), args.path).replace(/\.js$/, '');
            return BROWSER_TWINS.some(twin => base.endsWith(`/${twin}`))
                ? { path: `${base}.browser.ts` }
                : null;
        });
    },
};

const browserEntries = {
  // Main entry - output as index.js for directory-based resolution
  'index': 'src/index.browser.ts',
  // Domain barrels
  'notes/index': 'src/notes/index.ts',
  'matching/index': 'src/matching/index.ts',
  'ontology/index': 'src/ontology/index.ts',
  'network/index': 'src/network/index.ts',
  'skills/index': 'src/skills/index.ts',
  'extraction/index': 'src/extraction/index.ts',
  'constants/index': 'src/constants/index.ts',
  'constants/seams': 'src/constants/seams.ts',
  'tracing/index': 'src/tracing/index.ts',
  'prompts/index': 'src/prompts/index.ts',
  'policy/index': 'src/policy/index.ts',
  'export/index': 'src/export/index.ts',
  // Utils
  'utils/index': 'src/utils/index.browser.ts',
  'utils/common': 'src/utils/common.browser.ts',
  'patternRecognition/index': 'src/patternRecognition/index.ts',
  'security/index': 'src/security/index.ts',
  'config': 'src/config.browser.ts',
  'config/NoteBasedConfig': 'src/config/NoteBasedConfig.ts',
  'storage/Storage': 'src/storage/Storage.browser.ts',
  'storage/recovery': 'src/storage/recovery.ts',
  'templates/index': 'src/templates/index.ts',
  'fixtures/index': 'src/fixtures/index.ts',
  'feedback/index': 'src/feedback/index.ts',
  // Extensibility
  'suggestions/SuggestionStore': 'src/suggestions/SuggestionStore.browser.ts',
  'test-utils/index': 'src/test-utils/index.ts',
  'validation/index': 'src/validation/index.ts',
  'events/index': 'src/events/index.ts',
  // UI
  'ui/index': 'src/ui/index.browser.ts',
  'ui/strategy': 'src/ui/strategy.ts',
  'ui/ProfileRegistry': 'src/ui/ProfileRegistry.browser.ts',
  'ui/profile': 'src/ui/profile.ts',
  'ui/profileDefaults': 'src/ui/profileDefaults.ts',
  // Telemetry (browser stubs)
  'telemetry/journal': 'src/telemetry/journal.browser.ts',
  'telemetry/revisionStore': 'src/telemetry/revisionStore.browser.ts',
  'telemetry/ledger': 'src/telemetry/ledger.browser.ts',
  // Nostr
  'network/nostr/nostr': 'src/network/nostr/nostr.ts',
  'network/nostr/privacy': 'src/network/nostr/privacy.ts',
  'network/nostr/discovery': 'src/network/nostr/discovery.ts',
  'network/nostr/relay': 'src/network/nostr/relay.ts',
  'network/nostr/protocol': 'src/network/nostr/protocol.ts',
  // Schemas
  'schemas/generated/seam-definitions': 'src/schemas/generated/seam-definitions.ts',
};

const nodeEntries = [
  // Main entry
  'src/index.node.ts',
  // Domain barrels
  'src/notes/index.ts',
  'src/matching/index.ts',
  'src/ontology/index.ts',
  'src/ontology/domains.ts',
  'src/ontology/domains.facets.ts',
  'src/ontology/schema.ts',
  'src/network/index.ts',
  'src/skills/index.ts',
  'src/extraction/index.ts',
  'src/constants/index.ts',
  'src/constants/seams.ts',
  'src/constants/paths.ts',
  'src/constants/storageKeys.ts',
  'src/constants/strategyParams.ts',
  'src/tracing/index.ts',
  'src/prompts/index.ts',
  'src/policy/index.ts',
  'src/export/index.ts',
  // Utils
  'src/utils/index.ts',
  'src/patternRecognition/index.ts',
  'src/security/index.ts',
  'src/config/index.ts',
  'src/config/NoteBasedConfig.ts',
  'src/storage/index.ts',
  'src/storage/recovery.ts',
  'src/templates/index.ts',
  'src/fixtures/index.ts',
  'src/feedback/index.ts',
  // Extensibility
  'src/ontology/index.ts',
  'src/suggestions/SuggestionStore.ts',
  'src/test-utils/index.ts',
  'src/validation/index.ts',
  'src/events/index.ts',
  // UI
  'src/ui/index.ts',
  'src/ui/strategy.ts',
  'src/ui/ProfileRegistry.ts',
  'src/ui/profile.ts',
  'src/ui/profileDefaults.ts',
  // Telemetry
  'src/telemetry/journal.ts',
  'src/telemetry/revisionStore.ts',
  'src/telemetry/ledger.ts',
  'src/telemetry/revisionDriver.ts',
  'src/telemetry/revisionUtils.ts',
  'src/telemetry/constants.ts',
  // Nostr
  'src/network/nostr/nostr.ts',
  'src/network/nostr/privacy.ts',
  'src/network/nostr/discovery.ts',
  'src/network/nostr/relay.ts',
  'src/network/nostr/protocol.ts',
  // Eval
  'src/eval/caseManifest.ts',
  'src/eval/verdict.ts',
  'src/eval/quality.ts',
  // Schemas
  'src/schemas/generated/seam-definitions.ts',
  'src/schemas/index.ts',
];

export default defineConfig([
  // Node.js entry points (for optimizer, CLI, etc.)
  {
    entry: nodeEntries,
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    platform: 'node',
    target: 'node20',
    external: [
      '@notention/optimize',
      'ws',
      'events',
    ],
    noExternal: [
      '@notention/core/**',
      'better-sqlite3',
      'ajv',
    ],
    esbuildOptions(options) {
      options.banner = {
        js: '// Node.js entry point for @notention/core',
      };
      options.define = {
        'process.env.NODE_ENV': '"production"',
      };
    },
    onSuccess: async () => {
      console.log('✅ Node.js bundles complete');
    },
  },
  // Browser entry points (for UI)
  {
    entry: browserEntries,
    format: ['esm'],
    dts: false,
    splitting: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist/browser',
    platform: 'browser',
    target: 'es2022',
    external: [
      'fs', 'fs/promises', 'path', 'url', 'crypto', 'stream', 'process', 'events',
      'buffer', 'util', 'assert', 'constants', 'querystring', 'string_decoder',
      'punycode', 'vm', 'zlib', 'os', 'child_process', 'net', 'tls', 'http', 'https',
      'http2', 'dgram', 'dns', 'module', 'perf_hooks', 'worker_threads',
      '@notention/optimize',
      'better-sqlite3',
      'ajv',
    ],
    noExternal: ['@notention/core/**'],
    esbuildPlugins: [
      browserVariantRewrite,
      {
        name: 'ignore-node-imports',
        setup(build) {
          build.onResolve({ filter: /^node:/ }, args => ({ external: true }));
          build.onResolve({ filter: /^(fs|path|url|crypto|stream|buffer|util|assert|constants|querystring|string_decoder|punycode|vm|zlib|os)(\/|$)/ }, args => ({ external: true }));
        },
      },
    ],
    esbuildOptions(options) {
      options.banner = {
        js: '// Browser-safe entry point for @notention/core',
      };
      options.define = {
        'process.env.NODE_ENV': '"production"',
        'globalThis.window': '"object"',
      };
    },
    onSuccess: async () => {
      console.log('✅ Browser bundles complete');
    },
  },
]);