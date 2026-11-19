import { z } from 'zod';
import type { AppSettings, Template } from '../types/index.js';

/**
 * Zod schema for AppSettings.
 * Used for validation, migration, and potential UI generation.
 */
export const AppSettingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().optional(),
    developerMode: z.boolean().default(false),
    privacyMode: z.string().optional(),
    aiEnabled: z.boolean().default(false),
    automationEnabled: z.boolean().default(false),
    aiProvider: z.string().optional(),
    aiModel: z.string().optional(),
    googleGeminiApiKey: z.string().optional(),
    aiRemoteConsent: z.boolean().default(false),
    aiPiiRedactionEnabled: z.boolean().default(true),
    aiPiiOverrideEnabled: z.boolean().default(false),
    capabilities: z.object({
        browser: z.boolean().optional(),
        files: z.boolean().optional(),
    }).optional(),
    user: z.object({
        name: z.string().optional(),
    }).optional(),
    nostr: z.object({
        privkey: z.string().nullable().optional(),
        relays: z.array(z.string()).default([]),
        publishEnabled: z.boolean().optional(),
    }),
    meshtastic: z.object({
        enabled: z.boolean().optional(),
        connectionType: z.enum(['webserial', 'http', 'server-proxy']).optional(),
        port: z.string().optional(),
        saveReceivedNotes: z.boolean().optional(),
        publishEnabled: z.boolean().optional(),
    }).optional(),
    ontology: z.array(z.unknown()).optional(),
    customTemplates: z.array(z.unknown()).optional(), // Template[] but loose for migration
    accessibility: z.object({
        reducedMotion: z.boolean().optional(),
        highContrast: z.boolean().optional(),
    }).optional(),
    matchDigest: z.object({
        enabled: z.boolean(),
        frequency: z.enum(['daily', 'on-demand', 'disabled']),
        quietHoursStart: z.number().int().min(0).max(23),
        quietHoursEnd: z.number().int().min(0).max(23),
        minMatchScore: z.number().min(0).max(1),
        includePendingActions: z.boolean(),
        includeAcceptedMatches: z.boolean(),
        includeDismissedMatches: z.boolean(),
        includeCompletedActions: z.boolean(),
    }).optional(),
    autoBackup: z.object({
        enabled: z.boolean(),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']),
        encrypt: z.boolean(),
        passphrase: z.string().optional(),
        rotationCount: z.number().int().positive(),
        lastBackupAt: z.string().optional(),
        nextBackupAt: z.string().optional(),
    }).optional(),
    customCrossKeyMappings: z.record(z.array(z.string())).optional(),
    sync: z.object({
        wifiOnly: z.boolean().optional(),
        maxPayloadBytes: z.number().int().positive().optional(),
        batchEnabled: z.boolean().optional(),
        batchWindowMs: z.number().int().positive().optional(),
        intervalMinutes: z.number().int().nonnegative().optional(),
        compress: z.boolean().optional(),
        trackMetrics: z.boolean().optional(),
        lastSyncAt: z.number().optional(),
        lastPayloadBytes: z.number().optional(),
        totalBytesSynced: z.number().optional(),
        totalNotesSynced: z.number().optional(),
    }).optional(),
});

/** Inferred TypeScript type from the schema (should match AppSettings) */
export type AppSettingsFromSchema = z.infer<typeof AppSettingsSchema>;

/**
 * Default settings matching the schema defaults and UI defaults.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'system',
    developerMode: false,
    aiEnabled: false,
    automationEnabled: false,
    aiRemoteConsent: false,
    aiPiiRedactionEnabled: true,
    aiPiiOverrideEnabled: false,
    nostr: {
        privkey: null,
        relays: [],
        publishEnabled: false,
    },
    ontology: [],
    customTemplates: [],
    matchDigest: {
        enabled: false,
        frequency: 'disabled',
        quietHoursStart: 22,
        quietHoursEnd: 8,
        minMatchScore: 0.6,
        includePendingActions: true,
        includeAcceptedMatches: false,
        includeDismissedMatches: false,
        includeCompletedActions: false,
    },
    autoBackup: {
        enabled: false,
        frequency: 'disabled',
        encrypt: true,
        rotationCount: 7,
    },
    customCrossKeyMappings: {},
    sync: {
        wifiOnly: false,
        maxPayloadBytes: 100 * 1024, // 100 KB
        batchEnabled: true,
        batchWindowMs: 5000,
        intervalMinutes: 0,
        compress: true,
        trackMetrics: true,
    },
};

/**
 * Validate and normalize settings using the Zod schema.
 * Returns validated settings with defaults applied.
 */
export function validateSettings(input: unknown): AppSettings {
    const parsed = AppSettingsSchema.safeParse(input);
    if (parsed.success) {
        return { ...DEFAULT_APP_SETTINGS, ...parsed.data } as AppSettings;
    }

    // Log validation errors for debugging
    console.warn('[Settings] Validation failed, using defaults:', parsed.error.flatten());

    // Return defaults with any valid partial data merged
    const partial = parsed.error.flatten().formErrors.length === 0
        ? (input as Partial<AppSettings>)
        : {};
    return { ...DEFAULT_APP_SETTINGS, ...partial } as AppSettings;
}

/**
 * Validate settings strictly, throwing on failure.
 * Use for migration or critical paths where invalid settings must be caught.
 */
export function validateSettingsStrict(input: unknown): AppSettings {
    return AppSettingsSchema.parse(input) as AppSettings;
}

/**
 * Get the default value for a settings key from the schema.
 * Uses DEFAULT_APP_SETTINGS as the source of truth for defaults.
 */
export function getDefaultValue<K extends keyof AppSettings>(key: K): AppSettings[K] | undefined {
    return DEFAULT_APP_SETTINGS[key];
}

/**
 * Check if a settings object has any unknown keys (keys not in the schema).
 * Useful for detecting stale/migrated settings.
 */
export function getUnknownKeys(settings: Record<string, unknown>): string[] {
    const knownKeys = new Set(Object.keys(AppSettingsSchema.shape));
    return Object.keys(settings).filter(k => !knownKeys.has(k));
}

/**
 * Migrate settings from an older version to the current schema.
 * This is a placeholder for future schema version migrations.
 */
export function migrateSettings(settings: Record<string, unknown>, _fromVersion: number): AppSettings {
    // Remove unknown keys
    const knownKeys = new Set(Object.keys(AppSettingsSchema.shape));
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
        if (knownKeys.has(key)) {
            filtered[key] = value;
        }
    }

    // Apply schema validation with defaults
    return validateSettings(filtered);
}