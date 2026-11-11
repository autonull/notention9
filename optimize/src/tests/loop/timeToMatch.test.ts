import { describe, it, expect } from 'vitest';
import type { FrictionEvent } from '@notention/core/telemetry/journal';
import {
    computeTimeToFirstMatch,
    formatSeconds,
    percentile,
    renderTimeToMatchEvidence,
} from '../../loop/timeToMatch.js';

const event = (
    kind: FrictionEvent['kind'],
    sessionId: string,
    timestamp: string,
    noteId?: string,
): FrictionEvent => ({
    bucket: timestamp.slice(0, 10),
    timestamp,
    sessionId,
    workflow: kind === 'need_expressed' ? 'capture' : 'match',
    seam: kind === 'need_expressed' ? 'capture' : 'match',
    kind,
    count: 1,
    noteId,
});

describe('percentile', () => {
    it('returns the single value for one sample', () => {
        expect(percentile([42], 0.5)).toBe(42);
    });

    it('returns the median for an even number of samples', () => {
        expect(percentile([10, 20], 0.5)).toBe(15);
    });

    it('interpolates between neighbours', () => {
        expect(percentile([0, 10], 0.9)).toBe(9);
    });

    it('returns null for an empty list', () => {
        expect(percentile([], 0.5)).toBeNull();
    });
});

describe('computeTimeToFirstMatch', () => {
    it('pairs a need with the explanation that follows it', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z', 'note-1'),
            event('match_explained', 'session-1', '2026-11-11T10:00:45.000Z', 'note-1'),
        ]);

        expect(result.samples).toHaveLength(1);
        expect(result.samples[0].seconds).toBe(45);
        expect(result.samples[0].sameNote).toBe(true);
        expect(result.distribution.p50).toBe(45);
    });

    it('counts a need that was never understood', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z'),
        ]);

        expect(result.samples).toHaveLength(0);
        expect(result.expressedNotUnderstood).toBe(1);
        expect(result.distribution.n).toBe(0);
    });

    it('counts an explanation that no need preceded', () => {
        const result = computeTimeToFirstMatch([
            event('match_explained', 'session-1', '2026-11-11T10:00:10.000Z'),
        ]);

        expect(result.samples).toHaveLength(0);
        expect(result.understoodWithoutNeed).toBe(1);
    });

    it('ignores an explanation that came before the need', () => {
        const result = computeTimeToFirstMatch([
            event('match_explained', 'session-1', '2026-11-11T10:00:00.000Z'),
            event('need_expressed', 'session-1', '2026-11-11T10:00:30.000Z'),
            event('match_explained', 'session-1', '2026-11-11T10:01:00.000Z'),
        ]);

        expect(result.samples).toHaveLength(1);
        expect(result.samples[0].seconds).toBe(30);
    });

    it('keeps sessions apart', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'session-1', '2026-11-11T10:00:10.000Z'),
            event('need_expressed', 'session-2', '2026-11-11T11:00:00.000Z'),
            event('match_explained', 'session-2', '2026-11-11T11:00:50.000Z'),
        ]);

        expect(result.samples).toHaveLength(2);
        expect(result.distribution.p50).toBe(30);
        expect(result.sessions).toBe(2);
    });

    it('uses the first need and the first explanation of a session', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'session-1', '2026-11-11T10:00:20.000Z'),
            event('need_expressed', 'session-1', '2026-11-11T10:01:00.000Z'),
            event('match_explained', 'session-1', '2026-11-11T10:01:30.000Z'),
        ]);

        expect(result.samples).toHaveLength(1);
        expect(result.samples[0].seconds).toBe(20);
    });

    it('flags a match that was not about the need that was expressed', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z', 'note-1'),
            event('match_explained', 'session-1', '2026-11-11T10:00:10.000Z', 'note-2'),
        ]);

        expect(result.samples).toHaveLength(1);
        expect(result.samples[0].sameNote).toBe(false);
        expect(result.sameNoteSamples).toBe(0);
    });

    it('ignores events without a timestamp or a session id', () => {
        const result = computeTimeToFirstMatch([
            { bucket: '2026-11-11', workflow: 'capture', seam: 'capture', kind: 'need_expressed', count: 1 },
            event('match_explained', 'session-1', '2026-11-11T10:00:10.000Z'),
        ]);

        expect(result.sessionsWithNeed).toBe(0);
        expect(result.samples).toHaveLength(0);
        expect(result.unattributed).toBe(1);
    });

    it('reports a distribution, not a mean', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'a', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'a', '2026-11-11T10:00:10.000Z'),
            event('need_expressed', 'b', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'b', '2026-11-11T10:00:20.000Z'),
            event('need_expressed', 'c', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'c', '2026-11-11T10:01:40.000Z'),
        ]);

        expect(result.distribution.n).toBe(3);
        expect(result.distribution.p50).toBe(20);
        expect(result.distribution.p90).toBe(84);
        expect(result.distribution.min).toBe(10);
        expect(result.distribution.max).toBe(100);
    });
});

describe('formatSeconds', () => {
    it('shows sub-minute durations in seconds', () => {
        expect(formatSeconds(45)).toBe('45.0s');
    });

    it('shows longer durations in minutes', () => {
        expect(formatSeconds(125)).toBe('2m 5s');
    });

    it('shows a dash when there is no measurement', () => {
        expect(formatSeconds(null)).toBe('—');
    });
});

describe('renderTimeToMatchEvidence', () => {
    it('publishes an empty result honestly', () => {
        const report = renderTimeToMatchEvidence(computeTimeToFirstMatch([]), 'friction journal');

        expect(report).toContain('**Samples:** 0');
        expect(report).toContain('not measurable yet');
    });

    it('states whether the plan threshold is met', () => {
        const result = computeTimeToFirstMatch([
            event('need_expressed', 'session-1', '2026-11-11T10:00:00.000Z'),
            event('match_explained', 'session-1', '2026-11-11T10:00:30.000Z'),
        ]);

        const report = renderTimeToMatchEvidence(result, 'friction journal');

        expect(report).toContain('**Samples:** 1');
        expect(report).toContain('met');
        expect(report).toContain('30.0s');
    });
});
