import { matchingService } from '../core/src/matching/MatchingService.js';
import { PropertyIndex } from '../core/src/matching/PropertyIndex.js';
import { Note } from '../core/src/types/index.js';

const createNote = (id: string, properties: Note['properties']): Note => ({
    id,
    title: '',
    content: '',
    properties,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'test', timestamp: Date.now() },
    public: true,
    priority: 1
});

const generateNotes = (count: number): Note[] => {
    return Array.from({ length: count }, (_, i) =>
        createNote(`note-${i}`, [
            { key: 'role', operator: 'is', values: [i % 2 === 0 ? 'engineer' : 'designer'] },
            { key: 'level', operator: 'is', values: [String(Math.floor(Math.random() * 5) + 1)] },
            { key: 'rate', operator: 'is', values: [String(Math.floor(Math.random() * 100) + 50)] },
            { key: 'location', operator: 'is', values: ['remote'] }
        ])
    );
};

const measureTime = (fn: () => void): number => {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    return Number(end - start) / 1e6;
};

const runBenchmark = () => {
    console.log('Starting Benchmark...');
    const noteCounts = [100, 1000, 10000];

    for (const count of noteCounts) {
        console.log(`\n--- Benchmarking ${count} notes ---`);
        const notes = generateNotes(count);
        const index = new PropertyIndex();

        const indexingTime = measureTime(() => index.rebuild(notes));
        console.log(`Indexing time: ${indexingTime.toFixed(2)} ms`);

        const request = createNote('req-1', [
            { key: 'role', operator: 'is', values: ['engineer'] },
            { key: 'rate', operator: 'between', values: ['80', '120'] }
        ]);

        const noteMap = new Map(notes.map(n => [n.id, n]));

        const indexedMatchTime = measureTime(() => {
            const candidates = index.getCandidates(request.properties);
            if (!candidates) return;
            for (const id of candidates) {
                const note = noteMap.get(id);
                if (note && matchingService.matchNotes(request, note).score > 0) {
                }
            }
        });
        console.log(`Indexed Match time: ${indexedMatchTime.toFixed(2)} ms`);

        const naiveMatchTime = measureTime(() => {
            for (const note of notes) {
                matchingService.matchNotes(request, note);
            }
        });
        console.log(`Naive Match time: ${naiveMatchTime.toFixed(2)} ms`);
        console.log(`Speedup: ${(naiveMatchTime / indexedMatchTime).toFixed(2)}x`);
    }
};

const verifyRange = () => {
    console.log('\n--- Verifying Range Operator ---');
    const offer = createNote('offer', [{ key: 'price', operator: 'is', values: ['300'] }]);
    const request = createNote('req', [{ key: 'price', operator: 'range', values: ['100-500'] }]);
    const requestFail = createNote('reqFail', [{ key: 'price', operator: 'range', values: ['400-500'] }]);

    const matchResult = matchingService.matchNotes(request, offer);
    const failResult = matchingService.matchNotes(requestFail, offer);

    console.log(`Range match (100-500 vs 300): ${matchResult.score > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Range fail (400-500 vs 300): ${failResult.score === 0 ? 'PASS' : 'FAIL'}`);
};

runBenchmark();
verifyRange();
