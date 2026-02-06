import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,
    workers: 1, // Run sequentially to avoid port conflicts with the agent
    use: {
        trace: 'on-first-retry',
    },
});
