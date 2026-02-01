import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NetworkFeedHeader } from '../../components/network/NetworkFeedHeader';
import { OntologyNode } from '@notention/core';

describe('NetworkFeedHeader', () => {
    const mockSetFilter = vi.fn();
    const mockSetActiveFilterId = vi.fn();
    const mockOnClearMatch = vi.fn();

    const mockOntology: OntologyNode[] = [
        { id: 'work', label: 'Work', children: [] },
        { id: 'event', label: 'Event', children: [] }
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

    it('renders intent filter buttons based on ontology', () => {
        render(<NetworkFeedHeader {...defaultProps} />);

        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.getByText('Event')).toBeInTheDocument();
    });

    it('calls setActiveFilterId when a filter button is clicked', () => {
        render(<NetworkFeedHeader {...defaultProps} />);

        fireEvent.click(screen.getByText('Work'));
        expect(mockSetActiveFilterId).toHaveBeenCalledWith('work');

        fireEvent.click(screen.getByText('Event'));
        expect(mockSetActiveFilterId).toHaveBeenCalledWith('event');
    });

    it('updates search input', () => {
        render(<NetworkFeedHeader {...defaultProps} />);

        const input = screen.getByPlaceholderText('Search notes...');
        fireEvent.change(input, { target: { value: 'test' } });
        expect(mockSetFilter).toHaveBeenCalledWith('test');
    });
});
