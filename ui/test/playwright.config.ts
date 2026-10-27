import {defineConfig} from '@playwright/test';
import path from 'path';
import {fileURLToPath} from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const UI_PORT = 4199;
const RELAY_PORT = 7000;
const IS_CI = !!process.env.CI;

// In CI, use pre-built artifacts to avoid 240s build on every run.
// The build artifact should be prepared in a prior CI step.
// For optimize runs, we need VITE_DEV_HOOKS=true to enable the debug bridge.
const uiCommand = IS_CI
    ? `pnpm --filter @notention/ui preview --port ${UI_PORT} --strictPort`
    : `VITE_ENABLE_AGENT=false VITE_LLM_SOURCE=none VITE_DEV_HOOKS=true pnpm --filter @notention/ui build && pnpm --filter @notention/ui preview --port ${UI_PORT} --strictPort`;

export default defineConfig({
    testDir: ROOT,
    fullyParallel: false,
    workers: 1,
    forbidOnly: IS_CI,
    retries: IS_CI ? 1 : 0,
    reporter: IS_CI ? [['github'], ['list']] : [['list']],
    timeout: 45_000,
    expect: {timeout: 10_000},
    use: {
        baseURL: `http://localhost:${UI_PORT}`,
        serviceWorkers: 'block',
        deviceScaleFactor: 1,
        colorScheme: 'dark',
        trace: 'retain-on-failure',
        screenshot: 'off',
        video: 'off',
        launchOptions: {
            args: [
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-first-run',
                '--no-default-browser-check',
            ],
        },
    },
    projects: [
        {
            name: 'journeys',
            testMatch: 'journeys/**/*.spec.ts',
            use: {
                viewport: {width: 1440, height: 900},
            },
        },
        {
            name: 'showcase',
            testMatch: 'showcase/**/*.scene.ts',
            use: {
                viewport: {width: 1440, height: 900},
            },
        },
        {
            name: 'optimize',
            testMatch: 'optimize/**/*.journey.ts',
            use: {
                viewport: {width: 1440, height: 900},
            },
        },
    ],
    webServer: [
        {
            command: uiCommand,
            url: `http://localhost:${UI_PORT}`,
            reuseExistingServer: !IS_CI,
            timeout: IS_CI ? 60_000 : 240_000,
            cwd: path.resolve(ROOT, '../..'),
        },
        {
            command: `pnpm --filter @notention/agent relay -- --port ${RELAY_PORT}`,
            port: RELAY_PORT,
            reuseExistingServer: !IS_CI,
            timeout: 60_000,
            cwd: path.resolve(ROOT, '../..'),
        },
    ],
});