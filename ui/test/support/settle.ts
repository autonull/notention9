import type {Page} from '@playwright/test';

export const settle = async (page: Page) => {
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));

    const hasDevHooks = await page.evaluate(() => typeof window.__NOTENTION_READY__ !== 'undefined');
    if (hasDevHooks) {
        await page.waitForFunction(() => window.__NOTENTION_READY__ === true, { timeout: 5000 });
        // Wait for state to be populated with note data
        await page.waitForFunction(() => {
            const bridge = (window as any).__NOTENTION__;
            const state = bridge?.state?.();
            return state?.note !== null;
        }, { timeout: 5000 });
    }
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