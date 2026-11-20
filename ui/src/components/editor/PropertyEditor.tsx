import React, {useEffect, useMemo, useState} from 'react';
import {CheckIcon, ClockIcon, InformationCircleIcon, MapPinIcon, SearchSparkleIcon, XIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon} from '../ui/icons';
import type {OntologyNode, OntologyAttribute} from '@notention/core';
import {Logger} from '@notention/core';
import {findAttributeDefInTree, validateAttributeValue} from '@notention/core';
import {getCurrentPosition} from '../../utils/geolocation';
import {useToast} from '../../hooks/useToast';
import {useAnnounce} from '../../hooks/useAccessibility';
import {useGardener} from '../../hooks/useGardener';
import {useAIAlign} from '../../hooks/useAIAlign';
import {EnhancedPropertyValueInput} from '../properties/EnhancedPropertyValueInput';
import {Input, ExtractionStatus} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Select} from '../ui/Select';
import {Textarea} from '../ui/Textarea';
import {useOntologySuggestions} from '../../hooks/useOntologySuggestions';
import {usePatternSuggestions} from '../../hooks/usePatternSuggestions';
import type {SuggestedAttribute} from '@notention/core';
import {Metrics, useMetrics} from '../../hooks/useMetrics';
import {Modal} from '../ui/Modal';

interface PropertyEditorProps {
    initialKey?: string;
    initialOperator?: string;
    initialValue?: string;
    initialPropertyId?: string;
    isAdding: boolean;
    onSave: (key: string, operator: string, value: string, propertyId?: string, icon?: string) => void;
    onCancel: () => void;
    onPickLocation?: () => Promise<string> | void;
    onPickTime?: (key: string) => void;
    ontology: OntologyNode[];
    readonly?: boolean;
    isModal?: boolean;
    isOpen?: boolean;
    suggestions?: SuggestedAttribute[];
    title?: string;
}

const ALL_OPERATORS = [
    {value: 'is', label: 'is (=)'},
    {value: 'is not', label: 'is not (!=)'},
    {value: 'greater than', label: 'greater than (>)'},
    {value: 'less than', label: 'less than (<)'},
    {value: 'contains', label: 'contains'},
    {value: 'between', label: 'between (range)'},
    {value: 'near', label: 'near (geo)'},
    {value: 'before', label: 'before (date)'},
    {value: 'after', label: 'after (date)'},
];

