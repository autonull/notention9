import type {Page} from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import {settle, disableMotion} from './settle';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUTPUT = path.join(ROOT, 'doc/screenshot');

export interface SnapOptions {
    area: string;
    state: string;
    description: string;
    viewport?: 'desktop' | 'mobile';
    mask?: string[];
}

export async function snap(page: Page, options: SnapOptions) {
    await settle(page);
    await disableMotion(page);

    const directory = path.join(OUTPUT, options.area);
    await fs.mkdir(directory, {recursive: true});

    await page.screenshot({
        path: path.join(directory, `${options.state}.png`),
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        mask: (options.mask ?? []).map(selector => page.locator(selector)),
    });

    const manifest = {
        area: options.area,
        state: options.state,
        file: `${options.area}/${options.state}.png`,
        viewport: options.viewport ?? 'desktop',
        description: options.description,
    };
    await fs.writeFile(path.join(directory, `${options.state}.json`), JSON.stringify(manifest, null, 2));
}

export async function resetOutput() {
    await fs.rm(OUTPUT, {recursive: true, force: true});
    await fs.mkdir(OUTPUT, {recursive: true});
}
