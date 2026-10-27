import type { JourneySpec } from './journey.js';

const journeys = new Map<string, JourneySpec>();

export function registerJourney(spec: JourneySpec): void {
    if (journeys.has(spec.id)) {
        throw new Error(`Journey ${spec.id} already registered`);
    }
    journeys.set(spec.id, spec);
}

export function getJourney(id: string): JourneySpec | undefined {
    return journeys.get(id);
}

export function getAllJourneys(): JourneySpec[] {
    return Array.from(journeys.values());
}

export function getReadyJourneys(): JourneySpec[] {
    return Array.from(journeys.values()).filter(j => j.status === 'ready');
}

export function getJourneyAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};
    for (const journey of journeys.values()) {
        if (journey.status === 'ready') {
            aliases[journey.intent.toLowerCase()] = journey.id;
        }
    }
    return aliases;
}

export function clearRegistry(): void {
    journeys.clear();
}