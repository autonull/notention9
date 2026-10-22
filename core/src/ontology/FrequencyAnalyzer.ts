import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { inferPropertyType } from '../utils/inference.js';
import { findNodeIdForAttribute, findNode } from './ontologyCore.js';
import type { SuggestedAttribute } from './statistics.js';
import { UsageRecorder } from './UsageRecorder.js';
import { CoOccurrenceRecorder } from './CoOccurrenceRecorder.js';

/**
 * Analyzes usage frequency to generate suggestions
 */
export class FrequencyAnalyzer {
    constructor(
        private readonly recorder: UsageRecorder,
        private readonly coOccurrenceRecorder: CoOccurrenceRecorder,
        private ontology: OntologyNode[],
        private attributeIndex: Map<string, OntologyAttribute>
    ) {}

    setOntology(ontology: OntologyNode[]): void {
        this.ontology = ontology;
    }

    setAttributeIndex(index: Map<string, OntologyAttribute>): void {
        this.attributeIndex = index;
    }

    getSuggestions(minFrequency = 3): SuggestedAttribute[] {
        return Array.from(this.recorder.getUnknown().entries())
            .filter(([_, frequency]) => frequency >= minFrequency)
            .map(([key, frequency]) => {
                const values = this.recorder.getUnknownSamples().get(key) || [];
                const type = inferPropertyType(key, values);

                let likelyContext: string | undefined;
                const coMap = this.coOccurrenceRecorder.getCoOccurrence(key);
                if (coMap) {
                    const bestKey = Array.from(coMap.entries())
                        .reduce((best, current) => current[1] > best[1] ? current : best, ['', 0])[0];

                    if (bestKey) {
                        const nodeId = findNodeIdForAttribute(this.ontology, bestKey);
                        if (nodeId) {
                            const node = findNode(this.ontology, nodeId);
                            if (node) likelyContext = node.label;
                        }
                    }
                }

                return {
                    key,
                    type,
                    frequency,
                    confidence: Math.min(0.9, frequency / 10),
                    parentContext: likelyContext
                };
            })
            .sort((a, b) => b.frequency - a.frequency);
    }
}