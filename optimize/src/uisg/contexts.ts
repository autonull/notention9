import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SeamRole } from '@notention/core/ui/strategy';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CONTEXTS_FILE = resolve(ROOT, 'doc/uisg/contexts.json');

const contextsFile = (): string => process.env.NOTENTION_UISG_CONTEXTS ?? CONTEXTS_FILE;

export const CONTEXTS_SCHEMA_VERSION = 2 as const;

export type ContextDensity = 'compact' | 'comfortable' | 'spacious';
export type ContextModality = 'pointer' | 'keyboard' | 'touch';

export interface ContextProfile {
    id: string;
    extends?: string;
    name: string;
    description: string;
    actor: string;
    expertise: 'novice' | 'expert';
    device: 'desktop' | 'mobile' | 'tablet';
    connectivity: 'online' | 'offline' | 'degraded';
    locale: string;
    viewport: string;
    density: ContextDensity;
    modality: ContextModality;
    profile: string;
    theme: string;
    a11yConstraints: string[];
    strategyOverrides: Partial<Record<SeamRole, string>>;
    templateVariants: Record<string, string>;
    featureFlags: string[];
}

export interface ContextsData {
    version: typeof CONTEXTS_SCHEMA_VERSION;
    updatedAt: string;
    profiles: ContextProfile[];
}

