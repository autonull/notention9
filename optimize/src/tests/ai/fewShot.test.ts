import { describe, expect, it } from 'vitest';
import { renderFewShot, selectFewShot, tokenize } from '../../prompts/fewShot.js';

const bank = [
    {
        id: 'piano',
        input: 'Looking for a piano teacher for my child, weekends, budget 60',
        expected: [{ key: 'role', operator: 'contains', values: ['piano teacher'] }],
    },
    {
        id: 'tutor',
        input: 'Looking for a Spanish tutor, twice weekly, budget 30',
        expected: [{ key: 'role', operator: 'contains', values: ['Spanish tutor'] }],
    },
    {
        id: 'contract',
        input: 'Legal contract with jurisdiction Delaware and governing law',
        expected: [{ key: 'jurisdiction', operator: 'is', values: ['Delaware'] }],
    },
];

describe('few-shot retrieval', () => {
    it('drops stopwords and punctuation', () => {
        expect(tokenize('Need a piano-teacher, please!')).toEqual(['piano-teacher']);
    });

    it('selects the most similar labelled cases', () => {
        const selected = selectFewShot('Looking for a guitar tutor, weekly, budget 25', bank, 1);
        expect(selected.map(item => item.id)).toEqual(['tutor']);
    });

    it('never returns the evaluated case itself', () => {
        const selected = selectFewShot(bank[0].input, bank, 3);
        expect(selected.map(item => item.id)).not.toContain('piano');
    });

    it('renders a compact prompt prefix', () => {
        const rendered = renderFewShot([bank[2]]);
        expect(rendered).toContain('Similar labelled examples:');
        expect(rendered).toContain('"Legal contract');
        expect(renderFewShot([])).toBe('');
    });
});
