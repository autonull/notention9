import { describe, expect, it } from 'vitest';
import { resolveChatWrapperKind, modelSupportsGrammar } from '../../llm/llamaCppBridge.js';

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
});
