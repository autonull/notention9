import {test, expect} from '@playwright/test';
import {seed, clearStorage} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('export, clear, and restore a backup', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'});
    await page.getByRole('tab', {name: /Data Management/}).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Export JSON'}).click();
    const download = await downloadPromise;
    const file = await download.path();
    expect(file).toBeTruthy();

    const fs = await import('fs/promises');
    const raw = await fs.readFile(file!, 'utf8');
    const backup = JSON.parse(raw);
    expect(backup.version).toBe(1);
    expect(backup.notes).toHaveLength(10);
    expect(backup.settings.nostr.privkey).toBeNull();
    expect(raw).not.toMatch(/"privkey"\s*:\s*"[0-9a-f]{16,}"/i);

    await clearStorage(page);
    await expect(page.getByTestId('local-match')).toHaveCount(0);

    await page.setInputFiles('input[type="file"]', {
        name: 'notention-backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(raw),
    });
    await page.getByRole('button', {name: 'Restore & Overwrite'}).click();

    await page.waitForTimeout(2500);
    await expect(page.getByTestId('local-match')).toBeVisible();
});

test('malformed import is rejected without overwriting', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'});
    await page.getByRole('tab', {name: /Data Management/}).click();

    await page.setInputFiles('input[type="file"]', {
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({version: 1, notes: 'nope', settings: {}})),
    });

    await expect(page.getByText(/Import failed/)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Restore & Overwrite'})).toHaveCount(0);
});
