import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {readFrictionJournal, waitForFrictionEvent} from '../support/journal';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

test('a seeded workspace anchors the need before the match is explained', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    await page.evaluate(() => {
        window.location.hash = '#dashboard';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 30_000});
    await match.getByTestId('match-explanations').locator('summary').click();

    const explained = await waitForFrictionEvent(page, 'match_explained');
    const journal = await readFrictionJournal(page);

    // The need entered the app by hydration, not by a write path.
    const expressed = journal.find(e =>
        e.kind === 'need_expressed' && e.noteId === explained.noteId
    );
    expect(expressed).toBeTruthy();
    expect(expressed!.sessionId).toBe(explained.sessionId);
    expect(new Date(explained.timestamp!).getTime())
        .toBeGreaterThanOrEqual(new Date(expressed!.timestamp!).getTime());

    // The anchor is recorded once per note, and the journal stores it once.
    const inSession = journal.filter(e => e.sessionId === explained.sessionId);
    expect(inSession.filter(e => e.kind === 'need_expressed' && e.noteId === explained.noteId))
        .toHaveLength(1);
});
