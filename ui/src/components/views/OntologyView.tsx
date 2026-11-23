import React, {useState} from 'react';

import {useOntologyView, type OntologyTab} from '../../hooks/useOntologyView';
import {OntologyNodeItem} from '../ontology/OntologyNodeItem';
import {OntologyConflicts} from '../ontology/OntologyConflicts';
import {useView} from '../../hooks/useViewContext';
import {Tabs, type TabOption} from '../ui/kit';
import {Button} from '../ui/Button';
import {Toggle} from '../ui/Primitives';
import {EditIcon, SparklesIcon, PlusIcon} from '../ui/icons';
import {InputModal} from '../ui/Primitives';
import {AttributeEditorModal} from '../ontology/AttributeEditorModal';
import {OntologySuggestionItem} from '../ontology/OntologySuggestionItem';
import {ConfirmationModal} from '../ui/Primitives';
import {useToast} from '../../hooks/useToast';
import {OntologyAttribute} from '@notention/core';
import {Skeleton} from '../ui';

export function OntologyView() {
    const {addToast} = useToast();
    const {
        ontology: ontologyData,
        activeTab,
        setActiveTab,
        isEvolving,
        handleEvolve,
        handleOptimize,
        handleAddNode,
        handleDeleteNode,
        handleAddAttribute,
        usageStats,
        conflicts,
        suggestions
    } = useOntologyView();

    const ontology = ontologyData ?? [];

    const {setSelectedNoteId, setActiveView} = useView();
    const [isEditing, setIsEditing] = useState(false);

    // Modal States
    const [inputModalOpen, setInputModalOpen] = useState(false);
    const [attributeModalOpen, setAttributeModalOpen] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'addRoot' | 'addChild'>('addRoot');
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

    // Attribute Modal State
    const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
    const [attributeInitialValues, setAttributeInitialValues] = useState<{key: string, type: string, description?: string, aliases?: string[]} | undefined>(undefined);

    const handleSelectNote = (noteId: string) => {
        setSelectedNoteId(noteId);
        setActiveView('notes');
    };

    const openAddChildModal = (parentId: string) => {
        setSelectedParentId(parentId);
        setModalType('addChild');
        setInputModalOpen(true);
    };

    const openAddRootModal = () => {
        setModalType('addRoot');
        setInputModalOpen(true);
    };

    const handleInputConfirm = (name: string) => {
        if (modalType === 'addRoot') {
            handleAddNode(null, name);
        } else if (selectedParentId) {
            handleAddNode(selectedParentId, name);
        }
    };

    const handleAddAttributeConfirm = (key: string, attribute: OntologyAttribute) => {
        if (targetNodeId) {
            handleAddAttribute(targetNodeId, key, attribute);
            addToast(`Added '${key}' to ontology`, 'success');
        }
    };

    const openDeleteModal = (nodeId: string) => {
        setNodeToDelete(nodeId);
        setConfirmModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (nodeToDelete) {
            handleDeleteNode(nodeToDelete);
        }
    };

    const tabs: Array<TabOption<OntologyTab>> = [
        {id: 'graph', label: 'Graph'},
        {id: 'suggestions', label: 'Learning', count: suggestions.length > 0 ? suggestions.length : undefined},
        {id: 'conflicts', label: 'Conflicts', count: conflicts.length}
    ];

    // If we were on simulator tab (which is removed), switch to graph
    const safeActiveTab = activeTab === 'simulator' ? 'graph' : activeTab;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col gap-4 border-b border-[var(--app-line)] pb-4">

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--app-text)]">Ontology</h2>
                        <p className="text-[12px] text-[var(--app-muted)]">
                            The shared vocabulary of your network, built from the details in your notes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {safeActiveTab === 'graph' && (
                            <div className="flex items-center gap-2 mr-2">
                                <span className="hidden text-[11px] text-[var(--app-muted)] sm:inline">Edit mode</span>
                                <Toggle checked={isEditing} onChange={() => setIsEditing(p => !p)}/>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <Tabs
                                options={tabs}
                                value={safeActiveTab}
                                onChange={id => setActiveTab(id)}
                                label="Ontology sections"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Button
                        onClick={handleEvolve}
                        disabled={isEvolving}
                        loading={isEvolving}
                        variant="primary"
                        size="xs"
                        className="flex-shrink-0"
                    >
                        {isEvolving ? 'Updating...' : 'Update Ontology'}
                    </Button>

                    <Button
                        onClick={handleOptimize}
                        disabled={isEvolving}
                        loading={isEvolving}
                        variant="secondary"
                        size="xs"
                        className="flex-shrink-0"
                    >
                        Optimize
                    </Button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                {safeActiveTab === 'conflicts' ? (
                    <OntologyConflicts conflicts={conflicts} onSelectNote={handleSelectNote}/>
                ) : safeActiveTab === 'suggestions' ? (
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-lg border border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] p-3">
                            <SparklesIcon className="h-4 w-4 shrink-0 text-[var(--app-accent-text)]" />
                            <div>
                                <h3 className="text-[13px] font-medium text-[var(--app-text)]">Learned attributes</h3>
                                <p className="text-[12px] leading-5 text-[var(--app-muted)]">
                                    The system observes your usage and suggests new attributes to add to the ontology.
                                </p>
                            </div>
                        </div>

                        {suggestions.length === 0 ? (
                            <div className="py-10 text-center text-[12px] text-[var(--app-muted)]">
                                No suggestions yet. Start using new properties in your notes!
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {suggestions.map((suggestion) => (
                                    <OntologySuggestionItem
                                        key={suggestion.key}
                                        suggestion={suggestion}
                                        onAdd={() => {
                                            const targetNode = ontology.find(n => n.label === suggestion.parentContext) || ontology[0];
                                            if (targetNode) {
                                                setTargetNodeId(targetNode.id);
                                                setAttributeInitialValues({
                                                    key: suggestion.key,
                                                    type: suggestion.type,
                                                    description: `Learned from usage: ${suggestion.key}`
                                                });
                                                setAttributeModalOpen(true);
                                            } else {
                                                addToast('No suitable parent node found', 'error');
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isEditing && (
                            <div className="mb-4 flex justify-end">
                                <Button
                                    onClick={openAddRootModal}
                                    variant="secondary"
                                    size="sm"
                                    icon={EditIcon}
                                >
                                    Add Root Node
                                </Button>
                            </div>
                        )}

                        <div className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-6">
                            {ontology.length === 0 ? (
                                <div className="py-12 text-center text-[var(--app-muted)]">
                                    <p>Ontology is empty.</p>
                                    <p className="text-sm mt-2">Start writing notes with properties to seed the
                                        graph.</p>
                                </div>
                            ) : (
                                ontology.map((rootNode) => (
                                    <OntologyNodeItem
                                        key={rootNode.id}
                                        node={rootNode}
                                        level={0}
                                        usageStats={usageStats}
                                        isEditing={isEditing}
                                        onAddChild={openAddChildModal}
                                        onDeleteNode={openDeleteModal}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <InputModal
                isOpen={inputModalOpen}
                onClose={() => setInputModalOpen(false)}
                onConfirm={handleInputConfirm}
                title={modalType === 'addRoot' ? "Add Root Node" : "Add Child Node"}
                label="Concept Name"
                placeholder="e.g. Project, Task, Person"
                confirmLabel="Add Concept"
            />

            <AttributeEditorModal
                isOpen={attributeModalOpen}
                onClose={() => setAttributeModalOpen(false)}
                onConfirm={handleAddAttributeConfirm}
                initialValues={attributeInitialValues}
                title={`Add Attribute to ${ontology.find(n => n.id === targetNodeId)?.label || 'Node'}`}
            />

            <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Concept"
                message="Are you sure you want to delete this concept and all its descendants? This cannot be undone."
                confirmLabel="Delete"
                isDestructive
            />
        </div>
    );
}
