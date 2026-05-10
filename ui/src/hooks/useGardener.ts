import {useCallback, useMemo} from 'react';
import {capabilities} from '../config/Capabilities';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';
import {Gardener} from '../services/gardener';
import {LocalAIProvider} from '../services/ai/LocalProvider';
import {RemoteAIProvider} from '../services/ai/RemoteProvider';
import {WebLLMProvider} from '../services/ai/WebLLMProvider';
import {EMERGENT_NODE_ID, EMERGENT_NODE_LABEL} from '@notention/core';
import type {Note, OntologyAttribute, OntologyNode, Property} from '@notention/core';

// Helper to merge attributes into a target node (or "Emergent" if not found/specified)
const mergeAttributesToNode = (ontology: OntologyNode[], newAttributes: Record<string, OntologyAttribute>, targetNodeId?: string): OntologyNode[] => {
    const updatedOntology = structuredClone(ontology);

    const findAndMerge = (nodes: OntologyNode[]): boolean => {
        for (const node of nodes) {
            if (node.id === targetNodeId) {
                node.attributes = {...(node.attributes || {}), ...newAttributes};
                return true;
            }
            if (node.children && findAndMerge(node.children)) return true;
        }
        return false;
    };

    if (targetNodeId) {
        const found = findAndMerge(updatedOntology);
        if (found) return updatedOntology;
    }

    // Fallback to "Emergent"
    let emergentNode = updatedOntology.find((n: OntologyNode) => n.id === EMERGENT_NODE_ID);
    if (!emergentNode) {
        emergentNode = {
            id: EMERGENT_NODE_ID,
            label: EMERGENT_NODE_LABEL,
            description: 'Automatically inferred properties',
            attributes: {},
            children: []
        };
        updatedOntology.push(emergentNode);
    }
    emergentNode.attributes = {...(emergentNode.attributes || {}), ...newAttributes};

    return updatedOntology;
};

export function useGardener() {
    const {settings, setSettings} = useSettings();
    const {addToast} = useToast();

    const gardener = useMemo(() => {
        // Instantiate provider based on settings
        // Instantiate provider based on capabilities and settings
        let provider;

        if (capabilities.llm === 'none') {
            provider = new LocalAIProvider();
        } else if (capabilities.llm === 'browser') {
            // Browser environment forces WebLLM if enabled, or Local if not
            if (settings.aiEnabled) {
                provider = new WebLLMProvider(settings.aiModel);
            } else {
                provider = new LocalAIProvider();
            }
        } else {
            // Server capability allows full flexibility
            if (settings.aiEnabled) {
                if (settings.aiProvider === 'webllm') {
                    provider = new WebLLMProvider(settings.aiModel);
                } else {
                    provider = new RemoteAIProvider(settings.googleGeminiApiKey);
                }
            } else {
                provider = new LocalAIProvider();
            }
        }

        return new Gardener(provider);
    }, [settings.aiEnabled, settings.aiProvider, settings.aiModel, settings.googleGeminiApiKey]);

    const evolveOntology = useCallback(async (notes: Note[], targetConceptId?: string) => {
        const newAttributes = await gardener.evolveOntology(notes, targetConceptId);

        if (newAttributes.length === 0) return [];

        setSettings(prev => {
            const currentOntology = [...prev.ontology];
            const newAttrsMap: Record<string, OntologyAttribute> = {};

            for (const attr of newAttributes) {
                newAttrsMap[attr.key] = {
                    type: attr.type,
                    description: attr.description,
                    operators: {
                        real: ['is', 'is not'],
                        imaginary: attr.type === 'number' || attr.type === 'date'
                            ? ['greater than', 'less than']
                            : ['contains']
                    }
                };
            }

            return {
                ...prev,
                ontology: mergeAttributesToNode(currentOntology, newAttrsMap, targetConceptId)
            };
        });

        return newAttributes;
    }, [gardener, setSettings]);

    /**
     * Learns ontology attributes from a set of observed properties (e.g. from network events).
     * This is "Passive Learning".
     */
    const learnFromProperties = useCallback((properties: Property[]) => {
        if (!properties || properties.length === 0) return;

        setSettings(prev => {
            const currentOntology = [...prev.ontology];
            const newAttrsMap: Record<string, OntologyAttribute> = {};
            let hasChanges = false;

            for (const prop of properties) {
                // Check if property key exists anywhere in the ontology
                const keyExists = currentOntology.some(node =>
                    node.attributes && Object.keys(node.attributes).includes(prop.key)
                );

                // Also check if we already added it to newAttrsMap in this batch (though usually duplicates are filtered upstream or just overwritten)
                if (!keyExists && !newAttrsMap[prop.key]) {
                    const val = prop.values[0];
                    let type: 'string' | 'number' | 'date' = 'string';

                    if (!isNaN(parseFloat(val))) type = 'number';
                    else if (!isNaN(Date.parse(val))) type = 'date';

                    newAttrsMap[prop.key] = {
                        type,
                        description: 'Inferred from network',
                        operators: {
                            real: ['is', 'is not'],
                            imaginary: type === 'number' || type === 'date'
                                ? ['greater than', 'less than']
                                : ['contains']
                        }
                    };
                    hasChanges = true;
                    addToast(`New concept discovered: ${prop.key}`, 'info');
                }
            }

            if (!hasChanges) return prev;

            return {...prev, ontology: mergeAttributesToNode(currentOntology, newAttrsMap)};
        });
    }, [setSettings, addToast]);

    const alignToOntology = useCallback(async (text: string, ontology: OntologyNode[]) => {
        return await gardener.alignToOntology(text, ontology);
    }, [gardener]);

    const optimizeOntology = useCallback(async () => {
        const result = await gardener.optimizeOntology(settings.ontology);

        if (result.merged.length > 0 || result.pruned.length > 0) {
            addToast(`Optimization Report: ${result.merged.length} potential merges`, 'info');
        } else {
            addToast('No obvious optimizations found.', 'info');
        }
        return result;
    }, [gardener, settings.ontology, addToast]);

    return {evolveOntology, learnFromProperties, alignToOntology, optimizeOntology};
};
