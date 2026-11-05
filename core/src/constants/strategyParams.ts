/**
 * Shared strategy ParamSpecs
 * 
 * This file is the SOURCE FOR GENERATION (read by scripts/generate-definitions.ts).
 * At runtime, imports should use core/src/schemas/generated/seam-definitions.ts instead.
 * 
 * Run `pnpm generate:definitions` to regenerate after strategy changes.
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
    isAdding: { 
        type: 'boolean', 
        description: 'Whether the form is in add mode (vs edit mode)', 
        default: true,
        mechanism: 'PropertyForm.tsx reads this prop on mount to determine initial UI state (add vs edit). Affects: shows/hides "Add Property" button, pre-fills operator dropdown.'
    },
    initialOp: { 
        type: 'enum', 
        description: 'Default operator for new properties', 
        default: 'is', 
        options: ['is', 'equals', 'contains', 'less than', 'greater than', 'matches'],
        mechanism: 'PropertyForm.tsx reads this when rendering the operator selector for a new property row. Affects: default comparison operator in extraction, influences match scoring downstream.'
    },
};

/** DescribeItComposer - controls the natural language extraction UI */
export const describeItComposerParamSpec: ParamSpec = {
    placeholder: { 
        type: 'string', 
        description: 'Placeholder text for the input textarea', 
        default: 'e.g. I need a React developer for two weeks, up to 900 USD, starting next week',
        mechanism: 'DescribeItComposer.tsx reads this prop on mount for the textarea placeholder attribute. Affects: user guidance for extraction prompts, may influence extraction quality via priming.'
    },
    autoFocus: { 
        type: 'boolean', 
        description: 'Whether to auto-focus the input on open', 
        default: false,
        mechanism: 'DescribeItComposer.tsx useEffect on mount calls textareaRef.current?.focus() when true. Affects: capture latency (time-to-first-keystroke), UX friction.'
    },
};

/** TemplateSelector - currently no tunable params */
export const templateSelectorParamSpec: ParamSpec = {};

/** TagInput */
export const tagInputParamSpec: ParamSpec = {
    autoFocus: { 
        type: 'boolean', 
        description: 'Whether to auto-focus the tag input', 
        default: false,
        mechanism: 'TagInput.tsx useEffect on mount calls inputRef.current?.focus() when true. Affects: tag entry latency, correction rate for tag-heavy workflows.'
    },
};

/** LocalMatchPreview - match display configuration */
export const localMatchPreviewParamSpec: ParamSpec = {
    showScore: { 
        type: 'boolean', 
        description: 'Show match score percentage', 
        default: true,
        mechanism: 'LocalMatchPreview.tsx conditionally renders score badge when true. Affects: user trust calibration, decision time for match acceptance/rejection.'
    },
    showDetails: { 
        type: 'boolean', 
        description: 'Show detailed match explanations by default', 
        default: false,
        mechanism: 'LocalMatchPreview.tsx toggles expansion of match detail accordion on mount. Affects: information density, cognitive load, match verification accuracy.'
    },
    compactMode: { 
        type: 'boolean', 
        description: 'Use compact layout for dashboard', 
        default: false,
        mechanism: 'LocalMatchPreview.tsx applies compact CSS class reducing padding/font-size. Affects: scan density on dashboard, match discovery rate per unit time.'
    },
};

/** DashboardLocalMatch */
export const dashboardLocalMatchParamSpec: ParamSpec = {
    minScore: { 
        type: 'number', 
        description: 'Minimum score to show a match', 
        default: 0.4, 
        min: 0, 
        max: 1,
        mechanism: 'DashboardLocalMatch.tsx filters match engine results client-side before rendering. Affects: precision/recall tradeoff directly - higher = fewer false positives but more missed matches.'
    },
    maxResults: { 
        type: 'number', 
        description: 'Maximum number of matches to display', 
        default: 5, 
        min: 1, 
        max: 20,
        mechanism: 'DashboardLocalMatch.tsx slices sorted match array after minScore filter. Affects: dashboard clutter, user attention allocation, discovery of lower-ranked matches.'
    },
};

/** LocalMatchesPanel */
export const localMatchesPanelParamSpec: ParamSpec = {
    groupBySeam: { 
        type: 'boolean', 
        description: 'Group matches by seam type', 
        default: true,
        mechanism: 'LocalMatchesPanel.tsx renders matches in seam-grouped sections vs flat list. Affects: mental model alignment, cross-seam comparison efficiency.'
    },
    showScores: { 
        type: 'boolean', 
        description: 'Show match scores', 
        default: true,
        mechanism: 'LocalMatchesPanel.tsx conditionally renders score column in match table. Affects: same as LocalMatchPreview.showScore but at panel level.'
    },
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