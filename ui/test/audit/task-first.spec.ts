import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {auditCases} from '../fixtures/auditCases';
import {measureTaskFirst, writeTaskFirstEvidence, type TaskFirstCase, type TaskFirstMetrics} from '../support/taskFirst';

for (const viewport of ['desktop', 'mobile'] as const) {
    test(`task-first audit: ${viewport} primary action reach and duplicate verbs`, async ({page}) => {
        test.setTimeout(300_000);

        const results: Array<TaskFirstCase & {metrics: TaskFirstMetrics}> = [];

        await page.setViewportSize(
            viewport === 'desktop' ? {width: 1440, height: 900} : {width: 390, height: 844},
        );
        for (const item of auditCases) {
            await isolateNetwork(page);
            await seed(page, item.prepare);
            if (item.waitFor) await page.locator(item.waitFor).first().waitFor({timeout: 10_000}).catch(() => {});
            await page.waitForTimeout(item.settleMs ?? 250);

            const metrics = await measureTaskFirst(page);
            results.push({view: item.id.split('-')[0], state: item.state, viewport, metrics});
            const primary = metrics.primaries[0];
            console.log(
                `${viewport} ${item.id}: primaries=${metrics.primaries.length}` +
                ` first=${primary ? `"${primary.label}"@${primary.top}px/tab${primary.tabStops}` : 'none'}` +
                ` content@${metrics.firstContentTop ?? '-'}` +
                ` dup=${metrics.duplicateLabels.length}`,
            );
        }

        await writeTaskFirstEvidence(results, viewport);
    });
}
