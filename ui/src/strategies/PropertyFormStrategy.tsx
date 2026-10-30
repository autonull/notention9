import React from 'react';
import { PropertyForm } from '../components/editor/PropertyForm';
import { createBaseStrategy } from '@notention/core/ui';
import type { Seam } from '@notention/optimize/discovery';

const captureSeam: Seam = {
    id: 'capture-0',
    name: 'capture',
    description: 'Capture seam for property input',
    propsShape: {
        initialKey: 'string',
        initialOp: 'string',
        initialValue: 'string',
        isAdding: 'boolean',
        onSave: '(key: string, op: string, value: string) => void',
        onCancel: '() => void',
        onPickLocation: '() => Promise<string> | void',
        onPickTime: '(key: string) => void',
        ontology: 'OntologyNode[]',
    },
    components: ['PropertyForm'],
    role: 'capture',
};

export const PropertyFormStrategy = createBaseStrategy<
    React.ComponentProps<typeof PropertyForm>
>(
    'property-form',
    captureSeam,
    PropertyForm,
    '1.0.0',
    {
        isAdding: true,
        initialOp: 'is',
    }
);