import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropertyForm } from '../../../components/editor/PropertyForm';
import { OntologyNode } from '@notention/core';

// Mock dependencies
const mockExtractProperties = vi.fn();

// Fix paths relative to this test file:
// ui/tests/components/editor/PropertyForm.test.tsx -> ui/hooks/useGardener.ts
vi.mock('../../../hooks/useGardener', () => ({
  useGardener: () => ({
    extractProperties: mockExtractProperties
  })
}));

// ui/tests/components/editor/PropertyForm.test.tsx -> ui/hooks/useToast.ts
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}));

describe('PropertyForm', () => {
    const mockOntology: OntologyNode[] = [];
    const onSave = vi.fn();
    const onCancel = vi.fn();

    it('calls extractProperties when Magic button is clicked', async () => {
        // Mock extraction response
        mockExtractProperties.mockResolvedValue([
            { key: 'price', operator: 'is', values: ['100'] }
        ]);

        render(
            <PropertyForm
                initialKey=""
                initialOp="is"
                initialValue=""
                isAdding={true}
                onSave={onSave}
                onCancel={onCancel}
                ontology={mockOntology}
            />
        );

        // Open magic field
        fireEvent.click(screen.getByTitle('Extract properties from text'));

        // Type text
        const textarea = screen.getByPlaceholderText("Describe property (e.g. 'budget < 200')");
        fireEvent.change(textarea, { target: { value: 'price is 100' } });

        // Click Extract
        fireEvent.click(screen.getByText('Extract Property'));

        await waitFor(() => {
            expect(mockExtractProperties).toHaveBeenCalledWith('price is 100', mockOntology);
        });

        // Check if values were filled
        expect(screen.getByDisplayValue('price')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });
});
