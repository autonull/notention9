import { LLMProvider, LLMProviderConfig } from './base.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { TransformersProvider } from './transformers.js';
import { log } from '../utils.js';

type ProviderConstructor = new (config: LLMProviderConfig) => LLMProvider;

interface ProviderMetadata {
    name: string;
    description: string;
    constructor: ProviderConstructor;
    defaultBaseURL?: string;
    defaultApiKey?: string;
    defaultModel?: string;
    setupQuestions?: any[];
}

const PROVIDER_REGISTRY: Record<string, ProviderMetadata> = {
    openai: {
        name: 'openai',
        description: 'OpenAI API (GPT-4, GPT-3.5, etc.)',
        constructor: OpenAICompatibleProvider,
        defaultModel: 'gpt-4o',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter OpenAI model (e.g., gpt-4o):', default: 'gpt-4o' },
            { type: 'input', name: 'apiKey', message: 'Enter OpenAI API key:', mask: '*' }
        ]
    },
    ollama: {
        name: 'ollama',
        description: 'Ollama local models (Llama, Mistral, etc.)',
        constructor: OpenAICompatibleProvider,
        defaultBaseURL: 'http://localhost:11434/v1',
        defaultApiKey: 'ollama',
        defaultModel: 'llama3.2',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter Ollama model (e.g., llama3.2):', default: 'llama3.2' },
            { type: 'input', name: 'baseURL', message: 'Enter Ollama base URL:', default: 'http://localhost:11434/v1' }
        ]
    },
    local: {
        name: 'local',
        description: 'Local LLM server (OpenAI-compatible)',
        constructor: OpenAICompatibleProvider,
        defaultBaseURL: 'http://localhost:11434/v1',
        defaultApiKey: 'local',
        defaultModel: 'local-model',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter local model name:', default: 'local-model' },
            { type: 'input', name: 'baseURL', message: 'Enter local server base URL:', default: 'http://localhost:3000/v1' },
            { type: 'input', name: 'apiKey', message: 'Enter API key (if required):', mask: '*' }
        ]
    },
    groq: {
        name: 'groq',
        description: 'Groq API (fast inference)',
        constructor: OpenAICompatibleProvider,
        defaultBaseURL: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.1-70b-versatile',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter Groq model:', default: 'llama-3.1-70b-versatile' },
            { type: 'input', name: 'apiKey', message: 'Enter Groq API key:', mask: '*' }
        ]
    },
    together: {
        name: 'together',
        description: 'Together AI API',
        constructor: OpenAICompatibleProvider,
        defaultBaseURL: 'https://api.together.xyz/v1',
        defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter Together AI model:', default: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
            { type: 'input', name: 'apiKey', message: 'Enter Together AI API key:', mask: '*' }
        ]
    },
    transformers: {
        name: 'transformers',
        description: 'Transformers.js (browser-compatible models)',
        constructor: TransformersProvider,
        defaultModel: 'Xenova/Qwen1.5-0.5B-Chat',
        setupQuestions: [
            { type: 'input', name: 'model', message: 'Enter Transformers.js model (e.g., onnx-community/Qwen2.5-0.5B-Instruct):', default: 'onnx-community/Qwen2.5-0.5B-Instruct' }
        ]
    },
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

function applyProviderDefaults(config: LLMProviderConfig, metadata: ProviderMetadata): LLMProviderConfig {
    return {
        ...config,
        baseURL: config.baseURL ?? metadata.defaultBaseURL,
        apiKey: config.apiKey ?? metadata.defaultApiKey,
        model: config.model ?? metadata.defaultModel,
    };
}

export class ProviderFactory {
    static create(config: LLMProviderConfig): LLMProvider {
        const providerType = normalizeProviderName(config.provider);
        const metadata = PROVIDER_REGISTRY[providerType];

        if (metadata) {
            const finalConfig = applyProviderDefaults(config, metadata);
            return new metadata.constructor(finalConfig);
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

    static getProviderMetadata(provider: string): ProviderMetadata | undefined {
        const normalized = normalizeProviderName(provider);
        return PROVIDER_REGISTRY[normalized];
    }

    static getDefaultModel(provider: string): string {
        const normalized = normalizeProviderName(provider);
        return PROVIDER_REGISTRY[normalized]?.defaultModel || 'gpt-4o';
    }

    static getSetupQuestions(provider: string): any[] {
        const normalized = normalizeProviderName(provider);
        return PROVIDER_REGISTRY[normalized]?.setupQuestions || [];
    }

    static registerProvider(name: string, description: string, constructor: ProviderConstructor, defaults?: { baseURL?: string; apiKey?: string; model?: string; setupQuestions?: any[] }): void {
        PROVIDER_REGISTRY[name.toLowerCase()] = { name: name.toLowerCase(), description, constructor, ...defaults };
    }

    static getAllProviders(): ProviderMetadata[] {
        return Object.values(PROVIDER_REGISTRY);
    }
}