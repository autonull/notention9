import React from 'react';
import { DescribeItComposer } from '../components/editor/DescribeItComposer';
import { createComponentStrategy } from '@notention/core/ui';
import type { Seam } from '@notention/optimize/discovery';

const extractionSeam: Seam = {
    id: 'extraction-0',
    name: 'extraction',
    description: 'Extract structured properties from natural language',
    propsShape: {
        isOpen: 'boolean',
        onClose: '() => void',
        onApply: '(properties: Property[]) => void',
        ontology: 'OntologyNode[]',
    },
    components: ['DescribeItComposer'],
    role: 'capture',
};

export const DescribeItComposerStrategy = createComponentStrategy<
    React.ComponentProps<typeof DescribeItComposer>
>(
    'describe-it-composer',
    extractionSeam,
    DescribeItComposer,
    '1.0.0',
    {}
);