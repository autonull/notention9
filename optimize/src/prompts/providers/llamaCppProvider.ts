/**
 * llama.cpp Provider for Prompt Evaluation
 * Supports both embedded (node-llama-cpp) and server (OpenAI-compatible) modes.
 */

import type { Property, OntologyNode } from '@notention/core';
import type { Provider } from '../evaluate.js';
import { LlamaCppBridgeProvider, type LlamaCppBridgeOptions, closeLlamaCpp } from '../../llm/llamaCppBridge.js';
import type { LabelledCase } from '../fewShot.js';
import { collectOntologyKeysInTree } from '@notention/core';

export interface LlamaCppProviderOptions {
    /** Embedded mode: path to GGUF model file */
    modelPath?: string;
    /** Server mode: URL of OpenAI-compatible llama.cpp server (e.g., http://localhost:8080/v1) */
    serverUrl?: string;
    /** Model name for server mode (e.g., "Qwen2.5-7B-Instruct") */
    modelName?: string;
    /** Temperature (0 for deterministic) */
    temperature?: number;
    /** Context size */
    contextSize?: number;
    /** GPU layers: number, 'max', or 'auto' */
    gpuLayers?: number | 'max' | 'auto';
    /** Few-shot bank for retrieval-augmented prompting */
    fewShotBank?: readonly LabelledCase[];
    fewShotCount?: number;
    /** Custom system prompt (overrides default ontology-derived prompt) */
    systemPrompt?: string;
    /** Dispose model between extractions to free VRAM (slower but fits larger models) */
    disposeBetweenCases?: boolean;
    /** Enable chain-of-thought scratchpad (off by default) */
    useCoT?: boolean;
}

export class LlamaCppProvider implements Provider {
    name = 'llama-cpp';
    private options: LlamaCppProviderOptions;
    private bridgeProvider: LlamaCppBridgeProvider | null = null;
    private serverMode = false;
    private fallbackCount = 0;

    constructor(options: LlamaCppProviderOptions = {}) {
        this.options = options;
        this.serverMode = !!options.serverUrl;
    }

    async extract(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        if (this.serverMode) {
            return this.extractViaServer(text, ontology);
        }
        const result = await this.extractEmbedded(text, ontology);
        
        // Dispose model between cases if requested (frees VRAM for larger models)
        if (this.options.disposeBetweenCases && this.bridgeProvider) {
            await this.bridgeProvider.close();
            this.bridgeProvider = null;
        }
        
        return result;
    }

    private async extractEmbedded(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        try {
            if (!this.bridgeProvider) {
                const bridgeOptions: LlamaCppBridgeOptions = {
                    modelPath: this.options.modelPath ?? process.env.LLAMA_MODEL_PATH ?? '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf',
                    contextSize: this.options.contextSize ?? 2048,
                    gpuLayers: this.options.gpuLayers ?? 'max',
                    temperature: this.options.temperature ?? 0,
                    fewShotCount: this.options.fewShotCount ?? 3,
                    systemPrompt: this.options.systemPrompt,
                    useCoT: this.options.useCoT ?? false,
                };
                // Only include fewShotBank if it's a non-empty array
                if (this.options.fewShotBank && this.options.fewShotBank.length > 0) {
                    bridgeOptions.fewShotBank = this.options.fewShotBank;
                }
                this.bridgeProvider = new LlamaCppBridgeProvider(bridgeOptions);
            }
            return await this.bridgeProvider.extract(text, ontology);
        } catch (error) {
            this.fallbackCount++;
            console.warn(`[FALLBACK #${this.fallbackCount}] Llama.cpp embedded extraction failed: ${error}. Falling back to deterministic extraction.`);
            const { alignToOntology } = await import('@notention/core');
            const fallbackProps = alignToOntology(text, ontology);
            // Mark fallback properties with provenance for visibility
            return fallbackProps.map(p => ({ ...p, provenance: 'deterministic' as const }));
        }
    }

