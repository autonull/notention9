import { matchingService } from '../core/dist/index.js';
import assert from 'assert';

console.log('🧪 Verifying Core Matching Service...');

try {
    // 1. Verify Levenshtein
    const dist = matchingService.levenshteinDistance('kitten', 'sitting');
    assert.strictEqual(dist, 3, 'Levenshtein distance should be 3');
    console.log('✅ Levenshtein distance correct');

    // 2. Verify matchNotes (Basic)
    const request = {
        id: 'req1',
        title: 'Req',
        content: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        public: false,
        priority: 1,
        source: { type: 'user', identifier: 'u1', timestamp: 0 },
        properties: [
            { key: 'skill', operator: 'is', values: ['javascript'] }
        ]
    };

    const offer = {
        id: 'off1',
        title: 'Offer',
        content: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        public: false,
        priority: 0.8,
        source: { type: 'user', identifier: 'u2', timestamp: 0 },
        properties: [
            { key: 'skill', operator: 'is', values: ['JavaScript'] } // Case difference
        ]
    };

    const match = matchingService.matchNotes(request, offer);
    // Should match because normalization handles case
    assert.ok(match.score > 0, 'Should match JavaScript vs javascript');
    assert.strictEqual(match.satisfied.length, 1, 'Should satisfy 1 constraint');
    console.log('✅ Basic matching correct');

    // 3. Verify Constraints (Constraint check)
    const req2 = { ...request, properties: [{ key: 'experience', operator: 'greater than', values: ['5'] }] };
    const off2 = { ...offer, properties: [{ key: 'experience', operator: 'is', values: ['10'] }] }; // 10 > 5

    const match2 = matchingService.matchNotes(req2, off2);
    assert.strictEqual(match2.satisfied.length, 1, '10 should be greater than 5');
    console.log('✅ Numeric constraint correct');

    // 4. Verify Semantic Overlap
    const overlap = matchingService.calculateSemanticOverlap(request, offer);
    // Both have 'skill' key.
    // Jaccard: 1 / 1 = 1.
    // Weight: (1 + 0.8) / 2 = 0.9
    // So result should be 0.9
    assert.ok(Math.abs(overlap - 0.9) < 0.001, `Overlap should be 0.9, got ${overlap}`);
    console.log('✅ Semantic overlap correct');

    console.log('🎉 Core Matching Service Verified!');

} catch (e) {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
}
