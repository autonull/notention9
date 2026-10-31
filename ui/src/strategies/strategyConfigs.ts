import type { Seam } from '@notention/optimize/discovery';

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

export const STRATEGY_CONFIGS: StrategyConfig[] = [
    {
        id: 'property-form',
        seam: {
            id: 'capture-0',
            name: 'capture',
            description: 'Capture seam for property input',
            propsShape: {
                initialKey: 'string',
                initialOp: 'string',
                initialValue: 'string',
                isAdding: 'boolean',
                onSave: '(key: string, op: string, value: string) => void',
                onCancel: '() => void',
                onPickLocation: '() => Promise<string> | void',
                onPickTime: '(key: string) => void',
                ontology: 'OntologyNode[]',
            },
            components: ['PropertyForm'],
            role: 'capture',
        },
        componentPath: '../components/editor/PropertyForm',
        componentName: 'PropertyForm',
        version: '1.0.0',
        defaultProps: {
            isAdding: true,
            initialOp: 'is',
        },
    },
    {
        id: 'describe-it-composer',
        seam: {
            id: 'extraction-0',
            name: 'extraction',
            description: 'Extract structured properties from natural language',
            propsShape: {
                isOpen: 'boolean',
                onClose: '() => void',
                onApply: '(properties: Property[]) => void',
                ontology: 'OntologyNode[]',
            },
            components: ['DescribeItComposer'],
            role: 'capture',
        },
        componentPath: '../components/editor/DescribeItComposer',
        componentName: 'DescribeItComposer',
        version: '1.0.0',
        defaultProps: {},
    },
    {
        id: 'template-selector',
        seam: {
            id: 'template-0',
            name: 'template-selection',
            description: 'Select a template for note creation',
            propsShape: {
                ontology: 'OntologyNode[]',
                onSelect: '(template: OntologyNode) => void',
                onClose: '() => void',
            },
            components: ['TemplateSelector'],
            role: 'capture',
        },
        componentPath: '../components/editor/TemplateSelector',
        componentName: 'TemplateSelector',
        version: '1.0.0',
        defaultProps: {},
    },
    {
        id: 'tag-input',
        seam: {
            id: 'elicit-0',
            name: 'detail-elicitation',
            description: 'Elicit additional details from user',
            propsShape: {
                tags: 'string[]',
                onChange: '(tags: string[]) => void',
                onAutoTag: '() => void',
                isAutoTagging: 'boolean',
                autoFocus: 'boolean',
                className: 'string',
            },
            components: ['TagInput'],
            role: 'elicit',
        },
        componentPath: '../components/editor/TagInput',
        componentName: 'TagInput',
        version: '1.0.0',
        defaultProps: {
            autoFocus: false,
        },
    },
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