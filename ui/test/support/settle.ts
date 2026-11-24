import type {Page} from '@playwright/test';

/** Wait for the next painted frame so a synchronous React update has landed. */
export const settleFrame = async (page: Page) => {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
};

export const settle = async (page: Page) => {
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));

    // Wait for DevBridge to install the bridge (requires __OPTIMIZE_RUN_ID__ to be set)
    // Only wait if __OPTIMIZE_RUN_ID__ is set (optimize runs)
    const hasOptimizeRunId = await page.evaluate(() => !!(window as any).__OPTIMIZE_RUN_ID__);
    if (hasOptimizeRunId) {
        await page.waitForFunction(() => {
            const bridge = (window as any).__NOTENTION__;
            return bridge && typeof bridge.state === 'function';
        }, { timeout: 10000 });

        // Wait for state to be populated (note may be null on inbox)
        await page.waitForFunction(() => {
            const bridge = (window as any).__NOTENTION__;
            const state = bridge?.state?.();
            return state !== undefined && state !== null;
        }, { timeout: 5000 });
    }
};

export const settlePreview = async (page: Page) => {
    await page.waitForSelector('[data-skeleton-ready]');
    await page.evaluate(() => document.fonts.ready);
    await settleFrame(page);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
};

export const disableMotion = async (page: Page) => {
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation: none !important;
                transition: none !important;
                caret-color: transparent !important;
            }
            html { scroll-behavior: auto !important; }
        `,
    });
};