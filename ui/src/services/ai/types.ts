import type {Note, OntologyAttribute, OntologyNode} from '@notention/core';

export interface AIProvider {
    name: string;
    isAvailable: boolean;

    /**
     * Generates a text completion for a given prompt.
     */
    generateCompletion(prompt: string): Promise<string>;

    /**
     * Analyzes a set of notes to infer ontology attributes.
     * Optionally accepts a context (concept name) to guide analysis.
     * Returns a list of inferred attributes (key, type, stats).
     */
    analyzeOntology(notes: Note[], context?: string): Promise<InferredAttribute[]>;

    /**
     * Analyzes the current ontology to identify redundancies or improvements.
     * Returns a report of actions to take.
     */
    optimizeOntology(ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }>;

    /**
     * Suggests tags for a given text.
     * Optionally takes the current ontology to encourage reuse of terms.
     */
    suggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]>;

    /**
     * Analyzes text and extracts semantic properties based on the ontology.
     * Returns an array of formatted strings like "[key:operator:value]".
     */
    alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]>;
}

export interface InferredAttribute {
    key: string;
    type: OntologyAttribute['type'];
    description?: string;
    usageCount: number;
    sampleValues: string[];
}
