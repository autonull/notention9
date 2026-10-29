import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['src/scenarios/**/*.test.ts'],
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            '@notention/core': path.resolve(__dirname, '../core/src'),
        },
    },
});