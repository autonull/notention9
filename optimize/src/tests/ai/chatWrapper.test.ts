import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveChatWrapperKind, modelSupportsGrammar, getGrammarMode, recordGrammarSuccess, recordGrammarFailure, getGrammarModeStats } from '../../llm/llamaCppBridge.js';

// Mock localStorage
const localStorageMock = {
    store: {} as Record<string, string>,
    getItem(key: string) {
        return this.store[key] || null;
    },
    setItem(key: string, value: string) {
        this.store[key] = value;
    },
    removeItem(key: string) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    },
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('resolveChatWrapperKind', () => {
    it('uses the Qwen 3.5 wrapper for Qwen 3.5 models', () => {
        expect(resolveChatWrapperKind('/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf')).toEqual({
            type: 'qwen',
            variation: '3.5',
            supportsGrammar: true,
        });
    });

    it('uses the Qwen 3 wrapper for Qwen 3 base models', () => {
        expect(resolveChatWrapperKind('qwen3-4b-instruct.gguf')).toEqual({ type: 'qwen', variation: '3', supportsGrammar: true });
    });

    it('falls back to ChatML for Qwen 2.5 models', () => {
        expect(resolveChatWrapperKind('/models/hf_bartowski_Qwen2.5-3B-Instruct.Q4_K_M.gguf')).toEqual({
            type: 'chatml',
            supportsGrammar: false,
        });
    });

    it('uses Llama3 wrapper for Llama 3.2 models (no grammar)', () => {
        expect(resolveChatWrapperKind('/models/Llama-3.2-3B-Instruct.Q4_K_M.gguf')).toEqual({
            type: 'llama3',
            variation: '3.2',
            supportsGrammar: false,
        });
    });

    it('uses Llama3 wrapper for Llama 3.1 models (no grammar)', () => {
        expect(resolveChatWrapperKind('/models/Llama-3.1-8B-Instruct.Q4_K_M.gguf')).toEqual({
            type: 'llama3',
            variation: '3.1',
            supportsGrammar: false,
        });
    });

    it('uses Llama3 wrapper for Llama 3 base models (no grammar)', () => {
        expect(resolveChatWrapperKind('/models/Llama-3-8B-Instruct.Q4_K_M.gguf')).toEqual({
            type: 'llama3',
            variation: '3',
            supportsGrammar: false,
        });
    });

    it('uses Gemma 4 wrapper for Gemma 4 models', () => {
        expect(resolveChatWrapperKind('/models/gemma-4-4b-it.Q4_K_M.gguf')).toEqual({
            type: 'gemma',
            variation: '4',
            supportsGrammar: true,
        });
    });

    it('uses Gemma 4 wrapper for Gemma 4 models (alt naming)', () => {
        expect(resolveChatWrapperKind('gemma4-4b-instruct.gguf')).toEqual({
            type: 'gemma',
            variation: '4',
            supportsGrammar: true,
        });
    });

    it('uses Gemma 3 wrapper for Gemma 3 models', () => {
        expect(resolveChatWrapperKind('/models/gemma-3-4b-it.Q4_K_M.gguf')).toEqual({
            type: 'gemma',
            variation: '3',
            supportsGrammar: true,
        });
    });

    it('uses Gemma 3 wrapper for Gemma 3 models (alt naming)', () => {
        expect(resolveChatWrapperKind('gemma3-2b-instruct.gguf')).toEqual({
            type: 'gemma',
            variation: '3',
            supportsGrammar: true,
        });
    });
});

describe('modelSupportsGrammar', () => {
    it('returns true for Qwen 3.5 models', () => {
        expect(modelSupportsGrammar('/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf')).toBe(true);
    });

    it('returns false for Llama 3.2 models', () => {
        expect(modelSupportsGrammar('/models/Llama-3.2-3B-Instruct.Q4_K_M.gguf')).toBe(false);
    });

    it('returns false for ChatML fallback models', () => {
        expect(modelSupportsGrammar('/models/unknown-model.gguf')).toBe(false);
    });

    it('returns true for Gemma 4 models', () => {
        expect(modelSupportsGrammar('/models/gemma-4-4b-it.Q4_K_M.gguf')).toBe(true);
    });

    it('returns true for Gemma 3 models', () => {
        expect(modelSupportsGrammar('/models/gemma-3-4b-it.Q4_K_M.gguf')).toBe(true);
    });
});

describe('Grammar Gating', () => {
    const testModelPath = '/models/test-model.gguf';

    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('defaults to grammar mode for supported models', () => {
        expect(getGrammarMode(testModelPath)).toBe('grammar');
    });

    it('records grammar success and resets failures', () => {
        // Need 3 failures to trigger fallback
        recordGrammarFailure(testModelPath);
        recordGrammarFailure(testModelPath);
        recordGrammarFailure(testModelPath);
        expect(getGrammarMode(testModelPath)).toBe('fallback');

        recordGrammarSuccess(testModelPath);
        expect(getGrammarMode(testModelPath)).toBe('grammar');

        const stats = getGrammarModeStats();
        const state = stats.find(s => s.modelPath === testModelPath);
        expect(state?.failures).toBe(0);
        expect(state?.mode).toBe('grammar');
    });

    it('switches to fallback after MAX_GRAMMAR_FAILURES consecutive failures', () => {
        expect(getGrammarMode(testModelPath)).toBe('grammar');

        recordGrammarFailure(testModelPath);
        expect(getGrammarMode(testModelPath)).toBe('grammar');

        recordGrammarFailure(testModelPath);
        expect(getGrammarMode(testModelPath)).toBe('grammar');

        recordGrammarFailure(testModelPath); // 3rd failure - should switch to fallback (MAX_GRAMMAR_FAILURES = 3)
        expect(getGrammarMode(testModelPath)).toBe('fallback');

        const stats = getGrammarModeStats();
        const state = stats.find(s => s.modelPath === testModelPath);
        expect(state?.failures).toBe(3);
        expect(state?.mode).toBe('fallback');
    });

    it('persists grammar mode across calls', () => {
        recordGrammarFailure(testModelPath);
        recordGrammarFailure(testModelPath);
        recordGrammarFailure(testModelPath);
        expect(getGrammarMode(testModelPath)).toBe('fallback');

        // Simulate fresh load
        const stats = getGrammarModeStats();
        expect(stats.find(s => s.modelPath === testModelPath)?.mode).toBe('fallback');
    });

    it('returns fallback for unsupported models when checked with modelSupportsGrammar', () => {
        const unsupportedModel = '/models/llama-3.2-3b-instruct.gguf';
        expect(modelSupportsGrammar(unsupportedModel)).toBe(false);
        // getGrammarMode defaults to 'grammar' but extractWithLlamaCpp checks modelSupportsGrammar first
        const useGrammar = modelSupportsGrammar(unsupportedModel) ? getGrammarMode(unsupportedModel) : 'fallback';
        expect(useGrammar).toBe('fallback');
    });
});