const BASE_PROFILES: ContextProfile[] = [
    {
        id: 'desktop',
        name: 'Desktop baseline',
        description: 'Desktop viewport, comfortable density, pointer-first',
        actor: 'desktop-user',
        expertise: 'expert',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'desktop-1440',
        density: 'comfortable',
        modality: 'pointer',
        profile: 'default',
        theme: 'default',
        a11yConstraints: [],
        strategyOverrides: { layout: 'split', display: 'inline' },
        templateVariants: { panel: 'expanded' },
        featureFlags: [],
    },
    {
        id: 'mobile',
        name: 'Mobile baseline',
        description: 'Mobile viewport, compact density, gesture-first',
        actor: 'mobile-user',
        expertise: 'expert',
        device: 'mobile',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'mobile-390',
        density: 'compact',
        modality: 'touch',
        profile: 'minimal',
        theme: 'default',
        a11yConstraints: ['touch-targets'],
        strategyOverrides: { capture: 'mobile-capture', elicit: 'palette-swipe', layout: 'stacked' },
        templateVariants: { item: 'dense', panel: 'collapsed', editor: 'minimal', status: 'inline' },
        featureFlags: ['swipe-actions', 'haptic-feedback'],
    },
    {
        id: 'tablet',
        extends: 'mobile',
        name: 'Tablet baseline',
        description: 'Tablet viewport, comfortable density, touch-first',
        actor: 'tablet-user',
        expertise: 'expert',
        device: 'tablet',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'tablet-834',
        density: 'comfortable',
        modality: 'touch',
        profile: 'default',
        theme: 'default',
        a11yConstraints: [],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
];

const DEFAULT_PROFILES: ContextProfile[] = [
    ...BASE_PROFILES,
    {
        id: 'desktop-novice-dark',
        extends: 'desktop',
        name: 'Desktop novice, dark theme',
        description: 'First-time desktop user, dark theme, keyboard and screen reader',
        actor: 'first-time-user',
        expertise: 'novice',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'desktop-1440',
        density: 'comfortable',
        modality: 'pointer',
        profile: 'default',
        theme: 'default',
        a11yConstraints: ['keyboard-nav', 'screen-reader', 'high-contrast'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
    {
        id: 'desktop-expert-light',
        extends: 'desktop',
        name: 'Desktop expert, light theme',
        description: 'Power user, full profile, reduced motion',
        actor: 'power-user',
        expertise: 'expert',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'desktop-1440',
        density: 'comfortable',
        modality: 'keyboard',
        profile: 'full',
        theme: 'default',
        a11yConstraints: ['keyboard-nav', 'reduced-motion'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
    {
        id: 'mobile-novice-dark',
        extends: 'mobile',
        name: 'Mobile novice, dark theme',
        description: 'Mobile novice, large text, gesture-first',
        actor: 'mobile-user',
        expertise: 'novice',
        device: 'mobile',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'mobile-390',
        density: 'compact',
        modality: 'touch',
        profile: 'minimal',
        theme: 'default',
        a11yConstraints: ['screen-reader', 'large-text'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
    {
        id: 'mobile-expert-degraded',
        extends: 'mobile',
        name: 'Mobile expert, degraded connectivity',
        description: 'Field user, offline-capable, degraded network',
        actor: 'field-user',
        expertise: 'expert',
        device: 'mobile',
        connectivity: 'degraded',
        locale: 'en-US',
        viewport: 'mobile-390',
        density: 'compact',
        modality: 'touch',
        profile: 'default',
        theme: 'default',
        a11yConstraints: ['offline-capable'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: ['offline-queue'],
    },
    {
        id: 'desktop-a11y-high-contrast',
        extends: 'desktop',
        name: 'Desktop accessibility, high contrast',
        description: 'High contrast, screen reader, keyboard, large text',
        actor: 'a11y-user',
        expertise: 'expert',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'desktop-1440',
        density: 'comfortable',
        modality: 'keyboard',
        profile: 'full',
        theme: 'high-contrast',
        a11yConstraints: ['high-contrast', 'screen-reader', 'keyboard-nav', 'reduced-motion', 'large-text'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
    {
        id: 'tablet-multilingual',
        extends: 'tablet',
        name: 'Tablet multilingual user',
        description: 'Tablet, German locale, touch-first',
        actor: 'international-user',
        expertise: 'novice',
        device: 'tablet',
        connectivity: 'online',
        locale: 'de-DE',
        viewport: 'tablet-834',
        density: 'comfortable',
        modality: 'touch',
        profile: 'default',
        theme: 'default',
        a11yConstraints: ['screen-reader'],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
    {
        id: 'mobile-dense',
        extends: 'mobile',
        name: 'Mobile dense',
        description: 'Mobile viewport, dense density, gesture-first',
        actor: 'mobile-user',
        expertise: 'expert',
        device: 'mobile',
        connectivity: 'online',
        locale: 'en-US',
        viewport: 'mobile-390',
        density: 'compact',
        modality: 'touch',
        profile: 'minimal',
        theme: 'default',
        a11yConstraints: [],
        strategyOverrides: {},
        templateVariants: {},
        featureFlags: [],
    },
];

function mergeProfile(base: ContextProfile, override: ContextProfile): ContextProfile {
    return {
        ...base,
        ...override,
        id: override.id,
        extends: override.extends,
        a11yConstraints: [...new Set([...base.a11yConstraints, ...override.a11yConstraints])],
        strategyOverrides: { ...base.strategyOverrides, ...override.strategyOverrides },
        templateVariants: { ...base.templateVariants, ...override.templateVariants },
        featureFlags: [...new Set([...base.featureFlags, ...override.featureFlags])],
    };
}

function resolveFrom(profiles: ContextProfile[], id: string): ContextProfile | null {
    const byId = new Map(profiles.map(profile => [profile.id, profile]));
    const chain: ContextProfile[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    if (!current) return null;
    while (current) {
        if (seen.has(current.id)) throw new Error(`Context profile cycle: ${[...seen, current.id].join(' -> ')}`);
        seen.add(current.id);
        chain.unshift(current);
        if (!current.extends) break;
        const parent = byId.get(current.extends);
        if (!parent) throw new Error(`Unknown base profile ${current.extends} (from ${current.id})`);
        current = parent;
    }
    return chain.reduce(mergeProfile);
}

let _cachedContexts: ContextsData | null = null;
let _cachedContextsPath: string | null = null;

export function loadContexts(): ContextsData | null {
    const path = contextsFile();
    if (_cachedContexts && _cachedContextsPath === path) {
        return _cachedContexts;
    }
    try {
        const data = JSON.parse(readFileSync(path, 'utf8')) as ContextsData;
        if (data.version !== CONTEXTS_SCHEMA_VERSION) {
            throw new Error(`contexts.json version ${data.version} is not ${CONTEXTS_SCHEMA_VERSION}`);
        }
        _cachedContexts = data;
        _cachedContextsPath = path;
        return _cachedContexts;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
    }
}

export function saveContexts(contexts: ContextsData): void {
    writeFileSync(contextsFile(), JSON.stringify(contexts, null, 2) + '\n');
}

export function ensureContextsFile(): ContextsData {
    const existing = loadContexts();
    if (existing) return existing;

    const contexts: ContextsData = {
        version: CONTEXTS_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        profiles: DEFAULT_PROFILES,
    };
    saveContexts(contexts);
    return contexts;
}

export function getProfile(id: string): ContextProfile | null {
    const contexts = loadContexts();
    return contexts ? resolveFrom(contexts.profiles, id) : null;
}

export function listProfiles(): ContextProfile[] {
    const contexts = loadContexts();
    const profiles = contexts?.profiles ?? DEFAULT_PROFILES;
    return profiles
        .map(({ id }) => resolveFrom(profiles, id))
        .filter((profile): profile is ContextProfile => profile !== null);
}
