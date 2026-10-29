import type {Property, MatchResult, OntologyNode} from '@notention/core';
import {collectOntologyKeys} from '@notention/core';

export interface ClarificationQuestion {
    id: string;
    key: string;
    question: string;
    operator: string;
    suggestedValues: string[];
    informationGain: number;
    reason: string;
}

export interface ClarificationContext {
    missingProperties: Property[];
    matchedProperties: Property[];
    ontology: OntologyNode[];
    userText: string;
}

/**
 * Generate clarification questions for missing properties, ranked by information gain.
 * Information gain is estimated based on:
 * 1. Whether the property is required in the ontology
 * 2. Whether the property has high discriminative power (enum with few options)
 * 3. Whether the property was mentioned in user text but not extracted
 * 4. Whether the property is commonly used for matching
 */
export function generateClarificationQuestions(context: ClarificationContext): ClarificationQuestion[] {
    const {missingProperties, ontology, userText} = context;
    const ontologyKeys = collectOntologyKeys(ontology);
    const lowerText = userText.toLowerCase();
    
    return missingProperties
        .map(prop => {
            const attr = findAttributeInOntology(ontology, prop.key);
            const isRequired = isRequiredInOntology(ontology, prop.key);
            const isInOntology = ontologyKeys.has(prop.key);
            
            // Calculate information gain
            let gain = 0;
            const reasons: string[] = [];
            
            // Required properties have highest gain
            if (isRequired) {
                gain += 100;
                reasons.push('required');
            }
            
            // Properties in ontology with enum types have high gain (disambiguation)
            if (attr?.type === 'enum' && attr.options && attr.options.length > 0) {
                gain += 50;
                reasons.push(`enum:${attr.options.length} options`);
            }
            
            // Properties mentioned in text but not extracted have high gain
            if (prop.values.some(v => lowerText.includes(v.toLowerCase()))) {
                gain += 40;
                reasons.push('mentioned in text');
            }
            
            // Numeric/quantity properties have good discriminative power
            if (attr?.type === 'number' || attr?.type === 'quantity') {
                gain += 30;
                reasons.push('numeric');
            }
            
            // Date properties are high value for matching
            if (attr?.type === 'date') {
                gain += 35;
                reasons.push('date');
            }
            
            // Location properties are high value
            if (prop.key === 'location' || prop.key === 'coordinates') {
                gain += 35;
                reasons.push('location');
            }
            
            // Budget/price are high value for commerce matching
            if (['budget', 'price', 'rate', 'cost'].includes(prop.key)) {
                gain += 30;
                reasons.push('commercial');
            }
            
            // Default gain for any missing property
            if (gain === 0) {
                gain = 10;
            }
            
            const question = generateQuestion(prop, attr);
            const suggestedValues = generateSuggestedValues(prop, attr, userText);
            
            return {
                id: `clarify-${prop.key}-${prop.operator}-${prop.values.join(',')}`,
                key: prop.key,
                question,
                operator: prop.operator,
                suggestedValues,
                informationGain: gain,
                reason: reasons.join(', ') || 'missing property',
            };
        })
        .sort((a, b) => b.informationGain - a.informationGain);
}

function findAttributeInOntology(ontology: OntologyNode[], key: string): OntologyNode['attributes'][string] | undefined {
    for (const node of ontology) {
        if (node.attributes?.[key]) {
            return node.attributes[key];
        }
        if (node.children) {
            const found = findAttributeInOntology(node.children, key);
            if (found) return found;
        }
    }
    return undefined;
}

function isRequiredInOntology(ontology: OntologyNode[], key: string): boolean {
    for (const node of ontology) {
        if (node.requiredAttributes?.includes(key)) {
            return true;
        }
        if (node.children) {
            if (isRequiredInOntology(node.children, key)) return true;
        }
    }
    return false;
}

function generateQuestion(prop: Property, attr?: OntologyNode['attributes'][string]): string {
    const keyLabel = prop.key.replace(/([A-Z])/g, ' $1').toLowerCase();
    
    if (attr?.type === 'enum' && attr.options && attr.options.length > 0) {
        return `Which ${keyLabel}? (${attr.options.join(', ')})`;
    }
    
    switch (prop.operator) {
        case 'is':
            return `What ${keyLabel}?`;
        case 'contains':
            return `What ${keyLabel} does it contain?`;
        case 'greater than':
            return `What is the minimum ${keyLabel}?`;
        case 'less than':
            return `What is the maximum ${keyLabel}?`;
        case 'between':
            return `What is the ${keyLabel} range?`;
        case 'is not':
            return `What ${keyLabel} should be excluded?`;
        case 'is near':
            return `Where is the ${keyLabel}?`;
        default:
            return `What ${keyLabel}?`;
    }
}

function generateSuggestedValues(prop: Property, attr?: OntologyNode['attributes'][string], userText?: string): string[] {
    if (attr?.type === 'enum' && attr.options && attr.options.length > 0) {
        return attr.options;
    }
    
    if (attr?.type === 'number' || attr?.type === 'quantity') {
        return [];
    }
    
    if (attr?.type === 'date') {
        return ['today', 'tomorrow', 'next week'];
    }
    
    if (prop.key === 'channel') {
        return ['email', 'phone', 'whatsapp', 'telegram', 'slack'];
    }
    
    // Return existing values as suggestions
    return prop.values;
}

/**
 * Track clarification outcomes for learning
 */
export interface ClarificationOutcome {
    questionId: string;
    key: string;
    answered: boolean;
    changedOutcome: boolean;
    timestamp: number;
}

const OUTCOME_STORAGE_KEY = 'clarification-outcomes';

export function recordClarificationOutcome(outcome: ClarificationOutcome): void {
    try {
        const stored = localStorage.getItem(OUTCOME_STORAGE_KEY);
        const outcomes: ClarificationOutcome[] = stored ? JSON.parse(stored) : [];
        outcomes.push(outcome);
        // Keep last 1000 outcomes
        if (outcomes.length > 1000) outcomes.shift();
        localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(outcomes));
    } catch {
        // Ignore storage errors
    }
}

export function getClarificationStats(): Map<string, {asked: number, changed: number}> {
    try {
        const stored = localStorage.getItem(OUTCOME_STORAGE_KEY);
        if (!stored) return new Map();
        
        const outcomes: ClarificationOutcome[] = JSON.parse(stored);
        const stats = new Map<string, {asked: number, changed: number}>();
        
        for (const o of outcomes) {
            const existing = stats.get(o.key) || {asked: 0, changed: 0};
            existing.asked++;
            if (o.changedOutcome) existing.changed++;
            stats.set(o.key, existing);
        }
        
        return stats;
    } catch {
        return new Map();
    }
}

export function getClarificationValueRate(): number {
    const stats = getClarificationStats();
    let totalAsked = 0;
    let totalChanged = 0;
    
    for (const {asked, changed} of stats.values()) {
        totalAsked += asked;
        totalChanged += changed;
    }
    
    return totalAsked > 0 ? totalChanged / totalAsked : 0;
}