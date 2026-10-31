import {CreateMLCEngine, MLCEngine} from "@mlc-ai/web-llm";
import type {Note, OntologyAttribute, OntologyNode, Property} from '@notention/core';
import type {InferredAttribute} from './types';
import {BaseAIProvider} from './BaseProvider.js';
import {Logger, collectOntologyKeys, parsePropertiesJson} from '@notention/core';

export const AVAILABLE_MODELS = [
    {id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (Balanced)"},
    {id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (Fast, Lower Quality)"},
    {id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC", label: "RedPajama 3B"}
];

export class WebLLMProvider extends BaseAIProvider {
    readonly name = 'WebLLM (In-Browser)';
    readonly kind = 'local-model' as const;
    readonly isAvailable = true;
    private engine: MLCEngine | null = null;
    private readonly modelId: string;
    private initPromise: Promise<void> | null = null;

    constructor(modelId: string = "Llama-3.2-3B-Instruct-q4f16_1-MLC") {
        super();
        this.modelId = modelId;
    }

    async generateCompletion(prompt: string): Promise<string> {
        const engine = await this.getEngine();
        if (!engine) {
            throw new Error("WebLLM engine not available");
        }

        const response = await engine.chat.completions.create({
            messages: [{role: "user", content: prompt}],
            temperature: 0.7,
        });
        return response.choices[0]?.message?.content || "";
    }

    protected async doSuggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]> {
        const engine = await this.getEngine();
        if (!engine) {
            throw new Error("WebLLM engine not available");
        }

        // Extract ontology keys for context
        const ontologyKeys = ontology ? collectOntologyKeys(ontology) : new Set<string>();

        let ontologyContext = "";
        if (ontologyKeys.size > 0) {
            ontologyContext = `\nExisting Ontology Keys (Reuse these if relevant): ${Array.from(ontologyKeys).join(', ')}`;
        }

        const prompt = `
      Analyze the following text and suggest up to five short lowercase tags.
      Return ONLY a JSON array of strings. Do not include markdown formatting or explanations.
      ${ontologyContext}

      Text: "${text}"
    `;

        const response = await engine.chat.completions.create({
            messages: [{role: "user", content: prompt}],
            temperature: 0.1, // Deterministic
        });

        const content = response.choices[0]?.message?.content || "[]";
        try {
            return this.parseJsonArray(content);
        } catch {
            this.logger.warn("Failed to parse AI tags:", new Error(content));
            return [];
        }
    }

    protected async doAnalyzeOntology(notes: Note[]): Promise<InferredAttribute[]> {
        const engine = await this.getEngine();
        if (!engine) {
            throw new Error("WebLLM engine not available");
        }

        const sampleText = notes.slice(0, 5).map(n => n.content).join("\n---\n");

        const prompt = `
      Analyze these notes and infer an ontology schema.
      Identify common properties, their types (string, number, date, enum), and usage patterns.
      Return a JSON array of objects with keys: "key", "type", "description", "sampleValues".

      Notes:
      ${sampleText}
    `;

        const response = await engine.chat.completions.create({
            messages: [{role: "user", content: prompt}],
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content || "[]";
        try {
            const jsonStr = this.parseJsonArray<{key: string, type: string, description?: string, sampleValues?: string[]}>(content);
            return jsonStr.map((r) => ({
                key: r.key,
                type: r.type as OntologyAttribute['type'],
                description: r.description,
                usageCount: 0,
                sampleValues: r.sampleValues || []
            }));
        } catch {
            this.logger.warn("Failed to parse AI ontology:", new Error(content));
            return [];
        }
    }

    protected async doAlignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const engine = await this.getEngine();
        if (!engine) throw new Error("WebLLM engine not available");

        const keys = collectOntologyKeys(ontology);

        const prompt = `
      Extract semantic properties from the text as structured JSON.
      Reuse these ontology keys when relevant: ${[...keys].join(', ') || 'none'}.
      Return ONLY a JSON array of objects shaped like:
      [{"key": "skill", "operator": "is", "values": ["React"]}]
      Valid operators: is, is not, contains, greater than, less than.

      Text: "${text}"
    `;

        const response = await engine.chat.completions.create({
            messages: [{role: "user", content: prompt}],
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content || "[]";
        try {
            return parsePropertiesJson(this.parseJsonObject(content, []));
        } catch {
            this.logger.warn("Failed to parse AI properties:", new Error(content));
            return [];
        }
    }

    protected async doOptimizeOntology(_ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        // TODO: Implement actual LLM logic to find synonyms in the ontology tree.
        return {merged: [], pruned: []};
    }

    private async getEngine(): Promise<MLCEngine | null> {
        if (this.engine) return this.engine;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                try {
                    // Check if WebGPU is available (basic check)
                    if (!navigator.gpu) {
                        throw new Error("WebGPU not supported");
                    }

                    this.engine = await CreateMLCEngine(
                        this.modelId,
                        {
                            initProgressCallback: () => {
                                // Suppress logs
                            }
                        }
                    );
                } catch (e) {
                    this.logger.warn("Failed to load WebLLM:", e instanceof Error ? e : new Error(String(e)));
                    throw e; // Propagate error
                }
            })();
        }

        try {
            await this.initPromise;
            return this.engine;
        } catch {
            // If init failed, we can't return an engine.
            // The calling methods will have to handle null or re-throw.
            return null;
        }
    }
}