import { useMemo, useSyncExternalStore } from 'react';

export interface UisgFlags {
    density: 'compact' | 'comfortable';
    animations: boolean;
    reducedMotion: boolean;
    experimental: string[];
    theme: string;
    context: string;
    variant?: string;
}

type Listener = () => void;

class UisgFlagsStore {
    private flags: UisgFlags;
    private listeners = new Set<Listener>();

    constructor() {
        this.flags = this.getInitialFlags();
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', this.handleStorageChange);
        }
    }

    private getInitialFlags(): UisgFlags {
        if (typeof window === 'undefined') {
            return this.getDefaults();
        }

        // Parse URL params first
        const urlFlags = this.parseUrlFlags();
        
        // Then check localStorage
        const storedFlags = this.parseStoredFlags();
        
        // Merge: URL params > localStorage > defaults
        return {
            ...this.getDefaults(),
            ...storedFlags,
            ...urlFlags,
        };
    }

    private getDefaults(): UisgFlags {
        return {
            density: 'comfortable',
            animations: true,
            reducedMotion: false,
            experimental: [],
            theme: 'default',
            context: 'desktop',
        };
    }

    private parseUrlFlags(): Partial<UisgFlags> {
        if (typeof window === 'undefined') return {};
        const params = new URLSearchParams(window.location.search);
        const uisg = params.get('uisg');
        if (uisg !== '1') return {};

        const flagsParam = params.get('flags');
        const result: Partial<UisgFlags> = {};

        if (flagsParam) {
            const enabled: string[] = [];
            const disabled: string[] = [];
            for (const flag of flagsParam.split(',')) {
                if (flag.startsWith('-')) {
                    disabled.push(flag.slice(1));
                } else {
                    enabled.push(flag);
                }
            }
            if (enabled.length) result.experimental = enabled;
            // Note: disabled flags are handled by removing from the final list
        }

        const theme = params.get('theme');
        if (theme) result.theme = theme;

        const context = params.get('context');
        if (context) result.context = context;

        const variant = params.get('variant');
        if (variant) result.variant = variant;

        const density = params.get('density');
        if (density === 'compact' || density === 'comfortable') {
            result.density = density;
        }

        const animations = params.get('animations');
        if (animations === 'false') result.animations = false;
        if (animations === 'true') result.animations = true;

        const reducedMotion = params.get('reducedMotion');
        if (reducedMotion === 'true') result.reducedMotion = true;

        return result;
    }

    private parseStoredFlags(): Partial<UisgFlags> {
        if (typeof window === 'undefined') return {};
        try {
            const stored = localStorage.getItem('uisg:flags');
            if (stored) return JSON.parse(stored);
        } catch {
            // ignore parse errors
        }
        return {};
    }

    private handleStorageChange = (event: StorageEvent): void => {
        if (event.key === 'uisg:flags') {
            const newFlags = this.getInitialFlags();
            if (JSON.stringify(newFlags) !== JSON.stringify(this.flags)) {
                this.flags = newFlags;
                this.notify();
            }
        }
    };

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }

    getSnapshot(): UisgFlags {
        return this.flags;
    }

    getServerSnapshot(): UisgFlags {
        return this.getDefaults();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setFlags(flags: Partial<UisgFlags>): void {
        this.flags = { ...this.flags, ...flags };
        if (typeof window !== 'undefined') {
            localStorage.setItem('uisg:flags', JSON.stringify(this.flags));
        }
        this.notify();
    }

    setExperimentalFlags(flags: string[]): void {
        this.flags = { ...this.flags, experimental: flags };
        if (typeof window !== 'undefined') {
            localStorage.setItem('uisg:flags', JSON.stringify(this.flags));
        }
        this.notify();
    }

    toggleExperimentalFlag(flag: string): void {
        const current = this.flags.experimental;
        const enabled = !current.includes(flag);
        const next = enabled ? [...current, flag] : current.filter(f => f !== flag);
        this.setExperimentalFlags(next);
    }

    destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', this.handleStorageChange);
        }
    }
}

const store = new UisgFlagsStore();

export function useUisgFlags(): UisgFlags {
    return useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        store.getServerSnapshot.bind(store)
    );
}

export function useUisgFlag(flag: string): boolean {
    const flags = useUisgFlags();
    return flags.experimental.includes(flag);
}

export function useUisgFlagActions(): {
    setFlags: (flags: Partial<UisgFlags>) => void;
    setExperimentalFlags: (flags: string[]) => void;
    toggleExperimentalFlag: (flag: string) => void;
} {
    return useMemo(
        () => ({
            setFlags: store.setFlags.bind(store),
            setExperimentalFlags: store.setExperimentalFlags.bind(store),
            toggleExperimentalFlag: store.toggleExperimentalFlag.bind(store),
        }),
        []
    );
}

export function getUisgFlags(): UisgFlags {
    return store.getSnapshot();
}

export function setUisgFlags(flags: Partial<UisgFlags>): void {
    store.setFlags(flags);
}

export function resolveFlagsFromContext(
    contextFlags: string[],
    urlFlagsParam?: string
): { enabled: string[]; disabled: string[]; unknown: string[] } {
    const knownFlags = new Set([
        'swipe-actions',
        'haptic-feedback',
        'offline-queue',
        'ai-suggestions',
        'density-compact',
        'density-comfortable',
        'animations-on',
        'animations-off',
        'reduced-motion',
        'high-contrast',
    ]);

    const urlEnabled: string[] = [];
    const urlDisabled: string[] = [];

    if (urlFlagsParam) {
        for (const flag of urlFlagsParam.split(',')) {
            const trimmed = flag.trim();
            if (trimmed.startsWith('-')) {
                urlDisabled.push(trimmed.slice(1));
            } else if (trimmed) {
                urlEnabled.push(trimmed);
            }
        }
    }

    // Start with context flags
    let enabled = [...contextFlags];

    // Apply URL overrides
    for (const flag of urlDisabled) {
        enabled = enabled.filter(f => f !== flag);
    }
    for (const flag of urlEnabled) {
        if (!enabled.includes(flag)) enabled.push(flag);
    }

    // Validate
    const allFlags = [...new Set([...enabled, ...urlEnabled, ...urlDisabled])];
    const unknown = allFlags.filter(f => !knownFlags.has(f));

    return { enabled, disabled: urlDisabled, unknown };
}