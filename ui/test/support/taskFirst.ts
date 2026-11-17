import type {Page} from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = path.join(ROOT, 'doc/evidence/task-first.json');

export interface TaskFirstCase {
    view: string;
    state: string;
    viewport: 'desktop' | 'mobile';
}

export interface TaskFirstMetrics {
    primaries: Array<{label: string; top: number; tabStops: number; visible: boolean}>;
    duplicateLabels: Array<{label: string; count: number}>;
    focusableCount: number;
    firstContentTop: number | null;
    tabStopsToContent: number | null;
}

export const measureTaskFirst = (page: Page): Promise<TaskFirstMetrics> =>
    page.evaluate(() => {
        const main = document.querySelector('main') ?? document.body;
        const viewportHeight = window.innerHeight;
        const visible = (element: Element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                rect.bottom > 0 &&
                rect.top < viewportHeight
            );
        };
        const isRow = (element: Element) =>
            !!element.closest('[role="listitem"],li,article,.note-list-item,.rbc-event');
        const focusable = Array.from(
            main.querySelectorAll<HTMLElement>(
                'button:not([disabled]):not([tabindex="-1"]),a[href],input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
            ),
        ).filter(visible);
        const label = (element: Element) =>
            (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();
        const tabStops = (element: Element) => focusable.indexOf(element as HTMLElement);
        const primaries = focusable
            .filter(element => element.getAttribute('data-variant') === 'primary' || element.classList.contains('rbc-active'))
            .map(element => ({
                label: label(element).slice(0, 40),
                top: Math.round(element.getBoundingClientRect().top),
                tabStops: tabStops(element),
                visible: element.getBoundingClientRect().bottom <= viewportHeight,
            }));

        const counts = new Map<string, number>();
        for (const element of focusable) {
            if (isRow(element)) continue;
            const text = label(element).toLowerCase();
            if (text.length < 3) continue;
            counts.set(text, (counts.get(text) ?? 0) + 1);
        }
        const duplicateLabels = [...counts.entries()]
            .filter(([, count]) => count > 1)
            .map(([text, count]) => ({label: text.slice(0, 40), count}))
            .sort((a, b) => b.count - a.count);

        const content = main.querySelector(
            '[role="listitem"],[data-testid="notes-list-items"],[data-testid="local-match"],.note-list-item,.rbc-calendar,input,textarea',
        );

        return {
            primaries,
            duplicateLabels,
            focusableCount: focusable.length,
            firstContentTop: content ? Math.round(content.getBoundingClientRect().top) : null,
            tabStopsToContent: content ? tabStops(content) : null,
        };
    });

export const writeTaskFirstEvidence = async (cases: Array<TaskFirstCase & {metrics: TaskFirstMetrics}>) => {
    await fs.mkdir(path.dirname(EVIDENCE), {recursive: true});
    await fs.writeFile(EVIDENCE, JSON.stringify({generatedAt: new Date().toISOString(), cases}, null, 2));
};
