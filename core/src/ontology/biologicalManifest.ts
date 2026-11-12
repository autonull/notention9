import type { OntologyNode, OntologyAttribute } from '../types/index.js';

/**
 * BiologicalManifest - Survival needs, tolerances, and modifiers for individuals and groups.
 * 
 * This represents the biological requirements and constraints of a person or group
 * in a survival context. It includes:
 * - needs: Essential requirements (water, food, medication, etc.)
 * - tolerances: Environmental conditions the person can withstand
 * - modifiers: Factors that affect needs/tolerances (age, condition, equipment, etc.)
 */

export interface BiologicalNeed {
    /** Unique identifier for this need */
    id: string;
    /** Category of need */
    category: 'water' | 'food' | 'medication' | 'oxygen' | 'warmth' | 'cooling' | 'sanitation' | 'sleep' | 'mobility' | 'communication' | 'power' | 'other';
    /** Specific item or requirement */
    item: string;
    /** Quantity needed per time period */
    quantity: number;
    /** Unit of measurement */
    unit: string;
    /** Time period for the quantity (e.g., 'day', 'hour', 'week') */
    period: string;
    /** Urgency level */
    urgency: 'critical' | 'urgent' | 'normal' | 'low';
    /** Whether this need is currently met */
    met: boolean;
    /** Current available quantity */
    available?: number;
    /** Notes about this need */
    notes?: string;
    /** Ontology attribute key for matching */
    ontologyKey?: string;
}

export interface BiologicalTolerance {
    /** Unique identifier */
    id: string;
    /** Environmental factor */
    factor: 'heat' | 'cold' | 'radiation' | 'altitude' | 'humidity' | 'air-quality' | 'noise' | 'light' | 'motion' | 'pathogen' | 'chemical' | 'other';
    /** Maximum tolerable level */
    maxLevel: number;
    /** Unit of measurement */
    unit: string;
    /** Current exposure level */
    currentLevel?: number;
    /** Whether tolerance is currently breached */
    breached: boolean;
    /** Consequence of breach */
    consequence?: string;
    /** Notes */
    notes?: string;
    /** Ontology attribute key for matching */
    ontologyKey?: string;
}

export interface BiologicalModifier {
    /** Unique identifier */
    id: string;
    /** Type of modifier */
    type: 'age' | 'condition' | 'medication' | 'equipment' | 'training' | 'acclimatization' | 'pregnancy' | 'injury' | 'fatigue' | 'morale' | 'other';
    /** Description of the modifier */
    description: string;
    /** Effect on needs (multiplier, e.g., 1.5 = 50% more needed) */
    needMultiplier?: number;
    /** Effect on tolerances (offset, e.g., -5 = 5 degrees less heat tolerance) */
    toleranceOffset?: number;
    /** Specific needs affected (empty = all) */
    affectedNeeds?: string[];
    /** Specific tolerances affected (empty = all) */
    affectedTolerances?: string[];
    /** Whether this modifier is currently active */
    active: boolean;
    /** Notes */
    notes?: string;
}

export interface BiologicalProfile {
    /** Unique identifier for this profile */
    id: string;
    /** Display name */
    name: string;
    /** Optional: link to person/entity in ontology */
    personId?: string;
    /** Biological needs */
    needs: BiologicalNeed[];
    /** Environmental tolerances */
    tolerances: BiologicalTolerance[];
    /** Modifiers affecting needs/tolerances */
    modifiers: BiologicalModifier[];
    /** Created timestamp */
    createdAt: string;
    /** Updated timestamp */
    updatedAt: string;
    /** Version for migrations */
    version: number;
}

export interface GroupManifest {
    /** Unique identifier */
    id: string;
    /** Group name */
    name: string;
    /** Member profiles */
    members: BiologicalProfile[];
    /** Aggregate needs (computed from members) */
    aggregateNeeds: BiologicalNeed[];
    /** Aggregate tolerances (most restrictive) */
    aggregateTolerances: BiologicalTolerance[];
    /** Group-level modifiers (e.g., shared equipment, group morale) */
    groupModifiers: BiologicalModifier[];
    /** Created timestamp */
    createdAt: string;
    /** Updated timestamp */
    updatedAt: string;
    /** Version for migrations */
    version: number;
}

