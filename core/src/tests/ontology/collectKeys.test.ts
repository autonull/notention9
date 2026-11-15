import { describe, expect, test } from 'vitest';
import { DEFAULT_ONTOLOGY } from '../../ontology/domains.js';
import { collectOntologyKeysInTree } from '../../ontology/index.js';
import { collectOntologyKeys } from '../../ontology/loader.js';

describe('collectOntologyKeysInTree', () => {
    test('includes attributes defined on descendant nodes', () => {
        const keys = collectOntologyKeysInTree(DEFAULT_ONTOLOGY);

        for (const key of ['intent', 'role', 'email', 'need', 'deadline', 'price', 'budget']) {
            expect(keys.has(key)).toBe(true);
        }
    });

    test('returns attribute keys, not node ids', () => {
        const keys = collectOntologyKeysInTree(DEFAULT_ONTOLOGY);

        expect(keys.has('person')).toBe(false);
        expect(keys.has('job-request')).toBe(false);
    });

    test('loader collectOntologyKeys only sees top-level attributes', () => {
        const topLevel = collectOntologyKeys(DEFAULT_ONTOLOGY);
        const recursive = collectOntologyKeysInTree(DEFAULT_ONTOLOGY);

        expect(recursive.size).toBeGreaterThan(topLevel.size);
    });
});
