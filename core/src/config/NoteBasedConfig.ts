import { Note, AppSettings, Property } from '../types/index.js';

/**
 * Extracts configuration from a Note's semantic properties.
 * 
 * Maps:
 * [privacy:level:local-only] -> privacyMode: 'local-only'
 * [capability:browser:true] -> capabilities.browser: true
 * [capability:files:true] -> capabilities.files: true
 * [user:name:Alice] -> user.name: 'Alice'
 * [ai:enabled:true] -> aiEnabled: true
 * [ai:provider:webllm] -> aiProvider: 'webllm'
 */
export function parseConfigFromNote(note: Note): Partial<AppSettings> {
    const config: Partial<AppSettings> = {
        capabilities: { browser: false, files: false },
        user: {}
    };

    // Helper to get value
    const getVal = (key: string): string | undefined => {
        const prop = note.properties.find(p => p.key === key);
        return prop?.values[0];
    };

    // Privacy
    const privacyLevel = getVal('privacy:level');
    if (privacyLevel === 'local-only' || privacyLevel === 'shared') {
        config.privacyMode = privacyLevel;
    }

    // Capabilities
    const browserCap = getVal('capability:browser');
    if (browserCap === 'true') {
        config.capabilities = { ...config.capabilities, browser: true };
    }

    const filesCap = getVal('capability:files');
    if (filesCap === 'true') {
        config.capabilities = { ...config.capabilities, files: true };
    }

    // User
    const userName = getVal('user:name');
    if (userName) config.user = { name: userName };

    // AI Settings
    const aiEnabled = getVal('ai:enabled');
    if (aiEnabled === 'true') config.aiEnabled = true;
    if (aiEnabled === 'false') config.aiEnabled = false;

    const aiProvider = getVal('ai:provider');
    if (aiProvider === 'remote' || aiProvider === 'webllm') {
        config.aiProvider = aiProvider;
    }

    // Clean up empty objects if any
    if (!config.user?.name) delete config.user;
    // We keep capabilities object even if false, or maybe partial merge logic handles it?
    // Let's ensure strict partial returns

    return config;
}

/**
 * Merges a partial config into a base config.
 * Performs deep merge for capabilities and user objects.
 */
export function mergeConfigs(base: AppSettings, overrides: Partial<AppSettings>): AppSettings {
    const next = { ...base };

    if (overrides.privacyMode) next.privacyMode = overrides.privacyMode;
    if (overrides.aiEnabled !== undefined) next.aiEnabled = overrides.aiEnabled;
    if (overrides.aiProvider) next.aiProvider = overrides.aiProvider;

    if (overrides.capabilities) {
        next.capabilities = {
            ...base.capabilities,
            ...overrides.capabilities
        };

        // Ensure defaults if base was empty
        if (!next.capabilities) {
            const caps = overrides.capabilities;
            next.capabilities = {
                browser: caps.browser ?? false,
                files: caps.files ?? false
            };
        }
    }

    if (overrides.user) {
        next.user = { ...base.user, ...overrides.user };
    }

    return next;
}