export function PropertyEditor({
    initialKey = '',
    initialOperator = 'is',
    initialValue = '',
    initialPropertyId,
    isAdding,
    onSave,
    onCancel,
    onPickLocation,
    onPickTime,
    ontology,
    readonly = false,
    isModal = false,
    isOpen = true,
    suggestions = [],
    title,
}: PropertyEditorProps) {
    const [key, setKey] = useState(initialKey);
    const [operator, setOperator] = useState(initialOperator);
    const [value, setValue] = useState(initialValue);
    const [showExtraction, setShowExtraction] = useState(false);
    const [extractionText, setExtractionText] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [touched, setTouched] = useState(false);
    const {addToast} = useToast();
    const announce = useAnnounce();
    const {track} = useMetrics();
    const {alignToOntology} = useGardener();
    const {align, loading: aiLoading, error: aiError, fallbackUsed: aiFallbackUsed} = useAIAlign({
        onSuccess: (properties) => {
            if (properties.length > 0) {
                const property = properties[0];
                setKey(property.key);
                setOperator(property.operator);
                setValue(property.values.join(','));
                setShowExtraction(false);
                addToast('Property extracted!', 'success');
                announce(`Property extracted: ${property.key} ${property.operator} ${property.values.join(', ')}`);
            } else {
                addToast('No properties found in text.', 'info');
                announce('No properties found in text.');
            }
        },
        onError: (error) => {
            addToast('Extraction failed.', 'error');
            announce('Extraction failed.');
        },
    });
    const {suggestions: ontologySuggestions} = useOntologySuggestions();
    const {suggestions: patternSuggestions} = usePatternSuggestions({properties: []} as any);

    useEffect(() => {
        setKey(initialKey);
        setOperator(initialOperator);
        setValue(initialValue);
    }, [initialKey, initialOperator, initialValue]);

    const activeDef = useMemo(() => {
        if (ontology && key) {
            const found = findAttributeDefInTree(key, ontology);
            if (found) return found;
        }
        return undefined;
    }, [key, ontology]);

    const validation = useMemo(() => {
        return validateAttributeValue(key, operator, value, activeDef);
    }, [key, operator, value, activeDef]);

    const type = activeDef?.type;
    const description = activeDef?.description;
    const isTemporal = type === 'date' || type === 'datetime' || ['start', 'end', 'date', 'time', 'deadline', 'dueDate', 'startDateTime', 'endDateTime'].some(k => key.toLowerCase().includes(k.toLowerCase()));
    const isBoolean = type === 'boolean';
    const isNumber = type === 'number';
    const isAffinity = type === 'affinity';
    const isEnum = type === 'enum';
    const isGeo = type === 'geo';

    const compatibleOperators = useMemo(() => {
        if (activeDef) {
            return ALL_OPERATORS.filter(o =>
                activeDef?.operators?.real?.includes(o.value) || activeDef?.operators?.imaginary?.includes(o.value)
            );
        }
        return ALL_OPERATORS;
    }, [activeDef]);

    const handleUseCurrentLocation = async () => {
        try {
            const pos = await getCurrentPosition();
            setValue(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
            if (!key) setKey('location');
            addToast('Current location fetched', 'success');
        } catch (e) {
            addToast('Failed to get location: ' + (e instanceof Error ? e.message : String(e)), 'error');
        }
    };

    const handleMagicFill = async () => {
        if (!extractionText) return;
        await align(extractionText, ontology);
    };

    const handlePickLocation = async (): Promise<string> => {
        if (!onPickLocation) return '';
        if (isAdding && !key) setKey('location');
        const result = onPickLocation();
        if (result instanceof Promise) {
            const loc = await result;
            return loc ?? '';
        }
        return '';
    };

    const handleSave = () => {
        setTouched(true);
        if (!key.trim() || !value.trim() || !validation.isValid) return;

        onSave(key.trim(), operator, value.trim(), initialPropertyId, activeDef?.icon);
        if (isAdding) {
            setKey('');
            setOperator('is');
            setValue('');
        }
    };

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newKey = e.target.value;
        setKey(newKey);
        if (!operator || operator === 'is') {
            const def = findAttributeDefInTree(newKey, ontology);
            if (def?.operators?.real?.[0]) {
                setOperator(def.operators.real[0]);
            }
        }
    };

    const allSuggestions = useMemo(() => {
        const seen = new Set<string>();
        const merged: SuggestedAttribute[] = [];
        for (const s of [...patternSuggestions, ...ontologySuggestions, ...suggestions]) {
            const k = `${s.key}:${s.type}`;
            if (!seen.has(k)) {
                seen.add(k);
                merged.push(s);
            }
        }
        return merged;
    }, [patternSuggestions, ontologySuggestions, suggestions]);

    const filteredSuggestions = useMemo(() => {
        if (!key || activeDef) return [];
        const lower = key.toLowerCase();
        return allSuggestions
            .filter(s => s.key.toLowerCase().includes(lower) && s.key.toLowerCase() !== lower)
            .slice(0, 5);
    }, [key, allSuggestions, activeDef]);

    const patternSuggestionsFiltered = useMemo(() => filteredSuggestions.filter(s => s.parentContext), [filteredSuggestions]);
    const learnedSuggestionsFiltered = useMemo(() => filteredSuggestions.filter(s => !s.parentContext), [filteredSuggestions]);

    useEffect(() => {
        if (patternSuggestionsFiltered.length > 0) {
            track(Metrics.PATTERN_SUGGESTION_SHOWN, {
                count: patternSuggestionsFiltered.length,
                suggestions: patternSuggestionsFiltered.map(s => `${s.key} (${s.parentContext})`).join(', ')
            });
        }
    }, [patternSuggestionsFiltered, track]);

    const renderContent = () => (
        <>
            <div className="flex justify-between items-center flex-wrap gap-1 mb-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    {title || (isAdding ? 'New Property' : 'Edit Property')}
                </span>
                <div className="flex gap-1 flex-wrap">
                    {!readonly && isAdding && (
                        <Button
                            onClick={() => setShowExtraction(!showExtraction)}
                            variant={showExtraction ? 'primary' : 'secondary'}
                            size="xs"
                            icon={SearchSparkleIcon}
                            className="text-purple-300 border-purple-900/50 bg-purple-900/20 hover:bg-purple-900/40"
                            title="Extract properties from text"
                        >
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            Magic
                        </Button>
                    )}
                    {onPickLocation && (isAdding || ['location', 'geo', 'place'].includes(key)) && (
                        <div className="flex gap-1">
                            <Button
                                onClick={handleUseCurrentLocation}
                                variant="secondary"
                                size="xs"
                                icon={MapPinIcon}
                                title="Use current location"
                                disabled={readonly}
                            >
                                GPS
                            </Button>
                            <Button
                                onClick={() => {
                                    if (isAdding && !key) setKey('location');
                                    onPickLocation?.();
                                }}
                                variant="secondary"
                                size="xs"
                                icon={MapPinIcon}
                                title="Pick location on map"
                                disabled={readonly}
                            >
                                Map
                            </Button>
                        </div>
                    )}
                    {onPickTime && (isAdding || isTemporal) && (
                        <Button
                            onClick={() => {
                                const defaultKey = 'startDateTime';
                                if (isAdding && !key) setKey(defaultKey);
                                onPickTime?.(key || defaultKey);
                            }}
                            variant="secondary"
                            size="xs"
                            className="text-green-300 bg-green-900/30 hover:bg-green-900/50 border-green-900/50"
                            icon={ClockIcon}
                            title="Pick date/time"
                            disabled={readonly}
                        >
                            Time
                        </Button>
                    )}
                    {activeDef?.readonly && (
                        <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-700/30 flex items-center gap-1">
                            <span className="w-3 h-3" style={{background: `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22%3E%3Crect x=%223%22 y=%2211%22 width=%2218%22 height=%2211%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Cpath d=%22M7 11V7a5 5 0 0 1 10 0v4%22%3E%3C/path%3E%3C/svg%22")`}} />
                            Read-only
                        </span>
                    )}
                    <Button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        variant="secondary"
                        size="xs"
                        icon={showAdvanced ? ChevronUpIcon : ChevronDownIcon}
                        title={showAdvanced ? 'Hide advanced' : 'Show advanced'}
                        className="text-gray-400 hover:text-white"
                    />
                </div>
            </div>

            {showExtraction && (
                <div className="bg-gray-700/50 p-3 rounded mb-2 border border-purple-500/30">
                    <Textarea
                        placeholder="Describe property (e.g. 'budget < 200')"
                        value={extractionText}
                        onChange={(e) => setExtractionText(e.target.value)}
                        rows={2}
                        autoFocus
                        className="text-sm mb-2"
                    />
                    {(aiLoading || aiFallbackUsed || aiError) && (
                        <ExtractionStatus
                            loading={aiLoading}
                            fallbackUsed={aiFallbackUsed}
                            providerUsed="ai"
                            providerKind={aiFallbackUsed ? 'heuristic' : 'llm'}
                            error={aiError}
                            onRetry={handleMagicFill}
                        />
                    )}
                    <Button
                        onClick={handleMagicFill}
                        size="xs"
                        variant="primary"
                        className="w-full bg-purple-600 hover:bg-purple-500"
                        disabled={aiLoading}
                    >
                        {aiLoading ? 'Extracting...' : 'Extract Property'}
                    </Button>
                </div>
            )}

            <div className="relative">
                <Input
                    list="property-keys"
                    placeholder="Key (e.g. price)"
                    value={key}
                    onChange={handleKeyChange}
                    autoFocus={isAdding && !showExtraction}
                    disabled={readonly}
                    className={activeDef ? "border-blue-500/50 ring-1 ring-blue-500/20" : ""}
                />
                <datalist id="property-keys">
                    {ontology.flatMap(n =>
                        n.attributes ? Object.keys(n.attributes) : []
                    ).map(k => (
                        <option key={k} value={k}/>
                    ))}
                    {allSuggestions.map(s => (
                        <option key={`${s.key}-${s.type}`} value={s.key}>
                            {s.key} {s.parentContext ? `(Pattern: ${s.parentContext})` : '(Learned)'}
                        </option>
                    ))}
                </datalist>
                {type && !readonly && (
                    <span className="absolute right-2 top-3 text-[10px] uppercase bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600">
                        {type}
                    </span>
                )}
            </div>

            {description && (
                <div className="text-xs text-gray-400 italic flex items-start gap-1 mb-2">
                    <InformationCircleIcon className="w-3 h-3 flex-shrink-0 mt-0.5"/>
                    {description}
                </div>
            )}

            <div className="grid grid-cols-[1fr,2fr] gap-3">
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">Comparison</label>
                    <Select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        options={compatibleOperators}
                        disabled={readonly}
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">Value</label>
                    <EnhancedPropertyValueInput
                        value={value}
                        onChange={(val) => {
                            setValue(val);
                            setTouched(true);
                        }}
                        attributeDef={activeDef}
                        operator={operator}
                        onPickLocation={handlePickLocation}
                        onPickTime={onPickTime}
                        readonly={readonly || !!activeDef?.readonly}
                        numericOptions={activeDef?.numericOptions}
                        selectOptions={activeDef?.options}
                        affinityOptions={activeDef?.affinityOptions}
                        arity={activeDef?.arity}
                    />
                </div>
            </div>

            {activeDef?.arity && (
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <span className="w-3 h-3" style={{background: `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22%3E%3C/circle%3E%3Cline x1=%2212%22 y1=%228%22 x2=%2212%22 y2=%2216%22%3E%3C/line%3E%3Cline x1=%228%22 y1=%2212%22 x2=%2216%22 y2=%2212%22%3E%3C/line%3E%3C/svg%22")`}} />
                    {activeDef.arity.min > 0 && <span className="text-red-400">Required</span>}
                    {activeDef.arity.max && <span>Max {activeDef.arity.max} values</span>}
                </div>
            )}

            {learnedSuggestionsFiltered.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {learnedSuggestionsFiltered.map(s => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setKey(s.key)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50 transition-colors"
                        >
                            <SparklesIcon className="w-3 h-3" />
                            {s.key}
                        </button>
                    ))}
                </div>
            )}

            {patternSuggestionsFiltered.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {patternSuggestionsFiltered.map(s => (
                        <button
                            key={`${s.key}-${s.parentContext}`}
                            type="button"
                            onClick={() => {
                                track(Metrics.PATTERN_SUGGESTION_ACCEPTED, {
                                    suggestionKey: s.key,
                                    parentContext: s.parentContext ?? "",
                                    confidence: s.confidence
                                });
                                setKey(s.key);
                            }}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-900/30 text-green-300 border border-green-800/50 hover:bg-green-900/50 transition-colors"
                            title={`Suggested by pattern: ${s.parentContext}`}
                        >
                            <SparklesIcon className="w-3 h-3" />
                            {s.key}
                        </button>
                    ))}
                </div>
            )}

            {activeDef && (
                <div className="bg-blue-900/10 border border-blue-900/30 rounded p-2 mb-2 text-xs flex flex-col gap-1">
                    {activeDef.description && (
                        <div className="flex items-start gap-1.5 text-blue-300">
                            <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>
                            <span>{activeDef.description}</span>
                        </div>
                    )}
                    {activeDef.aliases && activeDef.aliases.length > 0 && (
                        <div className="text-gray-500 pl-5">
                            <span className="italic text-gray-600">Also known as: </span>
                            {activeDef.aliases.join(', ')}
                        </div>
                    )}
                </div>
            )}

            {touched && !validation.isValid && (
                <div className="bg-red-900/20 border border-red-900/50 rounded p-2 mb-2 flex items-center gap-2 text-red-300 text-xs animate-fadeIn">
                    <span className="w-4 h-4 flex-shrink-0">!</span>
                    <span>{validation.message}</span>
                </div>
            )}

            <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between transition-colors ${
                validation.isValid && key && value ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-900/30 border-gray-800'
            }`}>
                <div className="flex items-center gap-2 text-gray-500">
                    <span className="text-xs uppercase font-semibold">Summary</span>
                </div>
                <span className={`${validation.isValid && key && value ? 'text-blue-300' : 'text-gray-600'} text-sm`}>
                    {key && value ? `${key} ${operator} ${value}` : 'Choose a detail'}
                </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <IconButton
                    onClick={onCancel}
                    variant="secondary"
                    icon={XIcon}
                    title="Cancel"
                    disabled={readonly}
                />
                <IconButton
                    onClick={handleSave}
                    variant="ghost"
                    className="text-green-500 hover:text-green-400 hover:bg-gray-700"
                    icon={CheckIcon}
                    title="Save"
                    disabled={readonly || !key.trim() || !value.trim() || !validation.isValid}
                />
            </div>
        </>
    );

    if (isModal) {
        return (
            <Modal isOpen={isOpen} onClose={onCancel} title={title || (isAdding ? "Add detail" : "Edit detail")}>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
                    {renderContent()}
                </form>
            </Modal>
        );
    }

    return (
        <div className={`bg-gray-800 rounded-lg border space-y-4 animate-fade-in ${isModal ? 'shadow-xl p-4' : 'p-3 shadow-lg border-blue-500/50'}`}>
            {renderContent()}
        </div>
    );
}