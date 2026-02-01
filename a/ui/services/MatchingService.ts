import type { Note, Property, OntologyNode } from '@notention/core';
import { MatchingEngine } from '@notention/core';

// Thin wrapper extending Core Engine to use in UI
export class MatchingService extends MatchingEngine {
    constructor(ontology?: OntologyNode[]) {
        super(ontology);
    }

    // Methods are inherited from MatchingEngine:
    // matchNotes, calculateSemanticOverlap, checkConstraint, etc.
}

// Singleton for UI usage
// Note: In a real app, this should probably be provided via Context to inject the current ontology
export const matchingService = new MatchingService();

// Helper to update the ontology in the singleton if needed (though Context is better)
export const updateMatchingOntology = (ontology: OntologyNode[]) => {
    (matchingService as any).ontology = ontology;
};
