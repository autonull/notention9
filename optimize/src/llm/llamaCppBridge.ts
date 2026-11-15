/**
 * llama.cpp Bridge for Optimizer
 * Runs GGUF models directly in Node.js for headless evaluation.
 *
 * The system prompt encodes the ontology's real/imaginary modality: facts use
 * `is`; desires, needs, and hypotheticals use constraint operators. A JSON-schema
 * grammar constrains keys and operators to the ontology so a small local model
 * cannot emit out-of-vocabulary output.
 */

import {
    getLlama,
    Llama,
    LlamaModel,
    LlamaContext,
    LlamaChatSession,
    LlamaContextSequence,
    LlamaGrammar,
    ChatMLChatWrapper,
    QwenChatWrapper,
} from 'node-llama-cpp';
import { DEFAULT_ONTOLOGY, collectOntologyKeysInTree, parsePropertiesJson } from '@notention/core';
import type { Property, OntologyNode } from '@notention/core';

export interface LlamaCppBridgeOptions {
    modelPath: string;
    contextSize?: number;
    gpuLayers?: number;
    temperature?: number;
    timeout?: number;
    /** Instruction block; derived from the ontology when omitted. */
    systemPrompt?: string;
}

const VALID_OPERATORS = [
    'is', 'is not', 'contains', 'greater than', 'less than',
    'before', 'after', 'near', 'between', 'has', 'not has',
] as const;

let cachedLlama: Llama | null = null;
let cachedModel: LlamaModel | null = null;
let cachedContext: LlamaContext | null = null;
let cachedSequence: LlamaContextSequence | null = null;
let cachedSession: LlamaChatSession | null = null;
let cachedGrammar: { signature: string; grammar: LlamaGrammar } | null = null;
let currentOptions: Required<Omit<LlamaCppBridgeOptions, 'timeout'>> | null = null;

const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_GPU_LAYERS = 0; // CPU only for CI compatibility
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_TIMEOUT = 120000;

function getModelPath(): string {
    // Default to Qwen 3.5 0.8B: small, CPU-friendly, already wired into the eval flow.
    return process.env.LLAMA_MODEL_PATH || '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf';
}

function isQwen(modelPath: string): boolean {
    return /qwen/i.test(modelPath);
}

async function getOrCreateLlama(): Promise<Llama> {
    if (cachedLlama) return cachedLlama;

    console.log('[LlamaCpp] Initializing llama.cpp...');
    cachedLlama = await getLlama();
    console.log('[LlamaCpp] llama.cpp initialized');
    return cachedLlama;
}

async function disposeSession(): Promise<void> {
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
    cachedGrammar = null;
}

/** Ontology keys live on descendant nodes; `collectOntologyKeys` only sees top-level nodes. */
function leafOntologyKeys(ontology: OntologyNode[]): string[] {
    const keys = collectOntologyKeysInTree(ontology);
    return [...new Set([...keys].map(key => key.split('.').pop() ?? key))].sort();
}

function buildSystemPrompt(ontology: OntologyNode[]): string {
    const keysList = leafOntologyKeys(ontology).join(', ') || 'none';

    return `You are a precise semantic property extraction system. Output ONLY a JSON array. Do not explain.

Each item has exactly: "key" (from the ontology keys), "operator", and "values" (non-empty string array).

Ontology keys: ${keysList}

Modality rules:
- Actual facts and events use the real operator "is".
- Desires, needs, requests, and hypotheticals are NOT facts. Use constraint operators: "is not", "contains", "greater than", "less than", "before", "after", "near".
- Mark a need with key "need" and "intent" value "request".
- A pure hypothetical with no concrete constraint returns [].
- Never assert a desire as "is": "I want a cheap laptop" is a constraint ("price less than ..."), not a fact.
- Always include "intent" when the note has a clear intent.
- A meeting or appointment => "intent" "is" "schedule". A need/request => "intent" "is" "request".

Examples:
"Meeting with John tomorrow at 10am" -> [{"key":"intent","operator":"is","values":["schedule"]},{"key":"to","operator":"is","values":["John"]}]
"I need to buy milk and eggs" -> [{"key":"intent","operator":"is","values":["request"]},{"key":"need","operator":"contains","values":["milk","eggs"]}]
"Need a wheelchair ramp before Friday, budget 900" -> [{"key":"intent","operator":"is","values":["request"]},{"key":"need","operator":"contains","values":["wheelchair ramp"]},{"key":"budget","operator":"less than","values":["900 USD"]}]
"looking for a laptop under $1000" -> [{"key":"intent","operator":"is","values":["request"]},{"key":"price","operator":"less than","values":["1000 USD"]}]
"maybe we should consider the new proposal" -> []
"I am a software engineer looking for a job" -> [{"key":"role","operator":"is","values":["software engineer"]},{"key":"intent","operator":"is","values":["request"]}]
"contact me at john.doe@example.com" -> [{"key":"email","operator":"is","values":["john.doe@example.com"]}]
"price equals 100 dollars" -> [{"key":"price","operator":"is","values":["100 USD"]}]
"meeting between 2pm and 4pm tomorrow" -> [{"key":"startTime","operator":"is","values":["2pm"]},{"key":"endTime","operator":"is","values":["4pm"]}]
"meeting at the office in San Francisco" -> [{"key":"location","operator":"is","values":["San Francisco"]}]
"my SSN is 123-45-6789" -> []`;
}

