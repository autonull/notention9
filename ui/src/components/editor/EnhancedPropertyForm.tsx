import React, {useEffect, useState} from 'react';
import {CheckIcon, ClockIcon, InformationCircleIcon, MapPinIcon, SearchSparkleIcon, XIcon, SparklesIcon} from '../common/icons';
import type {OntologyNode} from '@notention/core';
import {Logger} from '@notention/core';
import {getCurrentPosition} from '../../utils/geolocation';
import {useToast} from '../../hooks/useToast';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {IconButton} from '../ui/Primitives';
import {Select} from '../common/Select';
import {Textarea} from '../common/Textarea';
import {useGardener} from '../../hooks/useGardener';
import {EnhancedPropertyValueInput} from '../properties/EnhancedPropertyValueInput';

interface PropertyFormProps {
    initialKey: string;
    initialOp: string;
    initialValue: string;
    isAdding: boolean;
    onSave: (key: string, op: string, value: string) => void;
    onCancel: () => void;
    onPickLocation?: () => Promise<string> | void;
    onPickTime?: (key: string) => void;
    ontology: OntologyNode[];
    readonly?: boolean;
}

export function PropertyForm({
    initialKey,
    initialOp,
    initialValue,
    isAdding,
    onSave,
    onCancel,
    onPickLocation,
    onPickTime,
    ontology,
    readonly = false,
}: PropertyFormProps) {
    const [key, setKey] = useState(initialKey);
    const [op, setOp] = useState(initialOp);
    const [value, setValue] = useState(initialValue);
    const [showExtraction, setShowExtraction] = useState(false);
    const [extractionText, setExtractionText] = useState('');
    const {addToast} = useToast();

    useEffect(() => {
        setKey(initialKey);
        setOp(initialOp);
        setValue(initialValue);
    }, [initialKey, initialOp, initialValue]);

    const getAttributeDetails = (k: string, nodes: OntologyNode[]): {
        type: string;
        description?: string;
        options?: string[];
        operators?: {real: string[]; imaginary: string[]};
        numericOptions?: {unit?: string; precision?: number; min?: number; max?: number};
        affinityOptions?: {bipolar?: boolean; targetType?: 'tag' | 'ontology_class' | 'peer'};
        readonly?: boolean;
        arity?: {min: number; max: number};
    } | undefined => {
        if (!nodes) return undefined;
        for (const node of nodes) {
            if (node.attributes && node.attributes[k]) {
                const attr = node.attributes[k];
                return {
                    type: attr.type,
                    description: attr.description,
                    options: attr.options,
                    operators: attr.operators,
                    numericOptions: (attr as any).numericOptions,
                    affinityOptions: (attr as any).affinityOptions,
                    readonly: (attr as any).readonly,
                    arity: (attr as any).arity,
                };
            }
            if (node.children) {
                const found = getAttributeDetails(k, node.children);
                if (found) return found;
            }
        }
        return undefined;
    };

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

    const {alignToOntology} = useGardener();

    const handleMagicFill = async () => {
        if (!extractionText) return;

        try {
            const results = await alignToOntology(extractionText, ontology);

            if (results.length > 0) {
                const property = results[0];
                setKey(property.key);
                setOp(property.operator);
                setValue(property.values.join(','));
                setShowExtraction(false);
                addToast('Property extracted!', 'success');
            } else {
                addToast('No properties found in text.', 'info');
            }
        } catch (e) {
            Logger.getInstance().error("Property extraction failed", e instanceof Error ? e : new Error(String(e)));
            addToast('Extraction failed.', 'error');
        }
    };

    const currentAttr = key ? getAttributeDetails(key, ontology) : undefined;
    const type = currentAttr?.type;
    const description = currentAttr?.description;
    const isTemporal = type === 'date' || type === 'datetime' || ['start', 'end', 'date', 'time', 'deadline', 'dueDate', 'startDateTime', 'endDateTime'].some(k => key.toLowerCase().includes(k.toLowerCase()));
    const isBoolean = type === 'boolean';
    const isNumber = type === 'number';
    const isAffinity = type === 'affinity';
    const isEnum = type === 'enum';
    const isGeo = type === 'geo';

    const allOperators = [
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

    const compatibleOperators = currentAttr
        ? allOperators.filter(o => currentAttr?.operators?.real?.includes(o.value) || currentAttr?.operators?.imaginary?.includes(o.value))
        : allOperators;

    const handleSave = () => {
        onSave(key, op, value);
        if (isAdding) {
            setKey('');
            setOp('is');
            setValue('');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/50 space-y-4 animate-fade-in shadow-xl">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex justify-between items-center flex-wrap gap-1">
                <span>{isAdding ? 'New Property' : 'Edit Property'}</span>
                <div className="flex gap-1 flex-wrap">
                    {isAdding && !readonly && (
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
                    {currentAttr?.readonly && (
                        <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-700/30 flex items-center gap-1">
                            <span className="w-3 h-3" style={{background: `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22%3E%3Crect x=%223%22 y=%2211%22 width=%2218%22 height=%2211%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Cpath d=%22M7 11V7a5 5 0 0 1 10 0v4%22%3E%3C/path%3E%3C/svg%22")`}} />
                            Read-only
                        </span>
                    )}
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
                    <Button
                        onClick={handleMagicFill}
                        size="xs"
                        variant="primary"
                        className="w-full bg-purple-600 hover:bg-purple-500"
                    >
                        Extract Property
                    </Button>
                </div>
            )}

            <div className="relative">
                <Input
                    list="property-keys"
                    placeholder="Key (e.g. price)"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    autoFocus={isAdding && !showExtraction}
                    disabled={readonly}
                />
                <datalist id="property-keys">
                    {ontology.flatMap(n =>
                        n.attributes ? Object.keys(n.attributes) : []
                    ).map(k => (
                        <option key={k} value={k}/>
                    ))}
                </datalist>
                {type && !readonly && (
                    <span className="absolute right-2 top-3 text-[10px] uppercase bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600">
                        {type}
                    </span>
                )}
            </div>

            {description && (
                <div className="text-xs text-gray-400 italic flex items-start gap-1">
                    <InformationCircleIcon className="w-3 h-3 flex-shrink-0 mt-0.5"/>
                    {description}
                </div>
            )}

            <Select
                value={op}
                onChange={(e) => setOp(e.target.value)}
                options={compatibleOperators}
                disabled={readonly}
            />

            <EnhancedPropertyValueInput
                value={value}
                onChange={setValue}
                attributeDef={currentAttr as any}
                operator={op}
                onPickLocation={onPickLocation ? async (): Promise<string> => {
                    if (isAdding && !key) setKey('location');
                    const result = onPickLocation();
                    if (result instanceof Promise) {
                        const loc = await result;
                        return loc ?? '';
                    }
                    return '';
                } : undefined}
                onPickTime={onPickTime}
                readonly={readonly || !!currentAttr?.readonly}
                numericOptions={currentAttr?.numericOptions}
                selectOptions={currentAttr?.options}
                affinityOptions={currentAttr?.affinityOptions}
                arity={currentAttr?.arity}
            />

            {currentAttr?.arity && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-3 h-3" style={{background: `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22%3E%3C/circle%3E%3Cline x1=%2212%22 y1=%228%22 x2=%2212%22 y2=%2216%22%3E%3C/line%3E%3Cline x1=%228%22 y1=%2212%22 x2=%2216%22 y2=%2212%22%3E%3C/line%3E%3C/svg%22")`}} />
                    {currentAttr.arity.min > 0 && <span className="text-red-400">Required</span>}
                    {currentAttr.arity.max && <span>Max {currentAttr.arity.max} values</span>}
                </div>
            )}

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
                    disabled={readonly || !key.trim()}
                />
            </div>
        </div>
    );
}