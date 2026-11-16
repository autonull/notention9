import React, {useCallback, useEffect, useRef, useState} from 'react';
import {findAttributeDef, OntologyNode, Property} from '@notention/core';
import {AttributeWidget} from './widgets/registry';
import {OperatorDropdown} from './OperatorDropdown';
import {getCorrectionSuggestions, type CorrectionSuggestion} from './correctionSuggestions';
import {
    ClockIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    TagIcon,
    BriefcaseIcon,
    TrashIcon,
    BoltIcon,
    ChartBarIcon,
    HomeIcon,
    XMarkIcon,
    LightBulbIcon,
    PinIcon,
    InfoIcon
} from '../ui/icons';

interface PropertyBlockProps {
    property: Property;
    onUpdate: (updated: Property) => void;
    onDelete: () => void;
    ontology: OntologyNode[];
    autoFocus?: boolean;
}

export function PropertyBlock({
    property,
    onUpdate,
    onDelete,
    ontology,
    autoFocus
}: PropertyBlockProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(property.values[0] || '');
    const [hasChanges, setHasChanges] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoFocus) {
            setIsEditing(true);
        }
    }, [autoFocus]);

    const handleSave = useCallback(() => {
        if (hasChanges) {
            onUpdate({...property, values: [localValue]});
            blockRef.current?.classList.add('property-saved');
            setTimeout(() => {
                blockRef.current?.classList.remove('property-saved');
            }, 600);
        }
        setIsEditing(false);
        setHasChanges(false);
    }, [hasChanges, localValue, property, onUpdate]);

    const handleCancel = useCallback(() => {
        setLocalValue(property.values[0] || '');
        setIsEditing(false);
        setHasChanges(false);
    }, [property]);

    const handleChange = useCallback((value: string) => {
        setLocalValue(value);
        setHasChanges(value !== (property.values[0] || ''));
    }, [property]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const getWidget = () => {
        const attributeDef = findAttributeDef(property.key, ontology);

        return (
            <AttributeWidget
                attribute={attributeDef}
                value={localValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                operator={property.operator}
            />
        );
    };

    // Get correction suggestions when editing
    const correctionSuggestions = isEditing 
        ? getCorrectionSuggestions(property, [property], ontology)
        : [];

    const getValidOperators = (key: string, ontology: OntologyNode[]): string[] => {
        const attributeDef = findAttributeDef(key, ontology);
        if (!attributeDef) return ['is', 'contains', 'matches'];
        return [...attributeDef.operators.real, ...attributeDef.operators.imaginary];
    };

    const IconComponent = getPropertyIcon(property.key);

    // Provenance display
    const provenance = property.provenance || 'user';
    const provenanceColors: Record<string, string> = {
        'deterministic': 'text-green-400 bg-green-900/30 border-green-700/50',
        'pattern': 'text-cyan-400 bg-cyan-900/30 border-cyan-700/50',
        'ai': 'text-purple-400 bg-purple-900/30 border-purple-700/50',
        'fuzzy': 'text-orange-400 bg-orange-900/30 border-orange-700/50',
        'ontology-key': 'text-blue-400 bg-blue-900/30 border-blue-700/50',
        'user': 'text-gray-400 bg-gray-900/30 border-gray-700/50',
        'inferred': 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50',
    };
    const provenanceColor = provenanceColors[provenance] || provenanceColors['user'];
    const hasSourceSpan = property.sourceSpan && property.sourceSpan[0] !== undefined && property.sourceSpan[1] !== undefined;

    const handleFocusSource = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasSourceSpan && property.sourceSpan) {
            window.dispatchEvent(new CustomEvent('focus-property-source', {
                detail: { start: property.sourceSpan[0], end: property.sourceSpan[1] }
            }));
        }
    }, [hasSourceSpan, property.sourceSpan]);

    return (
        <div
            ref={blockRef}
            data-testid="extracted-property"
            data-key={property.key}
            className={`
                property-block relative group transition-all duration-200 border rounded-md mb-1.5 overflow-hidden
                ${isEditing
                    ? 'bg-gray-800 border-blue-500/50 shadow-lg z-10 p-3'
                    : 'bg-gray-800/30 border-transparent hover:bg-gray-800 hover:border-gray-700 cursor-pointer p-2'
                }
            `}
            onClick={(e) => {
                if (!isEditing) {
                    e.stopPropagation();
                    setIsEditing(true);
                }
            }}
        >
            {!isEditing ? (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-700/50 text-gray-400">
                        <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span className="text-sm font-semibold text-gray-300 truncate" title={property.key}>
                            {property.key}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                            {property.operator}
                        </span>
                        <span className={`text-sm truncate ${property.key.match(/rate|price|cost|budget/) ? 'text-green-400 font-mono' : 'text-blue-300'}`}>
                            {formatValue(property)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Provenance badge */}
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${provenanceColor}`}>
                            {provenance}
                        </span>
                        {/* Focus source button */}
                        {hasSourceSpan && (
                            <button
                                className="p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                                onClick={handleFocusSource}
                                title="Focus source text"
                            >
                                <PinIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {isValid(property) && <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div>}
                        <button
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            title="Delete property"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
                        <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-blue-400" />
                            <span className="font-bold text-sm text-gray-200 tracking-wide">{property.key}</span>
                            {/* Provenance badge in editing mode */}
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${provenanceColor}`}>
                                {provenance}
                            </span>
                            {/* Focus source button in editing mode */}
                            {hasSourceSpan && (
                                <button
                                    className="p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                                    onClick={handleFocusSource}
                                    title="Focus source text"
                                >
                                    <PinIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                             className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                        >
                            <TrashIcon className="w-3 h-3" /> Remove
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-[100px] flex-shrink-0">
                            <OperatorDropdown
                                value={property.operator}
                                options={getValidOperators(property.key, ontology)}
                                onChange={(op) => onUpdate({...property, operator: op})}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            {getWidget()}
                        </div>
                    </div>

                    {/* Correction Suggestions */}
                    {correctionSuggestions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-700/50">
                            <div className="flex items-center gap-2 text-xs text-yellow-400">
                                <LightBulbIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium">Suggested fixes:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {correctionSuggestions.slice(0, 3).map((suggestion, idx) => (
                                    <button
                                        key={`${suggestion.type}-${idx}`}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const correctedProperty = suggestion.action();
                                            onUpdate(correctedProperty);
                                            setLocalValue(correctedProperty.values[0] || '');
                                            setHasChanges(true);
                                        }}
                                        className="px-2.5 py-1 text-xs text-gray-100 bg-yellow-900/40 border border-yellow-700/50 rounded hover:bg-yellow-900/60 transition-colors"
                                        title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                                    >
                                        {suggestion.message}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded shadow-sm shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSave();
                            }}
                            disabled={!hasChanges}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers
const getPropertyIcon = (key: string): React.ComponentType<{ className?: string }> => {
    const k = key.toLowerCase();
    if (k.match(/rate|price|cost|budget|amount|fee/)) return CurrencyDollarIcon;
    if (k.match(/location|place|city|country|geo/)) return MapPinIcon;
    if (k.match(/deadline|date|time|start|end|due/)) return ClockIcon;
    if (k.match(/role|job|title|position/)) return BriefcaseIcon;
    if (k.match(/skill|tech|stack/)) return BoltIcon;
    if (k.match(/experience|level|seniority/)) return ChartBarIcon;
    if (k.match(/remote|onsite|hybrid/)) return HomeIcon;
    return TagIcon;
};

const formatValue = (prop: Property): string => {
    if (prop.key.match(/rate|price|cost|budget/)) return `$${prop.values[0]}`;
    return prop.values[0] || '(empty)';
};

const isValid = (prop: Property): boolean => Boolean(prop.values[0] && prop.values[0].length > 0);
