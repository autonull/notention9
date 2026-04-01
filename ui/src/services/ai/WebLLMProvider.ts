import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import type { AIProvider, InferredAttribute } from '@notention/core';
import { Logger } from '@notention/core';
import type { Note, OntologyAttribute, OntologyNode } from '@notention/core';

export const AVAILABLE_MODELS = [
    { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (Balanced)" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (Fast, Lower Quality)" },
    { id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC", label: "RedPajama 3B" }
];

export class WebLLMProvider implements AIProvider {
  name = 'WebLLM (In-Browser)';
  isAvailable = true;
  private engine: MLCEngine | null = null;
  private modelId: string;
  private initPromise: Promise<void> | null = null;
  private logger = Logger.getInstance();

  constructor(modelId: string = "Llama-3.2-3B-Instruct-q4f16_1-MLC") {
    this.modelId = modelId;
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

  async generateCompletion(prompt: string): Promise<string> {
    const engine = await this.getEngine();
    if (!engine) {
        throw new Error("WebLLM engine not available");
    }

    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || "";
  }

  async suggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]> {
    const engine = await this.getEngine();
    if (!engine) {
        throw new Error("WebLLM engine not available");
    }

    // Extract ontology keys for context
    const ontologyKeys = new Set<string>();
    if (ontology) {
        const traverse = (nodes: OntologyNode[]) => {
            nodes.forEach(n => {
                if (n.attributes) Object.keys(n.attributes).forEach(k => ontologyKeys.add(k));
                if (n.children) traverse(n.children);
            });
        };
        traverse(ontology);
    }

    let ontologyContext = "";
    if (ontologyKeys.size > 0) {
        ontologyContext = `\nExisting Ontology Keys (Reuse these if relevant): ${Array.from(ontologyKeys).join(', ')}`;
    }

    const prompt = `
      Analyze the following text and suggest semantic tags in the format [key:op:value] or [key < value].
      Return ONLY a JSON array of strings. Do not include markdown formatting or explanations.
      ${ontologyContext}

      Text: "${text}"
    `;

    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Deterministic
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        this.logger.warn("Failed to parse AI tags:", new Error(content));
        return [];
    }
  }

  async analyzeOntology(notes: Note[]): Promise<InferredAttribute[]> {
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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "[]";
    try {
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        interface RawAttribute {
            key: string;
            type: string;
            description?: string;
            sampleValues?: string[];
        }
        const raw: RawAttribute[] = JSON.parse(jsonStr);
        return raw.map((r) => ({
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

  async alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]> {
    // Re-use suggestTags but with stricter ontology prompting if needed.
    // For now, suggestTags already handles ontology context.
    return this.suggestTags(text, ontology);
  }

  async optimizeOntology(_ontology: OntologyNode[]): Promise<{ merged: { source: string, target: string }[], pruned: string[] }> {
      // TODO: Implement actual LLM logic to find synonyms in the ontology tree.
      return { merged: [], pruned: [] };
  }
}
