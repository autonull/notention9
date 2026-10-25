import { CoreMessage, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
    LLMProvider,
    LLMProviderConfig,
    GenerateResult,
    GenerateOptions,
    ProviderHealthConfig,
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
        const isOllama = config.provider === 'ollama' ||
            config.baseURL?.includes('11434');
        const isLocal = config.provider === 'local';

        const healthConfig: ProviderHealthConfig = {
            requiresApiKey: ['openai', 'groq', 'together'],
            requiresServerCheck: ['ollama', 'local'],
            defaultServerUrl: 'http://localhost:11434/v1',
            healthCheckPrefix: 'Ollama/Local server',
        };

        super(config, { multiModal: false }, healthConfig);
        this.configureSDK();
    }

    private configureSDK() {
        // Use configured values (with defaults applied by factory)
        const baseURL = this.config.baseURL;
        const apiKey = this.config.apiKey || 'sk-dummy';

        this.sdk = createOpenAI({
            baseURL,
            apiKey,
        });

        this.model = this.sdk(this.config.model);
    }

    getName(): string {
        return this.config.provider || 'openai-compatible';
    }

    async generate(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): Promise<GenerateResult> {
        try {
            const result = await streamText({
                model: this.model,
                messages,
                temperature: this.getTemperature(options),
                maxTokens: this.getMaxTokens(options),
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
            temperature: this.getTemperature(options),
            maxTokens: this.getMaxTokens(options),
        });

        for await (const chunk of result.textStream) {
            yield chunk;
        }
    }

    protected onConfigUpdate(newConfig: Partial<LLMProviderConfig>): void {
        if (newConfig.provider || newConfig.baseURL || newConfig.apiKey || newConfig.model) {
            this.configureSDK();
        }
    }
}
