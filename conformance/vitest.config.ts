import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 120000,
    hookTimeout: 30000,
    globals: true,
  },
  resolve: {
    alias: {
      '@notention/core': path.resolve(__dirname, '../../core/src'),
      '@notention/simulator': path.resolve(__dirname, '../../simulator/src'),
    },
  },
});