import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OntologyView } from '../../components/views/OntologyView';
import { useOntologyView } from '../../hooks/useOntologyView';
import { useView } from '../../hooks/useViewContext';

// Mock dependencies
vi.mock('../../hooks/useOntologyView');
vi.mock('../../hooks/useViewContext');
vi.mock('../../hooks/useToast', () => ({
    useToast: () => ({ addToast: vi.fn() })
}));
vi.mock('../../components/developer/OntologyGraph', () => ({
    OntologyGraph: () => <div data-testid="ontology-graph">Graph</div>
}));
vi.mock('../../components/ontology/OntologyNodeItem', () => ({
    OntologyNodeItem: ({ node, onAddChild, onDeleteNode }) => (
        <div data-testid={`node-${node.id}`}>
            {node.label}
            <button onClick={() => onAddChild(node.id)}>Add Child</button>
            <button onClick={() => onDeleteNode(node.id)}>Delete</button>
        </div>
    )
}));

describe('OntologyView', () => {
    const mockHandleAddNode = vi.fn();
    const mockHandleDeleteNode = vi.fn();
    const mockSetActiveTab = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useView as any).mockReturnValue({
            setSelectedNoteId: vi.fn(),
            setActiveView: vi.fn(),
        });
        (useOntologyView as any).mockReturnValue({
            settings: { developerMode: true },
            ontology: [{ id: 'root1', label: 'Root 1', children: [] }],
            activeTab: 'graph',
            setActiveTab: mockSetActiveTab,
            isEvolving: false,
            handleEvolve: vi.fn(),
            handleOptimize: vi.fn(),
            handleAddNode: mockHandleAddNode,
            handleDeleteNode: mockHandleDeleteNode,
            usageStats: new Map(),
            conflicts: [],
            suggestions: []
        });
    });

    it('renders the graph tab by default', () => {
        render(<OntologyView />);
        expect(screen.getByTestId('node-root1')).toBeTruthy();
        expect(screen.getByText('Root 1')).toBeTruthy();
    });

    it('toggles edit mode and shows add root button', () => {
        render(<OntologyView />);

        // Find toggle (assuming it's a checkbox input for now or we trigger state change)
        // Since Toggle component is custom, we might need to find by role or class.
        // Let's assume user clicks "Edit Mode" toggle.
        // For testing, we can simulate state change if we could access it, but it's internal.
        // We will just look for the toggle element.
        const toggle = screen.getByRole('switch'); // If Toggle uses standard role
        // Or find by label text nearby?
        fireEvent.click(toggle);

        // Expect "Add Root Node" button to appear
        expect(screen.getByText('Add Root Node')).toBeTruthy();
    });

    it('opens modal when adding root node', async () => {
        render(<OntologyView />);
        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        fireEvent.click(screen.getByText('Add Root Node'));

        // Modal should appear - check for modal title specifically (h2 with id modal-title)
        expect(screen.getByRole('heading', { name: 'Add Root Node' })).toBeTruthy();

        // Input name
        const input = screen.getByPlaceholderText('e.g. Project, Task, Person');
        fireEvent.change(input, { target: { value: 'New Root' } });

        // Confirm
        fireEvent.click(screen.getByText('Add Concept'));

        expect(mockHandleAddNode).toHaveBeenCalledWith(null, 'New Root');
    });

    it('handles adding child node', () => {
        render(<OntologyView />);
        // Enable edit mode
        fireEvent.click(screen.getByRole('switch'));

        // Click Add Child on mock node
        const addBtn = screen.getAllByText('Add Child')[0];
        fireEvent.click(addBtn);

        // Modal appears - check for modal title specifically
        expect(screen.getByRole('heading', { name: 'Add Child Node' })).toBeTruthy();

        const input = screen.getByPlaceholderText('e.g. Project, Task, Person');
        fireEvent.change(input, { target: { value: 'Child Node' } });

        fireEvent.click(screen.getByText('Add Concept'));

        expect(mockHandleAddNode).toHaveBeenCalledWith('root1', 'Child Node');
    });

    it('handles deleting node', () => {
        render(<OntologyView />);
        fireEvent.click(screen.getByRole('switch'));

        const delBtn = screen.getAllByText('Delete')[0];
        fireEvent.click(delBtn);

        // Confirm modal
        expect(screen.getByText('Delete Concept')).toBeTruthy();

        // Find the destructive button in the modal dialog (variant="danger")
        const modalDialog = screen.getByRole('dialog');
        const deleteConfirmBtn = modalDialog.querySelector('button.btn-danger') as HTMLButtonElement;
        fireEvent.click(deleteConfirmBtn);

        expect(mockHandleDeleteNode).toHaveBeenCalledWith('root1');
    });
});
