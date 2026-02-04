import React, { useState } from 'react';

import type { Property, OntologyNode } from '@notention/core';
import {
  PlusIcon,
  TagIcon,
  XIcon,
  SearchSparkleIcon
} from '../common/icons';
import { PropertyForm } from './PropertyForm';
import { PropertyBlock } from '../properties/PropertyBlock';
import { IconButton } from '../common/IconButton';
import { useGardener } from '../../hooks/useGardener';
import { parseProperties } from '@notention/core';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { useNotes } from '../../hooks/useNotes';
import { useView } from '../../hooks/useViewContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { propertyExtractionService } from '../../services/ai/propertyExtraction';
import { useEffect } from 'react';

interface PropertyInspectorProps {
  properties: Property[];
  onPropertyChange: (newProperties: Property[]) => void;
  onUpdateText: (oldProp: Property | null, newProp: Property | null) => void;
  onPickLocation?: () => void;
  onPickTime?: (key: string) => void;
  ontology?: OntologyNode[];
  onClose?: () => void;
}

export function PropertyInspector({
  properties,
  onUpdateText,
  onPickLocation,
  onPickTime,
  ontology = [],
  onClose
}: PropertyInspectorProps) {
  const { alignToOntology } = useGardener();
  const { addToast } = useToast();
  const { notes } = useNotes();
  const { selectedNoteId } = useView();

  // Find current note content for scanning
  const currentNote = notes.find(n => n.id === selectedNoteId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [editKey, setEditKey] = useState('');
  const [editOp, setEditOp] = useState('is');
  const [editValue, setEditValue] = useState('');

  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [suggestedProperties, setSuggestedProperties] = useState<Property[]>([]);

  // Watch content for suggestions
  useEffect(() => {
      if (!currentNote?.content || currentNote.content.length < 10) return;

      const timer = setTimeout(async () => {
          try {
              const suggestions = await propertyExtractionService.extractProperties(currentNote.content);
              // Filter out existing properties
              const newSuggestions = suggestions.filter(s =>
                  !properties.some(p => p.key === s.key && p.values.join(',') === s.values.join(','))
              );
              setSuggestedProperties(newSuggestions);
          } catch (e) {
              console.error("Failed to extract suggestions", e);
          }
      }, 1000); // 1s debounce

      return () => clearTimeout(timer);
  }, [currentNote?.content, properties]);

  const startAdd = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setEditKey('');
    setEditOp('is');
    setEditValue('');
  };

  const handleAutoScan = async () => {
      if (!currentNote || !currentNote.content) {
          addToast("No content to scan.", "info");
          return;
      }

      addToast("Scanning note for properties...", "info");
      const results = await alignToOntology(currentNote.content, ontology);

      if (results.length === 0) {
          addToast("No new properties found.", "info");
          return;
      }

      let addedCount = 0;
      results.forEach(tag => {
          const parsed = parseProperties(tag);
          if (parsed.length > 0) {
              const p = parsed[0];
              // Check for duplicate
              const exists = properties.some(ex => ex.key === p.key && ex.operator === p.operator && ex.values.join(',') === p.values.join(','));
              if (!exists) {
                  onUpdateText(null, p);
                  addedCount++;
              }
          }
      });

      if (addedCount > 0) {
          addToast(`Added ${addedCount} properties from scan.`, "success");
      } else {
          addToast("All found properties already exist.", "info");
      }
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleSave = (key: string, op: string, value: string) => {
    if (!key || !value) return;
    const newProp: Property = {
      key,
      operator: op,
      values: value.split(',').map((v) => v.trim()),
    };

    // Add new
    onUpdateText(null, newProp);
    cancelEdit();
  };

  const handleWidgetChange = (oldProp: Property, newProp: Property) => {
    onUpdateText(oldProp, newProp);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      onUpdateText(propertyToDelete, null);
      setPropertyToDelete(null);
    }
  };

  const getAttributeDetails = (key: string, nodes: OntologyNode[]): { type: string, description?: string } | undefined => {
    if (!nodes) return undefined;
    for (const node of nodes) {
      if (node.attributes && node.attributes[key]) {
        return { type: node.attributes[key].type, description: node.attributes[key].description };
      }
      if (node.children) {
        const found = getAttributeDetails(key, node.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  const sortedProperties = [...properties].sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="bg-gray-900 border-l border-gray-700/50 w-72 flex-shrink-0 flex flex-col h-full transition-all duration-300">
      <div className="p-3 border-b border-gray-700/50 font-semibold text-gray-300 flex justify-between items-center bg-gray-800/30">
        <span className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-blue-500" />
          Properties
        </span>
        <div className="flex items-center gap-1">
            <IconButton
              onClick={startAdd}
              icon={PlusIcon}
              size="md"
              variant="ghost"
              className="text-blue-400 hover:bg-blue-900/50"
              tooltip="Add Property"
            />
            {onClose && (
                <IconButton
                  onClick={onClose}
                  icon={XIcon}
                  size="md"
                  variant="danger"
                  tooltip="Close Inspector"
                />
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {(isAdding || editingIndex !== null) && (
          <PropertyForm
             initialKey={editKey}
             initialOp={editOp}
             initialValue={editValue}
             isAdding={isAdding}
             onSave={handleSave}
             onCancel={cancelEdit}
             onPickLocation={onPickLocation}
             onPickTime={onPickTime}
             ontology={ontology}
          />
        )}

        {sortedProperties.map((prop, idx) => (
          <PropertyBlock
            key={`${prop.key}-${idx}`}
            property={prop}
            onUpdate={(newProp) => handleWidgetChange(prop, newProp)}
            onDelete={() => setPropertyToDelete(prop)}
            ontology={ontology}
          />
        ))}

        {/* Suggestions Section */}
        {suggestedProperties.length > 0 && !isAdding && (
            <div className="mt-4 border-t border-gray-800 pt-3">
                <div className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-1 px-1">
                    <SearchSparkleIcon className="w-3 h-3" />
                    Suggestions
                </div>
                <div className="space-y-2">
                    {suggestedProperties.map((prop, idx) => (
                        <div key={`sugg-${idx}`} className="opacity-80 hover:opacity-100 transition-opacity">
                            <PropertyBlock
                                property={prop}
                                onUpdate={(p) => {}} // No-op
                                onDelete={() => {}} // No-op
                                ontology={ontology}
                            />
                            <div className="flex justify-end mt-1">
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    className="text-purple-300 hover:text-purple-100 h-6"
                                    onClick={() => handleSave(prop.key, prop.operator, prop.values.join(','))}
                                >
                                    + Add
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {properties.length === 0 && suggestedProperties.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500 opacity-80">
            <div className="bg-gray-800/50 p-3 rounded-full mb-3 border border-gray-700/50">
                <TagIcon className="w-6 h-6 text-blue-400" />
            </div>
            <p className="font-medium text-sm mb-1 text-gray-300">No properties extracted</p>
            <p className="text-xs max-w-[200px] mb-6 leading-relaxed">
              Properties make your note discoverable by the matching engine. <br /><br />
              Type <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 font-mono">[skill:is:React]</code> in the editor to start.
            </p>
            {currentNote && currentNote.content && currentNote.content.length > 10 && (
                <Button
                    onClick={handleAutoScan}
                    size="sm"
                    variant="primary"
                    icon={SearchSparkleIcon}
                    className="shadow-lg shadow-blue-900/20"
                >
                    Auto-Scan Content
                </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!propertyToDelete}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Property?"
        message={`Are you sure you want to delete the property '${propertyToDelete?.key}'?`}
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  );
}
