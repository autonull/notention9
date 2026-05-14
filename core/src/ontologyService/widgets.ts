import type { OntologyNode, OntologyAttribute, PropertyType } from '../types/index.js';

/**
 * Widget type mapping for UI generation
 */
export type WidgetType =
    | 'text-input'
    | 'number-input'
    | 'datetime-picker'
    | 'date-picker'
    | 'map-picker'
    | 'dropdown'
    | 'contact-selector';

export interface WidgetMetadata {
    type: WidgetType;
    icon?: string;
    options?: string[];  // For dropdowns
    operators: string[];
}

const WIDGET_MAPPING: Record<string, WidgetType> = {
    'string': 'text-input',
    'number': 'number-input',
    'datetime': 'datetime-picker',
    'date': 'date-picker',
    'geo': 'map-picker',
    'enum': 'dropdown'
};

/**
 * Build widget metadata for an ontology attribute
 */
export function buildWidgetMetadata(
    attribute: OntologyAttribute
): WidgetMetadata {
    const widgetType = WIDGET_MAPPING[attribute.type] || 'text-input';

    return {
        type: widgetType,
        icon: attribute.icon,
        options: attribute.type === 'enum' ? attribute.options : undefined,
        operators: [...attribute.operators.real, ...attribute.operators.imaginary]
    };
}

/**
 * Get all attributes that support a specific operator
 */
export function getAttributesByOperator(
    attributeIndex: Map<string, OntologyAttribute>,
    operator: string
): Array<{ key: string; attribute: OntologyAttribute }> {
    return Array.from(attributeIndex)
        .filter(([_, attr]) =>
            attr.operators.real.includes(operator) || attr.operators.imaginary.includes(operator)
        )
        .map(([key, attribute]) => ({ key, attribute }));
}

/**
 * Get enum options for an attribute
 */
export function getEnumOptions(
    attributeIndex: Map<string, OntologyAttribute>,
    attributeKey: string
): string[] | null {
    const attr = attributeIndex.get(attributeKey);
    if (!attr || attr.type !== 'enum') return null;
    return attr.options || [];
}

/**
 * Get all attributes of a specific type
 */
export function getAttributesByType(
    attributeIndex: Map<string, OntologyAttribute>,
    type: string
): Map<string, OntologyAttribute> {
    return new Map(
        Array.from(attributeIndex.entries()).filter(([_, attr]) => attr.type === type)
    );
}

/**
 * Get valid operators for an attribute
 */
export function getValidOperators(
    attributeIndex: Map<string, OntologyAttribute>,
    attributeKey: string,
    type: 'real' | 'imaginary' | 'all' = 'all'
): string[] {
    const attr = attributeIndex.get(attributeKey);
    if (!attr) return [];

    switch (type) {
        case 'real': return attr.operators.real;
        case 'imaginary': return attr.operators.imaginary;
        default: return [...attr.operators.real, ...attr.operators.imaginary];
    }
}
