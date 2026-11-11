import { describe, it, expect } from 'vitest';
import {
    inferEvidenceClass,
    aggregateEvents,
    rankAggregates,
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
});

describe('rankAggregates', () => {
    it('ranks a repeated response creation above a single view', () => {
        const signals = rankAggregates(
            aggregateEvents([event('response_created', 6), event('response_viewed', 1)])
        );

        expect(signals[0].kind).toBe('response_created');
    });
});
