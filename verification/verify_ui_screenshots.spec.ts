import { test, expect } from '@playwright/test';

const MODAL_SELECTORS = {
    overlay: '.fixed.inset-0.z-50',
    title: 'h2.text-2xl.font-bold',
    actionButtons: ['Get Started', 'Next', 'Skip', 'Finish']
};

const EDITOR_SELECTORS = {
    editor: '.ProseMirror',
    createFirstNote: 'Create First Note',
    newNote: 'New Note',
    publicButton: 'button[title="Set to public"]',
    confirmButton: 'Confirm'
};

const dismissOnboardingModal = async (page) => {
    const modalOverlay = page.locator(MODAL_SELECTORS.overlay);
    const modalTitle = page.locator(MODAL_SELECTORS.title).filter({ hasText: 'Welcome to Notention' });

    try {
        await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Onboarding modal detected.');

        let attempts = 0;
        while (await modalOverlay.isVisible() && attempts < 5) {
            const actionBtn = MODAL_SELECTORS.actionButtons
                .map(name => page.getByRole('button', { name }))
                .reduce((acc, btn) => acc.or(btn), page.getByRole('button', { name: MODAL_SELECTORS.actionButtons[0] }))
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
    }
};

const ensureEditorExists = async (page) => {
    if (await page.locator(EDITOR_SELECTORS.editor).count() === 0) {
        const createFirstBtn = page.getByRole('button', { name: EDITOR_SELECTORS.createFirstNote });
        if (await createFirstBtn.isVisible()) {
            await createFirstBtn.click();
        } else {
            const headerNewBtn = page.locator('button').filter({ hasText: EDITOR_SELECTORS.newNote });
            if (await headerNewBtn.count() > 0) {
                await headerNewBtn.first().click();
            }
        }
    }
};

const typeNoteContent = async (page) => {
    const editor = page.locator(EDITOR_SELECTORS.editor);
    await editor.clear();
    await editor.pressSequentially('Meeting with Bob ');
    await page.waitForTimeout(500);
    await editor.pressSequentially('[priority:high]');
    await page.waitForTimeout(1000);
    await editor.pressSequentially(' at 2pm');
    await page.waitForTimeout(2000);
};

const takeScreenshot = async (page, path) => {
    console.log(`Taking ${path}...`);
    await page.screenshot({ path: `verification/${path}` });
};

const publishNote = async (page) => {
    const publicBtn = page.locator(EDITOR_SELECTORS.publicButton);
    if (await publicBtn.count() > 0 && await publicBtn.first().isVisible()) {
        await publicBtn.first().click();
        const confirmBtn = page.getByRole('button', { name: EDITOR_SELECTORS.confirmButton });
        try {
            await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
            await confirmBtn.click();
        } catch (e) {
        }
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'screenshot_p2p.png');
    }
};

test('UI Screenshot Verification', async ({ page }) => {
    test.setTimeout(120000);

    console.log('Navigating to UI...');
    await page.goto('http://localhost:5173');

    await dismissOnboardingModal(page);
    await ensureEditorExists(page);

    console.log('Waiting for editor...');
    await page.waitForSelector(EDITOR_SELECTORS.editor, { timeout: 30000 });

    console.log('Typing note...');
    await typeNoteContent(page);

    await takeScreenshot(page, 'screenshot_authoring.png');
    await publishNote(page);
});
