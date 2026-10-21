import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { UsageRecorder } from './UsageRecorder.js';
import { CoOccurrenceRecorder } from './CoOccurrenceRecorder.js';
import { FrequencyAnalyzer } from './FrequencyAnalyzer.js';
import { CoOccurrenceAnalyzer } from './CoOccurrenceAnalyzer.js';
import { GraphDataBuilder } from './GraphDataBuilder.js';

export interface SuggestedAttribute {
    key: string;
    type: string;
    frequency: number;
    confidence: number;
    parentContext?: string;
}

/**
 * Tracks usage statistics for ontology attributes
 * Composed from modular components for separation of concerns
 */
export class UsageTracker {
    private readonly recorder: UsageRecorder;
    private readonly coOccurrence: CoOccurrenceRecorder;
    private readonly frequencyAnalyzer: FrequencyAnalyzer;
    private readonly coOccurrenceAnalyzer: CoOccurrenceAnalyzer;
    private readonly graphDataBuilder: GraphDataBuilder;

    constructor(ontology: OntologyNode[] = [], attributeIndex?: Map<string, OntologyAttribute>) {
        this.recorder = new UsageRecorder(ontology);
        this.coOccurrence = new CoOccurrenceRecorder();
        this.frequencyAnalyzer = new FrequencyAnalyzer(this.recorder, this.coOccurrence, ontology, attributeIndex ?? new Map());
        this.coOccurrenceAnalyzer = new CoOccurrenceAnalyzer(
            this.coOccurrence,
            ontology,
            attributeIndex ?? new Map(),
            this.recorder
        );
        this.graphDataBuilder = new GraphDataBuilder(
            attributeIndex ?? new Map(),
            this.coOccurrence,
            this.recorder
        );
    }

    /**
     * Record usage of property keys
     */
    record(properties: Array<{ key: string; values?: unknown[] }>): void {
        this.recorder.record(properties);
        this.coOccurrence.record(properties);
    }

    /**
     * Get suggested attributes based on usage frequency
     */
    getSuggestions(
        ontology: OntologyNode[],
        attributeIndex: Map<string, OntologyAttribute>,
        minFrequency = 3
    ): SuggestedAttribute[] {
        this.frequencyAnalyzer.setOntology(ontology);
        this.frequencyAnalyzer.setAttributeIndex(attributeIndex);
        return this.frequencyAnalyzer.getSuggestions(minFrequency);
    }

    /**
     * Get contextual suggestions based on co-occurrence
     */
    getContextualSuggestions(
        existingKeys: string[],
        ontology: OntologyNode[],
        attributeIndex: Map<string, OntologyAttribute>,
        limit = 5
    ): SuggestedAttribute[] {
        this.coOccurrenceAnalyzer.setOntology(ontology);
        this.coOccurrenceAnalyzer.setAttributeIndex(attributeIndex);
        return this.coOccurrenceAnalyzer.getContextualSuggestions(existingKeys, limit);
    }

    /**
     * Get graph data for visualization
     */
    getGraphData() {
        return this.graphDataBuilder.getGraphData();
    }

    /**
     * Get usage statistics
     */
    getStats(): { known: Map<string, number>; unknown: Map<string, number> } {
        return {
            known: this.recorder.getKnown(),
            unknown: this.recorder.getUnknown()
        };
    }

    /**
     * Get co-occurrence data for graph visualization
     */
    getCoOccurrenceData(): Map<string, Map<string, number>> {
        return this.coOccurrence.getCoOccurrenceData();
    }
}