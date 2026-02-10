import {describe, expect, it} from 'vitest';
import {LocalAIProvider} from '../../../services/ai/LocalProvider';

describe('LocalAIProvider - Heuristics', () => {
    const provider = new LocalAIProvider();

    it('suggests tags from hashtags in text', async () => {
        const text = 'This is a #test of #local-ai provider.';
        const tags = await provider.suggestTags(text);
        expect(tags).toEqual(expect.arrayContaining(['test', 'local-ai']));
    });

    it('suggests project tags', async () => {
        const text = 'This project is almost done';
        const tags = await provider.suggestTags(text);
        expect(tags).toContain('project');
        expect(tags).toContain('[status:is:Active]');
    });

    it('suggests deadline for projects', async () => {
        const text = 'Project deadline is next week';
        const tags = await provider.suggestTags(text);
        expect(tags).toContain('project');
        expect(tags).toContain('[deadline:is:?]');
    });
});
