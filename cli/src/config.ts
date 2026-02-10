// Legacy config file - keeping for compatibility but replaced by config-manager.ts
// This file can be removed after verifying the new system works properly

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { LLMProviderConfig } from './providers/base.js';

/**
 * Schema for simple, flat configuration file
 */
const ConfigFileSchema = z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    baseURL: z.string().optional(),
    apiKey: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional()
}).passthrough();

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/**
 * Load configuration with strict priority:
 * 1. CLI Arguments (overrides)
 * 2. Environment Variables
 * 3. Config File (simple or complex)
 * 4. Defaults
 */
export function loadConfig(overrides?: Partial<LLMProviderConfig>): LLMProviderConfig {
    const configFile = loadConfigFile();

    // 1. Determine Provider
    const provider = overrides?.provider ||
        process.env.LLM_PROVIDER ||
        configFile.provider || // Flat config
        configFile.defaultProvider || // Legacy complex config
        'ollama';

    // 2. Get provider-specific settings from config file (if legacy complex format)
    const legacyProviderConfig = configFile.providers?.[provider] || {};

    // 3. Helper to get value from priority sources
    const getVal = <T>(key: keyof LLMProviderConfig, envVar: string, defaultVal: T): T => {
        // Explicit override? (CLI Arg)
        if (overrides?.[key] !== undefined) return overrides[key] as T;

        // Environment variable?
        if (process.env[envVar]) {
            if (typeof defaultVal === 'number') return Number(process.env[envVar]) as T;
            return process.env[envVar] as T;
        }

        // Logic check: Can we use the flat config file values?
        // Only if the provider in the file matches the active provider,
        // OR if we are looking for non-provider-specific settings (though most are specific).
        const configProviderMatches = configFile.provider === provider;

        // Legacy complex config file? (Highest file priority if strictly typed)
        if ((legacyProviderConfig as any)[key] !== undefined) return (legacyProviderConfig as any)[key] as T;

        // Flat config file?
        // Only use 'model', 'baseURL', 'apiKey' from flat config if the provider matches.
        // Otherwise we risk using an Ollama model for Transformers provider.
        if (configProviderMatches && (configFile as any)[key] !== undefined) {
            return (configFile as any)[key] as T;
        }

        // Default
        return defaultVal;
    };

    return {
        provider,
        model: getVal('model', 'LLM_MODEL', getDefaultModel(provider)),
        baseURL: getVal('baseURL', 'LLM_BASE_URL', undefined),
        apiKey: resolveApiKey(getVal('apiKey', 'LLM_API_KEY', undefined)),
        temperature: getVal('temperature', 'LLM_TEMPERATURE', 0.7),
        maxTokens: getVal('maxTokens', 'LLM_MAX_TOKENS', 2000),
        // Spread any other properties from flat config
        ...configFile,
        ...legacyProviderConfig,
        ...overrides,
    };
}

/**
 * Load configuration from config.json file
 */
// Helper type for migration support
interface AnyConfigFile {
    provider?: string;
    description?: string;
    defaultProvider?: string;
    providers?: Record<string, any>;
    [key: string]: any;
}

function loadConfigFile(): AnyConfigFile {
    const configPaths = [
        path.join(process.cwd(), 'cli', 'config.json'),
        path.join(process.cwd(), 'config.json'),
    ];

    for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
            try {
                const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                return rawConfig; // Return raw, we handle validation validation in logic
            } catch (error: any) {
                console.warn(`\n⚠ Config file error at ${configPath}`);
                console.warn(`  Ignoring and using defaults. Error: ${error.message}\n`);
            }
        }
    }
    return {};
}

/**
 * Resolve API key, supporting env: prefix
 */
function resolveApiKey(key?: string): string | undefined {
    if (!key) return undefined;

    if (key.startsWith('env:')) {
        const envVar = key.slice(4);
        return process.env[envVar];
    }

    return key;
}

/**
 * Get default model for a provider
 */
function getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
        openai: 'gpt-4o',
        ollama: 'llama3.2',
        // Use ONNX Community models - they're public and don't need auth
        transformers: 'onnx-community/Qwen2.5-0.5B-Instruct',
        local: 'local-model',
    };

    return defaults[provider] || 'gpt-4o';
}

/**
 * Validate configuration and provide helpful error messages
 */
export function validateConfig(config: LLMProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.model) {
        errors.push('Model name is required');
    }

    // Provider-specific validation
    if (config.provider === 'openai' && !config.apiKey) {
        if (!config.baseURL?.includes('localhost')) {
            errors.push('OpenAI API key is required (set LLM_API_KEY or OPENAI_API_KEY)');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
