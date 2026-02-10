import { CoreMessage, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
    LLMProvider,
    LLMProviderConfig,
    ProviderCapabilities,
    GenerateResult,
    GenerateOptions,
} from './base.js';

/**
 * OpenAI-compatible provider supporting:
 * - OpenAI API
 * - Ollama (with v1 endpoint)
 * - Local LLM servers (using OpenAI-compatible endpoints)
 * - Other OpenAI-compatible APIs (Groq, Together, etc.)
 */
export class OpenAICompatibleProvider extends LLMProvider {
    private sdk!: ReturnType<typeof createOpenAI>;
    private model!: any;

    constructor(config: LLMProviderConfig) {
        super(config);
        this.configureSDK();
    }

    private configureSDK() {
        // Special handling for known provider types
        const isOllama = this.config.provider === 'ollama' ||
            this.config.baseURL?.includes('11434');

        // Auto-configure Ollama defaults
        if (isOllama && !this.config.baseURL) {
            this.config.baseURL = 'http://localhost:11434/v1';
        }

        // Auto-configure API key for local providers
        const apiKey = this.config.apiKey ||
            (isOllama ? 'ollama' : 'sk-dummy');

        this.sdk = createOpenAI({
            baseURL: this.config.baseURL,
            apiKey,
        });

        this.model = this.sdk(this.config.model);
    }

    getName(): string {
        return this.config.provider || 'openai-compatible';
    }

    getCapabilities(): ProviderCapabilities {
        return {
            streaming: true,
            functionCalling: true,
            systemMessages: true,
            multiModal: false, // Could be true for OpenAI/GPT-4V
        };
    }

    async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
        try {
            // Check API key for OpenAI
            if (this.config.provider === 'openai' && !this.config.apiKey) {
                return {
                    healthy: false,
                    message: 'Missing API Key. Set LLM_API_KEY or OPENAI_API_KEY environment variable.'
                };
            }

            // For Ollama/Local, check if server is reachable
            if (this.config.provider === 'ollama' || this.config.provider === 'local') {
                try {
                    const baseUrl = this.config.baseURL || 'http://localhost:11434/v1';
                    // Strip /v1 for health check if possible, or just try models endpoint
                    const checkUrl = baseUrl.endsWith('/v1') ? baseUrl.replace('/v1', '') : baseUrl;
                    const res = await fetch(checkUrl);
                    if (!res.ok && res.status !== 404) { // 404 might just mean root not found but server up
                        // Try models endpoint as backup
                        const modelsRes = await fetch(`${baseUrl}/models`);
                        if (!modelsRes.ok) throw new Error(`Server returned ${modelsRes.status}`);
                    }
                } catch (e: any) {
                    const isOllama = this.config.provider === 'ollama';
                    const msg = isOllama
                        ? `Ollama not reachable at ${this.config.baseURL}. Run 'ollama serve'.`
                        : `Local server not reachable at ${this.config.baseURL}. Run 'npm run cli:local'.`;
                    return { healthy: false, message: msg };
                }
            }

            // Basic generation check (optional, implies cost for OpenAI)
            // For now, just assume config is valid if we passed above checks
            return { healthy: true, message: `${this.getName()} ready (${this.config.model})` };
        } catch (e: any) {
            return { healthy: false, message: e.message };
        }
    }

    async generate(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): Promise<GenerateResult> {
        try {
            const result = await streamText({
                model: this.model,
                messages,
                temperature: options?.temperature ?? this.config.temperature,
                maxTokens: options?.maxTokens ?? this.config.maxTokens,
            });

            let fullText = '';
            for await (const chunk of result.textStream) {
                fullText += chunk;
            }

            return {
                text: fullText,
                finishReason: 'stop',
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                },
            };
        } catch (error) {
            throw new Error(
                `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async *generateStream(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): AsyncGenerator<string, void, unknown> {
        const result = await streamText({
            model: this.model,
            messages,
            temperature: options?.temperature ?? this.config.temperature,
            maxTokens: options?.maxTokens ?? this.config.maxTokens,
        });

        for await (const chunk of result.textStream) {
            yield chunk;
        }
    }

    updateConfig(newConfig: Partial<LLMProviderConfig>): void {
        super.updateConfig(newConfig);
        this.configureSDK();
    }
}