function createChatWrapper(modelPath: string) {
    if (isQwen(modelPath)) {
        return new QwenChatWrapper({ variation: '3.5', thoughts: 'discourage' });
    }
    return new ChatMLChatWrapper();
}

async function getOrCreateGrammar(llama: Llama, ontology: OntologyNode[]): Promise<LlamaGrammar> {
    const keys = leafOntologyKeys(ontology);
    const signature = keys.join('|');
    if (cachedGrammar?.signature === signature) return cachedGrammar.grammar;

    const grammar = await llama.createGrammarForJsonSchema({
        type: 'array',
        items: {
            type: 'object',
            properties: {
                key: { enum: keys },
                operator: { enum: [...VALID_OPERATORS] },
                values: { type: 'array', items: { type: 'string' }, minItems: 1 },
            },
            required: ['key', 'operator', 'values'],
            additionalProperties: false,
        },
        maxItems: 8,
    });

    cachedGrammar = { signature, grammar };
    return grammar;
}

export async function getOrCreateLlamaSession(options: LlamaCppBridgeOptions): Promise<LlamaChatSession> {
    const opts = {
        modelPath: options.modelPath || getModelPath(),
        contextSize: options.contextSize ?? DEFAULT_CONTEXT_SIZE,
        gpuLayers: options.gpuLayers ?? DEFAULT_GPU_LAYERS,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        systemPrompt: options.systemPrompt ?? buildSystemPrompt(DEFAULT_ONTOLOGY),
    };

    if (cachedSession && currentOptions &&
        currentOptions.modelPath === opts.modelPath &&
        currentOptions.contextSize === opts.contextSize &&
        currentOptions.gpuLayers === opts.gpuLayers &&
        currentOptions.systemPrompt === opts.systemPrompt) {
        return cachedSession;
    }

    await disposeSession();

    const llama = await getOrCreateLlama();

    console.log('[LlamaCpp] Loading model from:', opts.modelPath);
    cachedModel = await llama.loadModel({
        modelPath: opts.modelPath,
        gpuLayers: opts.gpuLayers,
    });

    cachedContext = await cachedModel.createContext({ contextSize: opts.contextSize });
    cachedSequence = cachedContext.getSequence();
    cachedSession = new LlamaChatSession({
        contextSequence: cachedSequence,
        systemPrompt: opts.systemPrompt,
        chatWrapper: createChatWrapper(opts.modelPath),
    });

    currentOptions = opts;
    console.log('[LlamaCpp] Ready!');

    return cachedSession;
}

/** Remove thinking blocks and markdown fences before parsing. */
function unwrapResponse(response: string): string {
    return response
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();
}

function parseResponse(response: string, ontology: OntologyNode[]): Property[] {
    const cleaned = unwrapResponse(response);
    const start = cleaned.indexOf('[');
    if (start === -1) return [];

    // Prefer a complete array; otherwise repair a truncation at the last whole object.
    const end = cleaned.lastIndexOf(']');
    const json = end > start
        ? cleaned.slice(start, end + 1)
        : (() => {
            const lastBrace = cleaned.lastIndexOf('}');
            return lastBrace > start ? `${cleaned.slice(start, lastBrace + 1)}]` : null;
        })();
    if (!json) return [];

    try {
        const allowedKeys = new Set(leafOntologyKeys(ontology));
        return parsePropertiesJson(JSON.parse(json))
            .filter(property => allowedKeys.has(property.key))
            .map(property => ({
                ...property,
                operator: VALID_OPERATORS.includes(property.operator as typeof VALID_OPERATORS[number])
                    ? property.operator
                    : 'is',
            }));
    } catch (error) {
        console.warn('[LlamaCpp] Failed to parse response:', error);
        return [];
    }
}

export async function extractWithLlamaCpp(
    text: string,
    ontology: OntologyNode[] = DEFAULT_ONTOLOGY,
    options: LlamaCppBridgeOptions
): Promise<Property[]> {
    const systemPrompt = options.systemPrompt ?? buildSystemPrompt(ontology);
    const session = await getOrCreateLlamaSession({ ...options, systemPrompt });
    const grammar = await getOrCreateGrammar(cachedLlama!, ontology);

    console.log('[LlamaCpp] Running inference...');

    // Each extraction is independent; do not let prior cases bias the model.
    session.resetChatHistory();

    const response = await session.prompt(text, {
        maxTokens: 512,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        grammar,
    });

    if (process.env.LLAMA_DEBUG) {
        console.log('[LlamaCpp] Raw response:', JSON.stringify(response));
    }

    return parseResponse(response, ontology);
}

export async function closeLlamaCpp(): Promise<void> {
    await disposeSession();
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
            const { alignToOntology } = await import('@notention/core');
            return alignToOntology(text, ontology);
        }
    }
}
