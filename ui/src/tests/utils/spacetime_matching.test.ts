import {describe, expect, it} from 'vitest';
import {MatchingService} from '@notention/core';
import type {Note} from '@notention/core';

// Use empty ontology for testing to match old behavior (type inference from operators)
const service = new MatchingService([]);

describe('Spacetime Matching', () => {
    it('matches date ranges correctly', () => {
        const offer: Note = {
            id: '1', title: 'Event', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'startDateTime', operator: 'is', values: ['2024-05-15']}
            ]
        };

        const request: Note = {
            id: '2', title: 'Request', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'startDateTime', operator: 'is after', values: ['2024-05-01']}
            ]
        };

        expect(service.matchNotes(request, offer).score).toBe(1); // 100% match

        const requestLate: Note = {
            id: '3', title: 'Request Late', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'startDateTime', operator: 'is after', values: ['2024-06-01']}
            ]
        };
        expect(service.matchNotes(requestLate, offer).score).toBe(0);
    });

    it('matches geo proximity correctly', () => {
        const nyc = '40.7128,-74.0060';
        const nearNyc = '40.7300,-74.0000'; // Close
        const london = '51.5074,-0.1278'; // Far

        const offer: Note = {
            id: '1', title: 'NYC Event', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'location', operator: 'is', values: [nyc]}
            ]
        };

        const request: Note = {
            id: '2', title: 'Find near NYC', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'location', operator: 'is near', values: [nearNyc]}
            ]
        };

        // Geo matching returns a score based on distance, not exactly 1
        expect(service.matchNotes(request, offer).score).toBeGreaterThan(0.9);

        const requestLondon: Note = {
            id: '3', title: 'Find near London', content: '', tags: [], createdAt: '', updatedAt: '',
            properties: [
                {key: 'location', operator: 'is near', values: [london]}
            ]
        };

        expect(service.matchNotes(requestLondon, offer).score).toBe(0);
    });
});
