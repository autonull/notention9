import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {DataTab} from './DataTab';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {CapabilitiesPanel} from './CapabilitiesPanel';
import {ImportExportSection} from './ImportExportSection';
import {ConfirmationModal} from '../ui/Primitives';

// Mock hooks
vi.mock('../../hooks/useNotes');
vi.mock('../../hooks/useSettingsContext');
vi.mock('../../hooks/useViewContext');
vi.mock('../../hooks/useDemoWorkspace');

// Mock child components
vi.mock('./ImportExportSection', () => ({
    ImportExportSection: vi.fn(() => <div data-testid="import-export-section">ImportExportSection</div>)
}));
vi.mock('./CapabilitiesPanel', () => ({
    CapabilitiesPanel: vi.fn(() => <div data-testid="capabilities-panel">CapabilitiesPanel</div>)
}));
vi.mock('../ui/Primitives', () => ({
    ConfirmationModal: vi.fn(({isOpen, onClose, onConfirm, title, message, confirmLabel}) =>
        isOpen ? (
            <div data-testid="confirmation-modal">
                <h3>{title}</h3>
                <p>{message}</p>
                <button onClick={onConfirm}>{confirmLabel}</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        ) : null
    )
}));

const mockUseNotes = useNotes as vi.Mock;
const mockUseSettings = useSettings as vi.Mock;
const mockUseView = useView as vi.Mock;
const mockUseDemoWorkspace = useDemoWorkspace as vi.Mock;

describe('DataTab', () => {
    const mockNotes = [
        {id: '1', title: 'Note 1', content: '<p>Content 1</p>', properties: [], tags: ['test'], createdAt: Date.now(), updatedAt: Date.now()},
        {id: '2', title: 'Note 2', content: '<p>Content 2</p>', properties: [{key: 'allow', operator: 'grant', values: ['browser:navigate', 'example.com']}], tags: ['test'], createdAt: Date.now(), updatedAt: Date.now()},
    ];

    const mockSettings = {
        theme: 'dark',
        ontology: [],
        nostr: {relays: []}
    };

    const mockView = {
        activeView: 'dashboard',
        setActiveView: vi.fn(),
        selectedNoteId: null,
        setSelectedNoteId: vi.fn(),
    };

    const mockDemo = {
        hasSampleData: false,
        load: vi.fn(),
        remove: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseNotes.mockReturnValue({notes: mockNotes, updateNote: vi.fn()});
        mockUseSettings.mockReturnValue({settings: mockSettings});
        mockUseView.mockReturnValue(mockView);
        mockUseDemoWorkspace.mockReturnValue(mockDemo);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('renders all sections', () => {
        render(<DataTab/>);

        expect(screen.getByTestId('import-export-section')).toBeInTheDocument();
        expect(screen.getByText('Sample Workspace')).toBeInTheDocument();
        expect(screen.getByText('Deleted Notes')).toBeInTheDocument();
        expect(screen.getByTestId('capabilities-panel')).toBeInTheDocument();
        expect(screen.getByText('Clear All Local Data')).toBeInTheDocument();
    });

    it('shows sample workspace controls', () => {
        render(<DataTab/>);

        expect(screen.getByText('Load sample workspace')).toBeInTheDocument();
        expect(screen.queryByText('Remove sample data')).not.toBeInTheDocument();
    });

    it('shows remove sample data button when sample data exists', () => {
        mockUseDemoWorkspace.mockReturnValue({...mockDemo, hasSampleData: true});
        render(<DataTab/>);

        expect(screen.getByText('Reload sample workspace')).toBeInTheDocument();
        expect(screen.getByText('Remove sample data')).toBeInTheDocument();
    });

    it('calls demo.load when Load sample workspace is clicked', () => {
        render(<DataTab/>);
        fireEvent.click(screen.getByText('Load sample workspace'));
        expect(mockDemo.load).toHaveBeenCalledTimes(1);
    });

    it('navigates to trash view when Recently deleted is clicked', () => {
        render(<DataTab/>);
        fireEvent.click(screen.getByText('Recently deleted'));
        expect(mockView.setActiveView).toHaveBeenCalledWith('trash');
    });

    it('shows confirmation modal when Clear All Data is clicked', () => {
        render(<DataTab/>);
        fireEvent.click(screen.getByText('Clear All Local Data'));

        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        expect(screen.getByText('Clear All Data?')).toBeInTheDocument();
    });

    it('clears data and reloads when confirmation is confirmed', () => {
        const originalReload = window.location.reload;
        window.location.reload = vi.fn();
        const originalIndexedDB = window.indexedDB;
        window.indexedDB = {deleteDatabase: vi.fn()};

        render(<DataTab/>);
        fireEvent.click(screen.getByText('Clear All Local Data'));
        fireEvent.click(screen.getByText('Clear Everything'));

        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.indexedDB.deleteDatabase).toHaveBeenCalledWith('localforage');
        expect(window.location.reload).toHaveBeenCalled();

        window.location.reload = originalReload;
        window.indexedDB = originalIndexedDB;
    });

    it('closes confirmation modal when Cancel is clicked', () => {
        render(<DataTab/>);
        fireEvent.click(screen.getByText('Clear All Local Data'));
        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
    });

    it('displays capability grants in CapabilitiesPanel', () => {
        const notesWithGrants = [
            {id: '1', title: 'Note with grant', content: '', properties: [{key: 'allow', operator: 'grant', values: ['browser:navigate', 'example.com']}], tags: [], createdAt: Date.now(), updatedAt: Date.now()},
        ];
        mockUseNotes.mockReturnValue({notes: notesWithGrants, updateNote: vi.fn()});

        render(<DataTab/>);

        expect(screen.getByTestId('capabilities-panel')).toBeInTheDocument();
    });
});