import { test, expect } from '@playwright/test';

test('UI Screenshot Verification', async ({ page }) => {
    test.setTimeout(120000);

    console.log('Navigating to UI...');
    await page.goto('http://localhost:5173');

    // Check for Onboarding Modal
    const modalTitle = page.locator('h2.text-2xl.font-bold').filter({ hasText: 'Welcome to Notention' });
    try {
        await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Onboarding modal detected.');
        const actionBtn = page.getByRole('button', { name: 'Get Started' })
            .or(page.getByRole('button', { name: 'Next' })).first();

        if (await actionBtn.isVisible()) {
             console.log('Clicking action button...');
             await actionBtn.click();
             await page.waitForTimeout(1000);
        } else {
             console.log('No obvious button found. Trying to click outside...');
             await page.mouse.click(10, 10);
        }
    } catch (e) {
        console.log('Onboarding modal not found or timed out.');
    }

    // Check if we are already in editor
    if (await page.locator('.ProseMirror').count() > 0) {
        console.log('Already in editor.');
    } else {
        // Try "Create First Note"
        console.log('Looking for creation buttons...');
        const createFirstBtn = page.getByRole('button', { name: 'Create First Note' });

        if (await createFirstBtn.isVisible()) {
            console.log('Clicking Create First Note...');
            try {
                await createFirstBtn.click();
            } catch (e) {
                console.log('Click failed (maybe detached), continuing assuming navigation started...');
            }
        } else {
            // Try "New Note" in header
            const headerNewBtn = page.locator('button').filter({ hasText: 'New Note' });

            if (await headerNewBtn.count() > 0 && await headerNewBtn.first().isVisible()) {
                 console.log('Clicking New Note (Header)...');
                 await headerNewBtn.first().click();
            }
        }
    }

    console.log('Waiting for editor...');
    try {
        await page.waitForSelector('.ProseMirror', { timeout: 30000 });
    } catch (e) {
        console.log('Editor not found. Taking debug screenshot...');
        await page.screenshot({ path: 'verification/debug_editor_fail.png' });
        throw e;
    }

    // Type content
    console.log('Typing note...');
    await page.locator('.ProseMirror').fill('Meeting with Bob [priority:high] at 2pm');

    // Wait for property extraction (chips or formatting)
    await page.waitForTimeout(2000);

    // Screenshot Authoring
    console.log('Taking screenshot_authoring.png...');
    await page.screenshot({ path: 'verification/screenshot_authoring.png' });

    // 2. P2P Publishing
    console.log('Looking for privacy control...');
    const publicBtn = page.locator('button[title="Set to public"]');

    if (await publicBtn.count() > 0 && await publicBtn.first().isVisible()) {
        console.log('Clicking Public button...');
        await publicBtn.first().click();

        // Handle confirmation modal
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });

        try {
            await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Confirming privacy change...');
            await confirmBtn.click();
        } catch (e) {
            console.log('Confirmation modal did not appear or was not clickable.');
        }

        await page.waitForTimeout(2000); // Wait for state change

        // Screenshot P2P
        console.log('Taking screenshot_p2p.png...');
        await page.screenshot({ path: 'verification/screenshot_p2p.png' });
    } else {
        console.log('Privacy control not found, skipping P2P screenshot');
        await page.screenshot({ path: 'verification/debug_privacy_fail.png' });
    }
});
