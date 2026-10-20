import type {OntologyNode} from '@notention/core';
import {findAttributeDef} from '@notention/core';
import type {AIProvider, PropertyProposal} from './types';

const ONTOLOGY_CONFIDENCE = 0.85;
const UNKNOWN_KEY_CONFIDENCE = 0.6;

/**
 * Confidence is estimated from ontology coverage: a key the ontology already
 * knows is a safer proposal than a key invented from the text.
 */
export const confidenceFor = (key: string, ontology: OntologyNode[]): number =>
    findAttributeDef(key, ontology) ? ONTOLOGY_CONFIDENCE : UNKNOWN_KEY_CONFIDENCE;

/**
 * Turn free text into structured property proposals.
 * The provider stays behind its interface; no component sees bracket syntax.
 */
export const proposeProperties = async (
    provider: AIProvider,
    text: string,
    ontology: OntologyNode[]
): Promise<PropertyProposal[]> => {
    const properties = await provider.alignToOntology(text, ontology);

    return properties.map(property => ({
        property,
        confidence: confidenceFor(property.key, ontology),
        source: provider.kind,
    }));
};
