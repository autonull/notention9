import { Note, OntologyNode, OntologyAttribute } from './types/index.js';

export interface Conflict {
    noteId: string;
    noteTitle: string;
    propertyKey: string;
    expectedType: string;
    actualValue: string;
    reason: string;
}

export const detectConflicts = (notes: Note[], ontology: OntologyNode[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    const flatOntology = flattenOntology(ontology);

    notes.forEach(note => {
        note.properties.forEach(prop => {
            const attr = flatOntology[prop.key];
            if (attr) {
                // Check type
                prop.values.forEach(val => {
                    const error = validateType(val, attr.type);
                    if (error) {
                        conflicts.push({
                            noteId: note.id,
                            noteTitle: note.title,
                            propertyKey: prop.key,
                            expectedType: attr.type,
                            actualValue: val,
                            reason: error
                        });
                    }
                });
            }
        });
    });

    return conflicts;
};

// Helper to flatten ontology to key -> attribute map
const flattenOntology = (nodes: OntologyNode[]): Record<string, OntologyAttribute> => {
    let map: Record<string, OntologyAttribute> = {};
    nodes.forEach(node => {
        if (node.attributes) {
            Object.assign(map, node.attributes);
        }
        if (node.children) {
            Object.assign(map, flattenOntology(node.children));
        }
    });
    return map;
};

const validateType = (value: string, type: string): string | null => {
    if (type === 'number') {
        // Allow optional units e.g. "100 km" - simplistic check for now
        // But strict semantic usually implies raw values or structured values.
        // Let's assume strict number for now, or start of string is number.
        if (isNaN(parseFloat(value))) {
             return 'Not a number';
        }
    }
    if (type === 'date' || type === 'datetime') {
        if (isNaN(Date.parse(value))) {
            return 'Not a valid date';
        }
    }
    // Enum check could be added if we had options in the flattened map
    return null;
};