/**
 * Export format for BiologicalManifest (JSON/QR)
 */
export interface ManifestExport {
    /** Schema version */
    version: 1;
    /** Export timestamp */
    exportedAt: string;
    /** Profile or group */
    type: 'profile' | 'group';
    /** The manifest data */
    data: BiologicalProfile | GroupManifest;
}

/**
 * Create an empty BiologicalProfile
 */
export const createBiologicalProfile = (overrides?: Partial<BiologicalProfile>): BiologicalProfile => ({
    id: crypto.randomUUID(),
    name: 'New Profile',
    needs: [],
    tolerances: [],
    modifiers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides
});

/**
 * Create an empty GroupManifest
 */
export const createGroupManifest = (overrides?: Partial<GroupManifest>): GroupManifest => ({
    id: crypto.randomUUID(),
    name: 'New Group',
    members: [],
    aggregateNeeds: [],
    aggregateTolerances: [],
    groupModifiers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides
});

/**
 * Default needs for common biological profiles
 */
export const DEFAULT_BIOLOGICAL_PROFILES: Record<string, Partial<BiologicalProfile>> = {
    infant: {
        name: 'Infant (0-1 year)',
        needs: [
            { id: crypto.randomUUID(), category: 'food', item: 'Formula/breast milk', quantity: 750, unit: 'ml', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'water', item: 'Water (for formula)', quantity: 500, unit: 'ml', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'warmth', item: 'Temperature-controlled environment', quantity: 1, unit: 'environment', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'sanitation', item: 'Diapers', quantity: 8, unit: 'units', period: 'day', urgency: 'urgent', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'sleep', item: 'Sleep', quantity: 14, unit: 'hours', period: 'day', urgency: 'normal', met: false, ontologyKey: 'need' },
        ],
        tolerances: [
            { id: crypto.randomUUID(), factor: 'heat', maxLevel: 28, unit: 'celsius', breached: false, consequence: 'Heat stroke risk', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'cold', maxLevel: 20, unit: 'celsius', breached: false, consequence: 'Hypothermia risk', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'pathogen', maxLevel: 0, unit: 'exposure', breached: false, consequence: 'Severe infection risk', ontologyKey: 'tolerance' },
        ],
        modifiers: [
            { id: crypto.randomUUID(), type: 'age', description: 'Infant (0-1 year)', needMultiplier: 1.5, toleranceOffset: -5, active: true },
            { id: crypto.randomUUID(), type: 'condition', description: 'Immature immune system', needMultiplier: 1.0, toleranceOffset: -10, affectedTolerances: ['pathogen'], active: true },
        ]
    },
    elderly: {
        name: 'Elderly (75+ years)',
        needs: [
            { id: crypto.randomUUID(), category: 'water', item: 'Water', quantity: 2, unit: 'liters', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'food', item: 'Nutrient-dense food', quantity: 1800, unit: 'kcal', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'medication', item: 'Prescription medications', quantity: 1, unit: 'regimen', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'warmth', item: 'Heated shelter', quantity: 1, unit: 'environment', period: 'day', urgency: 'urgent', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'mobility', item: 'Mobility aid', quantity: 1, unit: 'device', period: 'day', urgency: 'urgent', met: false, ontologyKey: 'need' },
        ],
        tolerances: [
            { id: crypto.randomUUID(), factor: 'heat', maxLevel: 30, unit: 'celsius', breached: false, consequence: 'Heat exhaustion', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'cold', maxLevel: 18, unit: 'celsius', breached: false, consequence: 'Hypothermia', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'motion', maxLevel: 2, unit: 'g-force', breached: false, consequence: 'Fall risk', ontologyKey: 'tolerance' },
        ],
        modifiers: [
            { id: crypto.randomUUID(), type: 'age', description: 'Elderly (75+ years)', needMultiplier: 1.2, toleranceOffset: -3, active: true },
            { id: crypto.randomUUID(), type: 'condition', description: 'Reduced thermoregulation', needMultiplier: 1.0, toleranceOffset: -5, affectedTolerances: ['heat', 'cold'], active: true },
            { id: crypto.randomUUID(), type: 'condition', description: 'Polypharmacy', needMultiplier: 1.0, toleranceOffset: 0, affectedNeeds: ['medication'], active: true },
        ]
    },
    diabetic: {
        name: 'Type 1 Diabetic',
        needs: [
            { id: crypto.randomUUID(), category: 'water', item: 'Water', quantity: 3, unit: 'liters', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'food', item: 'Carbohydrate-counted meals', quantity: 2000, unit: 'kcal', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'medication', item: 'Insulin (rapid + long-acting)', quantity: 1, unit: 'regimen', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'medication', item: 'Glucose monitoring supplies', quantity: 6, unit: 'tests', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'food', item: 'Fast-acting glucose', quantity: 15, unit: 'grams', period: 'day', urgency: 'urgent', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'power', item: 'Refrigeration for insulin', quantity: 1, unit: 'device', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
        ],
        tolerances: [
            { id: crypto.randomUUID(), factor: 'heat', maxLevel: 32, unit: 'celsius', breached: false, consequence: 'Insulin degradation', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'cold', maxLevel: 10, unit: 'celsius', breached: false, consequence: 'Insulin freezing', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'pathogen', maxLevel: 1, unit: 'exposure', breached: false, consequence: 'DKA risk', ontologyKey: 'tolerance' },
        ],
        modifiers: [
            { id: crypto.randomUUID(), type: 'condition', description: 'Type 1 Diabetes', needMultiplier: 1.0, toleranceOffset: 0, active: true },
            { id: crypto.randomUUID(), type: 'equipment', description: 'Insulin pump', needMultiplier: 0.9, toleranceOffset: 0, affectedNeeds: ['medication'], active: true },
            { id: crypto.randomUUID(), type: 'equipment', description: 'CGM (Continuous Glucose Monitor)', needMultiplier: 0.9, toleranceOffset: 0, affectedNeeds: ['medication'], active: true },
        ]
    },
    healthy: {
        name: 'Healthy Adult',
        needs: [
            { id: crypto.randomUUID(), category: 'water', item: 'Water', quantity: 3, unit: 'liters', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'food', item: 'Food', quantity: 2200, unit: 'kcal', period: 'day', urgency: 'critical', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'sleep', item: 'Sleep', quantity: 7, unit: 'hours', period: 'day', urgency: 'normal', met: false, ontologyKey: 'need' },
            { id: crypto.randomUUID(), category: 'sanitation', item: 'Basic sanitation', quantity: 1, unit: 'access', period: 'day', urgency: 'normal', met: false, ontologyKey: 'need' },
        ],
        tolerances: [
            { id: crypto.randomUUID(), factor: 'heat', maxLevel: 35, unit: 'celsius', breached: false, consequence: 'Heat exhaustion', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'cold', maxLevel: 5, unit: 'celsius', breached: false, consequence: 'Hypothermia', ontologyKey: 'tolerance' },
            { id: crypto.randomUUID(), factor: 'altitude', maxLevel: 3000, unit: 'meters', breached: false, consequence: 'Altitude sickness', ontologyKey: 'tolerance' },
        ],
        modifiers: [
            { id: crypto.randomUUID(), type: 'age', description: 'Adult (18-65)', needMultiplier: 1.0, toleranceOffset: 0, active: true },
        ]
    }
};

/**
 * Validate a BiologicalProfile
 */
export const validateProfile = (profile: BiologicalProfile): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!profile.id) errors.push('Profile must have an id');
    if (!profile.name) errors.push('Profile must have a name');
    if (!Array.isArray(profile.needs)) errors.push('Profile needs must be an array');
    if (!Array.isArray(profile.tolerances)) errors.push('Profile tolerances must be an array');
    if (!Array.isArray(profile.modifiers)) errors.push('Profile modifiers must be an array');
    
    profile.needs.forEach((need, i) => {
        if (!need.id) errors.push(`Need ${i} must have an id`);
        if (!need.category) errors.push(`Need ${i} must have a category`);
        if (!need.item) errors.push(`Need ${i} must have an item`);
        if (typeof need.quantity !== 'number') errors.push(`Need ${i} must have a numeric quantity`);
        if (!need.unit) errors.push(`Need ${i} must have a unit`);
        if (!need.period) errors.push(`Need ${i} must have a period`);
    });
    
    profile.tolerances.forEach((tol, i) => {
        if (!tol.id) errors.push(`Tolerance ${i} must have an id`);
        if (!tol.factor) errors.push(`Tolerance ${i} must have a factor`);
        if (typeof tol.maxLevel !== 'number') errors.push(`Tolerance ${i} must have a numeric maxLevel`);
        if (!tol.unit) errors.push(`Tolerance ${i} must have a unit`);
    });
    
    profile.modifiers.forEach((mod, i) => {
        if (!mod.id) errors.push(`Modifier ${i} must have an id`);
        if (!mod.type) errors.push(`Modifier ${i} must have a type`);
        if (!mod.description) errors.push(`Modifier ${i} must have a description`);
    });
    
    return { valid: errors.length === 0, errors };
};

