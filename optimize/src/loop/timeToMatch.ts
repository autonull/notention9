/**
 * Time-to-first-match (TODO.17 P2c.4).
 *
 * The metric: seconds from "I expressed a need" to "I understood a match",
 * per user. One browser session is one user's turn, so a session is the unit
 * of observation. It is reported as a distribution, never a mean — a mean hides
 * the slow half.
 *
 * Two journal events anchor it, both stamped with the session id:
 *   need_expressed  — a note carrying `intent: request` was persisted
 *   match_explained — a match explanation was opened
 *
 * A session without both anchors is not a sample; it is counted and reported
 * as unpaired rather than silently dropped.
 */

import type {FrictionEvent} from '@notention/core/telemetry/journal';

export interface TimeToMatchSample {
    sessionId: string;
    expressedAt: string;
    understoodAt: string;
    seconds: number;
    sameNote: boolean;
}

export interface TimeToMatchDistribution {
    n: number;
    p50: number | null;
    p90: number | null;
    min: number | null;
    max: number | null;
}

export interface TimeToMatchResult {
    samples: TimeToMatchSample[];
    distribution: TimeToMatchDistribution;
    sessions: number;
    sessionsWithNeed: number;
    sessionsWithExplanation: number;
    expressedNotUnderstood: number;  // a need was expressed, never understood
    understoodWithoutNeed: number;   // a match was understood, no need was expressed
    sameNoteSamples: number;         // the match was about the need that was expressed
    unattributed: number;            // events without a session id or timestamp
    invalid: number;                 // pairs rejected (negative delta)
}

const EMPTY_DISTRIBUTION: TimeToMatchDistribution = {n: 0, p50: null, p90: null, min: null, max: null};

interface SessionEvents {
    needs: Array<{at: number; noteId?: string}>;
    explanations: Array<{at: number; noteId?: string}>;
}

function toMillis(timestamp: string): number | null {
    const value = new Date(timestamp).getTime();
    return Number.isFinite(value) ? value : null;
}

/**
 * Linear-interpolated percentile over a sorted list.
 * p50 is the median, which is the number the plan's threshold is written against.
 */
export function percentile(sorted: number[], fraction: number): number | null {
    if (sorted.length === 0) return null;
    if (sorted.length === 1) return sorted[0];
    const rank = fraction * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    if (low === high) return sorted[low];
    return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function summarize(samples: TimeToMatchSample[]): TimeToMatchDistribution {
    if (samples.length === 0) return {...EMPTY_DISTRIBUTION};
    const seconds = samples.map(s => s.seconds).sort((a, b) => a - b);
    return {
        n: seconds.length,
        p50: percentile(seconds, 0.5),
        p90: percentile(seconds, 0.9),
        min: seconds[0],
        max: seconds[seconds.length - 1],
    };
}

/**
 * Pair, per session, the first expressed need with the first match explanation
 * that follows it.
 */
export function computeTimeToFirstMatch(events: FrictionEvent[]): TimeToMatchResult {
    const sessions = new Map<string, SessionEvents>();
    let unattributed = 0;

    for (const event of events) {
        if (!event.sessionId || !event.timestamp) {
            unattributed++;
            continue;
        }
        const at = toMillis(event.timestamp);
        if (at === null) {
            unattributed++;
            continue;
        }

        const isNeed = event.kind === 'need_expressed';
        const isExplanation = event.kind === 'match_explained';
        if (!isNeed && !isExplanation) continue;

        const session = sessions.get(event.sessionId) ?? {needs: [], explanations: []};
        if (isNeed) session.needs.push({at, noteId: event.noteId});
        else session.explanations.push({at, noteId: event.noteId});
        sessions.set(event.sessionId, session);
    }

    const samples: TimeToMatchSample[] = [];
    let sessionsWithNeed = 0;
    let sessionsWithExplanation = 0;
    let expressedNotUnderstood = 0;
    let understoodWithoutNeed = 0;
    let invalid = 0;

    for (const [sessionId, session] of sessions) {
        if (session.needs.length > 0) sessionsWithNeed++;
        if (session.explanations.length > 0) sessionsWithExplanation++;

        if (session.needs.length === 0) {
            understoodWithoutNeed++;
            continue;
        }

        const need = session.needs.reduce((earliest, current) => (current.at < earliest.at ? current : earliest));
        const explanation = session.explanations
            .filter(e => e.at >= need.at)
            .reduce<{at: number; noteId?: string} | null>(
                (earliest, current) => (earliest === null || current.at < earliest.at ? current : earliest),
                null
            );

        if (!explanation) {
            expressedNotUnderstood++;
            continue;
        }

        const seconds = (explanation.at - need.at) / 1000;
        if (seconds < 0) {
            invalid++;
            continue;
        }

        samples.push({
            sessionId,
            expressedAt: new Date(need.at).toISOString(),
            understoodAt: new Date(explanation.at).toISOString(),
            seconds,
            sameNote: !!need.noteId && need.noteId === explanation.noteId,
        });
    }

    return {
        samples: samples.sort((a, b) => a.seconds - b.seconds),
        distribution: summarize(samples),
        sessions: sessions.size,
        sessionsWithNeed,
        sessionsWithExplanation,
        expressedNotUnderstood,
        understoodWithoutNeed,
        sameNoteSamples: samples.filter(s => s.sameNote).length,
        unattributed,
        invalid,
    };
}

export function formatSeconds(seconds: number | null): string {
    if (seconds === null) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds - minutes * 60);
    return `${minutes}m ${rest}s`;
}

