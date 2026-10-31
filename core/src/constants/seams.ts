/**
 * Single source of truth for seam definitions
 * Used by discovery, synthesis, runtime, and UI
 */

import type { Seam } from '../ui/strategy.js';

/**
 * Semantic seam roles - stable identifiers used across the system
 * Dynamic seam IDs (e.g., 'capture-0') are resolved at runtime from discovered seams
 */
export const SEAM_ROLES = {
    CAPTURE: 'capture',
    ELICIT: 'elicit',
    MATCH: 'match',
    DISPLAY: 'display',
    LAYOUT: 'layout',
    EXPLAIN: 'explain',
    ONTOLOGY: 'ontology',
    INTENT: 'intent',
} as const;

export type SeamRole = typeof SEAM_ROLES[keyof typeof SEAM_ROLES];

/**
 * Built-in seam specifications for synthesis (T1/T2)
 * Keyed by dynamic seam ID (e.g., 'capture-0')
 */
export const BUILTIN_SEAM_SPECS: Record<string, SeamSpec> = {
    'capture-0': {
        id: 'capture-0',
        name: 'Capture',
        description: 'Natural language capture interface',
        role: 'capture',
        propsShape: {
            input: 'string',
            onInputChange: '(value: string) => void',
            onSubmit: '(e: React.FormEvent) => void',
            extractedProps: 'Array<{key: string; values: string[]}>',
            onTemplateClick: '(type: string) => void',
        },
        components: ['QuickCapture', 'DescribeItComposer'],
    },
    'elicit-0': {
        id: 'elicit-0',
        name: 'Elicit',
        description: 'Property elicitation interface',
        role: 'elicit',
        propsShape: {
            onInsert: '(key: string, operator: string, value: string, icon?: string) => void',
            initialKey: 'string',
            initialOperator: 'string',
            initialValue: 'string',
            attributeDef: 'any',
            ontology: 'any[]',
            isEditing: 'boolean',
            onPickLocation: '() => Promise<string>',
            suggestions: 'any[]',
        },
        components: ['TagInput', 'InsertPropertyModal'],
    },
    'match-0': {
        id: 'match-0',
        name: 'Match Display',
        description: 'Match explanation and selection interface',
        role: 'match',
        propsShape: {
            match: 'any',
            onSelectNote: '(noteId: string) => void',
            onRejectMatch: '(matchId: string) => void',
            onReviseRequest: '() => void',
            notes: 'any[]',
        },
        components: ['LocalMatchPreview', 'DashboardLocalMatch'],
    },
    'layout-0': {
        id: 'layout-0',
        name: 'Layout',
        description: 'Workspace layout and panel arrangement',
        role: 'layout',
        propsShape: {
            properties: 'any[]',
            isAddingProperty: 'boolean',
            setIsAddingProperty: '(adding: boolean) => void',
            editingPropertyIndex: 'number | null',
            setEditingPropertyIndex: '(index: number | null) => void',
            propertyToDelete: 'any | null',
            setPropertyToDelete: '(prop: any | null) => void',
            onSaveProperty: '(key: string, op: string, value: string) => void',
            onCancelEdit: '() => void',
            onAcceptReview: '(item: any) => void',
            propertyReview: 'any | null',
            onDeleteProperty: '() => void',
            onPickLocation: '() => void',
            onPickTime: '(key: string) => void',
            ontology: 'any[]',
            localMatches: 'any[]',
            contacts: 'any[]',
            onSelect: '(match: any) => void',
        },
        components: ['PropertyPanel', 'LocalMatchesPanel'],
    },
} as const;

export interface SeamSpec {
    id: string;
    name: string;
    description: string;
    role: SeamRole;
    propsShape: Record<string, string>;
    components: string[];
}

/**
 * Resolve a semantic seam role to the actual discovered seam ID
 * Falls back to role name if no discovered seam matches
 */
export function resolveSeamId(
    role: SeamRole,
    strategyRegistry?: { listSeams(): Array<{ id: string }> }
): string {
    if (!strategyRegistry) return `${role}-0`;

    const seams = strategyRegistry.listSeams();
    const discovered = seams.find(s => s.id.startsWith(`${role}-`));
    return discovered?.id ?? `${role}-0`;
}

/**
 * Get all seam IDs for a given role
 */
export function getSeamIdsForRole(
    role: SeamRole,
    strategyRegistry?: { listSeams(): Array<{ id: string }> }
): string[] {
    if (!strategyRegistry) return [`${role}-0`];

    const seams = strategyRegistry.listSeams();
    return seams.filter(s => s.id.startsWith(`${role}-`)).map(s => s.id);
}

/**
 * Get built-in seam spec by dynamic seam ID
 */
export function getBuiltinSeamSpec(seamId: string): SeamSpec | undefined {
    return BUILTIN_SEAM_SPECS[seamId];
}

/**
 * Get all built-in seam specs
 */
export function getAllBuiltinSeamSpecs(): SeamSpec[] {
    return Object.values(BUILTIN_SEAM_SPECS);
}

/**
 * Convert SeamSpec to core Seam type
 */
export function toCoreSeam(spec: SeamSpec): Seam {
    return {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        propsShape: spec.propsShape,
        components: spec.components,
        role: spec.role,
    };
}

/**
 * Seam options for UI selectors
 */
export const SEAM_OPTIONS = [
    { value: SEAM_ROLES.CAPTURE, label: 'Capture' },
    { value: SEAM_ROLES.ELICIT, label: 'Elicit' },
    { value: SEAM_ROLES.MATCH, label: 'Match Display' },
    { value: SEAM_ROLES.LAYOUT, label: 'Layout' },
] as const;