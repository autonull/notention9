export interface OntologyProperty {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'enum' | 'array';
    operators: string[];
    defaultOperator: string;
    allowedValues?: string[];
    constraints?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        min?: number;
        max?: number;
        dependsOn?: string[];
        conflictsWith?: string[];
    };
    description?: string;
    examples?: string[];
    category?: string;
    tags?: string[];
}

export interface OntologyData {
    properties: OntologyProperty[];
    operators: Record<string, string[]>;
}

function extractPropertiesFromNodes(nodes: any[]): OntologyProperty[] {
    const properties: OntologyProperty[] = [];

    function traverse(node: any) {
        if (node.attributes) {
            for (const [attrKey, attr] of Object.entries(node.attributes)) {
                const a = attr as any;
                properties.push({
                    key: attrKey,
                    type: mapAttributeType(a.type),
                    operators: a.operators?.real || ['equals'],
                    defaultOperator: a.operators?.real?.[0] || 'equals',
                    allowedValues: a.options,
                    constraints: a.numericOptions ? {
                        min: a.numericOptions.min,
                        max: a.numericOptions.max,
                    } : undefined,
                    description: a.description,
                    category: node.label,
                });
            }
        }
        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    for (const node of nodes) {
        traverse(node);
    }

    return properties;
}

function mapAttributeType(type: string): OntologyProperty['type'] {
    switch (type) {
        case 'number':
        case 'quantity':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'enum':
        case 'string':
        default:
            return 'string';
    }
}

export class OntologyAdapter {
    async load(): Promise<OntologyData> {
        const { DEFAULT_ONTOLOGY } = await import('@notention/core');
        const properties = extractPropertiesFromNodes(DEFAULT_ONTOLOGY);

        const operators: Record<string, string[]> = {};
        for (const prop of properties) {
            operators[prop.key] = prop.operators;
        }

        return { properties, operators };
    }
}