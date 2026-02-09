import {useMemo} from 'react';
import {useOntologyIndex} from './useOntologyIndex';

export interface InsertMenuItem {
    id: string;
    type: 'tag' | 'template' | 'property';
    label: string;
    description?: string;
}

export type InsertMenuMode = 'all' | 'property';

// This hook now accepts the output of `useOntologyIndex`
export const useInsertMenuItems = (
    indexedOntology: ReturnType<typeof useOntologyIndex>,
    mode: InsertMenuMode = 'all'
): InsertMenuItem[] => {
    const {allTags, allTemplates, allProperties} = indexedOntology;

    return useMemo(() => {
        const tagItems: InsertMenuItem[] =
            mode === 'all'
                ? allTags.map((tag) => ({
                    id: `tag-${tag.id}`,
                    type: 'tag',
                    label: tag.label,
                    description: tag.description || 'Tag',
                }))
                : [];

        const templateItems: InsertMenuItem[] =
            mode === 'all'
                ? allTemplates.map((template) => ({
                    id: `template-${template.id}`,
                    type: 'template',
                    label: template.label,
                    description: template.description || 'Template',
                }))
                : [];

        const propertyItems: InsertMenuItem[] = allProperties.map((prop) => ({
            id: `property-${prop.id}`,
            type: 'property',
            label: prop.label,
            description: prop.description || 'Property',
        }));

        let items = [...tagItems, ...templateItems, ...propertyItems];

        // If in 'all' mode, filter out properties that are part of templates already shown
        if (mode === 'all') {
            const templateProps = new Set(
                allTemplates.flatMap((t) =>
                    t.attributes ? Object.keys(t.attributes) : []
                )
            );
            items = items.filter(
                (item) => item.type !== 'property' || !templateProps.has(item.label)
            );
        }

        // Sort alphabetically by label for consistent ordering
        return items.sort((a, b) => a.label.localeCompare(b.label));
    }, [allTags, allTemplates, allProperties, mode]);
};
