import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {seed} from '../support/seed';
import {settle} from '../support/settle';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

const VIEWS = [
    {name: 'Notes', hash: '#/notes'},
    {name: 'Note', hash: '#/notes/demo-request-react'},
    {name: 'Settings', hash: '#/settings'},
    {name: 'Skills', hash: '#/settings/skills'},
];

async function openRail(page: any) {
    await page.getByRole('tab', {name: 'Matches'}).click();
    await settle(page);
}

for (const theme of ['dark', 'light'] as const) {
    for (const view of VIEWS) {
        test(`axe: ${theme} ${view.name} has no serious or critical violations`, async ({page}) => {
            await seed(page, {notes: demoNotes(), settings: defaultSettings({theme}), hash: view.hash});

            const results = await new AxeBuilder({page})
                .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
                .analyze();

            const serious = results.violations.filter(v => v.impact === 'serious');
            const critical = results.violations.filter(v => v.impact === 'critical');

            if (serious.length > 0 || critical.length > 0) {
                console.log(`\n=== ${theme} ${view.name} violations ===`);
                for (const v of [...critical, ...serious]) {
                    console.log(`  [${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}: ${v.description}`);
                    console.log(`    Nodes: ${v.nodes.length}`);
                    for (const node of v.nodes.slice(0, 25)) {
                        console.log(`      ${node.target.join(' ')}`);
                        console.log(`      ${node.html.slice(0, 220)}`);
                        console.log(`      ${node.failureSummary?.split('\n').slice(0, 3).join(' | ')}`);
                    }
                }
            }

            expect(critical.length, `Critical violations on ${theme} ${view.name}`).toBe(0);
            expect(serious.length, `Serious violations on ${theme} ${view.name}`).toBe(0);
        });
    }

    // Note with rail (matches tab) open
    test(`axe: ${theme} Note with rail open has no serious or critical violations`, async ({page}) => {
        await seed(page, {notes: demoNotes(), settings: defaultSettings({theme}), hash: '#/notes/demo-request-react'});
        await openRail(page);

        const results = await new AxeBuilder({page})
            .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
            .analyze();

        const serious = results.violations.filter(v => v.impact === 'serious');
        const critical = results.violations.filter(v => v.impact === 'critical');

        if (serious.length > 0 || critical.length > 0) {
            console.log(`\n=== ${theme} Note with rail open violations ===`);
            for (const v of [...critical, ...serious]) {
                console.log(`  [${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}: ${v.description}`);
                console.log(`    Nodes: ${v.nodes.length}`);
                for (const node of v.nodes.slice(0, 25)) {
                    console.log(`      ${node.target.join(' ')}`);
                    console.log(`      ${node.html.slice(0, 220)}`);
                    console.log(`      ${node.failureSummary?.split('\n').slice(0, 3).join(' | ')}`);
                }
            }
        }

        expect(critical.length, `Critical violations on ${theme} Note with rail open`).toBe(0);
        expect(serious.length, `Serious violations on ${theme} Note with rail open`).toBe(0);
    });
}
