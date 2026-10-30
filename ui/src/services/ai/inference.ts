import type {Note, OntologyNode, Property} from '@notention/core';
import type {AIProvider, ProviderKind, InferredAttribute, PropertyProposal} from './types';
import {z} from 'zod';
import {
    ValidationPipeline,
    createPropertyPipeline,
    createTagPipeline,
    createInferredAttributesPipeline,
    createOntologyOptimizationPipeline,
    type PipelineResult,
} from '@notention/core/validation';

export interface ModelCapabilities {
    structuredOutput: boolean;
    maxContextTokens: number;
    supportsTools: boolean;
    supportsImages: boolean;
    streaming: boolean;
}

export interface ProviderConfig {
    name: string;
    kind: ProviderKind;
    capabilities: ModelCapabilities;
    priority: number;
}

export interface InferenceOptions {
    timeout?: number;
    maxRetries?: number;
    requireStructuredOutput?: boolean;
    temperature?: number;
    autoRepair?: boolean;
}

export interface InferenceResult<T> {
    data: T | null;
    error: Error | null;
    providerUsed: string;
    providerKind: ProviderKind;
    latencyMs: number;
    retries: number;
    fallbackUsed: boolean;
    validation?: PipelineResult<T>;
}

/**
 * Unified inference interface with capability probing and fallback chain
 * Fallback order: local-model → remote → heuristic (deterministic rules)
 */
export class InferenceRouter {
    private providers: Map<string, AIProvider> = new Map();
    private providerConfigs: Map<string, ProviderConfig> = new Map();
    private defaultOptions: InferenceOptions = {
        timeout: 30000,
        maxRetries: 2,
        temperature: 0.1,
        autoRepair: true,
    };

    registerProvider(provider: AIProvider, config: ProviderConfig): void {
        this.providers.set(config.name, provider);
        this.providerConfigs.set(config.name, config);
    }

    unregisterProvider(name: string): void {
        this.providers.delete(name);
        this.providerConfigs.delete(name);
    }

    getAvailableProviders(): ProviderConfig[] {
        const available: ProviderConfig[] = [];
        for (const [name, provider] of this.providers) {
            const config = this.providerConfigs.get(name);
            if (config && provider.isAvailable) {
                available.push(config);
            }
        }
        return available.sort((a, b) => a.priority - b.priority);
    }

