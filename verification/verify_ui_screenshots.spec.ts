import { test, expect } from '@playwright/test';

test('UI Screenshot Verification', async ({ page }) => {
    test.setTimeout(120000);

    console.log('Navigating to UI...');
    await page.goto('http://localhost:5173');

    // Check for Onboarding Modal
    const modalOverlay = page.locator('.fixed.inset-0.z-50');
    const modalTitle = page.locator('h2.text-2xl.font-bold').filter({ hasText: 'Welcome to Notention' });

    try {
        await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Onboarding modal detected.');

        let attempts = 0;
        while (await modalOverlay.isVisible() && attempts < 5) {
            const actionBtn = page.getByRole('button', { name: 'Get Started' })
                .or(page.getByRole('button', { name: 'Next' }))
                .or(page.getByRole('button', { name: 'Skip' }))
                .or(page.getByRole('button', { name: 'Finish' }))
                .first();

            if (await actionBtn.isVisible()) {
                 await actionBtn.click();
                 await page.waitForTimeout(500);
            } else {
                 await page.mouse.click(10, 10);
                 await page.waitForTimeout(500);
            }
            attempts++;
        }
        await expect(modalOverlay).not.toBeVisible({ timeout: 5000 });
    } catch (e) {
        // Ignore
    }

    // Create Note if needed
    if (await page.locator('.ProseMirror').count() === 0) {
        const createFirstBtn = page.getByRole('button', { name: 'Create First Note' });
        if (await createFirstBtn.isVisible()) {
            await createFirstBtn.click();
        } else {
            const headerNewBtn = page.locator('button').filter({ hasText: 'New Note' });
            if (await headerNewBtn.count() > 0) await headerNewBtn.first().click();
        }
    }

    console.log('Waiting for editor...');
    await page.waitForSelector('.ProseMirror', { timeout: 30000 });

    // Clear editor first just in case
    await page.locator('.ProseMirror').clear();

    // Type content - Use pressSequentially to trigger InputRules
    console.log('Typing note...');
    await page.locator('.ProseMirror').pressSequentially('Meeting with Bob ');
    await page.waitForTimeout(500);
    // Type the property carefully to trigger the rule on ']'
    await page.locator('.ProseMirror').pressSequentially('[priority:high]');
    // Wait for rule to apply
    await page.waitForTimeout(1000);

    await page.locator('.ProseMirror').pressSequentially(' at 2pm');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Screenshot Authoring
    console.log('Taking screenshot_authoring.png...');
    await page.screenshot({ path: 'verification/screenshot_authoring.png' });

    // P2P Publishing
    const publicBtn = page.locator('button[title="Set to public"]');
    if (await publicBtn.count() > 0 && await publicBtn.first().isVisible()) {
        await publicBtn.first().click();
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        try {
            await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
            await confirmBtn.click();
        } catch (e) {}
        await page.waitForTimeout(2000);
        console.log('Taking screenshot_p2p.png...');
        await page.screenshot({ path: 'verification/screenshot_p2p.png' });
    }
});
