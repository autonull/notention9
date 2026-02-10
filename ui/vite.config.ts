/// <reference types="vitest" />
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {configDefaults} from 'vitest/config';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, '.', '');
    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@notention/core': path.resolve(__dirname, '../core/src/index.ts'),
            },
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/tests/setup.ts',
            exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
            watch: false,
            pool: 'forks',
            poolOptions: {
                forks: {
                    singleFork: false,
                },
            },
            testTimeout: 10000,
            hookTimeout: 10000,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
            },
        },
        // Enable PWA functionality
        publicDir: 'public',
        plugins: [
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
                manifest: {
                    name: 'Notention',
                    short_name: 'Notention',
                    description: 'The Decentralized Super App',
                    theme_color: '#111827',
                    background_color: '#111827',
                    display: 'standalone',
                    scope: '/',
                    start_url: '/',
                    orientation: 'portrait',
                    icons: [
                        {
                            src: 'pwa-64x64.png',
                            sizes: '64x64',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any'
                        },
                        {
                            src: 'maskable-icon-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable'
                        }
                    ]
                },
                devOptions: {
                    enabled: true
                },
                workbox: {
                    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB
                }
            })
        ],
        build: {
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                }
            }
        }
    };
});
