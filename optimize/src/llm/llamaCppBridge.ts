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
    Llama3ChatWrapper,
    Llama3_1ChatWrapper,
    Llama3_2LightweightChatWrapper,
    GemmaChatWrapper,
    Gemma4ChatWrapper,
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

// Grammar gating state
interface GrammarModeState {
    modelPath: string;
    mode: 'grammar' | 'fallback';
    failures: number;
    lastUpdated: number;
}

const GRAMMAR_MODE_KEY = 'notention:grammar-mode';
const MAX_GRAMMAR_FAILURES = 3;

function loadGrammarModes(): Map<string, GrammarModeState> {
    try {
        const stored = localStorage.getItem(GRAMMAR_MODE_KEY);
        if (!stored) return new Map();
        const data = JSON.parse(stored) as GrammarModeState[];
        return new Map(data.map(s => [s.modelPath, s]));
    } catch {
        return new Map();
    }
}

function saveGrammarModes(modes: Map<string, GrammarModeState>): void {
    try {
        const data = Array.from(modes.values());
        localStorage.setItem(GRAMMAR_MODE_KEY, JSON.stringify(data));
    } catch {
        // Ignore localStorage errors (e.g., in Node.js without polyfill)
    }
}

export function getGrammarMode(modelPath: string): 'grammar' | 'fallback' {
    const modes = loadGrammarModes();
    const state = modes.get(modelPath);
    if (!state) return 'grammar';
    return state.mode;
}

export function recordGrammarSuccess(modelPath: string): void {
    const modes = loadGrammarModes();
    const state = modes.get(modelPath) || { modelPath, mode: 'grammar', failures: 0, lastUpdated: Date.now() };
    state.failures = 0;
    state.mode = 'grammar';
    state.lastUpdated = Date.now();
    modes.set(modelPath, state);
    saveGrammarModes(modes);
}

export function recordGrammarFailure(modelPath: string): void {
    const modes = loadGrammarModes();
    const state = modes.get(modelPath) || { modelPath, mode: 'grammar', failures: 0, lastUpdated: Date.now() };
    state.failures += 1;
    state.lastUpdated = Date.now();
    if (state.failures >= MAX_GRAMMAR_FAILURES) {
        state.mode = 'fallback';
        console.log(`[LlamaCpp] Grammar mode disabled for ${modelPath} after ${state.failures} consecutive failures`);
    }
    modes.set(modelPath, state);
    saveGrammarModes(modes);
}

export function getGrammarModeStats(): GrammarModeState[] {
    return Array.from(loadGrammarModes().values());
}

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

/** Qwen 3+ need the Qwen wrapper; Llama 3.x use Llama3 wrappers; Gemma uses Gemma wrappers; others use ChatML. */
export function resolveChatWrapperKind(
    modelPath: string
): { type: 'qwen'; variation: '3' | '3.5'; supportsGrammar: true }
    | { type: 'llama3'; variation: '3' | '3.1' | '3.2'; supportsGrammar: false }
    | { type: 'gemma'; variation: '3' | '4'; supportsGrammar: true }
    | { type: 'chatml'; supportsGrammar: false } {
    const lowerPath = modelPath.toLowerCase();

    // Detect Llama 3.x models - smaller models struggle with JSON schema grammars
    // Matches: llama-3.2, llama-3.1, llama-3, llama3-8b, etc.
    const llamaMatch = /llama[^0-9]*3(?:\.(\d+))?/i.exec(lowerPath);
    if (llamaMatch) {
        const minor = llamaMatch[1] ? Number(llamaMatch[1]) : 0;
        if (minor >= 2) return { type: 'llama3', variation: '3.2', supportsGrammar: false };
        if (minor === 1) return { type: 'llama3', variation: '3.1', supportsGrammar: false };
        return { type: 'llama3', variation: '3', supportsGrammar: false };
    }

    // Detect Gemma models - Gemma 3+ handles JSON schema grammars well
    // Matches: gemma-3, gemma-4, gemma3-4b, gemma4-4b, etc.
    const gemmaMatch = /gemma[^0-9]*(\d+(?:\.\d+)?)/i.exec(lowerPath);
    if (gemmaMatch) {
        const version = Number(gemmaMatch[1]);
        if (version >= 4) return { type: 'gemma', variation: '4', supportsGrammar: true };
        if (version >= 3) return { type: 'gemma', variation: '3', supportsGrammar: true };
    }

    // Detect Qwen models - trained to handle JSON schema grammars well
    const qwenMatch = /qwen[^0-9]*(\d+(?:\.\d+)?)/i.exec(lowerPath);
    if (qwenMatch) {
        const version = Number(qwenMatch[1]);
        if (version >= 3) return { type: 'qwen', variation: version >= 3.5 ? '3.5' : '3', supportsGrammar: true };
    }

    return { type: 'chatml', supportsGrammar: false };
}

export function createChatWrapper(modelPath: string) {
    const kind = resolveChatWrapperKind(modelPath);
    switch (kind.type) {
        case 'qwen':
            return new QwenChatWrapper({ variation: kind.variation, thoughts: 'discourage' });
        case 'llama3':
            // Use Llama3ChatWrapper for all Llama 3.x variants
            return new Llama3ChatWrapper();
        case 'gemma':
            // Gemma 4 uses Gemma4ChatWrapper with reasoning; Gemma 3 uses GemmaChatWrapper
            return kind.variation === '4'
                ? new Gemma4ChatWrapper({ reasoning: true, keepOnlyLastThought: true })
                : new GemmaChatWrapper();
        case 'chatml':
        default:
            return new ChatMLChatWrapper();
    }
}

