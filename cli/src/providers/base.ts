import { CoreMessage } from 'ai';

/**
 * Common configuration for all LLM providers
 */
export interface LLMProviderConfig {
    provider: string;
    model: string;
    baseURL?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any; // Allow provider-specific config
}

/**
 * Capabilities that a provider may support
 */
export interface ProviderCapabilities {
    streaming: boolean;
    functionCalling: boolean;
    systemMessages: boolean;
    multiModal: boolean;
}

/**
 * Result from text generation
 */
export interface GenerateResult {
    text: string;
    finishReason?: 'stop' | 'length' | 'error';
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Options for generation requests
 */
export interface GenerateOptions {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    stopSequences?: string[];
}

/**
 * Abstract base class for all LLM providers
 */
export abstract class LLMProvider {
    protected config: LLMProviderConfig;

    constructor(config: LLMProviderConfig) {
        this.config = config;
    }

    /**
     * Get provider name
     */
    abstract getName(): string;

    /**
     * Get provider capabilities
     */
    abstract getCapabilities(): ProviderCapabilities;

    /**
     * Check if provider is available and configured correctly
     */
    abstract healthCheck(): Promise<{ healthy: boolean; message?: string }>;

    /**
     * Generate text from messages (non-streaming)
     */
    abstract generate(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): Promise<GenerateResult>;

    /**
     * Generate text with streaming
     */
    abstract generateStream(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): AsyncGenerator<string, void, unknown>;

    /**
     * Update provider configuration
     */
    updateConfig(newConfig: Partial<LLMProviderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get current configuration (sanitized - no API keys)
     */
    getConfig(): Omit<LLMProviderConfig, 'apiKey'> {
        const { apiKey, ...safeConfig } = this.config;
        return safeConfig;
    }
}
