/**
 * Component path/name mapping for strategies
 * Used by scripts/generate-definitions.ts and ui/src/strategies/strategyConfigs.ts
 * This file has NO dependencies on generated definitions.
 */

export const componentMap: Record<string, { path: string; name: string }> = {
    'quick-capture': { path: '../components/dashboard/QuickCapture', name: 'QuickCapture' },
    'property-form': { path: '../components/editor/PropertyForm', name: 'PropertyForm' },
    'describe-it-composer': { path: '../components/editor/DescribeItComposer', name: 'DescribeItComposer' },
    'template-selector': { path: '../components/editor/TemplateSelector', name: 'TemplateSelector' },
    'tag-input': { path: '../components/editor/TagInput', name: 'TagInput' },
    'inline-detail': { path: '../strategies/InlineDetailStrategy', name: 'InlineDetailStrategy' },
    'local-matches-panel': { path: '../components/assistant/LocalMatchesPanel', name: 'LocalMatchesPanel' },
};