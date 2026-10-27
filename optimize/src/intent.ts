import { getReadyJourneys, getJourneyAliases } from './registry.js';

export interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings';
    journey?: string;
    target?: string;
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}

export function parseOptimizeIntent(args: string[]): OptimizeIntent {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
        case 'optimize': {
            const journey = rest[0];
            if (!journey) throw new Error('Journey ID required for optimize');
            // Check if it's an alias
            const aliases = getJourneyAliases();
            const journeyId = aliases[journey.toLowerCase()] || journey;
            return { action: 'optimize', journey: journeyId, constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        case 'reproduce': {
            const target = rest[0];
            if (!target) throw new Error('Finding ID or runId required for reproduce');
            return { action: 'reproduce', target, constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        case 'findings': {
            return { action: 'findings', constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        default:
            throw new Error(`Unknown subcommand: ${subcommand}. Use: optimize, reproduce, findings`);
    }
}

export function getAvailableJourneys(): string[] {
    return getReadyJourneys().map(j => j.id);
}

export function getJourneyIntent(journeyId: string): string | undefined {
    const journey = getReadyJourneys().find(j => j.id === journeyId);
    return journey?.intent;
}