/** Returns true if the model handles JSON schema grammars reliably. */
export function modelSupportsGrammar(modelPath: string): boolean {
    return resolveChatWrapperKind(modelPath).supportsGrammar;
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
        systemPrompt: options.systemPrompt ?? buildSystemPrompt(DEFAULT_ONTOLOGY, modelSupportsGrammar(options.modelPath || getModelPath())),
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
        .replace(/reasoning[\s\S]*?<\/think>/gi, '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();
}

/** Fix common malformed JSON patterns from models without grammar support. */
function repairJsonArray(candidate: string): string {
    // Fix missing braces around objects: "key":"value" -> {"key":"value"}
    let repaired = candidate
        .replace(/\[(\s*)"key"/g, '[{$1"key"')
        .replace(/"values"(\s*:\s*\[[^\]]*\]\s*)(,?\s*)(?="key"|\])/g, '"values"$1$2}')
        .replace(/"values"(\s*:\s*\[[^\]]*\]\s*)(?=\]|$)/g, '"values"$1}');

    // Fix trailing commas before ] or }
    repaired = repaired.replace(/,(\s*[\}\]])/g, '$1');

    // Ensure outer array brackets
    if (!repaired.trim().startsWith('[')) repaired = '[' + repaired;
    if (!repaired.trim().endsWith(']')) repaired = repaired + ']';

    return repaired;
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
            return null;
        }
    };

    const end = cleaned.lastIndexOf(']');
    if (end > start) {
        const slice = cleaned.slice(start, end + 1);
        const complete = tryParse(slice);
        if (complete) return complete;
        // Try repairing common malformed patterns
        const repaired = tryParse(repairJsonArray(slice));
        if (repaired) return repaired;
    }

    // Fallback: try progressively shorter slices from the last }
    for (let brace = cleaned.lastIndexOf('}'); brace > start; brace = cleaned.lastIndexOf('}', brace - 1)) {
        const slice = cleaned.slice(start, brace + 1) + ']';
        const parsed = tryParse(slice);
        if (parsed) return parsed;
        const repaired = tryParse(repairJsonArray(slice));
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

async function runExtraction(
    modelPath: string,
    session: LlamaChatSession,
    userPrompt: string,
    grammar?: LlamaGrammar,
    maxTokens: number = 512,
    temperature: number = DEFAULT_TEMPERATURE
): Promise<string> {
    return session.prompt(userPrompt, {
        maxTokens,
        temperature,
        grammar,
    });
}

export async function extractWithLlamaCpp(
    text: string,
    ontology: OntologyNode[] = DEFAULT_ONTOLOGY,
    options: LlamaCppBridgeOptions
): Promise<Property[]> {
    const modelPath = options.modelPath ?? getModelPath();
    const modelSupportsGrammar_ = modelSupportsGrammar(modelPath);
    const grammarMode = modelSupportsGrammar_ ? getGrammarMode(modelPath) : 'fallback';

    const useGrammar = grammarMode === 'grammar';
    const systemPrompt = options.systemPrompt ?? buildSystemPrompt(ontology, useGrammar);
    const session = await getOrCreateLlamaSession({ ...options, systemPrompt });
    const grammar = useGrammar ? await getOrCreateGrammar(cachedLlama!, ontology) : undefined;

    console.log('[LlamaCpp] Running inference...', useGrammar ? '(with grammar)' : '(no grammar, fallback)');

    // Each extraction is independent; do not let prior cases bias the model.
    // Clearing only the chat history keeps the old KV cache, which degrades
    // later extractions in the same context.
    session.resetChatHistory();
    await cachedSequence?.clearHistory();

    const examples = options.fewShotBank
        ? selectFewShot(text, options.fewShotBank, options.fewShotCount ?? 3)
        : [];
    const userPrompt = `${renderFewShot(examples)}Extract from: "${text}"`;

    let response: string;
    let properties: Property[] = [];

    if (useGrammar) {
        // Try with grammar first
        try {
            response = await runExtraction(modelPath, session, userPrompt, grammar, 512, options.temperature ?? DEFAULT_TEMPERATURE);
            
            if (process.env.LLAMA_DEBUG) {
                console.log('[LlamaCpp] Raw response (grammar):', JSON.stringify(response));
            }

            properties = pruneUngrounded(parseResponse(response, ontology), text);
            
            // If we got valid properties, record success
            if (properties.length > 0) {
                recordGrammarSuccess(modelPath);
                return properties;
            }
            
            // Empty result with grammar - might be a parse issue, try fallback
            console.log('[LlamaCpp] Grammar extraction returned empty, trying fallback...');
        } catch (error) {
            console.warn('[LlamaCpp] Grammar extraction failed, trying fallback:', error);
        }

        // Grammar failed or returned empty - record failure and try fallback
        recordGrammarFailure(modelPath);
    }

    // Fallback: run without grammar, with JSON repair
    session.resetChatHistory();
    await cachedSequence?.clearHistory();

    const fallbackSystemPrompt = buildSystemPrompt(ontology, false);
    await getOrCreateLlamaSession({ ...options, systemPrompt: fallbackSystemPrompt });

    response = await runExtraction(modelPath, session, userPrompt, undefined, 512, options.temperature ?? DEFAULT_TEMPERATURE);

    if (process.env.LLAMA_DEBUG) {
        console.log('[LlamaCpp] Raw response (fallback):', JSON.stringify(response));
    }

    properties = pruneUngrounded(parseResponse(response, ontology), text);
    
    return properties;
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
