import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { OntologyNode, OntologyAttribute } from '@notention/core';
import {
  addNode,
  deleteNode,
  renameNode,
  addAttribute,
  deleteAttribute,
  renameAttribute,
  mergeAttributes
} from '@notention/core';
import { PlusIcon, SparklesIcon } from '../common/icons';
import { Modal } from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import { InputModal } from '../common/InputModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { OntologyNodeRenderer } from './OntologyNodeRenderer';

export function OntologyTab() {
  const { settings, setSettings } = useSettings();
  const { addToast } = useToast();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modal State
  const [inputModal, setInputModal] = useState<{
      isOpen: boolean;
      title: string;
      label?: string;
      defaultValue?: string;
      onConfirm: (val: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Merge state
  const [mergingAttr, setMergingAttr] = useState<{ nodeId: string, sourceKey: string } | null>(null);
  const [targetMergeKey, setTargetMergeKey] = useState<string>('');

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedNodes(newSet);
  };

  // --- Actions ---

  const handleAddNode = (parentId: string | null) => {
      setInputModal({
          isOpen: true,
          title: "Add Node",
          label: "Node ID (Label will match ID initially)",
          onConfirm: (id) => {
              if (!id) return;
              const newNode: OntologyNode = { id, label: id };
              setSettings(prev => ({
                  ...prev,
                  ontology: addNode(prev.ontology, parentId, newNode)
              }));
              if (parentId) {
                  const newExpanded = new Set(expandedNodes);
                  newExpanded.add(parentId);
                  setExpandedNodes(newExpanded);
              }
          }
      });
  };

  const handleDeleteNode = (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Delete Node",
          message: "Are you sure you want to delete this node and all its children?",
          onConfirm: () => {
              setSettings(prev => ({
                  ...prev,
                  ontology: deleteNode(prev.ontology, id)
              }));
          }
      });
  };

  const handleRenameNode = (id: string, currentLabel: string) => {
      setInputModal({
          isOpen: true,
          title: "Rename Node",
          label: "New Label",
          defaultValue: currentLabel,
          onConfirm: (newLabel) => {
              if (newLabel && newLabel !== currentLabel) {
                  setSettings(prev => ({
                      ...prev,
                      ontology: renameNode(prev.ontology, id, newLabel)
                  }));
              }
          }
      });
  };

  const handleAddAttribute = (nodeId: string) => {
      setInputModal({
          isOpen: true,
          title: "Add Attribute",
          label: "Attribute Key",
          onConfirm: (key) => {
              if (!key) return;
              const newAttr: OntologyAttribute = {
                  type: 'string',
                  description: '',
                  operators: { real: ['is'], imaginary: ['is not'] }
              };
              setSettings(prev => ({
                  ...prev,
                  ontology: addAttribute(prev.ontology, nodeId, key, newAttr)
              }));
              const newExpanded = new Set(expandedNodes);
              newExpanded.add(nodeId);
              setExpandedNodes(newExpanded);
          }
      });
  };

  const handleDeleteAttribute = (nodeId: string, key: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Delete Attribute",
          message: `Delete attribute '${key}'?`,
          onConfirm: () => {
              setSettings(prev => ({
                  ...prev,
                  ontology: deleteAttribute(prev.ontology, nodeId, key)
              }));
          }
      });
  };

  const handleRenameAttribute = (nodeId: string, oldKey: string) => {
      setInputModal({
          isOpen: true,
          title: "Rename Attribute",
          label: "New Key",
          defaultValue: oldKey,
          onConfirm: (newKey) => {
              if (newKey && newKey !== oldKey) {
                  try {
                      setSettings(prev => ({
                          ...prev,
                          ontology: renameAttribute(prev.ontology, nodeId, oldKey, newKey)
                      }));
                  } catch (e: unknown) {
                      const message = e instanceof Error ? e.message : String(e);
                      addToast(message, 'error');
                  }
              }
          }
      });
  };

  const handleMergeAttribute = (nodeId: string, sourceKey: string) => {
    setMergingAttr({ nodeId, sourceKey });
    setTargetMergeKey('');
  };

  const executeMerge = () => {
    if (!mergingAttr || !targetMergeKey) return;
    if (mergingAttr.sourceKey === targetMergeKey) {
        addToast("Source and target keys must be different.", 'error');
        return;
    }

    try {
        setSettings(prev => ({
            ...prev,
            ontology: mergeAttributes(prev.ontology, mergingAttr.nodeId, mergingAttr.sourceKey, targetMergeKey)
        }));
        addToast(`Merged '${mergingAttr.sourceKey}' into '${targetMergeKey}'`, 'success');
        setMergingAttr(null);
        setTargetMergeKey('');
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        addToast(message, 'error');
    }
  };

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg text-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-200">Ontology Graph</h2>
        <Button
            onClick={() => handleAddNode(null)}
            variant="primary"
            icon={PlusIcon}
            size="sm"
        >
            Add Root Node
        </Button>
      </div>
      <p className="text-gray-400 mb-4 text-xs">
        Manage the semantic structure of your network.
        Use <b>Merge</b> to resolve conflicts (aliasing attributes).
        <br/>
        <span className="text-purple-400 flex items-center gap-1 mt-1"><SparklesIcon className="w-3 h-3"/> Emergent nodes are automatically learned from the network.</span>
      </p>

      <ul>
        {settings.ontology.map(node => (
            <OntologyNodeRenderer
                key={node.id}
                node={node}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                onRenameNode={handleRenameNode}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                onAddAttribute={handleAddAttribute}
                onRenameAttribute={handleRenameAttribute}
                onMergeAttribute={handleMergeAttribute}
                onDeleteAttribute={handleDeleteAttribute}
            />
        ))}
      </ul>

      {mergingAttr && (
        <Modal
            isOpen={true}
            onClose={() => setMergingAttr(null)}
            title={`Merge Attribute '${mergingAttr.sourceKey}'`}
        >
            <div className="space-y-4">
                <p className="text-gray-300">
                    Select the target attribute to merge <b>{mergingAttr.sourceKey}</b> into.
                    This will delete <b>{mergingAttr.sourceKey}</b> and alias it to the target.
                </p>
                <div>
                    <Input
                        label="Target Attribute Key"
                        value={targetMergeKey}
                        onChange={(e) => setTargetMergeKey(e.target.value)}
                        placeholder="e.g. 'price'"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        onClick={() => setMergingAttr(null)}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={executeMerge}
                        disabled={!targetMergeKey}
                        variant="primary"
                    >
                        Merge Attributes
                    </Button>
                </div>
                <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Upcoming Feature: Voting</h4>
                    <p className="text-xs text-gray-400">
                        In a future update, you will be able to propose this merge to the network and vote on shared definitions.
                    </p>
                </div>
            </div>
        </Modal>
      )}

      <InputModal
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={inputModal.onConfirm}
        title={inputModal.title}
        label={inputModal.label}
        defaultValue={inputModal.defaultValue}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive
      />
    </div>
  );
};
