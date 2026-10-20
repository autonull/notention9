import {useCallback, useEffect, useMemo, useState} from 'react';
import type {OntologyNode, Property} from '@notention/core';
import {getCanonicalKey} from '@notention/core';
import {useGardener} from './useGardener';
import {getTextFromHtml} from '../utils/html';

export interface PropertyReviewItem {
    property: Property;
    confidence: number;
}

const propertyId = (property: Property): string =>
    `${property.key}\u0000${property.operator}\u0000${property.values.join('\u0000')}`;

const collectKeys = (ontology: OntologyNode[]): Set<string> => {
    const keys = new Set<string>();
    const traverse = (nodes: OntologyNode[]) => {
        nodes.forEach(node => {
            Object.keys(node.attributes ?? {}).forEach(key => keys.add(key));
            if (node.children) traverse(node.children);
        });
    };
    traverse(ontology);
    return keys;
};

export function usePropertyReview(content: string, existing: Property[], ontology: OntologyNode[]) {
    const {alignToOntology} = useGardener();
    const [items, setItems] = useState<PropertyReviewItem[]>([]);
    const text = useMemo(() => getTextFromHtml(content), [content]);
    const existingKey = existing.map(propertyId).sort().join('|');
    const ontologyKeys = useMemo(() => collectKeys(ontology), [ontology]);

    useEffect(() => {
        if (text.trim().length < 10) {
            setItems([]);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            const found = await alignToOntology(text, ontology);
            if (cancelled) return;

            const existingIds = new Set(existingKey.split('|'));
            const seen = new Set<string>();
            const next = found
                .map(property => ({...property, key: getCanonicalKey(property.key, ontology)}))
                .filter(property => {
                    const id = propertyId(property);
                    if (existingIds.has(id) || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                })
                .map(property => ({
                    property,
                    confidence: ontologyKeys.has(property.key) ? 0.85 : 0.6,
                }));

            setItems(next);
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [text, existingKey, ontology, ontologyKeys, alignToOntology]);

    const accept = useCallback((item: PropertyReviewItem) => {
        setItems(previous => previous.filter(candidate => propertyId(candidate.property) !== propertyId(item.property)));
    }, []);

    const reject = useCallback((item: PropertyReviewItem) => {
        setItems(previous => previous.filter(candidate => propertyId(candidate.property) !== propertyId(item.property)));
    }, []);

    return {items, accept, reject};
}
