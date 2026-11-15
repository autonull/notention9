import { describe, expect, it } from 'vitest';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { parseResponse } from '../../llm/llamaCppBridge.js';

describe('parseResponse', () => {
    it('removes duplicate properties emitted by small models', () => {
        const response = JSON.stringify([
            { key: 'need', operator: 'contains', values: ['milk'] },
            { key: 'need', operator: 'contains', values: ['milk'] },
            { key: 'intent', operator: 'is', values: ['request'] },
        ]);

        expect(parseResponse(response, DEFAULT_ONTOLOGY)).toEqual([
            { key: 'need', operator: 'contains', values: ['milk'] },
            { key: 'intent', operator: 'is', values: ['request'] },
        ]);
    });

    it('strips thinking blocks and code fences', () => {
        const response = '```json\n<think>internal</think>\n[{"key":"email","operator":"is","values":["a@b.c"]}]\n```';

        expect(parseResponse(response, DEFAULT_ONTOLOGY)).toEqual([
            { key: 'email', operator: 'is', values: ['a@b.c'] },
        ]);
    });

    it('repairs a truncated array at the last complete object', () => {
        const response = '[{"key":"location","operator":"is","values":["Paris"]},{"key":"to","operator":"is","values":["Jo';

        expect(parseResponse(response, DEFAULT_ONTOLOGY)).toEqual([
            { key: 'location', operator: 'is', values: ['Paris'] },
        ]);
    });

    it('rejects keys outside the ontology', () => {
        const response = '[{"key":"nonexistentKey","operator":"is","values":["x"]}]';

        expect(parseResponse(response, DEFAULT_ONTOLOGY)).toEqual([]);
    });

    it('drops only the malformed item instead of the whole array', () => {
        const response = JSON.stringify([
            { key: 'startTime', operator: 'is', values: ['2pm'] },
            { key: 'to', operator: 'is', values: [''] },
            { key: 'endTime', operator: 'is', values: ['4pm'] },
        ]);

        expect(parseResponse(response, DEFAULT_ONTOLOGY)).toEqual([
            { key: 'startTime', operator: 'is', values: ['2pm'] },
            { key: 'endTime', operator: 'is', values: ['4pm'] },
        ]);
    });
});
