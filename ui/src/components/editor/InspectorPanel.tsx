import React, {useMemo, useState} from 'react';
import type {Note, OntologyNode, Property} from '@notention/core';
import {parseGeoFromValues} from '@notention/core';
import {ClockIcon, MapPinIcon, GlobeIcon, PlusIcon, XIcon} from '../ui/icons';
import {RelatedNotesPanel} from '../assistant/RelatedNotesPanel';
import {useRelatedNotes} from '../../hooks/useRelatedNotes';
import {useNotes} from '../../hooks/useNotes';
import {cn} from '../../utils/ui';
import type {RelatedNote} from '@notention/core';
import {PropertyBlock} from '../properties/PropertyBlock';
import {PropertyEditor} from '../editor/PropertyEditor';
import {ExtractionReview} from '../editor/ExtractionReview';
import {usePropertyReview} from '../../hooks/usePropertyReview';
import type {PropertyReviewItem} from '../../hooks/usePropertyReview';
import {Button} from '../ui/Button';
import {useToast} from '../../hooks/useToast';

interface InspectorPanelProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties: Note['properties'];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    ontology: OntologyNode[];
    className?: string;
}

interface PropertyReviewState {
    items: PropertyReviewItem[];
    accept: (item: PropertyReviewItem) => void;
    reject: (item: PropertyReviewItem) => void;
}

interface ContextData {
    location: { lat: number; lng: number } | null;
    date: Date | null;
    dateLabel: string;
}

