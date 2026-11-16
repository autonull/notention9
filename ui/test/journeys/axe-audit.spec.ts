import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIEWS = [
    {name: 'Inbox', path: '/'},
    {name: 'Notes', path: '/notes'},
    {name: 'Map', path: '/map'},
    {name: 'Timeline', path: '/timeline'},
    {name: 'Network', path: '/network'},
    {name: 'Chat', path: '/chat'},
    {name: 'Actions', path: '/actions'},
    {name: 'Responses', path: '/responses'},
    {name: 'Labels', path: '/labels'},
    {name: 'Trash', path: '/trash'},
    {name: 'Settings', path: '/settings'},
];

for (const view of VIEWS) {
    test.describe(`axe: ${view.name}`, () => {
        test(`no serious/critical violations on ${view.name}`, async ({page}) => {
            await page.goto(view.path);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({page})
                .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
                .analyze();

            const serious = results.violations.filter(v => v.impact === 'serious');
            const critical = results.violations.filter(v => v.impact === 'critical');

            if (serious.length > 0 || critical.length > 0) {
                console.log(`\n=== ${view.name} violations ===`);
                for (const v of [...critical, ...serious]) {
                    console.log(`  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}`);
                    console.log(`    Help: ${v.helpUrl}`);
                    console.log(`    Nodes: ${v.nodes.length}`);
                    for (const node of v.nodes.slice(0, 3)) {
                        console.log(`      - ${node.html}`);
                    }
                }
            }

            expect(critical.length, `Critical violations on ${view.name}`).toBe(0);
            expect(serious.length, `Serious violations on ${view.name}`).toBe(0);
        });
    });
}