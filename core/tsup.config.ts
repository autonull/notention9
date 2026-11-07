import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.browser.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist/browser',
  platform: 'browser',
  target: 'es2022',
  external: [
    // Externalize all Node.js built-ins
    'fs', 'fs/promises', 'path', 'url', 'crypto', 'stream', 'process', 'events',
    'buffer', 'util', 'assert', 'constants', 'querystring', 'string_decoder',
    'punycode', 'vm', 'zlib', 'os', 'child_process', 'net', 'tls', 'http', 'https',
    'http2', 'dgram', 'dns', 'module', 'perf_hooks', 'worker_threads',
    // Externalize packages not available in browser
    '@notention/optimize',
    'better-sqlite3',
    'ajv',
  ],
  noExternal: [
    // Bundle all internal modules
    '@notention/core/**',
  ],
  esbuildPlugins: [
    {
      name: 'ignore-node-imports',
      setup(build) {
        // Mark Node.js built-ins as external
        build.onResolve({ filter: /^node:/ }, args => ({
          external: true,
        }));
        // Mark fs/promises, path, url as external
        build.onResolve({ filter: /^(fs|path|url|crypto|stream|buffer|util|assert|constants|querystring|string_decoder|punycode|vm|zlib|os)(\/|$)/ }, args => ({
          external: true,
        }));
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
    console.log('✅ Browser bundle complete');
  },
});