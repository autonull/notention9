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

export { getLlama };
import { DEFAULT_ONTOLOGY, parsePropertiesJson } from '@notention/core';
import type { Property, OntologyNode } from '@notention/core';
import { buildSystemPrompt, leafOntologyKeys } from '../prompts/extractionPrompt.js';
import { VALID_OPERATOR_SET, pruneUngrounded } from '../prompts/policy.js';
import { renderFewShot, selectFewShot, type LabelledCase } from '../prompts/fewShot.js';

export type GpuLayerSetting = number | 'auto' | 'max';

export interface LlamaCppBridgeOptions {
    modelPath: string;
    contextSize?: number;
    gpuLayers?: GpuLayerSetting;
    temperature?: number;
    timeout?: number;
    maxTokens?: number;
    /** Instruction block; derived from the ontology when omitted. */
    systemPrompt?: string;
    /** Labelled cases used for retrieval-selected few-shot prompting. */
    fewShotBank?: readonly LabelledCase[];
    fewShotCount?: number;
}

let cachedLlama: Llama | null = null;
let cachedModel: LlamaModel | null = null;
let cachedContext: LlamaContext | null = null;
let cachedSequence: LlamaContextSequence | null = null;
let cachedSession: LlamaChatSession | null = null;
let cachedGrammar: { signature: string; grammar: LlamaGrammar } | null = null;
let currentOptions: Required<Omit<LlamaCppBridgeOptions, 'timeout' | 'fewShotBank' | 'fewShotCount' | 'maxTokens'>> | null = null;

const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_GPU_LAYERS: GpuLayerSetting = 'max'; // Use the GPU when one is available
const DEFAULT_TEMPERATURE = 0; // Greedy decoding: the golden gate must be reproducible
const DEFAULT_TIMEOUT = 120000;

function getModelPath(): string {
    // Default to Qwen 3.5 0.8B: small, CPU-friendly, already wired into the eval flow.
    return process.env.LLAMA_MODEL_PATH || '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf';
}

/** LLAMA_GPU_LAYERS overrides the default ("max"): a number, "auto", or "max". */
export function resolveGpuLayers(): GpuLayerSetting {
    const raw = process.env.LLAMA_GPU_LAYERS;
    if (!raw) return DEFAULT_GPU_LAYERS;
    if (raw === 'auto' || raw === 'max') return raw;
    const layers = Number(raw);
    return Number.isFinite(layers) ? layers : DEFAULT_GPU_LAYERS;
}

async function getOrCreateLlama(): Promise<Llama> {
    if (cachedLlama) return cachedLlama;

    console.log('[LlamaCpp] Initializing llama.cpp...');
    cachedLlama = await getLlama();
    console.log(`[LlamaCpp] llama.cpp initialized (backend: ${cachedLlama.gpu ?? 'cpu'})`);
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

/** Ontology keys live on descendant nodes; `leafOntologyKeys` flattens them. */

/** Qwen 3+ need the Qwen wrapper; Qwen 2.5 and earlier use ChatML. */
export function resolveChatWrapperKind(
    modelPath: string
): { type: 'qwen'; variation: '3' | '3.5' } | { type: 'chatml' } {
    const version = /qwen[^0-9]*(\d+(?:\.\d+)?)/i.exec(modelPath)?.[1];
    if (version === undefined || Number(version) < 3) return { type: 'chatml' };
    return { type: 'qwen', variation: Number(version) >= 3.5 ? '3.5' : '3' };
}

export function createChatWrapper(modelPath: string) {
    const kind = resolveChatWrapperKind(modelPath);
    return kind.type === 'qwen'
        ? new QwenChatWrapper({ variation: kind.variation, thoughts: 'discourage' })
        : new ChatMLChatWrapper();
}

export async function getOrCreateGrammar(llama: Llama, ontology: OntologyNode[]): Promise<LlamaGrammar> {
    const keys = leafOntologyKeys(ontology);
    const signature = keys.join('|');
    if (cachedGrammar?.signature === signature) return cachedGrammar.grammar;

    const grammar = await llama.createGrammarForJsonSchema({
        type: 'array',
        items: {
            type: 'object',
            properties: {
                key: { enum: keys },
                operator: { enum: [...VALID_OPERATOR_SET] },
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
        gpuLayers: options.gpuLayers ?? resolveGpuLayers(),
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
    console.log(`[LlamaCpp] Offloaded GPU layers: ${cachedModel.gpuLayers}`);

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

/** Best-effort JSON extraction: a truncated array is cut at its last complete object. */
function extractJsonArray(cleaned: string): unknown[] | null {
    const start = cleaned.indexOf('[');
    if (start === -1) return null;

    const tryParse = (candidate: string): unknown[] | null => {
        try {
            const parsed: unknown = JSON.parse(candidate);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null; // candidate slices are speculative
        }
    };

    const end = cleaned.lastIndexOf(']');
    if (end > start) {
        const complete = tryParse(cleaned.slice(start, end + 1));
        if (complete) return complete;
    }

    for (let brace = cleaned.lastIndexOf('}'); brace > start; brace = cleaned.lastIndexOf('}', brace - 1)) {
        const repaired = tryParse(`${cleaned.slice(start, brace + 1)}]`);
        if (repaired) return repaired;
    }
    return null;
}

export function parseResponse(response: string, ontology: OntologyNode[]): Property[] {
    const properties = extractJsonArray(unwrapResponse(response));
    if (!properties) return [];

    const allowedKeys = new Set(leafOntologyKeys(ontology));
    const seen = new Set<string>();
    return properties
        .flatMap(property => parsePropertiesJson([property]))
        .filter(property => allowedKeys.has(property.key))
        .map(property => ({
            ...property,
            operator: VALID_OPERATOR_SET.has(property.operator) ? property.operator : 'is',
        }))
        .filter(property => {
            const signature = `${property.key}|${property.operator}|${property.values.join(',')}`;
            if (seen.has(signature)) return false;
            seen.add(signature);
            return true;
        });
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
    // Clearing only the chat history keeps the old KV cache, which degrades
    // later extractions in the same context.
    session.resetChatHistory();
    await cachedSequence?.clearHistory();

    const examples = options.fewShotBank
        ? selectFewShot(text, options.fewShotBank, options.fewShotCount ?? 3)
        : [];
    const userPrompt = `${renderFewShot(examples)}Extract from: "${text}"`;

    const response = await session.prompt(userPrompt, {
        maxTokens: 512,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        grammar,
    });

    if (process.env.LLAMA_DEBUG) {
        console.log('[LlamaCpp] Raw response:', JSON.stringify(response));
    }

    return pruneUngrounded(parseResponse(response, ontology), text);
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
