import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const CONTEXTS_FILE = resolve(ROOT, 'doc/uisg/contexts.json');

export interface ContextProfile {
    id: string;
    name: string;
    actor: string;
    expertise: 'novice' | 'expert';
    device: 'desktop' | 'mobile' | 'tablet';
    connectivity: 'online' | 'offline' | 'degraded';
    locale: string;
    a11yConstraints: string[];
    dimensions: {
        viewport: string;
        theme: string;
        modality: string;
        profile: string;
    };
}

export interface ContextsData {
    version: number;
    updatedAt: string;
    profiles: ContextProfile[];
}

const DEFAULT_PROFILES: ContextProfile[] = [
    {
        id: 'desktop-novice-dark',
        name: 'Desktop novice, dark theme',
        actor: 'first-time-user',
        expertise: 'novice',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        a11yConstraints: ['keyboard-nav', 'screen-reader', 'high-contrast'],
        dimensions: {
            viewport: 'desktop-1440',
            theme: 'dark',
            modality: 'pointer',
            profile: 'default',
        },
    },
    {
        id: 'desktop-expert-light',
        name: 'Desktop expert, light theme',
        actor: 'power-user',
        expertise: 'expert',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        a11yConstraints: ['keyboard-nav', 'reduced-motion'],
        dimensions: {
            viewport: 'desktop-1440',
            theme: 'light',
            modality: 'keyboard',
            profile: 'full',
        },
    },
    {
        id: 'mobile-novice-dark',
        name: 'Mobile novice, dark theme',
        actor: 'mobile-user',
        expertise: 'novice',
        device: 'mobile',
        connectivity: 'online',
        locale: 'en-US',
        a11yConstraints: ['touch-targets', 'screen-reader', 'large-text'],
        dimensions: {
            viewport: 'mobile-390',
            theme: 'dark',
            modality: 'pointer',
            profile: 'minimal',
        },
    },
    {
        id: 'mobile-expert-degraded',
        name: 'Mobile expert, degraded connectivity',
        actor: 'field-user',
        expertise: 'expert',
        device: 'mobile',
        connectivity: 'degraded',
        locale: 'en-US',
        a11yConstraints: ['touch-targets', 'offline-capable'],
        dimensions: {
            viewport: 'mobile-390',
            theme: 'dark',
            modality: 'pointer',
            profile: 'default',
        },
    },
    {
        id: 'desktop-a11y-high-contrast',
        name: 'Desktop accessibility, high contrast',
        actor: 'a11y-user',
        expertise: 'expert',
        device: 'desktop',
        connectivity: 'online',
        locale: 'en-US',
        a11yConstraints: ['high-contrast', 'screen-reader', 'keyboard-nav', 'reduced-motion', 'large-text'],
        dimensions: {
            viewport: 'desktop-1440',
            theme: 'light',
            modality: 'keyboard',
            profile: 'full',
        },
    },
    {
        id: 'tablet-multilingual',
        name: 'Tablet multilingual user',
        actor: 'international-user',
        expertise: 'novice',
        device: 'tablet',
        connectivity: 'online',
        locale: 'de-DE',
        a11yConstraints: ['touch-targets', 'screen-reader'],
        dimensions: {
            viewport: 'mobile-390',
            theme: 'light',
            modality: 'pointer',
            profile: 'default',
        },
    },
];

export function loadContexts(): ContextsData | null {
    try {
        return JSON.parse(readFileSync(CONTEXTS_FILE, 'utf8')) as ContextsData;
    } catch {
        return null;
    }
}

export function saveContexts(contexts: ContextsData): void {
    writeFileSync(CONTEXTS_FILE, JSON.stringify(contexts, null, 2) + '\n');
}

export function ensureContextsFile(): ContextsData {
    const existing = loadContexts();
    if (existing) return existing;

    const contexts: ContextsData = {
        version: 1,
        updatedAt: new Date().toISOString(),
        profiles: DEFAULT_PROFILES,
    };
    saveContexts(contexts);
    return contexts;
}

export function getProfile(id: string): ContextProfile | null {
    const contexts = loadContexts();
    if (!contexts) return null;
    return contexts.profiles.find(p => p.id === id) ?? null;
}

export function listProfiles(): ContextProfile[] {
    const contexts = loadContexts();
    return contexts?.profiles ?? DEFAULT_PROFILES;
}