/**
 * The publishable report. An empty journal produces an honest "no sessions
 * yet" document rather than a zero-valued metric.
 */
export function renderTimeToMatchEvidence(result: TimeToMatchResult, source: string): string {
    const {distribution} = result;
    const rows = result.samples.map(s =>
        `| ${s.sessionId.slice(0, 8)} | ${s.expressedAt} | ${s.understoodAt} | ${formatSeconds(s.seconds)} | ${s.sameNote ? 'yes' : 'no'} |`
    ).join('\n');

    return `# Time-to-First-Match — 2026-11

**Metric:** seconds from "I expressed a need" to "I understood a match" (TODO.17 P2c.4).
**Definition:** ADR 016 — one browser session is one user's turn; t0 is the first
\`need_expressed\` event of the session, t1 is the first \`match_explained\` event
that follows it.
**Source:** \`${source}\`

## Result

- **Samples:** ${distribution.n}
- **Median (p50):** ${formatSeconds(distribution.p50)}
- **p90:** ${formatSeconds(distribution.p90)}
- **Fastest:** ${formatSeconds(distribution.min)}
- **Slowest:** ${formatSeconds(distribution.max)}
- **Threshold (plan §Numbers):** median < 2 min — ${distribution.p50 === null ? 'not measurable yet' : distribution.p50 < 120 ? 'met' : 'not met'}

## Coverage

- **Sessions observed:** ${result.sessions}
- **Sessions that expressed a need:** ${result.sessionsWithNeed}
- **Sessions that opened an explanation:** ${result.sessionsWithExplanation}
- **Expressed, never understood:** ${result.expressedNotUnderstood}
- **Understood without a recorded need:** ${result.understoodWithoutNeed}
- **The match was about that need:** ${result.sameNoteSamples}/${distribution.n}
- **Events without a session id or timestamp:** ${result.unattributed}
- **Rejected pairs (negative delta):** ${result.invalid}

## Samples

| Session | Expressed at | Understood at | Seconds | Same need |
|---|---|---|---|---|
${rows || '| — | — | — | — | — |'}

## Method

- The metric is a **distribution**, not a mean: a mean hides the slow half.
- A session counts once: the first \`need_expressed\` and the first
  \`match_explained\` that follows it.
- Pairs with a negative delta (clock skew) are rejected and counted, not averaged in.
- Events without a session id cannot be attributed to a session and are not sampled.
`;
}
