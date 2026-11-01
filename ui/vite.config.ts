/// <reference types="vitest" />
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {configDefaults} from 'vitest/config';
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
        },
        resolve: {
            conditions: ['browser'],
            alias: {
                '@': path.resolve(__dirname, './src'),
                // Use package.json exports for @notention/core subpaths
                '@notention/core/constants/storageKeys': path.resolve(__dirname, '../core/dist/constants/storageKeys.js'),
                '@notention/core/constants/paths': path.resolve(__dirname, '../core/dist/constants/paths.js'),
                '@notention/core/constants/seams': path.resolve(__dirname, '../core/dist/constants/seams.js'),
                '@notention/core/extraction': path.resolve(__dirname, '../core/dist/extraction/index.js'),
                '@notention/core/extraction/deterministic': path.resolve(__dirname, '../core/dist/extraction/deterministic.js'),
                '@notention/core/src/matching': path.resolve(__dirname, '../core/dist/matching'),
                '@notention/core/skills': path.resolve(__dirname, '../core/dist/skills/index.js'),
                '@notention/core/skills/metaphor/MetaphorRegistry': path.resolve(__dirname, '../core/dist/skills/metaphor/MetaphorRegistry.js'),
                // Browser stubs for Node.js-only modules (with .js extension to match optimize imports)
                '@notention/core/eval/caseManifest.js': path.resolve(__dirname, '../core/dist/eval/caseManifest.browser.js'),
                '@notention/core/eval/verdict.js': path.resolve(__dirname, '../core/dist/eval/verdict.browser.js'),
                '@notention/core/eval/quality.js': path.resolve(__dirname, '../core/dist/eval/quality.browser.js'),
                '@notention/core/telemetry/ledger.js': path.resolve(__dirname, '../core/dist/telemetry/ledger.browser.js'),
                '@notention/core/telemetry/revisionStore.js': path.resolve(__dirname, '../core/dist/telemetry/revisionStore.browser.js'),
                'path': 'path-browserify',
                'os': 'os-browserify/browser',
                'util': 'util',
            },
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
                    // Externalize Node.js-only modules and optimize package
                    if (id.startsWith('fs') || id.startsWith('path') || id.startsWith('os') || 
                        id.startsWith('url') || id.startsWith('node:') ||
                        id.includes('/eval/') || id.includes('/telemetry/') ||
                        id === '@notention/optimize' || id.startsWith('@notention/optimize/')) {
                        return true;
                    }
                    return false;
                },
            }
        }
    };
});