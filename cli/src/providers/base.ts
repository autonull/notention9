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
 * Health check result
 */
export interface HealthCheckResult {
    healthy: boolean;
    message?: string;
}

/**
 * Base provider configuration for health checks
 */
export interface ProviderHealthConfig {
    /** Provider types that require API key validation */
    requiresApiKey?: string[];
    /** Provider types that need server reachability check */
    requiresServerCheck?: string[];
    /** Default base URL for server check */
    defaultServerUrl?: string;
    /** Custom health check message prefix */
    healthCheckPrefix?: string;
}

/**
 * Abstract base class for all LLM providers
 */
export abstract class LLMProvider {
    protected config: LLMProviderConfig;
    protected capabilities: ProviderCapabilities;
    protected healthConfig: ProviderHealthConfig;

    constructor(config: LLMProviderConfig, capabilities?: Partial<ProviderCapabilities>, healthConfig?: ProviderHealthConfig) {
        this.config = config;
        this.capabilities = {
            streaming: true,
            functionCalling: true,
            systemMessages: true,
            multiModal: false,
            ...capabilities,
        };
        this.healthConfig = healthConfig ?? {};
    }

    /**
     * Get provider name
     */
    abstract getName(): string;

    /**
     * Get provider capabilities
     */
    getCapabilities(): ProviderCapabilities {
        return this.capabilities;
    }

    /**
     * Check if provider is available and configured correctly
     */
    async healthCheck(): Promise<HealthCheckResult> {
        try {
            // Check API key for providers that require it
            if (this.healthConfig.requiresApiKey?.includes(this.config.provider)) {
                if (!this.config.apiKey) {
                    return {
                        healthy: false,
                        message: `Missing API Key for ${this.config.provider}. Set appropriate environment variable.`
                    };
                }
            }

            // Check server reachability for providers that need it
            if (this.healthConfig.requiresServerCheck?.includes(this.config.provider)) {
                const baseUrl = this.config.baseURL || this.healthConfig.defaultServerUrl || 'http://localhost:11434/v1';
                const checkUrl = baseUrl.endsWith('/v1') ? baseUrl.replace('/v1', '') : baseUrl;
                try {
                    const res = await fetch(checkUrl);
                    if (!res.ok && res.status !== 404) {
                        const modelsRes = await fetch(`${baseUrl}/models`);
                        if (!modelsRes.ok) throw new Error(`Server returned ${modelsRes.status}`);
                    }
                } catch {
                    const prefix = this.healthConfig.healthCheckPrefix || this.config.provider;
                    return { healthy: false, message: `${prefix} not reachable at ${baseUrl}.` };
                }
            }

            return { healthy: true, message: `${this.getName()} ready (${this.config.model})` };
        } catch (e: any) {
            return { healthy: false, message: e.message };
        }
    }

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
     * Get resolved temperature from options or config
     */
    protected getTemperature(options?: GenerateOptions): number {
        return options?.temperature ?? this.config.temperature ?? 0.7;
    }

    /**
     * Get resolved maxTokens from options or config
     */
    protected getMaxTokens(options?: GenerateOptions): number {
        return options?.maxTokens ?? this.config.maxTokens ?? 2000;
    }

    /**
     * Create standard error result
     */
    protected createErrorResult(error: unknown): GenerateResult {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            text: '',
            finishReason: 'error',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * Update provider configuration
     */
    updateConfig(newConfig: Partial<LLMProviderConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.onConfigUpdate(newConfig);
    }

    /**
     * Hook for subclasses to handle config updates
     */
    protected onConfigUpdate(_newConfig: Partial<LLMProviderConfig>): void {
        // Override in subclasses if needed
    }

    /**
     * Get current configuration (sanitized - no API keys)
     */
    getConfig(): Omit<LLMProviderConfig, 'apiKey'> {
        const { apiKey, ...safeConfig } = this.config;
        return safeConfig;
    }
}