    /** Returns the number of times the provider fell back to deterministic extraction */
    getFallbackCount(): number {
        return this.fallbackCount;
    }

    /** Resets the fallback counter */
    resetFallbackCount(): void {
        this.fallbackCount = 0;
    }

    private async extractViaServer(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const serverUrl = this.options.serverUrl ?? process.env.LLAMA_CPP_SERVER_URL ?? 'http://localhost:8080/v1';
        const modelName = this.options.modelName ?? process.env.LLAMA_CPP_MODEL_NAME ?? 'Qwen2.5-7B-Instruct';
        const systemPrompt = this.options.systemPrompt ?? this.buildSystemPrompt(ontology);

        try {
            const response = await fetch(`${serverUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Extract from: "${text}"` },
                    ],
                    temperature: this.options.temperature ?? 0,
                    max_tokens: 512,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content ?? '';
            return this.parseResponse(content, ontology);
        } catch (error) {
            console.warn(`Llama.cpp server extraction failed: ${error}`);
            const { alignToOntology } = await import('@notention/core');
            return alignToOntology(text, ontology);
        }
    }

    private buildSystemPrompt(ontology: OntologyNode[]): string {
        const keys = this.collectOntologyKeys(ontology);
        const validOperators = ['is', 'contains', 'has', 'before', 'after', 'near', 'less than', 'greater than', 'within', 'starts with', 'ends with'];
        
        return `You are a precise semantic property extraction system.

ONTOLGY KEYS (use exactly these):
${keys.join(', ')}

VALID OPERATORS (use exactly these):
${validOperators.join(', ')}

RULES:
- Output ONLY a JSON array of objects with keys: key, operator, values
- Each values must be a non-empty array of strings
- Use only keys from the ontology list above
- Use only operators from the valid operators list above
- No extra text, no markdown, no explanation
- If no properties found, output: []

Example:
[{"key":"role","operator":"contains","values":["developer"]},{"key":"budget","operator":"less than","values":["100 USD"]}]`;
    }

    private collectOntologyKeys(ontology: OntologyNode[]): string[] {
        const keys = collectOntologyKeysInTree(ontology) as unknown as Iterable<string>;
        return [...new Set([...keys].map(key => key.split('.').pop() ?? key))].sort();
    }

    private parseResponse(response: string, ontology: OntologyNode[]): Property[] {
        const allowedKeys = new Set(this.collectOntologyKeys(ontology));
        const validOperators = new Set(['is', 'contains', 'has', 'before', 'after', 'near', 'less than', 'greater than', 'within', 'starts with', 'ends with']);
        
        let parsed: unknown;
        try {
            // Extract JSON array from response
            const start = response.indexOf('[');
            const end = response.lastIndexOf(']');
            if (start >= 0 && end > start) {
                parsed = JSON.parse(response.slice(start, end + 1));
            } else {
                parsed = JSON.parse(response);
            }
        } catch {
            return [];
        }

        if (!Array.isArray(parsed)) return [];

        const seen = new Set<string>();
        return parsed
            .flatMap((item: any) => {
                if (!item || typeof item !== 'object') return [];
                const key = item.key;
                const operator = item.operator;
                const values = item.values;
                if (!key || !operator || !Array.isArray(values) || values.length === 0) return [];
                return [{ key, operator, values }];
            })
            .filter((prop: any) => allowedKeys.has(prop.key) && validOperators.has(prop.operator))
            .filter((prop: any) => {
                const sig = `${prop.key}|${prop.operator}|${prop.values.join(',')}`;
                if (seen.has(sig)) return false;
                seen.add(sig);
                return true;
            });
    }

    async close(): Promise<void> {
        if (this.bridgeProvider) {
            await closeLlamaCpp();
            this.bridgeProvider = null;
        }
    }
}

/** Factory function for easy provider creation */
export function createLlamaCppProvider(options: LlamaCppProviderOptions = {}): LlamaCppProvider {
    return new LlamaCppProvider(options);
}