import { describe, it, expect } from 'vitest';
import {
    inferEvidenceClass,
    aggregateEvents,
    filterFrictionEventsSince,
    parseFrictionJsonl,
    rankAggregates,
    serializeFrictionEvents,
    type FrictionEvent,
} from './frictionUtils';

const event = (kind: FrictionEvent['kind'], count = 1): FrictionEvent => ({
    bucket: '2026-11-11',
    workflow: 'match',
    seam: 'match',
    kind,
    count,
});

describe('inferEvidenceClass', () => {
    it('treats a repeated response creation as measured', () => {
        expect(inferEvidenceClass('response_created', 5, 1)).toBe('measured');
    });

    it('treats a single response creation as observed', () => {
        expect(inferEvidenceClass('response_created', 1, 1)).toBe('observed');
    });

    it('treats an explained match as observed', () => {
        expect(inferEvidenceClass('match_explained', 12, 1)).toBe('observed');
    });

    it('treats a viewed response as observed', () => {
        expect(inferEvidenceClass('response_viewed', 3, 1)).toBe('observed');
    });

    it('treats a dismissed match as measured once repeated', () => {
        expect(inferEvidenceClass('match_dismissed', 4, 2)).toBe('measured');
    });

    it('treats an expressed need as observed', () => {
        expect(inferEvidenceClass('need_expressed', 1, 0)).toBe('observed');
    });
});

describe('aggregateEvents', () => {
    it('groups golden path events by kind', () => {
        const aggregates = aggregateEvents([
            event('response_created'),
            event('response_created'),
            event('match_explained'),
        ]);

        const byKind = new Map(aggregates.map(a => [a.kind, a.count]));
        expect(byKind.get('response_created')).toBe(2);
        expect(byKind.get('match_explained')).toBe(1);
    });

    it('keeps counting the need that starts the time-to-first-match clock', () => {
        const aggregates = aggregateEvents([
            event('need_expressed'),
            event('need_expressed'),
        ]);

        expect(aggregates.find(a => a.kind === 'need_expressed')?.count).toBe(2);
    });
});

describe('rankAggregates', () => {
    it('ranks a repeated response creation above a single view', () => {
        const signals = rankAggregates(
            aggregateEvents([event('response_created', 6), event('response_viewed', 1)])
        );

        expect(signals[0].kind).toBe('response_created');
    });
});

describe('friction JSONL', () => {
    const jsonlEvent: FrictionEvent = {
        bucket: '2026-11-12',
        timestamp: '2026-11-12T10:00:00.000Z',
        sessionId: 'session-1',
        workflow: 'capture',
        seam: 'capture',
        kind: 'need_expressed',
        count: 1,
        noteId: 'note-1',
    };

    it('serializes one complete line per event', () => {
        const serialized = serializeFrictionEvents([jsonlEvent, {...jsonlEvent, noteId: 'note-2'}]);

        expect(serialized.endsWith('\n')).toBe(true);
        expect(serialized.trimEnd().split('\n')).toHaveLength(2);
        expect(parseFrictionJsonl(serialized)).toEqual({
            events: [jsonlEvent, {...jsonlEvent, noteId: 'note-2'}],
            malformed: 0,
        });
    });

    it('keeps legacy events without timestamps or session ids', () => {
        const legacy = event('capture_started');

        expect(parseFrictionJsonl(JSON.stringify(legacy))).toEqual({events: [legacy], malformed: 0});
    });

    it('rejects malformed and unknown events', () => {
        const parsed = parseFrictionJsonl([
            JSON.stringify(jsonlEvent),
            '{not json',
            JSON.stringify({...jsonlEvent, kind: 'not_a_real_kind'}),
        ].join('\n'));

        expect(parsed.events).toEqual([jsonlEvent]);
        expect(parsed.malformed).toBe(2);
    });

    it('selects only events at or after a participant-session boundary', () => {
        const before = {...jsonlEvent, timestamp: '2026-11-12T09:59:59.999Z'};
        const after = {...jsonlEvent, timestamp: '2026-11-12T10:00:00.000Z'};
        const parsed = parseFrictionJsonl([
            JSON.stringify(before),
            JSON.stringify(after),
        ].join('\n'));

        expect(filterFrictionEventsSince(parsed.events, '2026-11-12T10:00:00.000Z')).toEqual([after]);
    });

    it('rejects semantically invalid counts, dates, and timestamps', () => {
        const parsed = parseFrictionJsonl([
            JSON.stringify({...jsonlEvent, count: 0}),
            JSON.stringify({...jsonlEvent, count: -1}),
            JSON.stringify({...jsonlEvent, count: 1.5}),
            JSON.stringify({...jsonlEvent, bucket: 'not-a-date'}),
            JSON.stringify({...jsonlEvent, bucket: '2026-02-30'}),
            JSON.stringify({...jsonlEvent, timestamp: 'not-a-timestamp'}),
            JSON.stringify({...jsonlEvent, timestamp: '2026-02-30T10:00:00.000Z'}),
        ].join('\n'));

        expect(parsed.events).toEqual([]);
        expect(parsed.malformed).toBe(7);
    });
});
