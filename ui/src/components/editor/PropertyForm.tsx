import React, {useEffect, useState} from 'react';
import {CheckIcon, ClockIcon, InformationCircleIcon, MapPinIcon, SearchSparkleIcon, XIcon} from '../common/icons';
import type {OntologyNode} from '@notention/core';
import {Logger, parseProperties} from '@notention/core';
import {getCurrentPosition} from '../../utils/geolocation';
import {useToast} from '../../hooks/useToast';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {IconButton} from '../common/IconButton';
import {Select} from '../common/Select';
import {Textarea} from '../common/Textarea';
import {useGardener} from '../../hooks/useGardener';
import {PropertyValueInput} from './PropertyValueInput';

interface PropertyFormProps {
    initialKey: string;
    initialOp: string;
    initialValue: string;
    isAdding: boolean;
    onSave: (key: string, op: string, value: string) => void;
    onCancel: () => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    ontology: OntologyNode[];
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
                                 ontology
                             }: PropertyFormProps) {
    const [key, setKey] = useState(initialKey);
    const [op, setOp] = useState(initialOp);
    const [value, setValue] = useState(initialValue);
    const [showExtraction, setShowExtraction] = useState(false);
    const [extractionText, setExtractionText] = useState('');
    const {addToast} = useToast();

    // Update state if props change (e.g. location picked from parent)
    useEffect(() => {
        setKey(initialKey);
        setOp(initialOp);
        setValue(initialValue);
    }, [initialKey, initialOp, initialValue]);

    const getAttributeDetails = (k: string, nodes: OntologyNode[]): {
        type: string,
        description?: string
    } | undefined => {
        if (!nodes) return undefined;
        for (const node of nodes) {
            if (node.attributes && node.attributes[k]) {
                return {type: node.attributes[k].type, description: node.attributes[k].description};
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
                // Take the first one for now
                const parsed = parseProperties(results[0]);
                if (parsed.length > 0) {
                    const p = parsed[0];
                    setKey(p.key);
                    setOp(p.operator);
                    setValue(p.values.join(','));
                    setShowExtraction(false);
                    addToast('Property extracted!', 'success');
                } else {
                    addToast('Could not parse extracted property.', 'error');
                }
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

    const handleSave = () => {
        onSave(key, op, value);
        // Reset form if adding
        if (isAdding) {
            setKey('');
            setOp('is');
            setValue('');
        }
    };

    return (
        <div className="bg-gray-800 p-3 rounded-md border border-blue-500/50 space-y-3 animate-fade-in shadow-lg">
            <div
                className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex justify-between items-center flex-wrap gap-1">
                <span>{isAdding ? 'New Property' : 'Edit Property'}</span>
                <div className="flex gap-1">
                    {isAdding && (
                        <Button
                            onClick={() => setShowExtraction(!showExtraction)}
                            variant={showExtraction ? 'primary' : 'secondary'}
                            size="xs"
                            icon={SearchSparkleIcon}
                            className="text-purple-300 border-purple-900/50 bg-purple-900/20 hover:bg-purple-900/40"
                            title="Extract properties from text"
                        >
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
                            >
                                GPS
                            </Button>
                            <Button
                                onClick={() => {
                                    if (isAdding && !key) setKey('location');
                                    onPickLocation();
                                }}
                                variant="secondary"
                                size="xs"
                                icon={MapPinIcon}
                                title="Pick location on map"
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
                                onPickTime(key || defaultKey);
                            }}
                            variant="secondary"
                            size="xs"
                            className="text-green-300 bg-green-900/30 hover:bg-green-900/50 border-green-900/50"
                            icon={ClockIcon}
                            title="Pick date/time"
                        >
                            Time
                        </Button>
                    )}
                </div>
            </div>
            {showExtraction && (
                <div className="bg-gray-700/50 p-2 rounded mb-2 border border-purple-500/30">
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
                    autoFocus={isAdding && !showExtraction} // Autofocus only on add if extraction not open
                />
                <datalist id="property-keys">
                    {ontology.flatMap(n =>
                        n.attributes ? Object.keys(n.attributes) : []
                    ).map(k => (
                        <option key={k} value={k}/>
                    ))}
                </datalist>
                {type && (
                    <span
                        className="absolute right-2 top-3 text-[10px] uppercase bg-gray-700 text-gray-300 px-1 rounded">
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
                options={[
                    {value: 'is', label: 'is (=)'},
                    {value: 'is not', label: 'is not (!=)'},
                    {value: 'greater than', label: 'greater than (>)'},
                    {value: 'less than', label: 'less than (<)'},
                    {value: 'contains', label: 'contains'},
                    {value: 'between', label: 'between (range)'},
                ]}
            />
            <PropertyValueInput
                value={value}
                onChange={setValue}
                attributeDef={currentAttr}
                onPickLocation={onPickLocation ? async () => {
                    if (isAdding && !key) setKey('location');
                    onPickLocation();
                    return undefined; // onPickLocation in inspector might be void or return promise, we wrap it safely
                } : undefined}
            />
            <div className="flex justify-end gap-2 pt-1">
                <IconButton
                    onClick={onCancel}
                    variant="secondary"
                    icon={XIcon}
                    title="Cancel"
                />
                <IconButton
                    onClick={handleSave}
                    variant="ghost"
                    className="text-green-500 hover:text-green-400 hover:bg-gray-700"
                    icon={CheckIcon}
                    title="Save"
                />
            </div>
        </div>
    );
};
