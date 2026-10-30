import type { OntologyNode, OntologyAttribute, Property, Note, NoteSource } from '../types/index.js';
import type { Seam } from '../ui/strategy.js';
import { DEFAULT_ONTOLOGY } from '../ontology/domains.js';

/**
 * Creates a minimal mock ontology for testing
 */
export function createMockOntology(overrides: Partial<OntologyNode>[] = []): OntologyNode[] {
    const baseOntology: OntologyNode[] = [
        {
            id: 'test-root',
            label: 'Test Root',
            description: 'Test ontology root',
            attributes: {
                name: {
                    type: 'string',
                    description: 'Name',
                    operators: { real: ['is'], imaginary: ['is not'] },
                },
                value: {
                    type: 'number',
                    description: 'Numeric value',
                    operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                },
                status: {
                    type: 'enum',
                    options: ['active', 'inactive'],
                    description: 'Status',
                    operators: { real: ['is'], imaginary: ['is not'] },
                },
                channel: {
                    type: 'enum',
                    options: ['email', 'whatsapp', 'slack'],
                    description: 'Communication channel',
                    operators: { real: ['is'], imaginary: ['is not'] },
                },
            },
            children: [],
        },
    ];

    return baseOntology.map((node, i) => ({
        ...node,
        ...overrides[i],
    }));
}

/**
 * Creates a mock note with sensible defaults
 */
export function createMockNote(overrides: Partial<Note> = {}): Note {
    const now = new Date().toISOString();
    return {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        properties: [],
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        source: {
            type: 'user',
            identifier: 'test-user',
            timestamp: Date.now(),
        },
        privacy: 'private',
        priority: 0,
        ...overrides,
    };
}

/**
 * Creates a mock property
 */
export function createMockProperty(
    key: string,
    operator: string = 'is',
    values: string[] = ['test'],
    overrides: Partial<Property> = {}
): Property {
    return {
        key,
        operator,
        values,
        ...overrides,
    };
}

/**
 * Creates a mock seam for testing strategies
 */
export function createMockSeam(overrides: Partial<Seam> = {}): Seam {
    return {
        id: 'test-seam',
        name: 'test-seam',
        description: 'Test seam',
        propsShape: {},
        components: ['TestComponent'],
        role: 'capture',
        ...overrides,
    };
}

/**
 * Creates a mock strategy for testing
 */
export function createMockStrategy(
    seamRole: Seam['role'] = 'capture',
    overrides: Record<string, unknown> = {}
) {
    const seam = createMockSeam({ role: seamRole });
    return {
        id: `mock-strategy-${seamRole}`,
        seam,
        version: '1.0.0',
        params: {},
        render: (props: Record<string, unknown>) => props as never,
        getDefaultProps: () => ({}),
        ...overrides,
    };
}

/**
 * Creates a mock note source
 */
export function createMockNoteSource(overrides: Partial<NoteSource> = {}): NoteSource {
    return {
        type: 'user',
        identifier: 'test-user',
        timestamp: Date.now(),
        ...overrides,
    };
}

/**
 * Asserts that a property matches expected values
 */
export function assertPropertyMatch(
    actual: Property,
    expected: { key: string; operator?: string; values?: string[]; unit?: string }
): { pass: boolean; message: string } {
    if (actual.key !== expected.key) {
        return { pass: false, message: `Expected key "${expected.key}", got "${actual.key}"` };
    }
    if (expected.operator !== undefined && actual.operator !== expected.operator) {
        return { pass: false, message: `Expected operator "${expected.operator}", got "${actual.operator}"` };
    }
    if (expected.values !== undefined) {
        const valuesMatch = JSON.stringify(actual.values) === JSON.stringify(expected.values);
        if (!valuesMatch) {
            return { pass: false, message: `Expected values ${JSON.stringify(expected.values)}, got ${JSON.stringify(actual.values)}` };
        }
    }
    if (expected.unit !== undefined && actual.unit !== expected.unit) {
        return { pass: false, message: `Expected unit "${expected.unit}", got "${actual.unit}"` };
    }
    return { pass: true, message: 'Property matches' };
}

/**
 * Default ontology for testing (re-exported from core)
 */
export { DEFAULT_ONTOLOGY };

/**
 * Type guard for test utilities
 */
export function isMockNote(obj: unknown): obj is Note {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'title' in obj &&
        'properties' in obj
    );
}

/**
 * Creates a mock ontology attribute
 */
export function createMockAttribute(
    type: string,
    overrides: Partial<OntologyAttribute> = {}
): OntologyAttribute {
    return {
        type,
        operators: { real: ['is'], imaginary: ['is not'] },
        ...overrides,
    };
}

/**
 * Async test helper with timeout (re-exported from utils)
 */
export { withTimeout } from '../utils/async.js';

/**
 * Creates multiple mock notes
 */
export function createMockNotes(count: number, baseOverrides: Partial<Note> = {}): Note[] {
    return Array.from({ length: count }, (_, i) =>
        createMockNote({
            ...baseOverrides,
            id: `note-${i}`,
            title: `Test Note ${i}`,
        })
    );
}

/**
 * Creates a mock property array for testing
 */
export function createMockProperties(properties: Array<{ key: string; operator?: string; values?: string[] }>): Property[] {
    return properties.map(p =>
        createMockProperty(p.key, p.operator, p.values)
    );
}