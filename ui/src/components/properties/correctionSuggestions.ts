/**
 * Correction Suggestions for Property Extraction Errors
 * 
 * Detects common extraction error patterns and provides one-tap fixes.
 * Based on friction journal analysis of top correction types.
 */

import type { Property, OntologyNode } from '@notention/core';

export interface CorrectionSuggestion {
    type: 'key' | 'operator' | 'value';
    message: string;
    action: () => Property;
    confidence: number; // 0-1
}

/**
 * Common confusion pairs from extraction analysis
 */
export const CONFUSION_PAIRS: Record<string, string[]> = {
    // Budget/Price confusion
    'price': ['budget'],
    'budget': ['price'],
    'cost': ['budget', 'price'],
    'amount': ['budget', 'price'],
    
    // Schedule/Frequency confusion
    'schedule': ['frequency'],
    'frequency': ['schedule', 'interval'],
    'interval': ['frequency', 'schedule'],
    'recurrence': ['frequency'],
    
    // Missing context properties that often need to be added
    'student': [],
    'vehicle': [],
    'format': [],
    'audience': [],
    'role': [],
    'location': [],
    'deadline': [],
};

/**
 * Properties that are commonly missing when certain keys are present
 */
export const IMPLIED_PROPERTIES: Record<string, string[]> = {
    'price': ['budget', 'currency'],
    'budget': ['price', 'currency'],
    'schedule': ['frequency', 'deadline'],
    'frequency': ['schedule', 'interval'],
    'student': ['role', 'format'],
    'vehicle': ['location', 'format'],
    'format': ['audience', 'student'],
    'audience': ['format', 'role'],
    'role': ['student', 'experience'],
    'location': ['vehicle', 'format'],
    'deadline': ['schedule', 'frequency'],
};

/**
 * Operator corrections for common mistakes
 */
export const OPERATOR_CORRECTIONS: Record<string, { wrong: string; correct: string }[]> = {
    'budget': [
        { wrong: 'is', correct: 'less than' },
        { wrong: 'greater than', correct: 'less than' },
    ],
    'price': [
        { wrong: 'is', correct: 'less than' },
        { wrong: 'greater than', correct: 'less than' },
    ],
    'schedule': [
        { wrong: 'is', correct: 'contains' },
    ],
    'frequency': [
        { wrong: 'is', correct: 'contains' },
    ],
};

/**
 * Detects correction suggestions for a property
 */
