/// <reference types="vitest" />
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {configDefaults} from 'vitest/config';
import nodePolyfills from 'rollup-plugin-node-polyfills';
// import {VitePWA} from 'vite-plugin-pwa'; // Temporarily disabled due to Node.js module resolution issues

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, '.', '');
    console.log('Vite config - mode:', mode, 'VITE_DEV_HOOKS:', env.VITE_DEV_HOOKS);
    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'import.meta.env.VITE_DEV_HOOKS': JSON.stringify(env.VITE_DEV_HOOKS === 'true'),
        },
        optimizeDeps: {
            exclude: ['@notention/optimize'],
            include: [
                'crypto-browserify',
                'stream-browserify',
                'assert',
                'buffer',
                'process/browser',
                'events',
                'querystring-es3',
                'string_decoder',
                'punycode',
                'url',
                'vm-browserify',
                'zlib-browserify',
                'constants-browserify',
                'path-browserify',
                'os-browserify/browser',
                'util',
            ],
            esbuildOptions: {
                plugins: [],
            },
        },
        resolve: {
            conditions: ['browser'],
            alias: [
                { find: '@', replacement: path.resolve(__dirname, './src') },
                // @notention/ui internal modules
                { find: '@notention/ui/strategies/strategyConfigs', replacement: path.resolve(__dirname, './src/strategies/strategyConfigs.ts') },
                { find: '@notention/ui/strategies/componentMap', replacement: path.resolve(__dirname, './src/strategies/componentMap.ts') },
                // Explicit @notention/core browser subpath aliases (ensure Vite resolves via package.json exports)
                { find: '@notention/core/ui/ProfileRegistry', replacement: path.resolve(__dirname, '../core/dist/browser/ui/ProfileRegistry.js') },
                { find: '@notention/core/ui/strategy', replacement: path.resolve(__dirname, '../core/dist/browser/ui/strategy.js') },
                { find: '@notention/core/ui/profile', replacement: path.resolve(__dirname, '../core/dist/browser/ui/profile.js') },
                { find: '@notention/core/ui/profileDefaults', replacement: path.resolve(__dirname, '../core/dist/browser/ui/profileDefaults.js') },
                { find: '@notention/core/ui', replacement: path.resolve(__dirname, '../core/dist/browser/ui/index.js') },
                { find: '@notention/core/storage', replacement: path.resolve(__dirname, '../core/dist/browser/storage/index.js') },
                { find: '@notention/core/constants/seams', replacement: path.resolve(__dirname, '../core/dist/browser/constants/seams.js') },
                { find: '@notention/core/schemas/generated/seam-definitions', replacement: path.resolve(__dirname, '../core/dist/browser/schemas/generated/seam-definitions.js') },
                { find: '@notention/core/telemetry/journal', replacement: path.resolve(__dirname, '../core/dist/browser/telemetry/journal.browser.js') },
                { find: '@notention/core/validation', replacement: path.resolve(__dirname, '../core/dist/browser/validation/index.js') },
                { find: '@notention/core/telemetry/revisionStore', replacement: path.resolve(__dirname, '../core/dist/browser/telemetry/revisionStore.browser.js') },
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
                { find: 'fs', replacement: path.resolve(__dirname, './public/polyfills/fs.js') },
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
            pool: 'forks',
            poolOptions: {
                forks: {
                    singleFork: false,
                    isolate: true,
                    maxForks: 1,
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
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                },
                external: (id) => {
                    // Externalize only truly Node.js-only modules (fs, child_process, cluster, etc.)
                    // Do NOT externalize node:* or polyfill modules
                    if (id.startsWith('fs') || id.startsWith('child_process') || 
                        id.startsWith('cluster') || id.startsWith('dns') || id.startsWith('net') || 
                        id.startsWith('tls') || id.startsWith('http') || id.startsWith('https') || 
                        id.startsWith('http2') || id.startsWith('dgram') ||
                        id === '@notention/optimize' || id.startsWith('@notention/optimize/')) {
                        return true;
                    }
                    // Explicitly do NOT externalize these Node.js built-ins (they'll be polyfilled)
                    if (id === 'crypto' || id === 'stream' || id === 'assert' || id === 'buffer' || 
                        id === 'process' || id === 'events' || id === 'querystring' || 
                        id === 'string_decoder' || id === 'punycode' || id === 'url' || 
                        id === 'vm' || id === 'zlib' || id === 'constants' || id === 'path' || 
                        id === 'os' || id === 'util' || id.startsWith('node:')) {
                        return false;
                    }
                    return false;
                },
                plugins: [
                    nodePolyfills({
                        include: ['os', 'path', 'url', 'util', 'buffer', 'process', 'events', 'stream', 'crypto', 'assert', 'constants', 'querystring', 'string_decoder', 'punycode', 'sys', 'tty', 'vm', 'zlib'],
                    }),
                ],
            }
        },
    };
});