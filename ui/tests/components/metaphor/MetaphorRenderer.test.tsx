import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {MetaphorRenderer} from '../../../components/metaphor/MetaphorRenderer';
import {Note, UIMetaphor} from '@notention/core';

describe('MetaphorRenderer', () => {
    const mockMetaphor: UIMetaphor = {
        id: 'test-metaphor',
        name: 'Test Metaphor',
        description: 'A test metaphor description',
        icon: '🧪',
        color: '#000000',
        category: 'test',
        template: '[test:value]',
        properties: [
            {
                name: 'value',
                type: 'string',
                label: 'Test Value',
                description: 'A test value',
                required: true
            }
        ]
    };

    const mockNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        properties: [
            {key: 'value', operator: 'is', values: ['42']}
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {type: 'user', identifier: 'test', timestamp: Date.now()},
        public: false,
        priority: 0
    };

    it('renders the metaphor name and description', () => {
        render(<MetaphorRenderer note={mockNote} metaphor={mockMetaphor}/>);

        expect(screen.getByText('Test Metaphor')).toBeInTheDocument();
        expect(screen.getByText('A test metaphor description')).toBeInTheDocument();
        expect(screen.getByText('🧪')).toBeInTheDocument();
    });

    it('renders property values from the note', () => {
        render(<MetaphorRenderer note={mockNote} metaphor={mockMetaphor}/>);

        expect(screen.getByText('Test Value')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders placeholder for missing properties', () => {
        const emptyNote: Note = {...mockNote, properties: []};
        render(<MetaphorRenderer note={emptyNote} metaphor={mockMetaphor}/>);

        expect(screen.getByText('(Not set)')).toBeInTheDocument();
    });
});
