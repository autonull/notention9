import { defineConfig } from 'tsup';

const browserEntries = [
  // Main entry
  'src/index.browser.ts',
  // Domain barrels
  'src/notes/index.ts',
  'src/matching/index.ts',
  'src/ontology/index.ts',
  'src/network/index.ts',
  'src/skills/index.ts',
  'src/extraction/index.ts',
  'src/constants/index.ts',
  'src/constants/seams.ts',
  'src/tracing/index.ts',
  'src/prompts/index.ts',
  'src/policy/index.ts',
  'src/export/index.ts',
  // Utils
  'src/utils/index.ts',
  'src/patternRecognition/index.ts',
  'src/security/index.ts',
  'src/config.browser.ts',
  'src/config/NoteBasedConfig.ts',
  'src/storage/Storage.browser.ts',
  'src/storage/recovery.ts',
  'src/templates/index.ts',
  'src/fixtures/index.ts',
  'src/feedback/index.ts',
  // Extensibility
  'src/ontology/index.ts',
  'src/suggestions/SuggestionStore.browser.ts',
  'src/test-utils/index.ts',
  'src/validation/index.ts',
  'src/events/index.ts',
  // UI
  'src/ui/index.ts',
  'src/ui/strategy.ts',
  'src/ui/ProfileRegistry.ts',
  'src/ui/profile.ts',
  'src/ui/profileDefaults.ts',
  // Telemetry (browser stubs)
  'src/telemetry/journal.browser.ts',
  'src/telemetry/revisionStore.browser.ts',
  'src/telemetry/ledger.browser.ts',
  // Nostr
  'src/network/nostr/nostr.ts',
  'src/network/nostr/privacy.ts',
  'src/network/nostr/discovery.ts',
  'src/network/nostr/relay.ts',
  'src/network/nostr/protocol.ts',
  // Schemas
  'src/schemas/generated/seam-definitions.ts',
];

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
    splitting: false,
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