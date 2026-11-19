import { REQUEST_TO_OFFER_KEY_MAP } from './MatchEngine.js';
import type { AppSettings } from '../types/ui.js';

/**
 * Merge built-in REQUEST_TO_OFFER_KEY_MAP with user-defined custom mappings.
 * User mappings take precedence (override) for the same key.
 */
export function getEffectiveCrossKeyMap(settings?: Partial<AppSettings>): Record<string, string[]> {
    const custom = settings?.customCrossKeyMappings ?? {};
    return { ...REQUEST_TO_OFFER_KEY_MAP, ...custom };
}

/**
 * Add or update a custom cross-key mapping.
 * Returns the updated mappings object.
 */
export function setCustomCrossKeyMapping(
    currentSettings: AppSettings,
    requestKey: string,
    offerKeys: string[]
): AppSettings {
    const currentCustom = currentSettings.customCrossKeyMappings ?? {};
    return {
        ...currentSettings,
        customCrossKeyMappings: {
            ...currentCustom,
            [requestKey]: offerKeys,
        },
    };
}

/**
 * Remove a custom cross-key mapping.
 */
export function removeCustomCrossKeyMapping(
    currentSettings: AppSettings,
    requestKey: string
): AppSettings {
    const currentCustom = currentSettings.customCrossKeyMappings ?? {};
    if (!currentCustom[requestKey]) return currentSettings;

    const { [requestKey]: _, ...rest } = currentCustom;
    return {
        ...currentSettings,
        customCrossKeyMappings: rest,
    };
}

/**
 * Get all custom cross-key mappings.
 */
export function getCustomCrossKeyMappings(settings?: Partial<AppSettings>): Record<string, string[]> {
    return settings?.customCrossKeyMappings ?? {};
}