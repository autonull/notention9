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
    const flatOntology = flattenOntology(ontology);

    return notes.flatMap(note =>
        note.properties.flatMap(prop => {
            const attr = flatOntology[prop.key];
            if (!attr) return [];

            return prop.values
                .map(val => validateType(val, attr.type))
                .filter((error): error is string => error !== null)
                .map(error => ({
                    noteId: note.id,
                    noteTitle: note.title,
                    propertyKey: prop.key,
                    expectedType: attr.type,
                    actualValue: prop.values.find(val => validateType(val, attr.type) === error)!,
                    reason: error
                }));
        })
    );
};

const flattenOntology = (nodes: OntologyNode[]): Record<string, OntologyAttribute> => {
    return nodes.reduce((map, node) => {
        if (node.attributes) {
            Object.assign(map, node.attributes);
        }
        if (node.children) {
            Object.assign(map, flattenOntology(node.children));
        }
        return map;
    }, {} as Record<string, OntologyAttribute>);
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
