import './journeys.js';
import { getAllJourneys, getJourney } from './registry.js';
import type { JourneySpec } from './journey.js';

/**
 * Legacy accessor over the Journey registry. The specs live in `journeys.ts`;
 * nothing is duplicated here so generated wrappers and UISG agree with runtime.
 */
export function getKnownJourney(id: string): JourneySpec | undefined {
    return getJourney(id);
}

export function getKnownJourneyIds(): string[] {
    return getAllJourneys().map(journey => journey.id);
}
