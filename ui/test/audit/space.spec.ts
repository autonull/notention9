import {test} from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import {seed} from '../support/seed';
import {measureSpace, writeSpaceEvidence, type SpaceCase, type SpaceMetrics} from '../support/space';
import {isolateNetwork} from '../fixtures/routes';
import {auditCases} from '../fixtures/auditCases';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOTS = path.join(ROOT, 'doc/evidence/space');

test('space utilization baseline', async ({page}) => {
    test.setTimeout(300_000);

    const results: Array<SpaceCase & {metrics: SpaceMetrics}> = [];

    for (const viewport of ['desktop', 'mobile'] as const) {
        await page.setViewportSize(
            viewport === 'desktop' ? {width: 1440, height: 900} : {width: 390, height: 844},
        );
        for (const item of auditCases) {
            await isolateNetwork(page);
            await seed(page, item.prepare);
            if (item.waitFor) await page.locator(item.waitFor).first().waitFor({timeout: 10_000}).catch(() => {});
            await page.waitForTimeout(item.settleMs ?? 250);

            const metrics = await measureSpace(page);
            results.push({id: item.id, view: item.id.split('-')[0], state: item.state, viewport, metrics});

            const directory = path.join(SHOTS, viewport);
            await fs.mkdir(directory, {recursive: true});
            await page.screenshot({
                path: path.join(directory, `${item.id}.jpg`),
                type: 'jpeg',
                quality: 60,
                animations: 'disabled',
                caret: 'hide',
                fullPage: false,
            });
            console.log(`${viewport} ${item.id}: ratio=${metrics.contentRatio} waste=${metrics.wastedRatio} stretch=${metrics.stretchDefects.length}`);
        }
    }

    await writeSpaceEvidence(results);
});
