import {defineConfig} from '@playwright/test';
import path from 'path';
import {fileURLToPath} from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UI_PORT = 4199;
const RELAY_PORT = 7000;

export default defineConfig({
    testDir: ROOT,
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    timeout: 60_000,
    expect: {timeout: 10_000},
    use: {
        baseURL: `http://localhost:${UI_PORT}`,
        serviceWorkers: 'block',
        deviceScaleFactor: 1,
        colorScheme: 'dark',
        trace: 'off',
        screenshot: 'off',
        video: 'off',
    },
    projects: [
        {
            name: 'journeys',
            testMatch: 'journeys/**/*.spec.ts',
            use: {
                viewport: {width: 1440, height: 900},
                trace: 'retain-on-failure',
            },
        },
        {
            name: 'showcase',
            testMatch: 'showcase/**/*.scene.ts',
            use: {
                viewport: {width: 1440, height: 900},
            },
        },
    ],
    webServer: [
        {
            command: `VITE_ENABLE_AGENT=false VITE_LLM_SOURCE=none pnpm --filter @notention/ui build && pnpm --filter @notention/ui preview --port ${UI_PORT} --strictPort`,
            url: `http://localhost:${UI_PORT}`,
            reuseExistingServer: !process.env.CI,
            timeout: 240_000,
            cwd: path.resolve(ROOT, '../..'),
        },
        {
            command: `pnpm --filter @notention/agent relay -- --port ${RELAY_PORT}`,
            port: RELAY_PORT,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            cwd: path.resolve(ROOT, '../..'),
        },
    ],
});
