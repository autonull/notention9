import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { getCanonicalKey } from '../ontology/ontologyHelpers.js';

/**
 * Records property usage for tracking frequency
 */
export class UsageRecorder {
    private known = new Map<string, number>();
    private unknown = new Map<string, number>();
    private unknownSamples = new Map<string, unknown[]>();

    constructor(private readonly ontology: OntologyNode[] = []) {}

    record(properties: Array<{ key: string; values?: unknown[] }>): void {
        properties.forEach(prop => {
            const { key, values } = prop;
            const canonical = getCanonicalKey(key, this.ontology);
            const isKnown = this.ontology.some(node =>
                node.attributes && (node.attributes[key] ||
                    Object.values(node.attributes).some(attr => attr.aliases?.includes(key)))
            );

            if (isKnown) {
                this.known.set(canonical, (this.known.get(canonical) ?? 0) + 1);
            } else {
                this.unknown.set(key, (this.unknown.get(key) ?? 0) + 1);

                if (values?.length) {
                    const samples = this.unknownSamples.get(key) ?? [];
                    if (samples.length < 20) {
                        samples.push(...values);
                        if (!this.unknownSamples.has(key)) this.unknownSamples.set(key, samples);
                    }
                }
            }
        });
    }

    getKnown(): Map<string, number> {
        return new Map(this.known);
    }

    getUnknown(): Map<string, number> {
        return new Map(this.unknown);
    }

    getUnknownSamples(): Map<string, unknown[]> {
        return new Map(this.unknownSamples);
    }

    clear(): void {
        this.known.clear();
        this.unknown.clear();
        this.unknownSamples.clear();
    }
}