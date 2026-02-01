import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuggestionItem } from '../../../components/editor/SuggestionItem';
import { OntologyNode } from '@notention/core';

// Mock PropertyWidget
vi.mock('../../../components/editor/PropertyWidget', () => ({
  PropertyWidget: ({ property, onChange, onRemove }: any) => (
    <div data-testid="property-widget">
      <span>{property.key}</span>
      <input
        data-testid="value-input"
        value={property.values[0]}
        onChange={(e) => onChange({...property, values: [e.target.value]})}
      />
      <button onClick={onRemove} data-testid="widget-remove">Remove</button>
    </div>
  )
}));

// Mock IconButton
vi.mock('../../../components/common/IconButton', () => ({
  IconButton: ({ onClick, tooltip }: any) => (
    <button onClick={onClick} aria-label={tooltip}>{tooltip}</button>
  )
}));

describe('SuggestionItem', () => {
    const mockOntology: OntologyNode[] = [];
    const onAccept = vi.fn();
    const onDismiss = vi.fn();

    it('renders correctly with a valid suggestion', () => {
        render(
            <SuggestionItem
                suggestion="[price:is:100]"
                onAccept={onAccept}
                onDismiss={onDismiss}
                ontology={mockOntology}
            />
        );
        expect(screen.getByTestId('property-widget')).toBeInTheDocument();
        expect(screen.getByText('price')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });

    it('calls onAccept with updated value when edited', () => {
         render(
            <SuggestionItem
                suggestion="[price:is:100]"
                onAccept={onAccept}
                onDismiss={onDismiss}
                ontology={mockOntology}
            />
        );

        // Edit value
        fireEvent.change(screen.getByTestId('value-input'), { target: { value: '150' } });

        // Click Accept
        fireEvent.click(screen.getByLabelText('Accept'));

        expect(onAccept).toHaveBeenCalledWith('[price:is:150]');
    });

    it('calls onDismiss when removed via widget', () => {
        render(
            <SuggestionItem
                suggestion="[price:is:100]"
                onAccept={onAccept}
                onDismiss={onDismiss}
                ontology={mockOntology}
            />
        );

        fireEvent.click(screen.getByTestId('widget-remove'));
        expect(onDismiss).toHaveBeenCalled();
    });
});
