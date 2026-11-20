import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: [path.resolve(__dirname, '../core/src/test-utils/vitestSetup.ts')],
        passWithNoTests: true,
        testTimeout: 300000,
        fileParallelism: false,
        localStorage: { file: '.vitest-localstorage' },
    },
    resolve: {
        alias: {
            '@notention/core': path.resolve(__dirname, '../core/dist'),
        },
    },
});