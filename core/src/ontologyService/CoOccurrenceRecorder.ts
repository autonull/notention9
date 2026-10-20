import { getCanonicalKey } from '../ontology/ontologyHelpers.js';

/**
 * Tracks co-occurrence of property keys
 */
export class CoOccurrenceRecorder {
    private coOccurrence = new Map<string, Map<string, number>>();

    record(properties: Array<{ key: string; values?: unknown[] }>): void {
        const canonicals = Array.from(
            new Set(properties.map(p => getCanonicalKey(p.key, [])))
        );

        canonicals.forEach(src => {
            const coMap = this.coOccurrence.get(src) ?? new Map<string, number>();
            if (!this.coOccurrence.has(src)) this.coOccurrence.set(src, coMap);

            canonicals
                .filter(target => src !== target)
                .forEach(target => {
                    coMap.set(target, (coMap.get(target) ?? 0) + 1);
                });
        });
    }

    getCoOccurrenceData(): Map<string, Map<string, number>> {
        return new Map(this.coOccurrence);
    }

    getCoOccurrence(key: string): Map<string, number> | undefined {
        return this.coOccurrence.get(key);
    }

    clear(): void {
        this.coOccurrence.clear();
    }
}