export function InspectorPanel({
    note,
    onNoteUpdate,
    properties,
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology,
    className = '',
}: InspectorPanelProps) {
    const { notes: allNotes } = useNotes();
    const { findRelated, findBacklinks } = useRelatedNotes(note);
    const relatedNotes = findRelated;
    const backlinks = findBacklinks;
    const { addToast } = useToast();
    const propertyReview = usePropertyReview(note.content, properties, ontology);

    const [isAddingProperty, setIsAddingProperty] = useState(false);
    const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

    const context = useMemo<ContextData>(() => {
        let location: { lat: number; lng: number } | null = null;
        let date: Date | null = null;
        let dateLabel = '';

        note.properties.forEach(p => {
            const k = p.key.toLowerCase();
            if (['location', 'geo', 'place'].includes(k) && p.values[0]) {
                location = parseGeoFromValues(p.values);
            }
            if (['date', 'time', 'deadline', 'start', 'end', 'due'].some(match => k.includes(match)) && p.values[0]) {
                const d = new Date(p.values[0]);
                if (!isNaN(d.getTime())) {
                    date = d;
                    dateLabel = p.key;
                }
            }
        });

        return {location, date, dateLabel};
    }, [note.properties]);

    const hasContext = context.location || context.date;

    const handleSaveProperty = (key: string, operator: string, value: string) => {
        if (!onUpdateProperty) return;

        const newProp: Property = {
            key,
            operator,
            values: value.split(',').map(v => v.trim())
        };

        if (editingPropertyIndex !== null && properties) {
            const oldProp = properties[editingPropertyIndex];
            onUpdateProperty(oldProp, newProp);
            setEditingPropertyIndex(null);
        } else {
            onUpdateProperty(null, newProp);
            setIsAddingProperty(false);
        }
    };

    const handleCancelEdit = () => {
        setIsAddingProperty(false);
        setEditingPropertyIndex(null);
    };

    const handleDeleteProperty = () => {
        if (propertyToDelete && onUpdateProperty) {
            onUpdateProperty(propertyToDelete, null);
            setPropertyToDelete(null);
        }
    };

    return (
        <div className={cn('flex flex-col h-full bg-gray-900 border-l border-gray-800', className)}>
            {hasContext && (
                <div className="flex flex-wrap gap-2 px-8 py-3 bg-gray-900/50 border-b border-gray-700/30">
                    {context.location && (
                        <div
                            className="group flex items-center gap-2 px-2.5 py-1.5 bg-blue-900/10 border border-blue-500/20 rounded-full hover:bg-blue-900/20 transition-all cursor-pointer"
                            onClick={onPickLocation}
                        >
                            <MapPinIcon className="w-3.5 h-3.5 text-blue-400"/>
                            <span className="text-[11px] font-medium text-blue-200">
                                {context.location.lat.toFixed(3)}, {context.location.lng.toFixed(3)}
                            </span>
                            <a
                                href={`https://www.openstreetmap.org/?mlat=${context.location.lat}&mlon=${context.location.lng}#map=15/${context.location.lat}/${context.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-blue-500 hover:text-blue-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GlobeIcon className="w-3 h-3"/>
                            </a>
                        </div>
                    )}

                    {context.date && (
                        <div
                            className="group flex items-center gap-2 px-2.5 py-1.5 bg-purple-900/10 border border-purple-500/20 rounded-full hover:bg-purple-900/20 transition-all cursor-pointer"
                            onClick={() => onPickTime?.(context.dateLabel)}
                        >
                            <ClockIcon className="w-3.5 h-3.5 text-purple-400"/>
                            <span className="text-[11px] font-medium text-purple-200">
                                {context.date.toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-purple-400/80 uppercase font-bold">
                                {(() => {
                                    const diff = context.date!.getTime() - Date.now();
                                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                    if (diff < 0) return `Passed`;
                                    if (days === 0) return 'Today';
                                    if (days === 1) return 'Tomorrow';
                                    return `In ${days}d`;
                                })()}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Properties section */}
                    <div className="space-y-3">
                        {!isAddingProperty && (
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs text-gray-500 font-medium">
                                    {properties.length} Properties
                                </span>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    icon={PlusIcon}
                                    onClick={() => setIsAddingProperty(true)}
                                    className="text-blue-400 hover:bg-blue-900/30"
                                >
                                    Add
                                </Button>
                            </div>
                        )}

                        {isAddingProperty && (
                            <PropertyEditor
                                initialKey=""
                                initialOperator="is"
                                initialValue=""
                                isAdding={true}
                                onSave={handleSaveProperty}
                                onCancel={handleCancelEdit}
                                onPickLocation={onPickLocation}
                                onPickTime={onPickTime}
                                ontology={ontology}
                            />
                        )}

                        <div className="space-y-1">
                            {properties.map((prop, idx) => (
                                <PropertyBlock
                                    key={`${prop.key}-${idx}`}
                                    property={prop}
                                    onUpdate={(newProp) => handleSaveProperty(newProp.key, newProp.operator, newProp.values.join(','))}
                                    onDelete={() => setPropertyToDelete(prop)}
                                    ontology={ontology}
                                />
                            ))}
                        </div>

                        {properties.length === 0 && !isAddingProperty && (
                            <div className="text-center py-4 text-gray-500 text-xs italic bg-gray-900/30 rounded border border-gray-800 border-dashed">
                                No properties yet.
                            </div>
                        )}

                        {!isAddingProperty && propertyReview && (
                            <ExtractionReview
                                items={propertyReview.items}
                                onAccept={propertyReview.accept}
                                onReject={propertyReview.reject}
                            />
                        )}
                    </div>

                    {/* Related notes section */}
                    {(relatedNotes.length > 0 || backlinks.length > 0) && (
                        <RelatedNotesPanel
                            note={note}
                            relatedNotes={relatedNotes}
                            backlinks={backlinks}
                            onSelectNote={(selectedNote) => {
                                window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: selectedNote.id }));
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

interface InspectorSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties: Note['properties'];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    ontology: OntologyNode[];
}

export function InspectorSidebar({
    isOpen,
    onClose,
    note,
    onNoteUpdate,
    properties,
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology,
}: InspectorSidebarProps) {
    const sidebarClass = cn(
        'flex flex-col h-full bg-gray-900 border-l border-gray-700/50',
        'transition-all duration-300 ease-in-out transform',
        'fixed inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none lg:z-0 lg:relative',
        'w-80 max-w-[85vw]',
        isOpen
            ? 'translate-x-0'
            : 'translate-x-full lg:w-0 lg:translate-x-0 lg:border-l-0 lg:overflow-hidden'
    );

    return (
        <div className={sidebarClass}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-200">Details</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close details"
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-800"
                >
                    <XIcon className="w-4 h-4"/>
                </button>
            </div>
            <InspectorPanel
                note={note}
                onNoteUpdate={onNoteUpdate}
                properties={properties}
                onUpdateProperty={onUpdateProperty}
                onPickLocation={onPickLocation}
                onPickTime={onPickTime}
                ontology={ontology}
            />
        </div>
    );
}