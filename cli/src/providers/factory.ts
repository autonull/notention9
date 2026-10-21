import { LLMProvider, LLMProviderConfig } from './base.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { TransformersProvider } from './transformers.js';
import { log } from '../utils.js';

/**
 * Provider constructor type
 */
type ProviderConstructor = new (config: LLMProviderConfig) => LLMProvider;

/**
 * Provider metadata
 */
interface ProviderMetadata {
    name: string;
    description: string;
    constructor: ProviderConstructor;
}

/**
 * Provider Registry - manages provider registration and instantiation
 */
class ProviderRegistry {
    private providers = new Map<string, ProviderMetadata>();

    register(name: string, metadata: ProviderMetadata): void {
        this.providers.set(name.toLowerCase(), metadata);
    }

    get(name: string): ProviderMetadata | undefined {
        return this.providers.get(name.toLowerCase());
    }

    has(name: string): boolean {
        return this.providers.has(name.toLowerCase());
    }

    getAll(): ProviderMetadata[] {
        return Array.from(this.providers.values());
    }

    getNames(): string[] {
        return Array.from(this.providers.keys());
    }
}

const providerRegistry = new ProviderRegistry();

// Provider aliases for common alternative names
const providerAliases: Record<string, string> = {
    'openai-compatible': 'openai',
    'llama': 'ollama',
    'transformers.js': 'transformers',
    'hf': 'transformers',
    'huggingface': 'transformers',
};

/**
 * Register a built-in provider
 */
function registerBuiltin(name: string, description: string, constructor: ProviderConstructor): void {
    providerRegistry.register(name, { name, description, constructor });
}

// Register built-in providers
registerBuiltin('openai', 'OpenAI API (GPT-4, GPT-3.5, etc.)', OpenAICompatibleProvider);
registerBuiltin('ollama', 'Ollama local models (Llama, Mistral, etc.)', OpenAICompatibleProvider);
registerBuiltin('local', 'Local LLM server (OpenAI-compatible)', OpenAICompatibleProvider);
registerBuiltin('groq', 'Groq API (fast inference)', OpenAICompatibleProvider);
registerBuiltin('together', 'Together AI API', OpenAICompatibleProvider);
registerBuiltin('transformers', 'Transformers.js (browser-compatible models)', TransformersProvider);

/**
 * Normalize provider name to canonical form using aliases
 */
function normalizeProviderName(provider: string): string {
    const normalized = provider.toLowerCase().trim();
    return providerAliases[normalized] || normalized;
}

/**
 * Provider Factory - creates the appropriate provider instance
 * based on configuration using the registry
 */
export class ProviderFactory {
    /**
     * Create a provider instance from configuration
     */
    static create(config: LLMProviderConfig): LLMProvider {
        const providerType = normalizeProviderName(config.provider);
        const metadata = providerRegistry.get(providerType);

        if (metadata) {
            return new metadata.constructor(config);
        }

        log.warn(`Unknown provider '${config.provider}', treating as OpenAI-compatible`);
        return new OpenAICompatibleProvider(config);
    }

    /**
     * List supported provider types
     */
    static getSupportedProviders(): string[] {
        return providerRegistry.getNames();
    }

    /**
     * Get provider description
     */
    static getProviderDescription(provider: string): string {
        const normalized = normalizeProviderName(provider);
        const metadata = providerRegistry.get(normalized);
        return metadata?.description || 'OpenAI-compatible API';
    }

    /**
     * Register a custom provider (for extensions)
     */
    static registerProvider(name: string, description: string, constructor: ProviderConstructor): void {
        providerRegistry.register(name.toLowerCase(), { name: name.toLowerCase(), description, constructor });
    }

    /**
     * Get all registered providers with metadata
     */
    static getAllProviders(): ProviderMetadata[] {
        return providerRegistry.getAll();
    }
}