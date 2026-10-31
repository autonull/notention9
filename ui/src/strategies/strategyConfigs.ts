import type { Seam } from '@notention/core/ui/strategy';
import { getBuiltinSeamSpec, toCoreSeam, type SeamSpec } from '@notention/core/constants/seams';

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
}

function createStrategyConfig(
    id: string,
    seamSpec: SeamSpec,
    componentPath: string,
    componentName: string,
    version: string,
    defaultProps: Record<string, unknown>
): StrategyConfig {
    return {
        id,
        seam: toCoreSeam(seamSpec),
        componentPath,
        componentName,
        version,
        defaultProps,
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
        { isAdding: true, initialOp: 'is' }
    ),
    createStrategyConfig(
        'describe-it-composer',
        { ...captureSpec, id: 'extraction-0', name: 'extraction', description: 'Extract structured properties from natural language' },
        '../components/editor/DescribeItComposer',
        'DescribeItComposer',
        '1.0.0',
        {}
    ),
    createStrategyConfig(
        'template-selector',
        { ...captureSpec, id: 'template-0', name: 'template-selection', description: 'Select a template for note creation' },
        '../components/editor/TemplateSelector',
        'TemplateSelector',
        '1.0.0',
        {}
    ),
    createStrategyConfig(
        'tag-input',
        elicitSpec,
        '../components/editor/TagInput',
        'TagInput',
        '1.0.0',
        { autoFocus: false }
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