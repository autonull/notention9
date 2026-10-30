import React from 'react';
import { TemplateSelector } from '../components/editor/TemplateSelector';
import { createBaseStrategy } from '@notention/core/ui';
import type { Seam } from '@notention/optimize/discovery';

const templateSeam: Seam = {
    id: 'template-0',
    name: 'template-selection',
    description: 'Select a template for note creation',
    propsShape: {
        ontology: 'OntologyNode[]',
        onSelect: '(template: OntologyNode) => void',
        onClose: '() => void',
    },
    components: ['TemplateSelector'],
    role: 'capture',
};

export const TemplateSelectorStrategy = createBaseStrategy<
    React.ComponentProps<typeof TemplateSelector>
>(
    'template-selector',
    templateSeam,
    TemplateSelector,
    '1.0.0',
    {}
);