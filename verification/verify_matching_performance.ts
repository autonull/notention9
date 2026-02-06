import { matchingService } from '../core/src/matching/MatchingService.js';
import { PropertyIndex } from '../core/src/matching/PropertyIndex.js';
import { Note } from '../core/src/types/index.js';

const generateNotes = (count: number): Note[] => {
    const notes: Note[] = [];
    for (let i = 0; i < count; i++) {
        notes.push({
            id: `note-${i}`,
            title: `Note ${i}`,
            content: `Content for note ${i}`,
            properties: [
                { key: 'role', operator: 'is', values: [i % 2 === 0 ? 'engineer' : 'designer'] },
                { key: 'level', operator: 'is', values: [String(Math.floor(Math.random() * 5) + 1)] },
                { key: 'rate', operator: 'is', values: [String(Math.floor(Math.random() * 100) + 50)] },
                { key: 'location', operator: 'is', values: ['remote'] }
            ],
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'user', identifier: 'test', timestamp: Date.now() },
            public: true,
            priority: 1
        });
    }
    return notes;
};

const runBenchmark = () => {
    console.log('Starting Benchmark...');
    const noteCounts = [100, 1000, 10000];

    for (const count of noteCounts) {
        console.log(`\n--- Benchmarking ${count} notes ---`);
        const notes = generateNotes(count);
        const index = new PropertyIndex();

        // Indexing time
        const startIdx = process.hrtime.bigint();
        index.rebuild(notes);
        const endIdx = process.hrtime.bigint();
        console.log(`Indexing time: ${Number(endIdx - startIdx) / 1e6} ms`);

        // Matching time (Indexed)
        const request: Note = {
            id: 'req-1',
            title: 'Hiring',
            content: '',
            properties: [
                { key: 'role', operator: 'is', values: ['engineer'] },
                { key: 'rate', operator: 'between', values: ['80', '120'] }
            ],
            tags: [],
            createdAt: '', updatedAt: '', source: { type: 'user', identifier: '', timestamp: 0 },
            priority: 1, public: true
        };

        // Pre-compute map to simulate O(1) DB lookup
        const noteMap = new Map(notes.map(n => [n.id, n]));

        const startMatch = process.hrtime.bigint();
        const candidates = index.getCandidates(request.properties);
        const matches = [];
        if (candidates) {
            for (const id of candidates) {
                const note = noteMap.get(id);
                if (note) {
                    const result = matchingService.matchNotes(request, note);
                    if (result.score > 0) matches.push(note);
                }
            }
        }
        const endMatch = process.hrtime.bigint();
        console.log(`Indexed Match time: ${Number(endMatch - startMatch) / 1e6} ms`);
        console.log(`Found ${matches.length} matches`);

        // Naive Matching time (for comparison)
        const startNaive = process.hrtime.bigint();
        const naiveMatches = [];
        for (const note of notes) {
            const result = matchingService.matchNotes(request, note);
            if (result.score > 0) naiveMatches.push(note);
        }
        const endNaive = process.hrtime.bigint();
        console.log(`Naive Match time: ${Number(endNaive - startNaive) / 1e6} ms`);
        console.log(`Speedup: ${(Number(endNaive - startNaive) / Number(endMatch - startMatch)).toFixed(2)}x`);
    }
};

const verifyRange = () => {
    console.log('\n--- Verifying Range Operator ---');
    const note: Note = {
        id: 'offer', title: '', content: '',
        properties: [{ key: 'price', operator: 'is', values: ['300'] }],
        tags: [], createdAt: '', updatedAt: '', source: { type: 'user', identifier: '', timestamp: 0 },
        priority: 1, public: true
    };

    const req: Note = {
        id: 'req', title: '', content: '',
        properties: [{ key: 'price', operator: 'range', values: ['100-500'] }],
        tags: [], createdAt: '', updatedAt: '', source: { type: 'user', identifier: '', timestamp: 0 },
        priority: 1, public: true
    };

    const result = matchingService.matchNotes(req, note);
    console.log(`Range match (100-500 vs 300): ${result.score > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Explanation: ${result.explanation}`);

    const reqFail: Note = {
        id: 'reqIfail', title: '', content: '',
        properties: [{ key: 'price', operator: 'range', values: ['400-500'] }],
        tags: [], createdAt: '', updatedAt: '', source: { type: 'user', identifier: '', timestamp: 0 },
        priority: 1, public: true
    };
    const resultFail = matchingService.matchNotes(reqFail, note);
    console.log(`Range fail (400-500 vs 300): ${resultFail.score === 0 ? 'PASS' : 'FAIL'}`);
};

runBenchmark();
verifyRange();
