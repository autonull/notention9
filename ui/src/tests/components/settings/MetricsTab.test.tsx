import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {MetricsTab} from '../../../components/settings/MetricsTab';

vi.mock('../../../hooks/useMetrics', () => ({
    useMetrics: vi.fn(),
    track: vi.fn(),
    hasConsent: vi.fn(),
    setConsent: vi.fn(),
    clearMetricsQueue: vi.fn(),
    getMetricsQueue: vi.fn(),
}));

import {useMetrics} from '../../../hooks/useMetrics';

describe('MetricsTab', () => {
    const mockTrack = vi.fn();
    const mockGetQueue = vi.fn(() => []);
    const mockClearQueue = vi.fn();
    const mockToggleConsent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders disabled state when consent is not given', () => {
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: false,
            toggleConsent: mockToggleConsent,
            getQueue: mockGetQueue,
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        expect(screen.getByText('Metrics & Analytics')).toBeInTheDocument();
        expect(screen.getByText('Disabled')).toBeInTheDocument();
        expect(screen.getByText('Metrics are disabled. Enable above to start collecting:')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('renders enabled state when consent is given', () => {
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: mockGetQueue,
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        expect(screen.getByText('Enabled')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeChecked();
        expect(screen.getByText('events in current session')).toBeInTheDocument();
    });

    it('toggles consent when checkbox is clicked', () => {
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: false,
            toggleConsent: mockToggleConsent,
            getQueue: mockGetQueue,
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        
        fireEvent.click(checkbox);
        
        expect(mockToggleConsent).toHaveBeenCalledWith(true);
    });

    it('shows event summary when events exist', () => {
        const mockEvents = [
            {name: 'test_event', properties: {foo: 'bar'}, timestamp: Date.now()},
            {name: 'test_event', properties: {foo: 'baz'}, timestamp: Date.now()},
            {name: 'another_event', properties: {}, timestamp: Date.now()},
        ];
        
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: vi.fn(() => mockEvents),
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        expect(screen.getByText(/test_event/)).toBeInTheDocument();
        expect(screen.getByText(/another_event/)).toBeInTheDocument();
        expect(screen.getByText('events in current session')).toBeInTheDocument();
    });

    it('clears queue when clear button is clicked', () => {
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: vi.fn(() => [{name: 'test', properties: {}, timestamp: Date.now()}]),
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        fireEvent.click(screen.getByText('Clear'));
        
        expect(mockClearQueue).toHaveBeenCalled();
    });

    it('exports events as JSON when export button is clicked', () => {
        const mockEvents = [
            {name: 'test_event', properties: {foo: 'bar'}, timestamp: Date.now()},
        ];
        
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: vi.fn(() => mockEvents),
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        // Mock URL.createObjectURL and anchor click
        const mockCreateObjectURL = vi.fn(() => 'blob:test');
        const mockRevokeObjectURL = vi.fn();
        const mockClick = vi.fn();
        
        vi.stubGlobal('URL', {createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL});
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'a') {
                return {
                    href: '',
                    download: '',
                    click: mockClick,
                } as any;
            }
            return originalCreateElement(tag);
        });
        
        fireEvent.click(screen.getByText('Export JSON'));
        
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('toggles raw view when show/hide button is clicked', () => {
        const mockEvents = [
            {name: 'test_event', properties: {foo: 'bar'}, timestamp: Date.now()},
        ];
        
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: vi.fn(() => mockEvents),
            clearQueue: mockClearQueue,
        });
        
        render(<MetricsTab />);
        
        expect(screen.queryByText('Raw Events (newest first)')).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Show Raw'));
        
        expect(screen.getByText('Raw Events (newest first)')).toBeInTheDocument();
        expect(screen.getByText('test_event')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Hide Raw'));
        
        expect(screen.queryByText('Raw Events (newest first)')).not.toBeInTheDocument();
    });

    it('persists consent across renders', () => {
        vi.mocked(useMetrics).mockReturnValue({
            track: mockTrack,
            consent: true,
            toggleConsent: mockToggleConsent,
            getQueue: mockGetQueue,
            clearQueue: mockClearQueue,
        });
        
        const {unmount} = render(<MetricsTab />);
        expect(screen.getByRole('checkbox')).toBeChecked();
        
        unmount();
        render(<MetricsTab />);
        
        expect(screen.getByRole('checkbox')).toBeChecked();
    });
});