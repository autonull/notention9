import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@notention/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@notention/optimize': path.resolve(__dirname, '../optimize/src'),
    }
  },
  test: {
    globals: true,
    environment: 'node'
  }
});
