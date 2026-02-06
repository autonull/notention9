import React, { useState } from 'react';

import { useOntologyView, OntologyTab } from '../../hooks/useOntologyView';
import { OntologyNodeItem } from '../ontology/OntologyNodeItem';
import { OntologyConflicts } from '../ontology/OntologyConflicts';
import { useView } from '../../hooks/useViewContext';
import { Tabs } from '../common/Tabs';
import { Button } from '../common/Button';
import { Toggle } from '../common/Toggle';
import { EditIcon } from '../common/icons';
import { InputModal } from '../common/InputModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { OntologyGraph } from '../developer/OntologyGraph';

export function OntologyView() {
  const {
    settings,
    ontology,
    activeTab,
    setActiveTab,
    isEvolving,
    handleEvolve,
    handleOptimize,
    handleAddNode,
    handleDeleteNode,
    usageStats,
    conflicts
  } = useOntologyView();

  const { setSelectedNoteId, setActiveView } = useView();
  const [isEditing, setIsEditing] = useState(false);

  // Modal States
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'addRoot' | 'addChild'>('addRoot');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

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

  const openDeleteModal = (nodeId: string) => {
    setNodeToDelete(nodeId);
    setConfirmModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (nodeToDelete) {
      handleDeleteNode(nodeToDelete);
    }
  };

  const tabs = [
    { id: 'graph', label: 'Graph' },
    { id: 'conflicts', label: 'Conflicts', count: conflicts.length }
  ];

  // If we were on simulator tab (which is removed), switch to graph
  const safeActiveTab = activeTab === 'simulator' ? 'graph' : activeTab;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-800/50 rounded-lg flex flex-col">
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-700 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Ontology</h2>
          {safeActiveTab === 'graph' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Edit Mode</span>
              <Toggle checked={isEditing} onChange={() => setIsEditing(p => !p)} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {settings.developerMode && (
            <>
              <Button
                onClick={handleOptimize}
                disabled={isEvolving}
                isLoading={isEvolving}
                variant="primary"
                size="xs"
                className="bg-blue-700/80 hover:bg-blue-600"
              >
                Optimize
              </Button>

              <Button
                onClick={handleEvolve}
                disabled={isEvolving}
                isLoading={isEvolving}
                variant="success"
                size="xs"
                className="bg-green-700/80 hover:bg-green-600"
              >
                {isEvolving ? 'Updating...' : 'Update Ontology'}
              </Button>
            </>
          )}

          <Tabs
            tabs={tabs}
            activeTab={safeActiveTab}
            onChange={(id) => setActiveTab(id as OntologyTab)}
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {safeActiveTab === 'conflicts' ? (
          <OntologyConflicts conflicts={conflicts} onSelectNote={handleSelectNote} />
        ) : (
          <>
            <div className="mb-6 flex items-start gap-4 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
              <div className="text-2xl">🌱</div>
              <div>
                <h3 className="font-bold text-white mb-1">The Ontology</h3>
                <p className="text-sm text-gray-400">
                  This graph represents the shared vocabulary of your network.
                  As you write notes with properties (e.g., <code>[price:is:100]</code>), the Semantic Engine automatically updates this structure.
                </p>
              </div>
            </div>

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

            <div className="mb-6 h-[400px] bg-gray-900 rounded-lg border border-gray-700/50 overflow-hidden">
              <OntologyGraph />
            </div>

            <div className="bg-gray-900/70 p-6 rounded-lg border border-gray-700/50">
              {ontology.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p>Ontology is empty.</p>
                  <p className="text-sm mt-2">Start writing notes with properties to seed the graph.</p>
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
