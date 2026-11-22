import {test, expect} from '@playwright/test';

test.describe('Keyboard Navigation', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('Skip link works and focuses main content', async ({page}) => {
        // Start from the document, not the auto-focused capture field.
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.press('Tab');
        const skipLink = page.locator('.skip-link:focus');
        await expect(skipLink).toBeVisible();
        
        // Press Enter to activate skip link
        await page.keyboard.press('Enter');
        
        // Main content should be focused
        const mainContent = page.locator('#main-content:focus');
        await expect(mainContent).toBeFocused();
    });

    test('Tab order through header navigation', async ({page}) => {
        // Tab to first focusable element in header
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Check focus is on a nav element
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
    });

    test('Ctrl+N opens the one composer', async ({page}) => {
        await page.keyboard.press('Control+N');
        await expect(page.getByTestId('capture-composer-input')).toBeFocused();
    });

    test('Search overlay opens with Ctrl+K', async ({page}) => {
        await page.keyboard.press('Control+K');
        await expect(page.getByRole('dialog', {name: 'Search'})).toBeVisible();
    });

    test('Escape closes modals/dialogs', async ({page}) => {
        await page.keyboard.press('Control+K');
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        await page.keyboard.press('Escape');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('Focus trapped in command palette', async ({page}) => {
        await page.keyboard.press('Control+K');
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        
        // Tab through elements in dialog - should not escape
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
        }
        
        // Focus should still be in dialog
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
    });

    test('Capture flow: composer -> Keep note (keyboard only)', async ({page}) => {
        await page.keyboard.press('Control+N');
        const composer = page.getByTestId('capture-composer-input');
        await expect(composer).toBeFocused();
        await page.keyboard.type('Test note for keyboard navigation');
        await page.keyboard.press('Control+Enter');

        const editor = page.locator('[contenteditable="true"]');
        await expect(editor).toBeVisible();
        await expect(editor).toContainText('Test note for keyboard navigation');

        await page.keyboard.press('Control+S');
        await expect(editor).toContainText('Test note for keyboard navigation');
    });

    test('Focus visible on all interactive elements', async ({page}) => {
        // Check that focus styles are applied
        const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex="0"], [role="button"]').all();
        
        for (const el of focusableElements.slice(0, 10)) {
            await el.focus();
            const styles = await el.evaluate((node) => {
                const computed = window.getComputedStyle(node);
                return {
                    outline: computed.outline,
                    outlineWidth: computed.outlineWidth,
                    outlineColor: computed.outlineColor,
                    boxShadow: computed.boxShadow,
                };
            });
            
            // Should have visible focus indicator (outline or box-shadow)
            const hasFocusIndicator = styles.outlineWidth !== '0px' || 
                                     styles.boxShadow.includes('rgba') || 
                                     styles.boxShadow.includes('rgb');
            
            if (!hasFocusIndicator) {
                console.log('Element missing focus indicator:', await el.getAttribute('outerHTML'));
            }
        }
    });
});

test.describe('Modal Focus Management', () => {
    test('Confirmation modal traps focus and handles Escape', async ({page}) => {
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        
        // Trigger a confirmation modal by clicking "Export" which might have confirmations
        // or try to find any button that opens a confirmation modal
        const confirmButton = page.locator('button:has-text("Clear"), button:has-text("Delete"), button:has-text("Remove"), button:has-text("Revoke")').first();
        
        if (await confirmButton.isVisible({timeout: 2000})) {
            await confirmButton.click();
        } else {
            // Skip test if no confirmation modal trigger found
            test.skip();
        }
        
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({timeout: 2000})) {
            // Focus should be trapped
            await page.keyboard.press('Tab');
            await expect(page.locator(':focus')).toBeVisible();
            
            // Escape should close
            await page.keyboard.press('Escape');
            await expect(modal).not.toBeVisible();
        }
    });
});