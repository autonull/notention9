import {act, renderHook} from '@testing-library/react';
import {useGardener} from '../../src/hooks/useGardener';
import {useSettings} from '../../src/hooks/useSettingsContext';
import {useView} from '../../src/hooks/useViewContext';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Note} from '@notention/core';

// Mock useSettings
vi.mock('../../src/hooks/useSettingsContext', () => ({
    useSettings: vi.fn(),
}));

// Mock useView
vi.mock('../../src/hooks/useViewContext', () => ({
    useView: vi.fn(),
}));

// Mock useToast
vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

// Mock Gardener
const mockAnalyzeOntology = vi.fn();
vi.mock('../../src/services/gardener', () => ({
    Gardener: vi.fn().mockImplementation(() => ({
        evolveOntology: mockAnalyzeOntology,
    })),
}));

// Mock Remote/Local AI providers
vi.mock('../../src/services/ai/LocalProvider', () => ({
    LocalAIProvider: vi.fn(),
}));
vi.mock('../../src/services/ai/RemoteProvider', () => ({
    RemoteAIProvider: vi.fn(),
}));


describe('useGardener', () => {
    const setSettingsMock = vi.fn();
    const showToastMock = vi.fn();
    const mockSettings = {
        settings: {
            aiEnabled: false,
            ontology: [],
        },
        setSettings: setSettingsMock,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useSettings).mockReturnValue(mockSettings as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useView).mockReturnValue({showToast: showToastMock} as any);
    });

    it('should call evolveOntology and update settings', async () => {
        const {result} = renderHook(() => useGardener());

        const mockNotes: Note[] = [{
            id: '1',
            title: 'test',
            content: 'test',
            createdAt: '',
            updatedAt: '',
            tags: [],
            properties: []
        }];
        const mockNewAttributes = [
            {key: 'newAttr', type: 'string', description: 'desc', usageCount: 1, sampleValues: []}
        ];

        mockAnalyzeOntology.mockResolvedValue(mockNewAttributes);

        await act(async () => {
            await result.current.evolveOntology(mockNotes);
        });

        // called with mockNotes and undefined context
        expect(mockAnalyzeOntology).toHaveBeenCalledWith(mockNotes, undefined);
        expect(setSettingsMock).toHaveBeenCalled();
        // Check if the update function logic is correct would require more complex mocking of setSettings behavior,
        // but verifying it's called is a good first step.
    });

    it('should not update settings if no new attributes', async () => {
        const {result} = renderHook(() => useGardener());
        mockAnalyzeOntology.mockResolvedValue([]);

        await act(async () => {
            await result.current.evolveOntology([]);
        });

        expect(setSettingsMock).not.toHaveBeenCalled();
    });
});
