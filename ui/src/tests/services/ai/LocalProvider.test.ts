import {describe, expect, it} from 'vitest';
import {LocalAIProvider} from '../../../services/ai/LocalProvider';

describe('LocalAIProvider', () => {
    const provider = new LocalAIProvider();

    it('suggests tags from hashtags in text', async () => {
        const text = 'This is a #test of #local-ai provider.';
        const tags = await provider.suggestTags(text);
        expect(tags).toEqual(['test', 'local-ai']);
    });

    it('handles duplicate hashtags', async () => {
        const text = '#test #test #example';
        const tags = await provider.suggestTags(text);
        expect(tags).toEqual(['test', 'example']);
    });

    it('returns empty array if no hashtags', async () => {
        const text = 'No hashtags here.';
        const tags = await provider.suggestTags(text);
        expect(tags).toEqual([]);
    });

    it('handles mixed case and content', async () => {
        const text = 'Check out #React and #TypeScript!';
        const tags = await provider.suggestTags(text);
        expect(tags).toContain('React');
        expect(tags).toContain('TypeScript');
    });
});