    async probeCapabilities(provider: AIProvider): Promise<ModelCapabilities> {
        const testPrompt = `Return a JSON object: {"test": "ok"}`;
        try {
            const result = await this.withTimeout(provider.generateCompletion(testPrompt), 5000);
            const parsed = JSON.parse(result);
            const hasStructuredOutput = parsed && typeof parsed === 'object' && 'test' in parsed;
            return {
                structuredOutput: hasStructuredOutput,
                maxContextTokens: 4096,
                supportsTools: false,
                supportsImages: false,
                streaming: false,
            };
        } catch {
            return {
                structuredOutput: false,
                maxContextTokens: 4096,
                supportsTools: false,
                supportsImages: false,
                streaming: false,
            };
        }
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
            ),
        ]);
    }

    private getPipeline(method: keyof AIProvider): ValidationPipeline<unknown> {
        switch (method) {
            case 'alignToOntology':
                return createPropertyPipeline({ 
                    schema: { 
                        kind: 'zod', 
                        schema: z.array(z.object({
                            key: z.string().min(1),
                            operator: z.enum(['is', 'is not', 'contains', 'greater than', 'less than']),
                            values: z.array(z.string().min(1)).min(1),
                        }))
                    },
                    maxRepairAttempts: 3,
                });
            case 'suggestTags':
                return createTagPipeline({ 
                    schema: { 
                        kind: 'zod', 
                        schema: z.array(z.string().min(1)).max(20)
                    },
                    maxRepairAttempts: 3,
                });
            case 'analyzeOntology':
                return createInferredAttributesPipeline({ 
                    schema: { 
                        kind: 'zod', 
                        schema: z.array(z.object({
                            key: z.string().min(1),
                            type: z.enum(['string', 'number', 'date', 'enum', 'geo']),
                            description: z.string().optional(),
                            usageCount: z.number().int().min(0).default(0),
                            sampleValues: z.array(z.string()).default([]),
                        }))
                    },
                    maxRepairAttempts: 3,
                });
            case 'optimizeOntology':
                return createOntologyOptimizationPipeline({ 
                    schema: { 
                        kind: 'zod', 
                        schema: z.object({
                            merged: z.array(z.object({
                                source: z.string().min(1),
                                target: z.string().min(1),
                            })),
                            pruned: z.array(z.string().min(1)),
                        })
                    },
                    maxRepairAttempts: 3,
                });
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    private async callWithRetry<T>(
        provider: AIProvider,
        method: keyof AIProvider,
        args: unknown[],
        options: InferenceOptions
    ): Promise<InferenceResult<T>> {
        const startTime = Date.now();
        let lastError: Error | null = null;
        const autoRepair = options.autoRepair ?? true;
        const pipeline = autoRepair ? this.getPipeline(method) : null;

        for (let attempt = 0; attempt <= (options.maxRetries ?? 2); attempt++) {
            try {
                const methodFn = provider[method] as (...args: unknown[]) => Promise<T>;
                const rawData = await this.withTimeout(methodFn.apply(provider, args), options.timeout);

                let data: T = rawData;
                let validation: PipelineResult<T> | undefined;

                if (pipeline && rawData !== null) {
                    const validated = await pipeline.validate(rawData);
                    if (validated.success) {
                        data = validated.data as T;
                        validation = validated;
                    } else {
                        throw new Error(`Validation failed: ${validated.issues.map(i => i.message).join(', ')}`);
                    }
                }

                return {
                    data,
                    error: null,
                    providerUsed: provider.name,
                    providerKind: provider.kind,
                    latencyMs: Date.now() - startTime,
                    retries: attempt,
                    fallbackUsed: false,
                    validation,
                };
            } catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                if (attempt < (options.maxRetries ?? 2)) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }

        return {
            data: null,
            error: lastError,
            providerUsed: provider.name,
            providerKind: provider.kind,
            latencyMs: Date.now() - startTime,
            retries: options.maxRetries ?? 2,
            fallbackUsed: false,
        };
    }

    async execute<T>(
        method: keyof AIProvider,
        args: unknown[],
        options: InferenceOptions = {}
    ): Promise<InferenceResult<T>> {
        const mergedOptions = {...this.defaultOptions, ...options};
        const providers = this.getAvailableProviders();

        if (providers.length === 0) {
            return {
                data: null,
                error: new Error('No providers available'),
                providerUsed: 'none',
                providerKind: 'heuristic',
                latencyMs: 0,
                retries: 0,
                fallbackUsed: false,
            };
        }

        for (let i = 0; i < providers.length; i++) {
            const config = providers[i];
            const provider = this.providers.get(config.name);
            if (!provider) continue;

            const requiresStructured = mergedOptions.requireStructuredOutput ?? config.capabilities.structuredOutput;
            if (requiresStructured && !config.capabilities.structuredOutput) {
                continue;
            }

            const result = await this.callWithRetry<T>(provider, method, args, mergedOptions);

            if (result.data !== null && result.error === null) {
                if (i > 0) {
                    result.fallbackUsed = true;
                }
                return result;
            }

            console.warn(`Provider ${provider.name} failed: ${result.error?.message}`);
        }

        return {
            data: null,
            error: new Error('All providers failed'),
            providerUsed: providers[providers.length - 1]?.name || 'none',
            providerKind: providers[providers.length - 1]?.kind || 'heuristic',
            latencyMs: 0,
            retries: 0,
            fallbackUsed: true,
        };
    }

    async generateCompletion(prompt: string, options?: InferenceOptions): Promise<InferenceResult<string>> {
        return this.execute<string>('generateCompletion', [prompt], options);
    }

    async suggestTags(text: string, ontology?: OntologyNode[], options?: InferenceOptions): Promise<InferenceResult<string[]>> {
        return this.execute<string[]>('suggestTags', [text, ontology], options);
    }

    async analyzeOntology(notes: Note[], context?: string, options?: InferenceOptions): Promise<InferenceResult<InferredAttribute[]>> {
        return this.execute<InferredAttribute[]>('analyzeOntology', [notes, context], options);
    }

    async alignToOntology(text: string, ontology: OntologyNode[], options?: InferenceOptions): Promise<InferenceResult<Property[]>> {
        return this.execute<Property[]>('alignToOntology', [text, ontology], options);
    }

    async optimizeOntology(ontology: OntologyNode[], options?: InferenceOptions): Promise<InferenceResult<{merged: {source: string, target: string}[], pruned: string[]}>> {
        return this.execute('optimizeOntology', [ontology], options);
    }
}

export const inferenceRouter = new InferenceRouter();