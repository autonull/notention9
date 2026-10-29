import {describe, it, expect, vi, beforeEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {DEFAULT_ONTOLOGY} from '@notention/core';
import {useProgressiveElicitation} from '../hooks/useProgressiveElicitation';

describe('Progressive Elicitation (P2)', () => {
    const ontology = DEFAULT_ONTOLOGY;

    const mockMatchResult = {
        score: 0.6,
        matches: [
            {requestProp: {key: 'role', operator: 'is', values: ['developer']}, offerProp: {key: 'role', operator: 'is', values: ['developer']}, compatibility: 1, reason: 'match'},
        ],
        conflicts: [],
        missing: [
            {key: 'budget', operator: 'is', values: ['5000']},
            {key: 'deadline', operator: 'is', values: ['2024-12-31']},
            {key: 'channel', operator: 'is', values: ['email']},
        ],
    };

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('generates questions from missing properties', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        expect(result.current.questions.length).toBe(3);
        expect(result.current.questions.map(q => q.key).sort()).toEqual(['budget', 'channel', 'deadline']);
    });

    it('ranks questions by information gain', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        // budget is required + commercial, channel is enum, deadline is date
        const gains = result.current.questions.map(q => q.informationGain);
        for (let i = 0; i < gains.length - 1; i++) {
            expect(gains[i]).toBeGreaterThanOrEqual(gains[i + 1]);
        }
    });

    it('starts elicitation with first question', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        expect(result.current.isActive).toBe(false);
        expect(result.current.currentQuestion).toBeNull();

        act(() => {
            result.current.startElicitation();
        });

        expect(result.current.isActive).toBe(true);
        expect(result.current.currentQuestion).toBeDefined();
        expect(result.current.currentQuestionIndex).toBe(0);
    });

    it('progresses through questions on answer', () => {
        const onAnswer = vi.fn();
        const onComplete = vi.fn();

        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer', {onAnswer, onComplete})
        );

        act(() => {
            result.current.startElicitation();
        });

        const firstQuestion = result.current.currentQuestion!;
        act(() => {
            result.current.answerCurrentQuestion('5000');
        });

        expect(onAnswer).toHaveBeenCalledWith(firstQuestion, '5000');
        expect(result.current.currentQuestionIndex).toBe(1);
        expect(result.current.answers.budget).toBe('5000');

        const secondQuestion = result.current.currentQuestion!;
        act(() => {
            result.current.answerCurrentQuestion('2024-12-31');
        });

        expect(result.current.currentQuestionIndex).toBe(2);
        expect(result.current.answers.deadline).toBe('2024-12-31');

        const thirdQuestion = result.current.currentQuestion!;
        act(() => {
            result.current.answerCurrentQuestion('email');
        });

        expect(onComplete).toHaveBeenCalledWith({
            budget: '5000',
            deadline: '2024-12-31',
            channel: 'email',
        });
        expect(result.current.isActive).toBe(false);
    });

    it('skips questions', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        act(() => {
            result.current.startElicitation();
        });

        act(() => {
            result.current.skipQuestion();
        });

        expect(result.current.currentQuestionIndex).toBe(1);
        expect(result.current.answers).toEqual({});
    });

    it('cancels elicitation', () => {
        const onCancel = vi.fn();

        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer', {onCancel})
        );

        act(() => {
            result.current.startElicitation();
        });

        act(() => {
            result.current.cancelElicitation();
        });

        expect(onCancel).toHaveBeenCalled();
        expect(result.current.isActive).toBe(false);
        expect(result.current.questions).toEqual([]);
    });

    it('calculates progress correctly', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        act(() => {
            result.current.startElicitation();
        });

        expect(result.current.progress).toBe(0); // 0/3 = 0%

        act(() => {
            result.current.answerCurrentQuestion('5000');
        });

        expect(result.current.progress).toBeCloseTo(33.33, 1); // 1/3 = 33.33%

        act(() => {
            result.current.answerCurrentQuestion('2024-12-31');
        });

        expect(result.current.progress).toBeCloseTo(66.66, 1); // 2/3 = 66.66%
    });

    it('returns empty when no missing properties', () => {
        const matchWithoutMissing = {
            ...mockMatchResult,
            missing: [],
        };

        const {result} = renderHook(() =>
            useProgressiveElicitation(matchWithoutMissing, ontology, 'I need a developer')
        );

        expect(result.current.questions).toEqual([]);
        expect(result.current.hasQuestions).toBe(false);
    });

    it('records clarification outcomes', () => {
        const {result} = renderHook(() =>
            useProgressiveElicitation(mockMatchResult, ontology, 'I need a developer')
        );

        act(() => {
            result.current.startElicitation();
        });

        act(() => {
            result.current.answerCurrentQuestion('5000');
        });

        // Check localStorage was updated
        const stored = localStorage.getItem('clarification-outcomes');
        expect(stored).toBeDefined();
        
        const outcomes = JSON.parse(stored!);
        expect(outcomes.length).toBe(1);
        expect(outcomes[0].key).toBe('budget');
        expect(outcomes[0].answered).toBe(true);
    });
});