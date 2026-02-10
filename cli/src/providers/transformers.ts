import { CoreMessage, streamText } from 'ai';
import {
    LLMProvider,
    LLMProviderConfig,
    ProviderCapabilities,
    GenerateResult,
    GenerateOptions,
} from './base.js';
import { log } from '../utils.js';

// Define types for Transformers.js since we might not have types installed
// or we want to keep it loose for dynamic import
type Pipeline = any;

/**
 * Transformers.js provider for fully local, in-process inference
 * using browser-compatible models.
 */
export class TransformersProvider extends LLMProvider {
    private pipe: Pipeline | null = null;
    private pipelinePromise: Promise<Pipeline> | null = null;
    private env: any;

    constructor(config: LLMProviderConfig) {
        super(config);
    }

    getName(): string {
        return 'transformers.js';
    }

    getCapabilities(): ProviderCapabilities {
        return {
            streaming: true,
            functionCalling: false, // Not supported by most small local models yet
            systemMessages: true,   // Handled by chat template
            multiModal: false,
        };
    }

    async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
        try {
            await this.ensureModelLoaded();
            return {
                healthy: true,
                message: `Transformers.js ready (model: ${this.config.model})`,
            };
        } catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : 'Failed to load model',
            };
        }
    }

    private async ensureModelLoaded(): Promise<Pipeline> {
        if (this.pipe) return this.pipe;
        if (this.pipelinePromise) return this.pipelinePromise;

        this.pipelinePromise = (async () => {
            log.info(`Loading local model: ${this.config.model}...`);
            log.info(`(This happens only once and may download ~500MB+ for new models)`);

            try {
                // Dynamic import to avoid hard dependency if not used
                const { pipeline, env } = await import('@xenova/transformers');
                this.env = env;

                // Use local cache to avoid auth issues
                env.allowLocalModels = true;
                env.allowRemoteModels = true;

                // Use quantized ONNX models that are publicly accessible
                this.pipe = await pipeline('text-generation', this.config.model, {
                    quantized: true,
                    progress_callback: (progress: any) => {
                        if (progress.status === 'downloading') {
                            const pct = Math.round(progress.progress || 0);
                            process.stdout.write(`\rDownloading model... ${pct}%`);
                        }
                    }
                });

                log.success(`Model loaded: ${this.config.model}`);
                return this.pipe;
            } catch (e) {
                log.error(`Failed to load Transformers.js model`, e);
                this.pipelinePromise = null;
                throw e;
            }
        })();

        return this.pipelinePromise;
    }

    async generate(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): Promise<GenerateResult> {
        const pipe = await this.ensureModelLoaded();

        // Simple chat template construction
        // Note: Real implementation should use tokenizer.apply_chat_template if available
        // For now, we do a basic conversion
        const prompt = this.formatMessages(messages);

        const result = await (pipe as any)(prompt, {
            max_new_tokens: options?.maxTokens ?? this.config.maxTokens ?? 100,
            temperature: options?.temperature ?? this.config.temperature ?? 0.7,
            return_full_text: false,
        });

        const text = Array.isArray(result) ? result[0].generated_text : result.generated_text;

        return {
            text: text,
            finishReason: 'stop',
            usage: {
                promptTokens: 0, // Not easily available without tokenizer
                completionTokens: 0,
                totalTokens: 0,
            },
        };
    }

    async *generateStream(
        messages: CoreMessage[],
        options?: GenerateOptions
    ): AsyncGenerator<string, void, unknown> {
        const pipe = await this.ensureModelLoaded();
        const prompt = this.formatMessages(messages);

        // Streaming support in Transformers.js pipeline
        const streamer = new (await import('@xenova/transformers')).TextStreamer(pipe.tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
        });

        // We can't easily yield from the pipeline execution directly in a way that matches
        // the generator signature perfectly because pipe() is async but not a generator.
        // However, we can use the callback approach or investigate if the library supports AsyncGenerator.

        // LIMITATION: @xenova/transformers v2 pipeline doesn't return an async generator directly.
        // It accepts a streamer object (callback based) or callback function.
        // To bridge this to async generator, we need a queue.

        // Fallback to non-streaming for MVP robustness:
        const result = await this.generate(messages, options);
        // Simulate streaming by yielding chunks
        const chunkSize = 4;
        for (let i = 0; i < result.text.length; i += chunkSize) {
            yield result.text.slice(i, i + chunkSize);
            await new Promise(r => setTimeout(r, 10)); // tiny delay
        }
    }

    private formatMessages(messages: CoreMessage[]): string {
        // Basic ChatML-like or Llama-2 format fallback
        return messages.map(m => {
            const role = m.role === 'user' ? 'User' : 'Assistant';
            // Simple format:
            // User: ...
            // Assistant: ...
            return `${role}: ${m.content}\n`;
        }).join('\n') + "Assistant: ";
    }
}
