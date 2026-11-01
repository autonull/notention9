import type { Seam } from '@notention/core/ui/strategy';
import { getBuiltinSeamSpec, toCoreSeam, type SeamSpec } from '@notention/core/constants/seams';
import type { ParamSpec } from '@notention/core/ui/strategy';
import {
    propertyFormParamSpec,
    describeItComposerParamSpec,
    templateSelectorParamSpec,
    tagInputParamSpec,
    localMatchPreviewParamSpec,
    dashboardLocalMatchParamSpec,
    localMatchesPanelParamSpec,
} from '@notention/core/constants/strategyParams';

/**
 * UI-specific strategy configuration
 * Extends core ParamSpecs with component paths and names
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