/**
 * Validate a GroupManifest
 */
export const validateGroup = (group: GroupManifest): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!group.id) errors.push('Group must have an id');
    if (!group.name) errors.push('Group must have a name');
    if (!Array.isArray(group.members)) errors.push('Group members must be an array');
    
    group.members.forEach((member, i) => {
        const result = validateProfile(member);
        result.errors.forEach(e => errors.push(`Member ${i}: ${e}`));
    });
    
    return { valid: errors.length === 0, errors };
};

/**
 * Compute aggregate needs from group members
 */
export const computeAggregateNeeds = (members: BiologicalProfile[]): BiologicalNeed[] => {
    const needMap = new Map<string, BiologicalNeed>();
    
    for (const member of members) {
        for (const need of member.needs) {
            const key = `${need.category}:${need.item}:${need.unit}:${need.period}`;
            const existing = needMap.get(key);
            if (existing) {
                existing.quantity += need.quantity;
                existing.urgency = urgencyMax(existing.urgency, need.urgency);
            } else {
                needMap.set(key, { ...need, id: crypto.randomUUID() });
            }
        }
    }
    
    return Array.from(needMap.values());
};

/**
 * Compute aggregate tolerances from group members (most restrictive)
 */
export const computeAggregateTolerances = (members: BiologicalProfile[]): BiologicalTolerance[] => {
    const tolMap = new Map<string, BiologicalTolerance>();
    
    for (const member of members) {
        for (const tol of member.tolerances) {
            const key = `${tol.factor}:${tol.unit}`;
            const existing = tolMap.get(key);
            if (existing) {
                // Most restrictive = lowest maxLevel
                if (tol.maxLevel < existing.maxLevel) {
                    existing.maxLevel = tol.maxLevel;
                    existing.consequence = tol.consequence;
                }
            } else {
                tolMap.set(key, { ...tol, id: crypto.randomUUID() });
            }
        }
    }
    
    return Array.from(tolMap.values());
};

