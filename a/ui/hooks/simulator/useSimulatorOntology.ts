import { useCallback, MutableRefObject } from 'react';
import type { OntologyNode } from '@notention/core';
import { Gardener } from '../../services/gardener';
import { mergeAttributes, deleteAttribute, findNode, renameAttribute } from '@notention/core';

interface UseSimulatorOntologyProps {
    ontologyRef: MutableRefObject<OntologyNode[]>;
    setOntology: (nodes: OntologyNode[]) => void;
    gardenerRef: MutableRefObject<Gardener | null>;
    addLog: (msg: string, type: 'info' | 'match' | 'ontology' | 'reuse') => void;
}

export function useSimulatorOntology({
    ontologyRef,
    setOntology,
    gardenerRef,
    addLog
}: UseSimulatorOntologyProps) {

    const optimizeOntology = useCallback(async () => {
        if (!gardenerRef.current) return;

        addLog("Starting ontology optimization...", 'info');
        const result = await gardenerRef.current.optimizeOntology(ontologyRef.current);

        if (result.merged.length === 0 && result.pruned.length === 0) {
            addLog("Ontology is already optimized.", 'info');
            return;
        }

        let newOntology = [...ontologyRef.current];

        // Helper to find all nodes containing a key
        const findNodeIdsForKey = (nodes: OntologyNode[], key: string): string[] => {
            let ids: string[] = [];
            for (const node of nodes) {
                if (node.attributes && node.attributes[key]) {
                    ids.push(node.id);
                }
                if (node.children) {
                    ids = ids.concat(findNodeIdsForKey(node.children, key));
                }
            }
            return ids;
        };

        result.merged.forEach(merge => {
            addLog(`[Optimization] Merging '${merge.source}' -> '${merge.target}'`, 'ontology');
            const nodeIds = findNodeIdsForKey(newOntology, merge.source);

            nodeIds.forEach(nodeId => {
               const node = findNode(newOntology, nodeId);
               if (node) {
                   if (node.attributes && node.attributes[merge.target]) {
                       // Target exists: Merge (delete source, keep target)
                       newOntology = mergeAttributes(newOntology, nodeId, merge.source, merge.target);
                   } else {
                       // Target missing: Rename source to target
                       newOntology = renameAttribute(newOntology, nodeId, merge.source, merge.target);
                   }
               }
            });
        });

        result.pruned.forEach(key => {
            addLog(`[Optimization] Pruning '${key}'`, 'ontology');
            const nodeIds = findNodeIdsForKey(newOntology, key);
            nodeIds.forEach(nodeId => {
                newOntology = deleteAttribute(newOntology, nodeId, key);
            });
        });

        setOntology(newOntology);
        addLog("Optimization applied to Simulator Ontology.", 'info');

    }, [addLog, gardenerRef, ontologyRef, setOntology]);

    return {
        optimizeOntology
    };
}
