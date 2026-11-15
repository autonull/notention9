import { describe, expect, it } from 'vitest';
import { resolveChatWrapperKind } from '../../llm/llamaCppBridge.js';

describe('resolveChatWrapperKind', () => {
    it('uses the Qwen 3.5 wrapper for Qwen 3.5 models', () => {
        expect(resolveChatWrapperKind('/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf')).toEqual({
            type: 'qwen',
            variation: '3.5',
        });
    });

    it('uses the Qwen 3 wrapper for Qwen 3 base models', () => {
        expect(resolveChatWrapperKind('qwen3-4b-instruct.gguf')).toEqual({ type: 'qwen', variation: '3' });
    });

    it('falls back to ChatML for Qwen 2.5 models', () => {
        expect(resolveChatWrapperKind('/models/hf_bartowski_Qwen2.5-3B-Instruct.Q4_K_M.gguf')).toEqual({
            type: 'chatml',
        });
    });

    it('falls back to ChatML for non-Qwen models', () => {
        expect(resolveChatWrapperKind('/models/Llama-3.2-3B-Instruct.Q4_K_M.gguf')).toEqual({ type: 'chatml' });
    });
});
