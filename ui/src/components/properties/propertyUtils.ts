import {useMemo} from 'react';
import {OntologyNode, SuggestedAttribute, OntologyAttribute} from '@notention/core';

export interface PropertyOption {
    key: string;
    icon?: string;
    description?: string;
    isLearned?: boolean;
    frequency?: number;
    attributeDef?: OntologyAttribute;
    nodeLabel?: string;
    nodePath?: string[];
    depth?: number;
}

export interface BuildPropertyOptionsConfig {
    defaults?: Array<{key: string; icon?: string; description?: string}>;
    ontology: OntologyNode[];
    suggestions?: SuggestedAttribute[];
    recentKeys?: string[];
    includeRecentInOptions?: boolean;
    includeDefaults?: boolean;
}

/**
 * Build property options from ontology, suggestions, and defaults.
 * Handles deduplication across all sources.
 */
export function buildPropertyOptions(config: BuildPropertyOptionsConfig): PropertyOption[] {
    const {
        defaults = [],
        ontology,
        suggestions = [],
        recentKeys = [],
        includeRecentInOptions = false,
        includeDefaults = true
    } = config;

    const options: PropertyOption[] = [];
    const existingKeys = new Set<string>();

    // Add defaults first
    if (includeDefaults) {
        defaults.forEach(d => {
            if (!existingKeys.has(d.key)) {
                options.push({...d, isLearned: false, frequency: undefined});
                existingKeys.add(d.key);
            }
        });
    }

    // Add learned suggestions
    suggestions.forEach(s => {
        if (!existingKeys.has(s.key)) {
            options.push({
                key: s.key,
                description: `Learned (${s.frequency}x)`,
                isLearned: true,
                frequency: s.frequency
            });
            existingKeys.add(s.key);
        }
    });

    // Add recent keys if requested
    if (includeRecentInOptions) {
        recentKeys.forEach(key => {
            if (!existingKeys.has(key)) {
                options.push({key, isLearned: false});
                existingKeys.add(key);
            }
        });
    }

    // Add ontology attributes
    ontology.forEach(node => {
        if (!node.attributes) return;
        Object.entries(node.attributes).forEach(([key, attr]) => {
            if (!existingKeys.has(key)) {
                options.push({
                    key,
                    icon: attr.icon,
                    description: attr.description || node.label,
                    attributeDef: attr,
                    nodeLabel: node.label,
                    nodePath: [node.label],
                    depth: 0
                });
                existingKeys.add(key);
            }
        });
    });

    return options;
}

export interface FilterPropertyOptionsConfig {
    filter: string;
    options: PropertyOption[];
    showAll?: boolean;
    maxDepth?: number;
}

/**
 * Filter property options based on search term and visibility settings.
 */
export function filterPropertyOptions(config: FilterPropertyOptionsConfig): PropertyOption[] {
    const {filter, options, showAll = false, maxDepth = 1} = config;

    if (!filter) {
        if (showAll) return options;
        return options.filter(o => (o.depth ?? 0) <= maxDepth);
    }

    const lowerFilter = filter.toLowerCase();
    return options.filter(o =>
        o.key.toLowerCase().includes(lowerFilter) ||
        o.description?.toLowerCase().includes(lowerFilter) ||
        o.nodePath?.some(p => p.toLowerCase().includes(lowerFilter))
    );
}

export interface RenderPropertyOptionProps {
    option: PropertyOption;
    isSelected: boolean;
    isExpanded?: boolean;
    onSelect: () => void;
    onMouseEnter: () => void;
    onToggleExpand?: () => void;
    hasChildren?: boolean;
    showTypeBadge?: boolean;
    renderTypeBadge?: (attr?: OntologyAttribute) => React.ReactNode;
}

/**
 * Render a single property option button.
 * Shared between PropertyPalette and UnifiedSelector.
 */
import {SparklesIcon, TagIcon, ChevronRightIcon, ChevronDownIcon} from '../ui/icons';

export function renderPropertyOption({
    option,
    isSelected,
    isExpanded,
    onSelect,
    onMouseEnter,
    onToggleExpand,
    hasChildren,
    showTypeBadge = false,
    renderTypeBadge
}: RenderPropertyOptionProps): React.ReactNode {

    // If this is a parent node with children, render expandable header
    if (hasChildren && onToggleExpand) {
        return (
            <div key={option.key}>
                <button
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                        isExpanded ? 'bg-gray-700/50' : 'hover:bg-gray-700/50'
                    } border border-transparent`}
                    onClick={onToggleExpand}
                    onMouseEnter={onMouseEnter}
                >
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                        {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-gray-200">{option.nodeLabel}</span>
                            {option.description && <span className="text-xs text-gray-500">{option.description}</span>}
                        </div>
                    </div>
                </button>
                {isExpanded && (
                    <div className="pl-8 space-y-1 border-l border-gray-700/30 ml-2">
                        {/* Children rendered by parent */}
                    </div>
                )}
            </div>
        );
    }

    // Regular property option
    return (
        <button
            key={option.key}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                isSelected
                    ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                    : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
            }`}
            onClick={onSelect}
            onMouseEnter={onMouseEnter}
        >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                {option.isLearned ? <SparklesIcon className="w-4 h-4 text-purple-400" /> : option.icon || <TagIcon className="w-4 h-4 text-gray-500" />}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-medium truncate text-sm">{option.key}</span>
                    {option.isLearned && option.frequency && (
                        <span className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/30">
                            {option.frequency}
                        </span>
                    )}
                </div>
                {option.description && (
                    <div className="text-xs text-gray-500 truncate">{option.description}</div>
                )}
                {showTypeBadge && renderTypeBadge && renderTypeBadge(option.attributeDef)}
            </div>
        </button>
    );
}

/**
 * Get widget type label for an ontology attribute.
 */
export function getWidgetTypeLabel(attr?: OntologyAttribute): string | null {
    if (!attr) return 'Text';
    const type = attr.type || 'string';
    const operators = attr.operators || {};
    
    if (operators.real?.includes('greater than')) return 'Number';
    if (type === 'date') return 'Date';
    if (Object.keys(operators).length > 2) return 'Enum';
    if (operators.real?.includes('contains')) return 'Text';
    return 'Text';
}