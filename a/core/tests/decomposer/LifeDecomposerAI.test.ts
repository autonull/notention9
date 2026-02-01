import { describe, it, expect, vi } from 'vitest';
import { LifeDecomposer } from '../../src/decomposer/LifeDecomposer';
import { AIProvider } from '../../src/types/index';

describe('LifeDecomposer AI', () => {
  const mockProvider: AIProvider = {
    name: 'test',
    isAvailable: true,
    generateCompletion: vi.fn(),
    analyzeOntology: vi.fn(),
    optimizeOntology: vi.fn(),
    suggestTags: vi.fn(),
    alignToOntology: vi.fn()
  };

  const decomposer = new LifeDecomposer(mockProvider);

  it('should use AI provider when available', async () => {
    const mockResponse = JSON.stringify([
      { ontology: 'ai.test', content: 'AI Generated Question' }
    ]);
    (mockProvider.generateCompletion as any).mockResolvedValue(mockResponse);

    const thoughts = await decomposer.decomposeWithAI('Test Intent');

    expect(mockProvider.generateCompletion).toHaveBeenCalled();
    expect(thoughts.length).toBe(1);
    expect(thoughts[0].content).toBe('AI Generated Question');
    expect(thoughts[0].source).toBe('decomposer:ai');
  });

  it('should fallback to regex when AI fails', async () => {
    (mockProvider.generateCompletion as any).mockRejectedValue(new Error('AI Failed'));

    const thoughts = await decomposer.decomposeWithAI('I want to sleep better');

    expect(thoughts.length).toBeGreaterThan(0);
    expect(thoughts[0].source).toBe('decomposer:v1');
  });
});
