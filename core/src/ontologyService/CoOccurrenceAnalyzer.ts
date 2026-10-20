import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { getCanonicalKey } from '../ontology/ontologyHelpers.js';
import { inferPropertyType } from '../utils/inference.js';
import type { SuggestedAttribute } from './statistics.js';
import { CoOccurrenceRecorder } from './CoOccurrenceRecorder.js';

/**
 * Analyzes co-occurrence for contextual suggestions
 */
export class CoOccurrenceAnalyzer {
    constructor(
        private readonly recorder: CoOccurrenceRecorder,
        private ontology: OntologyNode[],
        private attributeIndex: Map<string, OntologyAttribute>,
        private readonly usageRecorder: { getUnknownSamples(): Map<string, unknown[]> }
    ) {}

    setOntology(ontology: OntologyNode[]): void {
        this.ontology = ontology;
    }

    setAttributeIndex(index: Map<string, OntologyAttribute>): void {
        this.attributeIndex = index;
    }

    getContextualSuggestions(existingKeys: string[], limit = 5): SuggestedAttribute[] {
        const scoreMap = new Map<string, number>();
        const canonicalKeys = existingKeys.map(k => getCanonicalKey(k, this.ontology));

        for (const key of canonicalKeys) {
            const coMap = this.recorder.getCoOccurrence(key);
            if (coMap) {
                for (const [neighbor, count] of coMap.entries()) {
                    if (!canonicalKeys.includes(neighbor)) {
                        scoreMap.set(neighbor, (scoreMap.get(neighbor) || 0) + count);
                    }
                }
            }
        }

        return Array.from(scoreMap.entries())
            .map(([key, score]) => {
                let type: string = 'string';
                const attr = this.attributeIndex.get(key);
                if (attr) {
                    type = attr.type;
                } else {
                    const values = this.usageRecorder.getUnknownSamples().get(key);
                    type = inferPropertyType(key, values || []);
                }

                return {
                    key,
                    type,
                    frequency: score,
                    confidence: Math.min(0.95, score / 10),
                    parentContext: 'Contextual'
                };
            })
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);
    }
}