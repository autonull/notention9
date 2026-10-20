import type {Page} from '@playwright/test';

export const settle = async (page: Page) => {
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
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
