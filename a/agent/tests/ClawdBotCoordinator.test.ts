import { describe, it, expect } from 'vitest';
import { ClawdBotCoordinator } from '../src/ClawdBotCoordinator';
import { Note } from '../../core/src/types/index';

describe('ClawdBotCoordinator', () => {
    const coordinator = new ClawdBotCoordinator();

    const jobNote: Note = {
        id: 'test-job',
        title: 'Looking for React Developer',
        content: 'I need a react developer',
        tags: [],
        properties: [
            { key: 'role', operator: 'is', values: ['React Developer'] },
            { key: 'location', operator: 'is', values: ['Remote'] }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'u1', timestamp: Date.now() },
        public: false,
        priority: 1.0
    };

    it('should find matching skills for a job note', async () => {
        const sequences = await coordinator.processNote(jobNote);
        expect(sequences.length).toBeGreaterThan(0);
        expect(sequences[0].name).toContain('Indeed');
    });

    it('should return empty array for unrelated note', async () => {
        const randomNote: Note = {
            ...jobNote,
            properties: [{ key: 'random', operator: 'is', values: ['value'] }]
        };
        const sequences = await coordinator.processNote(randomNote);
        expect(sequences.length).toBe(0);
    });
});
