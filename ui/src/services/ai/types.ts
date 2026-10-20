import type {Note, OntologyAttribute, OntologyNode, Property} from '@notention/core';

/**
 * Where a provider runs and how much it can be trusted.
 * - heuristic: deterministic rules, no model
 * - local-model: a model running in this browser
 * - remote: a model running on someone else's machine (text leaves the device)
 */
export type ProviderKind = 'heuristic' | 'local-model' | 'remote';

export interface AIProvider {
    name: string;
    kind: ProviderKind;
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
     * Extracts structured properties from text, grounded in the ontology.
     * Returns property objects; callers own serialization.
     */
    alignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]>;
}

export interface InferredAttribute {
    key: string;
    type: OntologyAttribute['type'];
    description?: string;
    usageCount: number;
    sampleValues: string[];
}

/**
 * A property a provider proposed, with the confidence of the proposal.
 * The property is structured data; serialization stays with the caller.
 */
export interface PropertyProposal {
    property: Property;
    confidence: number;
    source: ProviderKind;
}
