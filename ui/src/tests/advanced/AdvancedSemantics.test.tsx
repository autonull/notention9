import {describe, expect, it, vi} from 'vitest';
import {createNote, patternRecognitionService} from '@notention/core';

// Mock the core service
vi.mock('@notention/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        patternRecognitionService: {
            predictUserNeeds: vi.fn(),
        },
    };
});

describe('Advanced Semantics Integration', () => {
    it('should surface predictions based on semantic intent', () => {
        const userId = 'test-user';
        const note = createNote({
            id: 'test-note-advanced',
            title: 'Reminder',
            content: 'Remind me to submit the report',
            properties: [
                {key: 'intent', operator: 'is', values: ['reminder']}
            ]
        });

        const mockPrediction = {
            pattern: {id: 'test-pattern', name: 'Test Pattern', confidence: 0.9},
            predictedAction: 'Create Reminder Task',
            confidence: 0.9
        };

        // Mock the service response
        vi.mocked(patternRecognitionService.predictUserNeeds).mockReturnValue([mockPrediction] as any);

        // Call the service (simulating UI interaction)
        const predictions = patternRecognitionService.predictUserNeeds(userId, note);

        expect(predictions).toHaveLength(1);
        expect(predictions[0].predictedAction).toBe('Create Reminder Task');
        expect(patternRecognitionService.predictUserNeeds).toHaveBeenCalledWith(userId, note);
    });
});