export function getCorrectionSuggestions(
    property: Property,
    allProperties: Property[],
    ontology: OntologyNode[]
): CorrectionSuggestion[] {
    const suggestions: CorrectionSuggestion[] = [];
    const existingKeys = new Set(allProperties.map(p => p.key));
    
    // 1. Key confusion suggestions (price ↔ budget, schedule ↔ frequency)
    const confusedKeys = CONFUSION_PAIRS[property.key] || [];
    for (const suggestedKey of confusedKeys) {
        if (!existingKeys.has(suggestedKey)) {
            // Check if the value would be valid for the suggested key
            const attrDef = findAttributeDef(suggestedKey, ontology);
            if (attrDef && isValueValidForAttribute(property.values[0], attrDef)) {
                suggestions.push({
                    type: 'key',
                    message: `Did you mean "${suggestedKey}"?`,
                    action: () => ({
                        ...property,
                        key: suggestedKey,
                        // Adjust operator if needed
                        operator: adjustOperatorForKey(property.operator, property.key, suggestedKey, ontology),
                    }),
                    confidence: 0.85,
                });
            }
        }
    }
    
    // 2. Missing implied properties
    const impliedKeys = IMPLIED_PROPERTIES[property.key] || [];
    for (const impliedKey of impliedKeys) {
        if (!existingKeys.has(impliedKey)) {
            const attrDef = findAttributeDef(impliedKey, ontology);
            if (attrDef) {
                suggestions.push({
                    type: 'key',
                    message: `Missing "${impliedKey}" — often needed with "${property.key}"`,
                    action: () => ({
                        key: impliedKey,
                        operator: getDefaultOperator(impliedKey, ontology),
                        values: [getDefaultValue(impliedKey, ontology)],
                        confidence: 0.7,
                        provenance: 'user',
                    }),
                    confidence: 0.7,
                });
            }
        }
    }
    
    // 3. Operator corrections
    const operatorCorrections = OPERATOR_CORRECTIONS[property.key] || [];
    for (const correction of operatorCorrections) {
        if (property.operator === correction.wrong) {
            suggestions.push({
                type: 'operator',
                message: `Use "${correction.correct}" for "${property.key}"?`,
                action: () => ({
                    ...property,
                    operator: correction.correct,
                }),
                confidence: 0.8,
            });
        }
    }
    
    // 4. Value format corrections
    const valueSuggestions = getValueCorrections(property, ontology);
    suggestions.push(...valueSuggestions);
    
    // Sort by confidence descending
    return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Checks if a value would be valid for an attribute
 */
function isValueValidForAttribute(value: string, attrDef: any): boolean {
    if (!value) return false;
    
    switch (attrDef.type) {
        case 'number':
            return !isNaN(Number(value.replace(/[$,]/g, '')));
        case 'date':
        case 'datetime':
            return !isNaN(Date.parse(value));
        case 'boolean':
            return ['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase());
        case 'enum':
            return attrDef.options?.includes(value) ?? true;
        default:
            return true;
    }
}

/**
 * Adjusts operator when changing key
 */
function adjustOperatorForKey(
    currentOperator: string,
    oldKey: string,
    newKey: string,
    ontology: OntologyNode[]
): string {
    const newAttrDef = findAttributeDef(newKey, ontology);
    if (!newAttrDef) return currentOperator;
    
    const validOperators = [...newAttrDef.operators.real, ...newAttrDef.operators.imaginary];
    if (validOperators.includes(currentOperator)) return currentOperator;
    
    // Return first valid operator
    return validOperators[0] || 'is';
}

/**
 * Gets default operator for a key
 */
function getDefaultOperator(key: string, ontology: OntologyNode[]): string {
    const attrDef = findAttributeDef(key, ontology);
    if (!attrDef) return 'is';
    return attrDef.operators.real[0] || 'is';
}

/**
 * Gets default value for a key
 */
function getDefaultValue(key: string, ontology: OntologyNode[]): string {
    const attrDef = findAttributeDef(key, ontology);
    if (!attrDef) return '';
    
    switch (attrDef.type) {
        case 'number':
            return '0';
        case 'boolean':
            return 'true';
        case 'enum':
            return attrDef.options?.[0] || '';
        default:
            return '';
    }
}

/**
 * Value-specific corrections
 */
function getValueCorrections(property: Property, ontology: OntologyNode[]): CorrectionSuggestion[] {
    const suggestions: CorrectionSuggestion[] = [];
    const value = property.values[0] || '';
    
    // Price/Budget: add $ if missing for number types
    if (['price', 'budget', 'cost', 'amount'].includes(property.key)) {
        const attrDef = findAttributeDef(property.key, ontology);
        if (attrDef?.type === 'number' && value && !value.match(/^\$?\d/)) {
            suggestions.push({
                type: 'value',
                message: `Add numeric value (e.g., "50" or "$50")`,
                action: () => ({ ...property, values: [''] }),
                confidence: 0.6,
            });
        }
    }
    
    // Date fields: suggest format
    if (['deadline', 'date', 'start', 'end', 'due'].some(k => property.key.toLowerCase().includes(k))) {
        if (value && isNaN(Date.parse(value))) {
            suggestions.push({
                type: 'value',
                message: `Use date format (e.g., "2024-12-31" or "Dec 31, 2024")`,
                action: () => ({ ...property, values: [''] }),
                confidence: 0.7,
            });
        }
    }
    
    return suggestions;
}

/**
 * Finds attribute definition in ontology
 */
function findAttributeDef(key: string, ontology: OntologyNode[]): any {
    for (const node of ontology) {
        if (node.attributes && node.attributes[key]) {
            return node.attributes[key];
        }
        if (node.children) {
            const found = findAttributeDef(key, node.children);
            if (found) return found;
        }
    }
    return undefined;
}