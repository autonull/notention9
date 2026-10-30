import React from 'react';
import { TagInput } from '../components/editor/TagInput';
import { createBaseStrategy } from '@notention/core/ui';
import type { Seam } from '@notention/optimize/discovery';

const elicitSeam: Seam = {
    id: 'elicit-0',
    name: 'detail-elicitation',
    description: 'Elicit additional details from user',
    propsShape: {
        tags: 'string[]',
        onChange: '(tags: string[]) => void',
        onAutoTag: '() => void',
        isAutoTagging: 'boolean',
        autoFocus: 'boolean',
        className: 'string',
    },
    components: ['TagInput'],
    role: 'elicit',
};

export const TagInputStrategy = createBaseStrategy<
    React.ComponentProps<typeof TagInput>
>(
    'tag-input',
    elicitSeam,
    TagInput,
    '1.0.0',
    {
        autoFocus: false,
    }
);