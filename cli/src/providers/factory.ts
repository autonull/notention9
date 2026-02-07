import { LLMProvider, LLMProviderConfig } from './base.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { TransformersProvider } from './transformers.js';
import { log } from '../utils.js';

/**
 * Provider factory - creates the appropriate provider instance
 * based on configuration
 */
export class ProviderFactory {
    /**
     * Create a provider instance from configuration
     */
    static create(config: LLMProviderConfig): LLMProvider {
        const providerType = this.normalizeProviderName(config.provider);

        switch (providerType) {
            case 'openai':
            case 'ollama':
            case 'local':
            case 'groq':
            case 'together':
                return new OpenAICompatibleProvider(config);

            case 'transformers':
                return new TransformersProvider(config);

            default:
                log.warn(`Unknown provider '${config.provider}', treating as OpenAI-compatible`);
                return new OpenAICompatibleProvider(config);
        }
    }

    /**
     * Normalize provider name to canonical form
     */
    private static normalizeProviderName(provider: string): string {
        const normalized = provider.toLowerCase().trim();

        // Handle aliases
        const aliases: Record<string, string> = {
            'openai-compatible': 'openai',
            'llama': 'ollama',
            'transformers.js': 'transformers',
            'hf': 'transformers',
            'huggingface': 'transformers',
        };

        return aliases[normalized] || normalized;
    }

    /**
     * List supported provider types
     */
    static getSupportedProviders(): string[] {
        return ['openai', 'ollama', 'local', 'transformers', 'groq', 'together'];
    }

    /**
     * Get provider description
     */
    static getProviderDescription(provider: string): string {
        const descriptions: Record<string, string> = {
            openai: 'OpenAI API (GPT-4, GPT-3.5, etc.)',
            ollama: 'Ollama local models (Llama, Mistral, etc.)',
            local: 'Local LLM server (OpenAI-compatible)',
            transformers: 'Transformers.js (browser-compatible models)',
            groq: 'Groq API (fast inference)',
            together: 'Together AI API',
        };

        return descriptions[provider] || 'OpenAI-compatible API';
    }
}
