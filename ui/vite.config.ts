/// <reference types="vitest" />
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {configDefaults} from 'vitest/config';
import react from '@vitejs/plugin-react';
import nodePolyfills from 'rollup-plugin-node-polyfills';
// import {VitePWA} from 'vite-plugin-pwa'; // Temporarily disabled due to Node.js module resolution issues

// Plugin to exclude test files from production build
const createExcludeTestsPlugin = (isDev: boolean) => ({
    name: 'exclude-tests',
    enforce: 'pre',
    resolveId(id) {
        const isTestFile = id.includes('.test.') || id.includes('.spec.') || id.includes('/tests/') || id.includes('/test/');
        const isWorkspacePackage = id.includes('@notention/');
        const isNodeModules = id.includes('node_modules');
        // Exclude test files from workspace packages (which are symlinked in node_modules)
        // and from the main src directory
        if (isTestFile && (isWorkspacePackage || !isNodeModules)) {
            return isDev ? { id, external: true } : false;
        }
    },
});

// Plugin to inject __name polyfill into production JS chunks via generateBundle
const namePolyfillPlugin = {
    name: 'name-polyfill',
    generateBundle(options, bundle) {
        const polyfill = `var __name = function __name(fn, name) { try { Object.defineProperty(fn, 'name', { value: name, configurable: true }); } catch (e) {} return fn; };\n`;
        for (const [fileName, chunk] of Object.entries(bundle)) {
            if (fileName.endsWith('.js') && chunk.type === 'chunk') {
                const code = chunk.code;
                if (!/var __name\s*=\s*function __name\(/.test(code)) {
                    chunk.code = polyfill + code;
                }
            }
        }
    },
};

// Mirror core's tsup browser-variant rewrite for the dev server:
// Node-only core modules (fs/sqlite) must resolve to their `.browser.ts` twins.
const CORE_BROWSER_TWINS = [
    'telemetry/journal',
    'telemetry/revisionStore',
    'telemetry/ledger',
    'ui/ProfileRegistry',
    'utils/common',
];
const coreBrowserVariantPlugin = {
    name: 'core-browser-variant',
    enforce: 'pre',
    resolveId(source, importer) {
        if (!importer || !source.startsWith('.') || !source.endsWith('.js')) return null;
        const cleanImporter = importer.split('?')[0];
        if (!cleanImporter.includes('/core/src/')) return null;
        const base = path.resolve(path.dirname(cleanImporter), source).replace(/\.js$/, '');
        return CORE_BROWSER_TWINS.some(twin => base.endsWith(`/${twin}`))
            ? `${base}.browser.ts`
            : null;
    },
};

// Plugin to preserve React's named exports by converting to namespace imports
const preserveReactExportsPlugin = {
    name: 'preserve-react-exports',
    enforce: 'post',
    renderChunk(code) {
        // Convert named React imports to namespace imports to avoid chunk splitting issues
        // import { useRef, useState, useEffect } from 'react'
        // -> import * as React from 'react'; const { useRef, useState, useEffect } = React;
        return code
            .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]react['"]/g, (match, imports) => {
                const namedImports = imports.split(',').map(i => i.trim()).filter(Boolean);
                const destructured = namedImports.join(', ');
                return `import * as React from 'react'; const { ${destructured} } = React;`;
            })
            .replace(/import\s+React\s+from\s+['"]react['"]/g, "import * as React from 'react'");
    },
};

// Plugin to inject __name polyfill in dev mode (Rollup's CommonJS helper)
const namePolyfillDevPlugin = {
    name: 'name-polyfill-dev',
    enforce: 'pre',
    transform(code, id) {
        // Only inject in development mode
        // Apply to ALL modules (including node_modules) that might use __name
        if (!id.endsWith('.css') && !code.includes('var __name = function __name')) {
            // Check if this module calls __name (indicating it needs the polyfill)
            const callsName = code.includes('__name(');
            const hasDefineProperty = code.includes('Object.defineProperty(fn, \'name\')');
            const notNodeModules = !id.includes('node_modules');
            if (callsName || hasDefineProperty || notNodeModules) {
                const polyfill = `var __name = function __name(fn, name) { try { Object.defineProperty(fn, 'name', { value: name, configurable: true }); } catch (e) {} return fn; };\n`;
                return polyfill + code;
            }
        }
    },
};



// Plugin to remove __name (Vite dev-only) from production builds
const removeDevOnlyPlugin = {
    name: 'remove-dev-only',
    enforce: 'post',
    renderChunk(code) {
        if (code.includes('__name')) {
            // Handle var/let/const __name = ... declarations by replacing with void 0;
            // Handle __name = ... assignments by replacing with void 0 =
            // But don't match property assignments like globalThis.__name = or window.__name =
            return code
                .replace(/\b(var|let|const)\s+__name\s*=[^;]*;/g, 'void 0;')
                .replace(/(^|[^a-zA-Z_$.])__name\s*=/g, '$1void 0 =');
        }
    },
};

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    console.log('Vite config - mode:', mode, 'VITE_DEV_HOOKS:', env.VITE_DEV_HOOKS, 'isDev:', isDev);

    return {
        define: {
            global: 'globalThis',
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            // Substitute the raw string, as Vite does for import.meta.env: code
            // compares `import.meta.env.VITE_DEV_HOOKS === 'true'`, and a boolean
            // substitution (JSON.stringify(true)) makes that comparison false.
            'import.meta.env.VITE_DEV_HOOKS': JSON.stringify(env.VITE_DEV_HOOKS ?? ''),
        },
        optimizeDeps: {
            exclude: ['@notention/optimize', 'playwright-core', 'playwright', 'chromium-bidi', 'http', 'fs', 'child_process', 'cluster', 'dns', 'net', 'tls', 'http2', 'dgram', '@playwright/test'],
            include: [
                'crypto-browserify',
                'stream-browserify',
                'assert',
                'buffer',
                'process',
                'events',
                'querystring',
                'string_decoder',
                'punycode',
                'url',
                'vm-browserify',
                'zlib-browserify',
                'path-browserify',
                'os-browserify/browser',
                'util',
                // Ensure __name polyfill is pre-bundled and available early
                '@/polyfills/name',
            ],
            esbuildOptions: {
                plugins: [
                    {
                        name: 'mark-node-builtins-external',
                        setup(build) {
                            build.onResolve({ filter: /^(http|fs|child_process|cluster|dns|net|tls|http2|dgram|playwright-core|playwright|chromium-bidi|@playwright\/test)$/ }, args => ({ external: true }));
                        },
                    },
                ],
            },
            // Only scan the main entry point to avoid test files importing playwright
            entries: ['index.html'],
        },
        server: {
            watch: {
                ignored: ['**/tests/**', '**/test/**', '**/visual/**'],
            },
        },
        resolve: {
            conditions: ['browser'],
            // Single React instance: a second copy (or an older major) makes the
            // renderer reject elements with React error #525.
            dedupe: ['react', 'react-dom'],
            alias: [
                { find: '@', replacement: path.resolve(__dirname, './src') },
                // @notention/ui internal modules
                { find: '@notention/ui/strategies/strategyConfigs', replacement: path.resolve(__dirname, './src/strategies/strategyConfigs.ts') },
                { find: '@notention/ui/strategies/componentMap', replacement: path.resolve(__dirname, './src/strategies/componentMap.ts') },
                // @notention/core - EXPLICIT subpath aliases MUST come before general @notention/core alias
                // Explicit subpath aliases for imports used in UI codebase
                { find: '@notention/core/ui', replacement: path.resolve(__dirname, isDev ? '../core/src/ui' : '../core/dist/browser/ui') },
                { find: '@notention/core/ui/strategy', replacement: path.resolve(__dirname, isDev ? '../core/src/ui/strategy.ts' : '../core/dist/browser/ui/strategy.js') },
                { find: '@notention/core/ui/ProfileRegistry', replacement: path.resolve(__dirname, isDev ? '../core/src/ui/ProfileRegistry.browser.ts' : '../core/dist/browser/ui/ProfileRegistry.js') },
                { find: '@notention/core/ui/profile', replacement: path.resolve(__dirname, isDev ? '../core/src/ui/profile.ts' : '../core/dist/browser/ui/profile.js') },
                { find: '@notention/core/ui/profileDefaults', replacement: path.resolve(__dirname, isDev ? '../core/src/ui/profileDefaults.ts' : '../core/dist/browser/ui/profileDefaults.js') },
                { find: '@notention/core/schemas/generated/seam-definitions', replacement: path.resolve(__dirname, isDev ? '../core/src/schemas/generated/seam-definitions.ts' : '../core/dist/browser/schemas/generated/seam-definitions.js') },
                { find: '@notention/core/constants/seams', replacement: path.resolve(__dirname, isDev ? '../core/src/constants/seams.ts' : '../core/dist/browser/constants/seams.js') },
                { find: '@notention/core/telemetry/journal', replacement: path.resolve(__dirname, isDev ? '../core/src/telemetry/journal.browser.ts' : '../core/dist/browser/telemetry/journal.js') },
                { find: '@notention/core/telemetry/revisionStore', replacement: path.resolve(__dirname, isDev ? '../core/src/telemetry/revisionStore.browser.ts' : '../core/dist/browser/telemetry/revisionStore.js') },
                { find: '@notention/core/validation', replacement: path.resolve(__dirname, isDev ? '../core/src/validation/index.ts' : '../core/dist/browser/validation/index.js') },
                { find: '@notention/core/storage', replacement: path.resolve(__dirname, isDev ? '../core/src/storage/index.ts' : '../core/dist/browser/storage/index.js') },
                // Additional subpaths for direct imports from @notention/core
                { find: '@notention/core/extraction', replacement: path.resolve(__dirname, isDev ? '../core/src/extraction/index.ts' : '../core/dist/browser/extraction/index.js') },
                { find: '@notention/core/notes', replacement: path.resolve(__dirname, isDev ? '../core/src/notes/index.ts' : '../core/dist/browser/notes/index.js') },
                { find: '@notention/core/ontology', replacement: path.resolve(__dirname, isDev ? '../core/src/ontology/index.ts' : '../core/dist/browser/ontology/index.js') },
                { find: '@notention/core/matching', replacement: path.resolve(__dirname, isDev ? '../core/src/matching/index.ts' : '../core/dist/browser/matching/index.js') },
                { find: '@notention/core/network', replacement: path.resolve(__dirname, isDev ? '../core/src/network/index.ts' : '../core/dist/browser/network/index.js') },
                { find: '@notention/core/skills', replacement: path.resolve(__dirname, isDev ? '../core/src/skills/index.ts' : '../core/dist/browser/skills/index.js') },
                { find: '@notention/core/prompts', replacement: path.resolve(__dirname, isDev ? '../core/src/prompts/index.ts' : '../core/dist/browser/prompts/index.js') },
                { find: '@notention/core/export', replacement: path.resolve(__dirname, isDev ? '../core/src/export/index.ts' : '../core/dist/browser/export/index.js') },
                { find: '@notention/core/config', replacement: path.resolve(__dirname, isDev ? '../core/src/config.browser.ts' : '../core/dist/browser/config.js') },
                { find: '@notention/core/tracing', replacement: path.resolve(__dirname, isDev ? '../core/src/tracing/index.ts' : '../core/dist/browser/tracing/index.js') },
                { find: '@notention/core/policy', replacement: path.resolve(__dirname, isDev ? '../core/src/policy/index.ts' : '../core/dist/browser/policy/index.js') },
                { find: '@notention/core/fixtures', replacement: path.resolve(__dirname, isDev ? '../core/src/fixtures/index.ts' : '../core/dist/browser/fixtures/index.js') },
                { find: '@notention/core/templates', replacement: path.resolve(__dirname, isDev ? '../core/src/templates/index.ts' : '../core/dist/browser/templates/index.js') },
                { find: '@notention/core/patternRecognition', replacement: path.resolve(__dirname, isDev ? '../core/src/patternRecognition/index.ts' : '../core/dist/browser/patternRecognition/index.js') },
                { find: '@notention/core/security', replacement: path.resolve(__dirname, isDev ? '../core/src/security/index.ts' : '../core/dist/browser/security/index.js') },
                { find: '@notention/core/feedback', replacement: path.resolve(__dirname, isDev ? '../core/src/feedback/index.ts' : '../core/dist/browser/feedback/index.js') },
                { find: '@notention/core/events', replacement: path.resolve(__dirname, isDev ? '../core/src/events/index.ts' : '../core/dist/browser/events/index.js') },
                { find: '@notention/core/utils', replacement: path.resolve(__dirname, isDev ? '../core/src/utils/index.browser.ts' : '../core/dist/browser/utils/index.js') },
                { find: '@notention/core/constants', replacement: path.resolve(__dirname, isDev ? '../core/src/constants/index.ts' : '../core/dist/browser/constants/index.js') },
                // @notention/core - directory-based resolution for main entry (MUST be LAST to not shadow subpath aliases)
                // Dev: src/index.browser.ts (browser entry), Production: dist/browser directory
                { find: '@notention/core', replacement: path.resolve(__dirname, isDev ? '../core/src/index.browser.ts' : '../core/dist/browser') },
                // Node.js built-in polyfills - use direct file paths for packages without proper ESM exports
                { find: 'crypto', replacement: path.resolve(__dirname, './node_modules/crypto-browserify/index.js') },
                { find: 'stream', replacement: path.resolve(__dirname, './node_modules/stream-browserify/index.js') },
                { find: 'assert', replacement: 'assert' },
                { find: 'buffer', replacement: path.resolve(__dirname, './node_modules/buffer/index.js') },
                { find: 'process', replacement: path.resolve(__dirname, './public/polyfills/process.js') },
                { find: 'events', replacement: 'events' },
                { find: 'querystring', replacement: path.resolve(__dirname, './node_modules/querystring/index.js') },
                { find: 'string_decoder', replacement: path.resolve(__dirname, './node_modules/string_decoder/lib/string_decoder.js') },
                { find: 'punycode', replacement: path.resolve(__dirname, './node_modules/punycode/punycode.js') },
                { find: 'url', replacement: path.resolve(__dirname, './public/polyfills/url.js') },
                { find: 'vm', replacement: path.resolve(__dirname, './node_modules/vm-browserify/index.js') },
                { find: 'zlib', replacement: path.resolve(__dirname, './node_modules/zlib-browserify/index.js') },
                { find: 'constants', replacement: path.resolve(__dirname, './node_modules/constants-browserify/constants.json') },
                { find: 'querystring', replacement: path.resolve(__dirname, './node_modules/querystring/index.js') },
                { find: 'path', replacement: path.resolve(__dirname, './node_modules/path-browserify/index.js') },
                { find: 'os', replacement: path.resolve(__dirname, './node_modules/os-browserify/browser.js') },
                { find: 'util', replacement: path.resolve(__dirname, './node_modules/util/util.js') },
                // fs polyfill for browser - provides all required fs functions (directory-based)
                { find: 'fs', replacement: path.resolve(__dirname, './public/polyfills/fs') },
                // Redirect node:* protocol imports to polyfills
                { find: /^node:crypto$/, replacement: path.resolve(__dirname, './node_modules/crypto-browserify/index.js') },
                { find: /^node:path$/, replacement: path.resolve(__dirname, './node_modules/path-browserify/index.js') },
                { find: /^node:url$/, replacement: path.resolve(__dirname, './public/polyfills/url.js') },
                { find: /^node:fs$/, replacement: path.resolve(__dirname, './public/polyfills/fs.js') },
                { find: /^node:buffer$/, replacement: path.resolve(__dirname, './node_modules/buffer/index.js') },
                { find: /^node:util$/, replacement: path.resolve(__dirname, './node_modules/util/util.js') },
                { find: /^node:stream$/, replacement: path.resolve(__dirname, './node_modules/stream-browserify/index.js') },
                { find: /^node:events$/, replacement: 'events' },
                { find: /^node:process$/, replacement: path.resolve(__dirname, './public/polyfills/process.js') },
                { find: /^node:assert$/, replacement: 'assert' },
                { find: /^node:constants$/, replacement: path.resolve(__dirname, './node_modules/constants-browserify/constants.js') },
                { find: /^node:querystring$/, replacement: path.resolve(__dirname, './node_modules/querystring-es3/index.js') },
                { find: /^node:string_decoder$/, replacement: path.resolve(__dirname, './node_modules/string_decoder/index.js') },
                { find: /^node:punycode$/, replacement: path.resolve(__dirname, './node_modules/punycode/index.js') },
                { find: /^node:vm$/, replacement: path.resolve(__dirname, './node_modules/vm-browserify/index.js') },
                { find: /^node:zlib$/, replacement: path.resolve(__dirname, './node_modules/zlib-browserify/index.js') },
            ],
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/tests/setup.ts'],
            exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**', 'test/**', '**/visual/**'],
            watch: false,
            pool: 'threads',
            poolOptions: {
                threads: {
                    singleThread: true,
                    isolate: false,
                },
            },
            testTimeout: 10000,
            hookTimeout: 10000,
            sequence: {
                shuffle: true,
                seed: 42,
            },
            forceExit: true,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
            },
        },
        // Enable PWA functionality
        publicDir: 'public',
        plugins: [
            react(),
            coreBrowserVariantPlugin,
            createExcludeTestsPlugin(isDev),
            namePolyfillPlugin,
            preserveReactExportsPlugin,
            isDev && namePolyfillDevPlugin,
            // removeDevOnlyPlugin disabled - namePolyfillPlugin handles __name
            // VitePWA temporarily disabled due to Node.js module resolution issues with eval/telemetry
            // VitePWA({
            //     registerType: 'autoUpdate',
            //     includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            //     manifest: {
            //         name: 'Notention',
            //         short_name: 'Notention',
            //         description: 'The Decentralized Super App',
            //         theme_color: '#111827',
            //         background_color: '#111827',
            //         display: 'standalone',
            //         scope: '/',
            //         start_url: '/',
            //         orientation: 'portrait',
            //         icons: [
            //             {
            //                 src: 'pwa-64x64.png',
            //                 sizes: '64x64',
            //                 type: 'image/png'
            //             },
            //             {
            //                 src: 'pwa-192x192.png',
            //                 sizes: '192x192',
            //                 type: 'image/png'
            //             },
            //             {
            //                 src: 'pwa-512x512.png',
            //                 sizes: '512x512',
            //                 type: 'image/png'
            //             },
            //             {
            //                 src: 'maskable-icon-512x512.png',
            //                 sizes: '512x512',
            //                 type: 'image/png',
            //                 purpose: 'any'
            //             }
            //         ]
            //     },
            //     devOptions: {
            //         enabled: true
            //     },
            //     workbox: {
            //         maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
            //         exclude: [/\/@notention\/core\/eval/, /\/@notention\/core\/telemetry/],
            //     }
            // })
        ],
        build: {
            cssCodeSplit: true,
            sourcemap: true,
            minify: false,
            terserOptions: {
                compress: {
                    // Disable __name helper used for function name preservation
                    // unsafe: true removes Rollup's __name helper causing "ReferenceError: __name is not defined"
                    unsafe: false,
                },
                mangle: {
                    // Don't use __name helper for function names
                    keep_fnames: false,
                },
            },
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                },
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
                        'vendor-router': ['react-router-dom'],
                        'vendor-tiptap': ['@tiptap/core', '@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-bubble-menu', '@tiptap/extension-mention'],
                        'vendor-utils': ['date-fns'],
                        'vendor-ajv': ['ajv', 'ajv-formats'],
                        'vendor-nostr': ['nostr-tools', '@noble/hashes'],
                        'vendor-mlc': ['@mlc-ai/web-llm'],
                        'vendor-core': ['@notention/core'],
                        'vendor-mesh': ['@meshtastic/core', '@meshtastic/transport-web-serial'],
                        'vendor-other': ['dompurify', 'iconv-lite', 'localforage', 'leaflet', 'react-big-calendar', 'tippy.js', '@google/genai', 'xmlchars'],
                    },
                },
                external: (id) => {
                    // Explicitly do NOT externalize these Node.js built-ins (they'll be polyfilled)
                    if (id === 'crypto' || id === 'stream' || id === 'assert' || id === 'buffer' || 
                        id === 'process' || id === 'events' || id === 'querystring' || 
                        id === 'string_decoder' || id === 'punycode' || id === 'url' || 
                        id === 'vm' || id === 'zlib' || id === 'constants' || id === 'path' || 
                        id === 'os' || id === 'util' || id === 'fs' || id.startsWith('node:')) {
                        return false;
                    }
                    // Externalize only truly Node.js-only modules (fs, child_process, cluster, etc.)
                    // Do NOT externalize node:* or polyfill modules
                    if (id.startsWith('child_process') || 
                        id.startsWith('cluster') || id.startsWith('dns') || id.startsWith('net') || 
                        id.startsWith('tls') || id.startsWith('http') || id.startsWith('https') || 
                        id.startsWith('http2') || id.startsWith('dgram')) {
                        return true;
                    }
                    return false;
                },
                plugins: [
                    nodePolyfills({
                        include: ['os', 'path', 'url', 'util', 'buffer', 'process', 'events', 'stream', 'crypto', 'assert', 'constants', 'querystring', 'string_decoder', 'punycode', 'sys', 'tty', 'vm', 'zlib', 'fs'],
                    }),
                ],
            },
            // Exclude test files from production build
            // Note: Vite doesn't have a direct exclude option for build, but we can use modulePreload or other approaches
            // The test files are being picked up because they're in src/
            // We'll use a plugin to exclude them
            modulePreload: {
                polyfill: false,
            },
        },
    };
});