/**
 * Shared strategy ParamSpecs
 * 
 * Single source of truth for strategy parameter definitions.
 * Used by both UI package (for registration) and optimizer package (for candidate enumeration).
 * No React dependencies - pure TypeScript.
 */

import type { ParamSpec, Seam } from '../ui/strategy.js';
import { SEAM_ROLES, BUILTIN_SEAM_SPECS, toCoreSeam, type SeamSpec } from './seams.js';

export interface StrategyParamConfig {
    id: string;
    seam: Seam;
    version: string;
    defaultProps: Record<string, unknown>;
    paramSpec: ParamSpec;
}

function createStrategyParamConfig(
    id: string,
    seamSpec: SeamSpec,
    version: string,
    defaultProps: Record<string, unknown>,
    paramSpec: ParamSpec = {}
): StrategyParamConfig {
    return {
        id,
        seam: toCoreSeam(seamSpec),
        version,
        defaultProps,
        paramSpec,
    };
}

// Built-in seam specs
const captureSpec = BUILTIN_SEAM_SPECS['capture-0']!;
const elicitSpec = BUILTIN_SEAM_SPECS['elicit-0']!;
const matchSpec = BUILTIN_SEAM_SPECS['match-0']!;
const layoutSpec = BUILTIN_SEAM_SPECS['layout-0']!;

// --- ParamSpecs ---

/** PropertyForm - controls the property input form behavior */
export const propertyFormParamSpec: ParamSpec = {
    isAdding: { type: 'boolean', description: 'Whether the form is in add mode (vs edit mode)', default: true },
    initialOp: { type: 'enum', description: 'Default operator for new properties', default: 'is', options: ['is', 'equals', 'contains', 'less than', 'greater than', 'matches'] },
};

/** DescribeItComposer - controls the natural language extraction UI */
export const describeItComposerParamSpec: ParamSpec = {
    placeholder: { type: 'string', description: 'Placeholder text for the input textarea', default: 'e.g. I need a React developer for two weeks, up to 900 USD, starting next week' },
    autoFocus: { type: 'boolean', description: 'Whether to auto-focus the input on open', default: false },
};

/** TemplateSelector - currently no tunable params */
export const templateSelectorParamSpec: ParamSpec = {};

/** TagInput */
export const tagInputParamSpec: ParamSpec = {
    autoFocus: { type: 'boolean', description: 'Whether to auto-focus the tag input', default: false },
};

/** LocalMatchPreview - match display configuration */
export const localMatchPreviewParamSpec: ParamSpec = {
    showScore: { type: 'boolean', description: 'Show match score percentage', default: true },
    showDetails: { type: 'boolean', description: 'Show detailed match explanations by default', default: false },
    compactMode: { type: 'boolean', description: 'Use compact layout for dashboard', default: false },
};

/** DashboardLocalMatch */
export const dashboardLocalMatchParamSpec: ParamSpec = {
    minScore: { type: 'number', description: 'Minimum score to show a match', default: 0.4, min: 0, max: 1 },
    maxResults: { type: 'number', description: 'Maximum number of matches to display', default: 5, min: 1, max: 20 },
};

/** LocalMatchesPanel */
export const localMatchesPanelParamSpec: ParamSpec = {
    groupBySeam: { type: 'boolean', description: 'Group matches by seam type', default: true },
    showScores: { type: 'boolean', description: 'Show match scores', default: true },
};

// --- Strategy Configs ---

export const STRATEGY_PARAM_CONFIGS: StrategyParamConfig[] = [
    // Capture strategies
    createStrategyParamConfig(
        'property-form',
        { ...captureSpec, id: 'capture-0', name: 'capture', description: 'Capture properties' },
        '1.0.0',
        { isAdding: true, initialOp: 'is' },
        propertyFormParamSpec
    ),
    createStrategyParamConfig(
        'describe-it-composer',
        { ...captureSpec, id: 'extraction-0', name: 'extraction', description: 'Extract structured properties from natural language' },
        '1.0.0',
        { placeholder: 'e.g. I need a React developer for two weeks, up to 900 USD, starting next week', autoFocus: false },
        describeItComposerParamSpec
    ),
    createStrategyParamConfig(
        'template-selector',
        { ...captureSpec, id: 'template-0', name: 'template-selection', description: 'Select a template for note creation' },
        '1.0.0',
        {},
        templateSelectorParamSpec
    ),

    // Elicit strategies
    createStrategyParamConfig(
        'tag-input',
        elicitSpec,
        '1.0.0',
        { autoFocus: false },
        tagInputParamSpec
    ),

    // Match strategies
    createStrategyParamConfig(
        'local-match-preview',
        matchSpec,
        '1.0.0',
        {},
        localMatchPreviewParamSpec
    ),
    createStrategyParamConfig(
        'dashboard-local-match',
        matchSpec,
        '1.0.0',
        {},
        dashboardLocalMatchParamSpec
    ),

    // Layout strategies
    createStrategyParamConfig(
        'local-matches-panel',
        { ...layoutSpec, id: 'matches-panel-0', name: 'matches-panel', description: 'Panel showing local matches' },
        '1.0.0',
        {},
        localMatchesPanelParamSpec
    ),
];

/**
 * Get a strategy param config by ID
 */
export function getStrategyParamConfig(id: string): StrategyParamConfig | undefined {
    return STRATEGY_PARAM_CONFIGS.find(c => c.id === id);
}

/**
 * Get all strategy param configs for a given seam role
 */
export function getStrategyParamConfigsByRole(role: Seam['role']): StrategyParamConfig[] {
    return STRATEGY_PARAM_CONFIGS.filter(c => c.seam.role === role);
}

/**
 * Get all strategy param configs
 */
export function getAllStrategyParamConfigs(): StrategyParamConfig[] {
    return STRATEGY_PARAM_CONFIGS;
}