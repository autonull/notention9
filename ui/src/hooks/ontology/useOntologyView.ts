import {useCallback, useMemo, useState} from 'react';
import {useSettings, useNotes} from '../index';
import {useGardener} from './useGardener';
import {addNode, deleteNode, detectConflicts, addAttribute, addAliasToAttribute, OntologyAttribute} from '@notention/core';
import {useOntologySuggestions} from './useOntologySuggestions';

export type OntologyTab = 'graph' | 'simulator' | 'conflicts' | 'suggestions';

export function useOntologyView() {
    const {settings, setSettings} = useSettings();
    const ontology = settings.ontology;
    const {notes} = useNotes();
    const {evolveOntology, optimizeOntology} = useGardener();
    const [activeTab, setActiveTab] = useState<OntologyTab>('graph');
    const [isEvolving, setIsEvolving] = useState(false);

    // Use reusable hook for suggestions
    const {suggestions} = useOntologySuggestions();

    const usageStats = useMemo(() => {
        const stats = new Map<string, number>();

        notes.forEach(note => {
            note.properties.forEach(prop => {
                stats.set(prop.key, (stats.get(prop.key) || 0) + 1);
            });
            note.tags.forEach(tag => {
                stats.set(tag.toLowerCase(), (stats.get(tag.toLowerCase()) || 0) + 1);
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

    const handleAddAttribute = useCallback((nodeId: string, key: string, attribute: OntologyAttribute) => {
        setSettings(prev => ({
            ...prev,
            ontology: addAttribute(prev.ontology, nodeId, key, attribute)
        }));
    }, [setSettings]);

    const handleAddAlias = useCallback((nodeId: string, attributeKey: string, alias: string) => {
        setSettings(prev => ({
            ...prev,
            ontology: addAliasToAttribute(prev.ontology, nodeId, attributeKey, alias)
        }));
    }, [setSettings]);

    const getGraphData = useCallback(() => {
        const nodes = ontology.map(node => ({
            id: node.id,
            label: node.label,
            val: usageStats.get(node.id) || 1,
            group: 'concept'
        }));

        const links: Array<{ source: string, target: string, value: number }> = [];
        const traverse = (nodes: any[]) => {
            nodes.forEach(node => {
                if (node.children) {
                    node.children.forEach((child: any) => {
                        links.push({source: node.id, target: child.id, value: 5});
                        traverse([child]);
                    });
                }
            });
        };
        traverse(ontology);

        return {nodes, links};
    }, [ontology, usageStats]);

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
        handleAddAttribute,
        handleAddAlias,
        usageStats,
        conflicts,
        getGraphData,
        suggestions
    };
};