function urgencyMax(a: BiologicalNeed['urgency'], b: BiologicalNeed['urgency']): BiologicalNeed['urgency'] {
    const order = { critical: 4, urgent: 3, normal: 2, low: 1 };
    return order[a] >= order[b] ? a : b;
}

/**
 * Export manifest to JSON string
 */
export const exportManifest = (data: BiologicalProfile | GroupManifest, type: 'profile' | 'group'): string => {
    const exportData: ManifestExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        type,
        data
    };
    return JSON.stringify(exportData, null, 2);
};

/**
 * Import manifest from JSON string
 */
export const importManifest = (json: string): ManifestExport => {
    const data = JSON.parse(json);
    if (!data.version || data.version !== 1) {
        throw new Error('Unsupported manifest version');
    }
    if (!data.type || !['profile', 'group'].includes(data.type)) {
        throw new Error('Invalid manifest type');
    }
    if (!data.data) {
        throw new Error('Manifest data missing');
    }
    return data as ManifestExport;
};

/**
 * Generate QR code data URL for manifest (compact JSON)
 */
export const generateManifestQR = (data: BiologicalProfile | GroupManifest, type: 'profile' | 'group'): string => {
    const exportData: ManifestExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        type,
        data
    };
    // Compact JSON for QR
    const compact = JSON.stringify(exportData);
    // Return data URI for QR code generation
    return `data:application/json;base64,${btoa(compact)}`;
};