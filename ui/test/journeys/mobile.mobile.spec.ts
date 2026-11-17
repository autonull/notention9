import {test, expect} from '@playwright/test';
import {seed, clearStorage} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

const mobileRoutes: Array<[string, string]> = [
    ['#inbox', 'Recent notes'],
    ['#notes', 'Notes'],
    ['#actions', 'Actions'],
    ['#map', 'OpenStreetMap'],
    ['#timeline', 'Spacetime Filter'],
    ['#network', 'Public Feed'],
    ['#chat', 'Chat needs an identity'],
    ['#responses', 'No responses yet'],
    ['#labels', 'Labels'],
    ['#trash', 'Recently deleted'],
    ['#settings', 'Settings'],
    ['#dashboard', 'Recent notes'], // W10.2: dashboard redirects to inbox
    ['#ontology', 'Ontology'],
];

test('mobile: every navigation route renders content at 360px', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    for (const [hash, text] of mobileRoutes) {
        await page.evaluate(nextHash => { window.location.hash = nextHash; window.dispatchEvent(new PopStateEvent('popstate')); }, hash);
        await expect(page.locator('main')).toContainText(new RegExp(text, 'i'));
        await expect(page.locator('main')).not.toBeEmpty();
    }
});

test('mobile: no horizontal overflow at 360px', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Check each route for horizontal scroll
    for (const [hash] of mobileRoutes) {
        await page.evaluate(nextHash => { window.location.hash = nextHash; window.dispatchEvent(new PopStateEvent('popstate')); }, hash);
        await expect(page.locator('main')).not.toBeEmpty();

        // Check body/document for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth ||
                   document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasHorizontalScroll).toBeFalsy();
    }
});

test('mobile: bottom nav is visible and functional', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Bottom nav should be visible on mobile
    const bottomNav = page.locator('[role="tablist"]');
    await expect(bottomNav).toBeVisible();

    // Check primary nav items are present
    await expect(page.getByRole('tab', {name: 'Inbox'})).toBeVisible();
    await expect(page.getByRole('tab', {name: 'Notes'})).toBeVisible();
    await expect(page.getByRole('tab', {name: 'Actions'})).toBeVisible();
    await expect(page.getByRole('tab', {name: 'More'})).toBeVisible();
});

test('mobile: touch targets meet 44px minimum', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Check bottom nav buttons
    const tabs = page.getByRole('tablist').getByRole('tab');
    const count = await tabs.count();
    
    for (let i = 0; i < count; i++) {
        const tab = tabs.nth(i);
        const box = await tab.boundingBox();
        if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
    }

    // One capture entry: the inbox field, not a duplicate bottom-bar button
    const bottomBar = page.locator('.fixed.bottom-0').first();
    await expect(bottomBar.getByRole('button', {name: 'Capture'})).toHaveCount(0);
    const capture = page.getByTestId('quick-capture-input');
    await expect(capture).toBeVisible();
    const captureBox = await capture.boundingBox();
    if (captureBox) {
        expect(captureBox.height).toBeGreaterThanOrEqual(44);
    }

    // Check search and help buttons
    const searchBtn = bottomBar.getByRole('button', {name: 'Search and commands'});
    const helpBtn = bottomBar.getByRole('button', {name: 'Keyboard shortcuts'});
    for (const btn of [searchBtn, helpBtn]) {
        const box = await btn.boundingBox();
        if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
    }
});

test('mobile: more sheet opens and navigates', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Open more menu
    await page.getByRole('tab', {name: 'More'}).click();
    
    // Check more sheet is open
    const moreSheet = page.getByRole('dialog', {name: 'More views'});
    await expect(moreSheet).toBeVisible();
    
    // Check secondary nav items (from SECONDARY_NAV + SETTINGS_VIEW)
    await expect(page.getByRole('menuitem', {name: 'Map'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Timeline'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Network'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Chat'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Responses'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Labels'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Trash'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Skills'})).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Settings'})).toBeVisible();
    
    // Navigate via more sheet
    await page.getByRole('menuitem', {name: 'Settings'}).click();
    await expect(page.locator('main')).toContainText('Settings');
});

test('mobile: search and shortcuts accessible', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Search button in bottom bar
    const searchBtn = page.getByRole('button', {name: 'Search and commands'});
    await expect(searchBtn).toBeVisible();
    const searchBox = await searchBtn.boundingBox();
    if (searchBox) {
        expect(searchBox.width).toBeGreaterThanOrEqual(44);
        expect(searchBox.height).toBeGreaterThanOrEqual(44);
    }

    // Shortcuts help button
    const helpBtn = page.getByRole('button', {name: 'Keyboard shortcuts'});
    await expect(helpBtn).toBeVisible();
    const helpBox = await helpBtn.boundingBox();
    if (helpBox) {
        expect(helpBox.width).toBeGreaterThanOrEqual(44);
        expect(helpBox.height).toBeGreaterThanOrEqual(44);
    }
});

test('mobile: sidebar is visible on notes view', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // On mobile notes view, sidebar is always visible (main content is hidden)
    await page.evaluate(() => { window.location.hash = '#notes'; window.dispatchEvent(new PopStateEvent('popstate')); });
    
    // Sidebar should be visible
    const sidebar = page.locator('aside[role="complementary"], .sidebar, [data-testid="sidebar"]');
    await expect(sidebar.first()).toBeVisible({timeout: 5000});
    
    // Should contain note list (demo notes include "React developer")
    await expect(sidebar.first()).toContainText('React developer');
});

test('mobile: inbox quick capture input is accessible', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Navigate to inbox (where quick capture lives)
    await page.evaluate(() => { window.location.hash = '#inbox'; window.dispatchEvent(new PopStateEvent('popstate')); });
    
    // Quick capture should be visible
    const quickCapture = page.getByTestId('quick-capture-input');
    await expect(quickCapture).toBeVisible();
    
    // Type in quick capture
    await quickCapture.fill('Test mobile note #test');
    
    // Input should have the typed value
    await expect(quickCapture).toHaveValue('Test mobile note #test');
    
    // Input should be focusable and have correct touch target size
    const box = await quickCapture.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
});

test('mobile: persistence survives reload', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    
    // Navigate to inbox
    await page.evaluate(() => { window.location.hash = '#inbox'; window.dispatchEvent(new PopStateEvent('popstate')); });
    
    await page.reload();
    await expect(page.locator('main')).toContainText('Recent notes');
    await clearStorage(page);
});