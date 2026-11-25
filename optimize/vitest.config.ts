import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        globalSetup: [path.resolve(__dirname, '../core/src/test-utils/globalSetup.ts')],
        setupFiles: [path.resolve(__dirname, '../core/src/test-utils/vitestSetup.ts')],
        passWithNoTests: true,
        testTimeout: 300000,
        pool: 'forks',
        fileParallelism: true,
        localStorage: { file: '.vitest-localstorage' },
    },
    resolve: {
        alias: {
            '@notention/core': path.resolve(__dirname, '../core/dist'),
        },
    },
});