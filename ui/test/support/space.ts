import type {Page} from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = path.join(ROOT, 'doc/evidence/space-utilization.json');

export interface SpaceCase {
    id: string;
    view: string;
    state: string;
    viewport: 'desktop' | 'mobile';
}

export interface SpaceMetrics {
    viewport: {width: number; height: number};
    scrollHeight: number;
    contentRatio: number;
    wastedSpace: number;
    wastedRatio: number;
    trailingSpace: number;
    contentHeight: number;
    root: string;
    overflowX: number;
    stretchDefects: Array<{element: string; height: number; childHeight: number}>;
    emptyState: {element: string; height: number; footprint: number} | null;
    density: number;
    actions: Array<{label: string; top: number}>;
    facts: number;
}

export const measureSpace = (page: Page): Promise<SpaceMetrics> =>
    page.evaluate(() => {
        const viewport = {width: window.innerWidth, height: window.innerHeight};
        const mainElement = document.querySelector('main');
        const mainRect = mainElement?.getBoundingClientRect();
        const mainPainted =
            !!mainRect && mainRect.width > 0 && mainRect.height > 0 && mainRect.right > 0 && mainRect.left < viewport.width;
        const main = (mainPainted ? mainElement : document.querySelector('[data-testid="sidebar"]')) ?? mainElement ?? document.body;
        const root = main === mainElement ? 'main' : main.getAttribute('data-testid') ?? main.tagName.toLowerCase();
        const scrollHeight = Math.max(main.scrollHeight, document.documentElement.scrollHeight);
        const seen = (element: Element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                rect.bottom > 0 &&
                rect.top < viewport.height
            );
        };
        const clip = (rect: DOMRect) => ({
            top: Math.max(0, rect.top),
            bottom: Math.min(viewport.height, rect.bottom),
        });
        const spans: Array<{top: number; bottom: number}> = [];
        const push = (rect: DOMRect) => {
            const {top, bottom} = clip(rect);
            if (bottom - top >= 2) spans.push({top, bottom});
        };

        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.nodeValue?.trim()) continue;
            const parent = node.parentElement;
            if (!parent || !seen(parent)) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            Array.from(range.getClientRects()).forEach(push);
        }
        main
            .querySelectorAll(
                'button,a[href],input,textarea,select,img,svg[role="img"],[role="button"],[role="listitem"],table,[data-testid]',
            )
            .forEach(element => {
                if (seen(element)) push(element.getBoundingClientRect());
            });

        spans.sort((a, b) => a.top - b.top);
        const merged: Array<{top: number; bottom: number}> = [];
        for (const span of spans) {
            const last = merged[merged.length - 1];
            if (last && span.top <= last.bottom + 1) last.bottom = Math.max(last.bottom, span.bottom);
            else merged.push({...span});
        }

        const covered = merged.reduce((sum, span) => sum + (span.bottom - span.top), 0);
        const wastedSpace = merged.reduce((sum, span, index) => {
            const previous = merged[index - 1];
            if (!previous) return sum;
            const gap = span.top - previous.bottom;
            return gap > 24 ? sum + gap - 24 : sum;
        }, 0);
        const first = merged[0]?.top ?? 0;
        const last = merged[merged.length - 1]?.bottom ?? 0;
        const contentHeight = Math.max(0, last - first);

        const stretchDefects: SpaceMetrics['stretchDefects'] = [];
        main.querySelectorAll('div,section').forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.height < viewport.height * 0.5) return;
            const style = window.getComputedStyle(element);
            if (!/center/.test(style.justifyContent) && !/center/.test(style.alignItems)) return;
            const child = Array.from(element.children).find(
                node => node.getBoundingClientRect().height > 0 && node.getBoundingClientRect().width > 0,
            );
            if (!child) return;
            if (Array.from(element.children).filter(node => node.getBoundingClientRect().height > 0).length !== 1) return;
            const childHeight = child.getBoundingClientRect().height;
            if (childHeight >= rect.height * 0.5) return;
            const className = typeof element.className === 'string' ? element.className : '';
            stretchDefects.push({
                element: `${element.tagName.toLowerCase()}[data-testid="${element.getAttribute('data-testid') ?? ''}"]:${className.slice(0, 60)}`,
                height: Math.round(rect.height),
                childHeight: Math.round(childHeight),
            });
        });

        const empty = main.querySelector<HTMLElement>('[data-empty-state], .empty-state');
        const emptyRect = empty?.getBoundingClientRect();

        const actions = Array.from(main.querySelectorAll('button,a[href],input,textarea,select'))
            .filter(seen)
            .map(element => ({
                label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 40),
                top: Math.round(element.getBoundingClientRect().top),
            }))
            .filter(action => action.label);
        const facts = Array.from(
            main.querySelectorAll('[role="listitem"],[data-testid*="property"],[data-testid*="constraint"]'),
        ).filter(seen).length;

        return {
            viewport,
            scrollHeight,
            contentRatio: +(covered / viewport.height).toFixed(3),
            wastedSpace: Math.round(wastedSpace),
            wastedRatio: +(wastedSpace / viewport.height).toFixed(3),
            trailingSpace: Math.round(Math.max(0, viewport.height - last)),
            contentHeight: Math.round(contentHeight),
            root,
            overflowX: Math.max(0, document.documentElement.scrollWidth - viewport.width),
            stretchDefects,
            emptyState: emptyRect
                ? {
                      element: empty!.className.slice(0, 60),
                      height: Math.round(emptyRect.height),
                      footprint: +(emptyRect.height / viewport.height).toFixed(3),
                  }
                : null,
            density: +(contentHeight ? ((actions.length + facts) / contentHeight) * 1000 : 0).toFixed(1),
            actions: actions.slice(0, 5),
            facts,
        };
    });

export const writeSpaceEvidence = async (cases: Array<SpaceCase & {metrics: SpaceMetrics}>) => {
    await fs.mkdir(path.dirname(EVIDENCE), {recursive: true});
    await fs.writeFile(
        EVIDENCE,
        JSON.stringify({generatedAt: new Date().toISOString(), cases}, null, 2),
    );
    return EVIDENCE;
};
