/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig(({ mode }) => {
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
      setupFiles: './tests/setup.ts',
      exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
    // Enable PWA functionality
    publicDir: 'public',
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          sw: path.resolve(__dirname, 'src/service-worker.js')
        }
      }
    }
  };
});
