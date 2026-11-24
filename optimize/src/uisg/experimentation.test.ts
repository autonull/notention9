import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    CONTEXTS_SCHEMA_VERSION, ensureContextsFile, getProfile, listProfiles, loadContexts,
} from './contexts.js';
import { emitThemeCss, getTheme, listThemes, writeThemeCss } from './themes.js';

describe('context profiles v2', () => {
    it('resolves inheritance through the base chain', () => {
        const dense = getProfile('mobile-dense')!;
        expect(dense).toMatchObject({
            viewport: 'mobile-390',
            density: 'compact',
            modality: 'touch',
            strategyOverrides: { capture: 'mobile-capture', elicit: 'palette-swipe', layout: 'stacked' },
            templateVariants: { item: 'dense', panel: 'collapsed', editor: 'minimal', status: 'inline' },
        });
        expect(dense.featureFlags).toEqual(['swipe-actions', 'haptic-feedback']);
        expect(dense.a11yConstraints).toEqual(['touch-targets']);
    });

    it('overrides scalars and unions arrays', () => {
        const a11y = getProfile('desktop-a11y-high-contrast')!;
        expect(a11y.theme).toBe('high-contrast');
        expect(a11y.profile).toBe('full');
        expect(a11y.a11yConstraints).toEqual([
            'high-contrast', 'screen-reader', 'keyboard-nav', 'reduced-motion', 'large-text',
        ]);
    });

    it('lists bases and derived profiles', () => {
        const ids = listProfiles().map(({ id }) => id);
        expect(ids).toEqual(expect.arrayContaining(['desktop', 'mobile', 'tablet', 'mobile-dense']));
        expect(ids).toHaveLength(10);
    });

    it('returns null for unknown profiles', () => {
        expect(getProfile('missing')).toBeNull();
    });
});

describe('contexts resilience', () => {
    let dir: string;
    const env = process.env.NOTENTION_UISG_CONTEXTS;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'uisg-contexts-'));
        process.env.NOTENTION_UISG_CONTEXTS = join(dir, 'contexts.json');
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
        if (env === undefined) delete process.env.NOTENTION_UISG_CONTEXTS;
        else process.env.NOTENTION_UISG_CONTEXTS = env;
    });

    it('writes v2 defaults when the file is missing', () => {
        const data = ensureContextsFile();
        expect(data.version).toBe(CONTEXTS_SCHEMA_VERSION);
        expect(loadContexts()!.version).toBe(2);
    });

    it('rejects v1 contexts', () => {
        writeFileSync(process.env.NOTENTION_UISG_CONTEXTS!, JSON.stringify({ version: 1, updatedAt: '', profiles: [] }));
        expect(() => loadContexts()).toThrow(/version 1 is not 2/);
    });
});

describe('theme tokens', () => {
    let dir: string;
    const stylesEnv = process.env.NOTENTION_UISG_STYLES_DIR;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'uisg-themes-'));
        process.env.NOTENTION_UISG_STYLES_DIR = dir;
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
        if (stylesEnv === undefined) delete process.env.NOTENTION_UISG_STYLES_DIR;
        else process.env.NOTENTION_UISG_STYLES_DIR = stylesEnv;
    });

    it('resolves tokens and lists themes', () => {
        expect(getTheme('brand-acme')).toEqual({ accent: '#FF6B35', radius: '12px', font: 'Inter' });
        expect(listThemes().map(({ id }) => id)).toEqual(expect.arrayContaining(['default', 'brand-acme', 'brand-beta', 'high-contrast']));
    });

    it('rejects unknown themes', () => {
        expect(() => getTheme('missing')).toThrow(/Unknown theme: missing/);
    });

    it('emits and writes CSS variables', () => {
        const tokens = getTheme('brand-beta');
        const css = emitThemeCss('brand-beta', tokens);
        expect(css).toContain('--accent-color: #00D4AA;');
        expect(css).toContain('--theme-radius: 4px;');
        expect(css).toContain('--theme-font: JetBrains Mono;');

        const path = writeThemeCss('brand-beta');
        expect(path).toBe(join(dir, 'theme-brand-beta.css'));
        expect(readFileSync(path, 'utf8')).toBe(css);
    });
});
