import { useState, useMemo, useCallback } from 'react';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { useGardener } from './useGardener';
import { detectConflicts } from '@notention/core';
import { addNode, deleteNode } from '@notention/core';

export type OntologyTab = 'graph' | 'simulator' | 'conflicts';

export const useOntologyView = () => {
  const { settings, setSettings } = useSettings();
  const ontology = settings.ontology;
  const { notes } = useNotes();
  const { evolveOntology, optimizeOntology } = useGardener();
  const [activeTab, setActiveTab] = useState<OntologyTab>('graph');
  const [isEvolving, setIsEvolving] = useState(false);

  // Calculate usage stats
  const usageStats = useMemo(() => {
    const stats = new Map<string, number>();

    notes.forEach(note => {
      // Count property usage
      note.properties.forEach(prop => {
        const current = stats.get(prop.key) || 0;
        stats.set(prop.key, current + 1);
      });
      // Also count tags matching ontology node IDs?
      // Tags are strings. If tag matches node.id or node.label
      note.tags.forEach(tag => {
        const t = tag.toLowerCase(); // simplified
        const current = stats.get(t) || 0;
        stats.set(t, current + 1);
      });
    });

    return stats;
  }, [notes]);

  const conflicts = useMemo(() => {
    return detectConflicts(notes, ontology);
  }, [notes, ontology]);

  const handleEvolve = async () => {
    setIsEvolving(true);
    await evolveOntology(notes);
    setIsEvolving(false);
    // Alert handled by hook? No, alert was here.
    // Let's rely on Toast in useGardener if possible, or keep alert.
    // alert('Ontology updated based on local notes!');
  };

  const handleOptimize = async () => {
    setIsEvolving(true);
    const res = await optimizeOntology();
    setIsEvolving(false);
    if (res.merged.length > 0) {
      alert(`Optimization Suggestion:\n${res.merged.join('\n')}`);
    }
  };

  const handleAddNode = useCallback((parentId: string | null, label: string) => {
    setSettings(prev => {
      const newNode = {
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        attributes: {},
        children: []
      };
      return {
        ...prev,
        ontology: addNode(prev.ontology, parentId, newNode)
      };
    });
  }, [setSettings]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setSettings(prev => ({
      ...prev,
      ontology: deleteNode(prev.ontology, nodeId)
    }));
  }, [setSettings]);

  return {
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
  };
};
