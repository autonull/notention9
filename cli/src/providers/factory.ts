import { LLMProvider, LLMProviderConfig } from './base.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { TransformersProvider } from './transformers.js';
import { log } from '../utils.js';

type ProviderConstructor = new (config: LLMProviderConfig) => LLMProvider;

interface ProviderMetadata {
    name: string;
    description: string;
    constructor: ProviderConstructor;
}

const PROVIDER_REGISTRY: Record<string, ProviderMetadata> = {
    openai: { name: 'openai', description: 'OpenAI API (GPT-4, GPT-3.5, etc.)', constructor: OpenAICompatibleProvider },
    ollama: { name: 'ollama', description: 'Ollama local models (Llama, Mistral, etc.)', constructor: OpenAICompatibleProvider },
    local: { name: 'local', description: 'Local LLM server (OpenAI-compatible)', constructor: OpenAICompatibleProvider },
    groq: { name: 'groq', description: 'Groq API (fast inference)', constructor: OpenAICompatibleProvider },
    together: { name: 'together', description: 'Together AI API', constructor: OpenAICompatibleProvider },
    transformers: { name: 'transformers', description: 'Transformers.js (browser-compatible models)', constructor: TransformersProvider },
};

const PROVIDER_ALIASES: Record<string, string> = {
    'openai-compatible': 'openai',
    'llama': 'ollama',
    'transformers.js': 'transformers',
    'hf': 'transformers',
    'huggingface': 'transformers',
};

function normalizeProviderName(provider: string): string {
    const normalized = provider.toLowerCase().trim();
    return PROVIDER_ALIASES[normalized] || normalized;
}

export class ProviderFactory {
    static create(config: LLMProviderConfig): LLMProvider {
        const providerType = normalizeProviderName(config.provider);
        const metadata = PROVIDER_REGISTRY[providerType];

        if (metadata) {
            return new metadata.constructor(config);
        }

        log.warn(`Unknown provider '${config.provider}', treating as OpenAI-compatible`);
        return new OpenAICompatibleProvider(config);
    }

    static getSupportedProviders(): string[] {
        return Object.keys(PROVIDER_REGISTRY);
    }

    static getProviderDescription(provider: string): string {
        const normalized = normalizeProviderName(provider);
        return PROVIDER_REGISTRY[normalized]?.description || 'OpenAI-compatible API';
    }

    static registerProvider(name: string, description: string, constructor: ProviderConstructor): void {
        PROVIDER_REGISTRY[name.toLowerCase()] = { name: name.toLowerCase(), description, constructor };
    }

    static getAllProviders(): ProviderMetadata[] {
        return Object.values(PROVIDER_REGISTRY);
    }
}