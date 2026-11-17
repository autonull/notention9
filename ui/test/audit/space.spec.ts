import {test} from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import {seed} from '../support/seed';
import {measureSpace, writeSpaceEvidence, type SpaceCase, type SpaceMetrics} from '../support/space';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes, deletedNote, noteWithDetails, taskNotes} from '../fixtures/workspace';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SHOTS = path.join(ROOT, 'doc/evidence/space');

interface AuditCase {
    id: string;
    state: string;
    prepare: Parameters<typeof seed>[1];
    waitFor?: string;
    settleMs?: number;
}

const cases: AuditCase[] = [
    {id: 'inbox-empty', state: 'empty', prepare: {notes: [], settings: defaultSettings(), hash: '#inbox'}},
    {id: 'inbox-populated', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#inbox'}, waitFor: '[data-testid="local-match"]'},
    {id: 'notes-list', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes/demo-request-react'}, waitFor: '.note-list-item'},
    {id: 'notes-grid', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes', sidebarViewMode: 'grid'}, waitFor: '.note-list-item'},
    {id: 'trash', state: 'populated', prepare: {notes: [deletedNote()], settings: defaultSettings(), hash: '#trash'}},
    {id: 'timeline', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#timeline'}, waitFor: '.rbc-calendar'},
    {id: 'actions', state: 'populated', prepare: {notes: [...demoNotes(), ...taskNotes()], settings: defaultSettings(), hash: '#actions'}, waitFor: 'text=RUNNING (1)'},
    {id: 'responses', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#responses'}},
    {id: 'labels', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#labels'}},
    {id: 'ontology', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#ontology'}, waitFor: 'text=The Ontology'},
    {id: 'map', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#map'}, waitFor: '.leaflet-container'},
    {id: 'settings', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'}},
    {id: 'chat', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#chat'}},
    {id: 'editor', state: 'populated', prepare: {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'}},
    {id: 'network', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#network'}},
];

test('space utilization baseline', async ({page}) => {
    test.setTimeout(300_000);

    const results: Array<SpaceCase & {metrics: SpaceMetrics}> = [];

    for (const viewport of ['desktop', 'mobile'] as const) {
        await page.setViewportSize(
            viewport === 'desktop' ? {width: 1440, height: 900} : {width: 390, height: 844},
        );
        for (const item of cases) {
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
