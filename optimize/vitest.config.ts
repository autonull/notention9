import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: [path.resolve(__dirname, '../core/src/test-utils/vitestSetup.ts')],
        passWithNoTests: true,
    },
    resolve: {
        alias: {
            '@notention/core': path.resolve(__dirname, '../core/src'),
        },
    },
});