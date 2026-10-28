import type { ParsedGoal } from './goalParser.js';

export function generateJourneyId(goal: string): string {
    return goal
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
}

export function generateIntent(goal: string, parsedGoal: ParsedGoal): string {
    if (goal.length > 10 && goal.length < 100) {
        return goal;
    }

    const action = parsedGoal.actions[0]?.intent || 'perform action';
    const target = parsedGoal.targetState.path;
    return `${action.replace('note.', '')} ${target}`;
}

export function inferJourneysTouched(parsedGoal: ParsedGoal): string[] {
    const journeys: string[] = [];

    for (const action of parsedGoal.actions) {
        if (action.intent.includes('capture') || action.intent.includes('create')) {
            journeys.push('note-capture');
        }
        if (action.intent.includes('property') || action.intent.includes('edit')) {
            journeys.push('property-editing');
        }
        if (action.intent.includes('publish')) {
            journeys.push('publishing');
        }
        if (action.intent.includes('persistence') || action.intent.includes('reload')) {
            journeys.push('persistence');
        }
        if (action.intent.includes('select')) {
            journeys.push('note-navigation');
        }
    }

    return [...new Set(journeys)];
}