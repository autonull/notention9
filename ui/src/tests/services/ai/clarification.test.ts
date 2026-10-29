import {describe, it, expect} from 'vitest';
import {DEFAULT_ONTOLOGY} from '@notention/core';
import {
    generateClarificationQuestions,
    recordClarificationOutcome,
    getClarificationStats,
    getClarificationValueRate,
} from '../services/ai/clarification';

describe('Clarification Questions (L16)', () => {
    const ontology = DEFAULT_ONTOLOGY;

    const mockContext = {
        missingProperties: [
            {key: 'budget', operator: 'is', values: ['5000']},
            {key: 'channel', operator: 'is', values: ['email']},
            {key: 'deadline', operator: 'is', values: ['2024-12-31']},
            {key: 'location', operator: 'is near', values: ['Berlin']},
        ] as const,
        matchedProperties: [] as const,
        ontology,
        userText: 'I need a developer for a project with budget 5000',
    };

    it('generates questions for missing properties', () => {
        const questions = generateClarificationQuestions(mockContext);
        
        expect(questions.length).toBe(4);
        expect(questions.every(q => q.question)).toBe(true);
        expect(questions.every(q => q.key)).toBe(true);
    });

    it('ranks questions by information gain', () => {
        const questions = generateClarificationQuestions(mockContext);
        
        // Budget is required + commercial = high gain
        // Channel is enum = high gain
        // Deadline is date = medium gain
        // Location = medium gain
        
        for (let i = 0; i < questions.length - 1; i++) {
            expect(questions[i].informationGain).toBeGreaterThanOrEqual(questions[i + 1].informationGain);
        }
    });

    it('generates appropriate questions for enum types', () => {
        const channelProp = mockContext.missingProperties.find(p => p.key === 'channel')!;
        const questions = generateClarificationQuestions(mockContext);
        const channelQuestion = questions.find(q => q.key === 'channel');
        
        expect(channelQuestion).toBeDefined();
        expect(channelQuestion!.question).toContain('channel');
        expect(channelQuestion!.suggestedValues).toContain('email');
        expect(channelQuestion!.suggestedValues).toContain('whatsapp');
    });

    it('generates appropriate questions for date types', () => {
        const questions = generateClarificationQuestions(mockContext);
        const deadlineQuestion = questions.find(q => q.key === 'deadline');
        
        expect(deadlineQuestion).toBeDefined();
        expect(deadlineQuestion!.question).toContain('deadline');
        expect(deadlineQuestion!.suggestedValues).toContain('today');
    });

    it('increases gain for properties mentioned in user text', () => {
        const contextWithMention = {
            ...mockContext,
            missingProperties: [
                {key: 'budget', operator: 'is', values: ['5000']},
                {key: 'random', operator: 'is', values: ['unknown']},
            ] as const,
            userText: 'budget is 5000 for the project',
        };
        
        const questions = generateClarificationQuestions(contextWithMention);
        const budgetQuestion = questions.find(q => q.key === 'budget');
        const randomQuestion = questions.find(q => q.key === 'random');
        
        expect(budgetQuestion!.informationGain).toBeGreaterThan(randomQuestion!.informationGain);
    });

    it('tracks clarification outcomes', () => {
        // Clear storage
        localStorage.clear();
        
        recordClarificationOutcome({
            questionId: 'test-1',
            key: 'budget',
            answered: true,
            changedOutcome: true,
            timestamp: Date.now(),
        });
        
        recordClarificationOutcome({
            questionId: 'test-2',
            key: 'budget',
            answered: true,
            changedOutcome: false,
            timestamp: Date.now(),
        });
        
        recordClarificationOutcome({
            questionId: 'test-3',
            key: 'channel',
            answered: true,
            changedOutcome: true,
            timestamp: Date.now(),
        });
        
        const stats = getClarificationStats();
        expect(stats.get('budget')).toEqual({asked: 2, changed: 1});
        expect(stats.get('channel')).toEqual({asked: 1, changed: 1});
    });

    it('calculates clarification value rate', () => {
        localStorage.clear();
        
        recordClarificationOutcome({
            questionId: 'test-1',
            key: 'budget',
            answered: true,
            changedOutcome: true,
            timestamp: Date.now(),
        });
        
        recordClarificationOutcome({
            questionId: 'test-2',
            key: 'budget',
            answered: true,
            changedOutcome: false,
            timestamp: Date.now(),
        });
        
        expect(getClarificationValueRate()).toBe(0.5);
    });

    it('returns 0 when no outcomes recorded', () => {
        localStorage.clear();
        expect(getClarificationValueRate()).toBe(0);
    });
});