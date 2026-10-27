import {test} from '@playwright/test';

test('debug dashboard', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => {
        errors.push(err.message);
    });
    
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    console.log('Console errors:', errors);
    console.log('Page content:', await page.content());
});
