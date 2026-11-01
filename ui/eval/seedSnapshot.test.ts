import { describe, it, expect, vi } from 'vitest';
import {
    captureSnapshot,
    restoreSnapshot,
    verifySnapshot,
    computeDomHash,
    generateRunId,
    type SeedSnapshot,
} from './seedSnapshot.js';

describe('SeedSnapshot', () => {
    const mockPage = {
        viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
        url: vi.fn().mockReturnValue('http://localhost:5173/#dashboard'),
        goto: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn(),
        reload: vi.fn().mockResolvedValue(undefined),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateRunId', () => {
        it('generates deterministic run IDs', () => {
            const id1 = generateRunId('abc123', 'rev_001', 'case_001', 0);
            const id2 = generateRunId('abc123', 'rev_001', 'case_001', 0);
            expect(id1).toBe(id2);
        });

        it('generates different IDs for different inputs', () => {
            const id1 = generateRunId('abc123', 'rev_001', 'case_001', 0);
            const id2 = generateRunId('abc123', 'rev_001', 'case_001', 1);
            const id3 = generateRunId('abc123', 'rev_002', 'case_001', 0);
            expect(id1).not.toBe(id2);
            expect(id1).not.toBe(id3);
        });

        it('includes all components in the ID', () => {
            const id = generateRunId('abc123', 'rev_001', 'case_001', 0);
            expect(id).toContain('abc123');
            expect(id).toContain('rev_001');
            expect(id).toContain('case_001');
        });
    });

    describe('computeDomHash', () => {
        it('computes a consistent hash for the same DOM', async () => {
            mockPage.evaluate.mockResolvedValue('abc12345');

            const hash1 = await computeDomHash(mockPage);
            const hash2 = await computeDomHash(mockPage);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(8);
        });

        it('calls evaluate with DOM hashing logic', async () => {
            mockPage.evaluate.mockResolvedValue('abc12345');
            await computeDomHash(mockPage);

            expect(mockPage.evaluate).toHaveBeenCalled();
            const callArg = mockPage.evaluate.mock.calls[0][0];
            expect(typeof callArg).toBe('function');
        });
    });

    describe('captureSnapshot', () => {
        it('captures all snapshot components', async () => {
            mockPage.evaluate
                .mockResolvedValueOnce({ 'key1': 'value1' }) // IndexedDB
                .mockResolvedValueOnce({ 'lsKey1': 'lsValue1' }) // localStorage
                .mockResolvedValueOnce([{ seamRole: 'capture', revisionId: 'rev_001', strategyId: 'strat_001', params: {} }]) // revisions
                .mockResolvedValueOnce('abc12345'); // DOM hash

            const snapshot = await captureSnapshot(mockPage);

            expect(snapshot.version).toBe(1);
            expect(snapshot.capturedAt).toBeDefined();
            expect(snapshot.indexedDB).toEqual({ 'key1': 'value1' });
            expect(snapshot.localStorage).toEqual({ 'lsKey1': 'lsValue1' });
            expect(snapshot.activeRevisions).toHaveLength(1);
            expect(snapshot.activeRevisions[0].seamRole).toBe('capture');
            expect(snapshot.domHash).toBe('abc12345');
            expect(snapshot.viewport).toEqual({ width: 1280, height: 720 });
            expect(snapshot.url).toBe('http://localhost:5173/#dashboard');
        });

        it('allows selective capture via options', async () => {
            mockPage.evaluate.mockResolvedValue({});

            const snapshot = await captureSnapshot(mockPage, {
                includeIndexedDB: false,
                includeLocalStorage: false,
                includeRevisions: false,
                computeDomHash: false,
            });

            expect(snapshot.indexedDB).toEqual({});
            expect(snapshot.localStorage).toEqual({});
            expect(snapshot.activeRevisions).toHaveLength(0);
            expect(snapshot.domHash).toBe('');
        });
    });

    describe('restoreSnapshot', () => {
        const mockSnapshot: SeedSnapshot = {
            version: 1,
            capturedAt: '2024-01-01T00:00:00.000Z',
            indexedDB: { 'key1': 'value1' },
            localStorage: { 'lsKey1': 'lsValue1' },
            activeRevisions: [{ seamRole: 'capture', revisionId: 'rev_001', strategyId: 'strat_001', params: {} }],
            domHash: 'abc12345',
            viewport: { width: 1280, height: 720 },
            url: 'http://localhost:5173/#dashboard',
        };

        it('navigates to snapshot URL and restores state', async () => {
            mockPage.evaluate.mockResolvedValue(undefined);

            await restoreSnapshot(mockPage, mockSnapshot);

            expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:5173/#dashboard');
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
            expect(mockPage.reload).toHaveBeenCalled();
        });

        it('restores localStorage, IndexedDB, and revisions', async () => {
            mockPage.evaluate.mockResolvedValue(undefined);

            await restoreSnapshot(mockPage, mockSnapshot);

            // Check localStorage restore was called
            const localStorageCall = mockPage.evaluate.mock.calls.find(
                call => call[0].toString().includes('localStorage.clear')
            );
            expect(localStorageCall).toBeDefined();

            // Check IndexedDB restore was called
            const indexedDBCall = mockPage.evaluate.mock.calls.find(
                call => call[0].toString().includes('indexedDB.open')
            );
            expect(indexedDBCall).toBeDefined();
        });
    });

    describe('verifySnapshot', () => {
        const mockSnapshot: SeedSnapshot = {
            version: 1,
            capturedAt: '2024-01-01T00:00:00.000Z',
            indexedDB: { 'key1': 'value1' },
            localStorage: { 'lsKey1': 'lsValue1' },
            activeRevisions: [],
            domHash: 'abc12345',
            viewport: { width: 1280, height: 720 },
            url: 'http://localhost:5173/#dashboard',
        };

        it('returns match=true when DOM hash matches', async () => {
            mockPage.evaluate
                .mockResolvedValueOnce('abc12345') // computeDomHash
                .mockResolvedValueOnce({ 'key1': 'value1' }) // captureIndexedDB
                .mockResolvedValueOnce({ 'lsKey1': 'lsValue1' }); // captureLocalStorage

            const result = await verifySnapshot(mockPage, mockSnapshot);

            expect(result.match).toBe(true);
            expect(result.domHash).toBe('abc12345');
            expect(result.details.some(d => d.includes('DOM hash matches'))).toBe(true);
        });

        it('returns match=false when DOM hash mismatches', async () => {
            mockPage.evaluate
                .mockResolvedValueOnce('different') // computeDomHash
                .mockResolvedValueOnce({ 'key1': 'value1' })
                .mockResolvedValueOnce({ 'lsKey1': 'lsValue1' });

            const result = await verifySnapshot(mockPage, mockSnapshot);

            expect(result.match).toBe(false);
            expect(result.details.some(d => d.includes('DOM hash mismatch'))).toBe(true);
        });
    });
});