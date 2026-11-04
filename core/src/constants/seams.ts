/**
 * Single source of truth for seam definitions
 * Used by discovery, synthesis, runtime, and UI
 * 
 * SEAM DEFINITIONS ARE NOW GENERATED from strategy source code.
 * See scripts/generate-definitions.ts and core/src/schemas/generated/seam-definitions.ts
 * This file provides backward-compatible accessors AND the source data for generation.
 */

import type { Seam, SeamRole } from '../ui/strategy.js';
import type { SeamDefinition } from '../schemas/seamDefinition.js';
import { getSeams } from '../ui/strategy.js';

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
} as const satisfies Record<string, SeamRole>;

/**
 * Built-in seam specifications for synthesis (T1/T2) and generation
 * Keyed by dynamic seam ID (e.g., 'capture-0')
 * This is the SOURCE FOR GENERATION - scripts/generate-definitions.ts reads this.
 * At runtime, use getBuiltinSeamSpec() which reads from generated definitions.
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

// --- Lazy-loaded generated definitions cache ---

let generatedSeamDefinitions: SeamDefinition[] | null = null;
let generatedStrategyConfigs: StrategyInfo[] | null = null;

async function loadGeneratedDefs(): Promise<void> {
    if (generatedSeamDefinitions !== null) return;
    try {
        const mod = await import('../schemas/generated/seam-definitions.js');
        generatedSeamDefinitions = mod.SEAM_DEFINITIONS;
        generatedStrategyConfigs = mod.STRATEGY_CONFIGS;
    } catch {
        generatedSeamDefinitions = [];
        generatedStrategyConfigs = [];
    }
}

function getGeneratedSeams(): SeamDefinition[] {
    return generatedSeamDefinitions ?? [];
}

function getGeneratedStrategies(): StrategyInfo[] {
    return generatedStrategyConfigs ?? [];
}

// Preload in background (non-blocking)
loadGeneratedDefs();

interface StrategyInfo {
    id: string;
    seamId: string;
    seamName: string;
    seamRole: string;
    version: string;
    componentPath: string;
    componentName: string;
    paramSpec: Record<string, any>;
    defaultProps: Record<string, unknown>;
}

/**
 * Get built-in seam spec by dynamic seam ID (from generated definitions at runtime, from BUILTIN_SEAM_SPECS at generation time)
 */
export function getBuiltinSeamSpec(seamId: string): SeamSpec | undefined {
    const generated = getGeneratedSeams();
    if (generated.length > 0) {
        const def = generated.find(d => d.id === seamId);
        if (def) {
            return {
                id: def.id,
                name: def.name,
                description: def.description,
                role: def.role,
                propsShape: def.propsShape,
                components: def.components,
            };
        }
    }
    return BUILTIN_SEAM_SPECS[seamId];
}

/**
 * Get all built-in seam specs (from generated definitions at runtime, from BUILTIN_SEAM_SPECS at generation time)
 */
export function getAllBuiltinSeamSpecs(): SeamSpec[] {
    const generated = getGeneratedSeams();
    if (generated.length > 0) {
        return generated.map(def => ({
            id: def.id,
            name: def.name,
            description: def.description,
            role: def.role,
            propsShape: def.propsShape,
            components: def.components,
        }));
    }
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
 * Resolve a semantic seam role to the actual discovered seam ID
 * Falls back to role name if no discovered seam matches
 */
export function resolveSeamId(
    role: SeamRole
): string {
    const seams = getSeams();
    const discovered = seams.find(s => s.id.startsWith(`${role}-`));
    return discovered?.id ?? `${role}-0`;
}

/**
 * Get all seam IDs for a given role
 */
export function getSeamIdsForRole(
    role: SeamRole
): string[] {
    const seams = getSeams();
    return seams.filter(s => s.id.startsWith(`${role}-`)).map(s => s.id);
}

/**
 * Get strategy config by ID (from generated definitions at runtime)
 */
export function getStrategyConfig(id: string) {
    const generated = getGeneratedStrategies();
    if (generated.length > 0) {
        return generated.find(c => c.id === id);
    }
    return undefined;
}

/**
 * Get all strategy configs (from generated definitions at runtime)
 */
export function getAllStrategyConfigs() {
    return getGeneratedStrategies();
}

/**
 * Get strategy configs by seam role (from generated definitions at runtime)
 */
export function getStrategyConfigsByRole(role: Seam['role']) {
    const generated = getGeneratedStrategies();
    if (generated.length > 0) {
        return generated.filter(c => c.seamRole === role);
    }
    return [];
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