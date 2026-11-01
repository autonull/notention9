import type { Seam } from '@notention/core/ui/strategy';
import { getBuiltinSeamSpec, toCoreSeam, type SeamSpec } from '@notention/core/constants/seams';
import type { ParamSpec } from '@notention/core/ui/strategy';

/**
 * Centralized strategy configurations
 * Single source of truth for seam definitions and strategy metadata
 */
export interface StrategyConfig {
    id: string;
    seam: Seam;
    componentPath: string;
    componentName: string;
    version: string;
    defaultProps: Record<string, unknown>;
    paramSpec: ParamSpec;
}

function createStrategyConfig(
    id: string,
    seamSpec: SeamSpec,
    componentPath: string,
    componentName: string,
    version: string,
    defaultProps: Record<string, unknown>,
    paramSpec: ParamSpec = {}
): StrategyConfig {
    return {
        id,
        seam: toCoreSeam(seamSpec),
        componentPath,
        componentName,
        version,
        defaultProps,
        paramSpec,
    };
}

const captureSpec = getBuiltinSeamSpec('capture-0')!;
const elicitSpec = getBuiltinSeamSpec('elicit-0')!;
const matchSpec = getBuiltinSeamSpec('match-0')!;
const layoutSpec = getBuiltinSeamSpec('layout-0')!;

// ParamSpec for PropertyForm - controls the property input form behavior
const propertyFormParamSpec: ParamSpec = {
    isAdding: { type: 'boolean', description: 'Whether the form is in add mode (vs edit mode)', default: true },
    initialOp: { type: 'enum', description: 'Default operator for new properties', default: 'is', options: ['is', 'equals', 'contains', 'less than', 'greater than', 'matches'] },
};

// ParamSpec for DescribeItComposer - controls the natural language extraction UI
const describeItComposerParamSpec: ParamSpec = {
    placeholder: { type: 'string', description: 'Placeholder text for the input textarea', default: 'e.g. I need a React developer for two weeks, up to 900 USD, starting next week' },
    autoFocus: { type: 'boolean', description: 'Whether to auto-focus the input on open', default: false },
};

// ParamSpec for TemplateSelector - currently no tunable params
const templateSelectorParamSpec: ParamSpec = {};

// ParamSpec for TagInput
const tagInputParamSpec: ParamSpec = {
    autoFocus: { type: 'boolean', description: 'Whether to auto-focus the tag input', default: false },
};

// ParamSpec for LocalMatchPreview - match display configuration
const localMatchPreviewParamSpec: ParamSpec = {
    showScore: { type: 'boolean', description: 'Show match score percentage', default: true },
    showDetails: { type: 'boolean', description: 'Show detailed match explanations by default', default: false },
    compactMode: { type: 'boolean', description: 'Use compact layout for dashboard', default: false },
};

// ParamSpec for DashboardLocalMatch
const dashboardLocalMatchParamSpec: ParamSpec = {
    minScore: { type: 'number', description: 'Minimum score to show a match', default: 0.4, min: 0, max: 1 },
    maxResults: { type: 'number', description: 'Maximum number of matches to display', default: 5, min: 1, max: 20 },
};

// ParamSpec for LocalMatchesPanel
const localMatchesPanelParamSpec: ParamSpec = {
    groupBySeam: { type: 'boolean', description: 'Group matches by seam type', default: true },
    showScores: { type: 'boolean', description: 'Show match scores', default: true },
};

export const STRATEGY_CONFIGS: StrategyConfig[] = [
    createStrategyConfig(
        'property-form',
        captureSpec,
        '../components/editor/PropertyForm',
        'PropertyForm',
        '1.0.0',
        { isAdding: true, initialOp: 'is' },
        propertyFormParamSpec
    ),
    createStrategyConfig(
        'describe-it-composer',
        { ...captureSpec, id: 'extraction-0', name: 'extraction', description: 'Extract structured properties from natural language' },
        '../components/editor/DescribeItComposer',
        'DescribeItComposer',
        '1.0.0',
        { placeholder: 'e.g. I need a React developer for two weeks, up to 900 USD, starting next week', autoFocus: false },
        describeItComposerParamSpec
    ),
    createStrategyConfig(
        'template-selector',
        { ...captureSpec, id: 'template-0', name: 'template-selection', description: 'Select a template for note creation' },
        '../components/editor/TemplateSelector',
        'TemplateSelector',
        '1.0.0',
        {},
        templateSelectorParamSpec
    ),
    createStrategyConfig(
        'tag-input',
        elicitSpec,
        '../components/editor/TagInput',
        'TagInput',
        '1.0.0',
        { autoFocus: false },
        tagInputParamSpec
    ),
    // Match strategies
    createStrategyConfig(
        'local-match-preview',
        matchSpec,
        '../components/dashboard/LocalMatchPreview',
        'LocalMatchPreview',
        '1.0.0',
        {},
        localMatchPreviewParamSpec
    ),
    createStrategyConfig(
        'dashboard-local-match',
        matchSpec,
        '../components/dashboard/DashboardLocalMatch',
        'DashboardLocalMatch',
        '1.0.0',
        {},
        dashboardLocalMatchParamSpec
    ),
    createStrategyConfig(
        'local-matches-panel',
        { ...layoutSpec, id: 'matches-panel-0', name: 'matches-panel', description: 'Panel showing local matches' },
        '../components/assistant/LocalMatchesPanel',
        'LocalMatchesPanel',
        '1.0.0',
        {},
        localMatchesPanelParamSpec
    ),
];

/**
 * Get a strategy config by ID
 */
export function getStrategyConfig(id: string): StrategyConfig | undefined {
    return STRATEGY_CONFIGS.find(c => c.id === id);
}

/**
 * Get all strategy configs for a given seam role
 */
export function getStrategyConfigsByRole(role: Seam['role']): StrategyConfig[] {
    return STRATEGY_CONFIGS.filter(c => c.seam.role === role);
}