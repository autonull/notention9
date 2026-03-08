import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {NetworkFeedHeader} from '../../components/network/NetworkFeedHeader';
import {OntologyNode} from '@notention/core';

describe('NetworkFeedHeader', () => {
    const mockSetFilter = vi.fn();
    const mockSetActiveFilterId = vi.fn();
    const mockOnClearMatch = vi.fn();

    const mockOntology: OntologyNode[] = [
        {id: 'work', label: 'Work', children: []},
        {id: 'event', label: 'Event', children: []}
    ];

    const defaultProps = {
        filter: '',
        setFilter: mockSetFilter,
        sortedEvents: [],
        onClearMatch: mockOnClearMatch,
        ontology: mockOntology,
        activeFilterId: 'all',
        setActiveFilterId: mockSetActiveFilterId
    };

    it('updates search input', () => {
        render(<NetworkFeedHeader {...defaultProps} />);

        const input = screen.getByPlaceholderText('Filter notes...');
        fireEvent.change(input, {target: {value: 'test'}});
        expect(mockSetFilter).toHaveBeenCalledWith('test');
    });
});
