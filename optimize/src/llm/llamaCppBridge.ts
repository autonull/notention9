/**
 * llama.cpp Bridge for Optimizer
 * Uses node-llama-cpp to run Llama models directly in Node.js for headless evaluation.
 */

import { getLlama, Llama, LlamaModel, LlamaContext, LlamaChatSession, LlamaContextSequence } from 'node-llama-cpp';
import { DEFAULT_ONTOLOGY, collectOntologyKeys, parsePropertiesJson } from '@notention/core';
import type { Property, OntologyNode } from '@notention/core';

export interface LlamaCppBridgeOptions {
    modelPath: string;
    contextSize?: number;
    gpuLayers?: number;
    temperature?: number;
    timeout?: number;
}

let cachedLlama: Llama | null = null;
let cachedModel: LlamaModel | null = null;
let cachedContext: LlamaContext | null = null;
let cachedSequence: LlamaContextSequence | null = null;
let cachedSession: LlamaChatSession | null = null;
let currentOptions: LlamaCppBridgeOptions | null = null;

const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_GPU_LAYERS = 0; // CPU only for CI compatibility
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_TIMEOUT = 120000;

function getModelPath(): string {
    // Default to a common location for GGUF models
    return process.env.LLAMA_MODEL_PATH || '/home/me/notention9/models/hf_bartowski_Llama-3.2-3B-Instruct.Q4_K_M.gguf';
}

async function getOrCreateLlama(): Promise<Llama> {
    if (cachedLlama) {
        return cachedLlama;
    }
    
    console.log('[LlamaCpp] Initializing llama.cpp...');
    cachedLlama = await getLlama();
    console.log('[LlamaCpp] llama.cpp initialized');
    return cachedLlama;
}

export async function getOrCreateLlamaSession(options: LlamaCppBridgeOptions): Promise<LlamaChatSession> {
    const opts = {
        modelPath: options.modelPath || getModelPath(),
        contextSize: options.contextSize ?? DEFAULT_CONTEXT_SIZE,
        gpuLayers: options.gpuLayers ?? DEFAULT_GPU_LAYERS,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        timeout: options.timeout ?? DEFAULT_TIMEOUT,
    };

    // Check if we can reuse the cached session
    if (cachedSession && currentOptions) {
        const sameOptions = 
            currentOptions.modelPath === opts.modelPath &&
            currentOptions.contextSize === opts.contextSize &&
            currentOptions.gpuLayers === opts.gpuLayers;

        if (sameOptions) {
            return cachedSession;
        }
    }

    // Clean up old resources
    if (cachedSession) {
        await cachedSession.dispose();
        cachedSession = null;
    }
    if (cachedSequence) {
        await cachedSequence.dispose();
        cachedSequence = null;
    }
    if (cachedContext) {
        await cachedContext.dispose();
        cachedContext = null;
    }
    if (cachedModel) {
        await cachedModel.dispose();
        cachedModel = null;
    }

    const llama = await getOrCreateLlama();
    
    console.log('[LlamaCpp] Loading model from:', opts.modelPath);
    
    // Load the model
    cachedModel = await llama.loadModel({
        modelPath: opts.modelPath,
        gpuLayers: opts.gpuLayers,
    });

    console.log('[LlamaCpp] Model loaded, creating context...');
    
    // Create context
    cachedContext = await cachedModel.createContext({
        contextSize: opts.contextSize,
    });

    console.log('[LlamaCpp] Context created, creating sequence...');
    
    // Create sequence
    cachedSequence = cachedContext.getSequence();

    console.log('[LlamaCpp] Sequence created, creating chat session...');
    
    // Create chat session
    cachedSession = new LlamaChatSession({
        contextSequence: cachedSequence,
    });

    currentOptions = opts;
    console.log('[LlamaCpp] Ready!');
    
    return cachedSession;
}

function buildPrompt(text: string, ontology: OntologyNode[]): string {
    const keys = collectOntologyKeys(ontology);
    
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a precise semantic property extraction system. Your ONLY output must be a valid JSON array. No explanations, no markdown, no conversational text.

Extract semantic properties from the user's text as a JSON array of objects with exactly these fields:
- "key": string (must be from the ontology keys below)
- "operator": string (must be one of: is, is not, contains, greater than, less than)
- "values": string[] (non-empty array)

Ontology keys available: ${[...keys].join(', ') || 'none'}
Valid operators: is, is not, contains, greater than, less than

If no properties match, return: []

Text: "${text}"<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;
}

export async function extractWithLlamaCpp(
    text: string,
    ontology: OntologyNode[] = DEFAULT_ONTOLOGY,
    options: LlamaCppBridgeOptions
): Promise<Property[]> {
    const session = await getOrCreateLlamaSession(options);
    const prompt = buildPrompt(text, ontology);
    
    console.log('[LlamaCpp] Running inference...');
    
    try {
        const response = await session.prompt(prompt, {
            maxTokens: 512,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        });
        
        console.log('[LlamaCpp] Response:', response);
        
        // Parse the JSON response
        try {
            const parsed = JSON.parse(response);
            return parsePropertiesJson(parsed);
        } catch (e) {
            console.warn('[LlamaCpp] Failed to parse response as JSON:', e);
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return parsePropertiesJson(parsed);
                } catch {
                    // Ignore
                }
            }
            return [];
        }
    } catch (error) {
        console.error('[LlamaCpp] Inference failed:', error);
        throw error;
    }
}

export async function closeLlamaCpp(): Promise<void> {
    if (cachedSession) {
        await cachedSession.dispose();
        cachedSession = null;
    }
    if (cachedSequence) {
        await cachedSequence.dispose();
        cachedSequence = null;
    }
    if (cachedContext) {
        await cachedContext.dispose();
        cachedContext = null;
    }
    if (cachedModel) {
        await cachedModel.dispose();
        cachedModel = null;
    }
    if (cachedLlama) {
        await cachedLlama.dispose();
        cachedLlama = null;
    }
    currentOptions = null;
}

export function isLlamaCppInitialized(): boolean {
    return cachedSession !== null;
}

/**
 * Provider implementation that uses llama.cpp
 */
export class LlamaCppBridgeProvider {
    name = 'llamacpp-bridge';
    private options: LlamaCppBridgeOptions;

    constructor(options: LlamaCppBridgeOptions) {
        this.options = options;
    }

    async extract(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        try {
            return await extractWithLlamaCpp(text, ontology, this.options);
        } catch (error) {
            console.warn(`Llama.cpp extraction failed: ${error}`);
            // Fallback to deterministic
            const { alignToOntology } = await import('@notention/core');
            return alignToOntology(text, ontology);
        }
    }
}