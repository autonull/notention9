/**
 * Benchmark fixtures - shared test data for plugin benchmarks
 */

export function createTestIntentCase(id: string, split: 'search' | 'validation' | 'holdout' = 'search') {
    return {
        id,
        family: 'intent' as const,
        intent: `test_${id}`,
        prompt: `Test prompt for ${id}`,
        seed: {
            notes: [],
            settings: {},
            revisions: ['incumbent'],
        },
        expected: {
            minProperties: 1,
            requiredKeys: ['title'],
            outcome: 'captured' as const,
        },
        metrics: ['completion'],
        tags: ['test'],
        provenance: {
            author: 'human' as const,
            source: 'test',
        },
        split,
    };
}

export function createTestQualityCase(id: string, qualityFamily: 'extraction' | 'match' = 'extraction') {
    return {
        id,
        family: 'quality' as const,
        qualityFamily,
        input: `Test input for ${id}`,
        expected: [{ key: 'title', operator: 'equals' as const, values: ['Test'] }],
        tags: ['test'],
    };
}

export function createTestManifest() {
    const intentCases = [
        createTestIntentCase('case-1', 'search'),
        createTestIntentCase('case-2', 'validation'),
        createTestIntentCase('case-3', 'holdout'),
    ];
    const qualityCases = [
        createTestQualityCase('quality-1'),
        createTestQualityCase('quality-2'),
    ];
    
    const allCases = [...intentCases, ...qualityCases];
    const cases = allCases.map(c => ({
        id: c.id,
        family: c.family,
        split: 'split' in c ? c.split : undefined,
        qualityFamily: 'qualityFamily' in c ? c.qualityFamily : undefined,
        path: `${c.family}_${c.id}.json`,
        hash: 'test-hash',
        tags: c.tags,
    }));
    
    return {
        version: 1,
        hash: 'test-manifest-hash',
        generatedAt: new Date().toISOString(),
        counts: {
            intent: { search: 1, validation: 1, holdout: 1 },
            quality: { extraction: 2, match: 0 },
        },
        cases,
    };
}