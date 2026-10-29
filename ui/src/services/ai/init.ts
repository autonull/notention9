import {LocalAIProvider} from './LocalProvider';
import {RemoteAIProvider, isGeminiApiKeyAvailable} from './RemoteProvider';
import {WebLLMProvider, AVAILABLE_MODELS} from './WebLLMProvider';
import {inferenceRouter, type ProviderConfig, type ModelCapabilities} from './inference';

const HEURISTIC_CAPABILITIES: ModelCapabilities = {
    structuredOutput: false,
    maxContextTokens: Infinity,
    supportsTools: false,
    supportsImages: false,
    streaming: false,
};

const REMOTE_CAPABILITIES: ModelCapabilities = {
    structuredOutput: true,
    maxContextTokens: 1000000,
    supportsTools: true,
    supportsImages: true,
    streaming: true,
};

const LOCAL_MODEL_CAPABILITIES: ModelCapabilities = {
    structuredOutput: true,
    maxContextTokens: 4096,
    supportsTools: false,
    supportsImages: false,
    streaming: false,
};

export interface AIInitOptions {
    remoteApiKey?: string;
    webllmModelId?: string;
    enableRemote?: boolean;
    enableWebLLM?: boolean;
    enableHeuristic?: boolean;
}

export async function initializeAI(options: AIInitOptions = {}): Promise<void> {
    const {
        remoteApiKey,
        webllmModelId = AVAILABLE_MODELS[0].id,
        enableRemote = true,
        enableWebLLM = true,
        enableHeuristic = true,
    } = options;

    // 1. Heuristic (deterministic rules) - always available, lowest priority (fallback)
    if (enableHeuristic) {
        const heuristicProvider = new LocalAIProvider();
        inferenceRouter.registerProvider(heuristicProvider, {
            name: 'heuristic',
            kind: 'heuristic',
            capabilities: HEURISTIC_CAPABILITIES,
            priority: 3, // Lowest priority = last resort
        });
    }

    // 2. WebLLM (in-browser local model) - medium priority
    if (enableWebLLM) {
        try {
            const webllmProvider = new WebLLMProvider(webllmModelId);
            // Test if WebGPU is available
            if (typeof navigator !== 'undefined' && navigator.gpu) {
                inferenceRouter.registerProvider(webllmProvider, {
                    name: 'webllm',
                    kind: 'local-model',
                    capabilities: LOCAL_MODEL_CAPABILITIES,
                    priority: 1, // High priority - preferred for privacy
                });
            } else {
                console.warn('WebGPU not available, skipping WebLLM provider');
            }
        } catch (e) {
            console.warn('Failed to initialize WebLLM:', e);
        }
    }

    // 3. Remote (Gemini) - highest priority when available
    if (enableRemote && isGeminiApiKeyAvailable(remoteApiKey)) {
        const remoteProvider = new RemoteAIProvider(remoteApiKey);
        inferenceRouter.registerProvider(remoteProvider, {
            name: 'gemini',
            kind: 'remote',
            capabilities: REMOTE_CAPABILITIES,
            priority: 0, // Highest priority - best quality
        });
    } else if (enableRemote) {
        console.warn('Gemini API key not available, skipping remote provider');
    }

    // Probe capabilities for all registered providers
    for (const config of inferenceRouter.getAvailableProviders()) {
        const provider = (inferenceRouter as any).providers.get(config.name);
        if (provider) {
            const capabilities = await inferenceRouter.probeCapabilities(provider);
            config.capabilities = {...config.capabilities, ...capabilities};
        }
    }

    console.log('AI providers initialized:', inferenceRouter.getAvailableProviders().map(p => `${p.name}(${p.kind}) priority:${p.priority}`));
}

export function getInferenceRouter() {
    return inferenceRouter;
}

export {inferenceRouter} from './inference';
export type {InferenceResult, InferenceOptions, ModelCapabilities, ProviderConfig} from './inference';
export type {AIProvider, ProviderKind, InferredAttribute, PropertyProposal} from './types';