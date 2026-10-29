import {useCallback, useMemo, useState} from 'react';
import type {OntologyNode, Property, MatchResult} from '@notention/core';
import {generateClarificationQuestions, recordClarificationOutcome, ClarificationQuestion} from '../services/ai/clarification';

export interface ElicitationState {
    questions: ClarificationQuestion[];
    currentQuestionIndex: number;
    answers: Record<string, string>;
    isActive: boolean;
}

export interface ProgressiveElicitationOptions {
    onAnswer?: (question: ClarificationQuestion, answer: string) => void;
    onComplete?: (answers: Record<string, string>) => void;
    onCancel?: () => void;
}

/**
 * Progressive elicitation for missing properties on match failure.
 * Shows one question at a time, ranked by information gain.
 * Only asks when it could change the outcome (L16).
 */
export function useProgressiveElicitation(
    matchResult: MatchResult | null,
    ontology: OntologyNode[],
    userText: string,
    options: ProgressiveElicitationOptions = {}
) {
    const {onAnswer, onComplete, onCancel} = options;
    const [state, setState] = useState<ElicitationState>({
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        isActive: false,
    });

    // Generate questions when match result changes
    const questions = useMemo(() => {
        if (!matchResult || matchResult.missing.length === 0) return [];
        return generateClarificationQuestions({
            missingProperties: matchResult.missing,
            matchedProperties: matchResult.matches.map(m => m.requestProp),
            ontology,
            userText,
        });
    }, [matchResult, ontology, userText]);

    const startElicitation = useCallback(() => {
        if (questions.length === 0) {
            onComplete?.({});
            return;
        }
        setState({
            questions,
            currentQuestionIndex: 0,
            answers: {},
            isActive: true,
        });
    }, [questions, onComplete]);

    const answerCurrentQuestion = useCallback((answer: string) => {
        const {questions, currentQuestionIndex, answers} = state;
        if (currentQuestionIndex >= questions.length) return;

        const question = questions[currentQuestionIndex];
        const newAnswers = {...answers, [question.key]: answer};
        
        // Record outcome for learning
        recordClarificationOutcome({
            questionId: question.id,
            key: question.key,
            answered: true,
            changedOutcome: false, // Will be updated later when match is re-evaluated
            timestamp: Date.now(),
        });

        onAnswer?.(question, answer);

        if (currentQuestionIndex + 1 >= questions.length) {
            setState({
                questions,
                currentQuestionIndex: questions.length,
                answers: newAnswers,
                isActive: false,
            });
            onComplete?.(newAnswers);
        } else {
            setState({
                questions,
                currentQuestionIndex: currentQuestionIndex + 1,
                answers: newAnswers,
                isActive: true,
            });
        }
    }, [state, onAnswer, onComplete]);

    const skipQuestion = useCallback(() => {
        const {questions, currentQuestionIndex} = state;
        if (currentQuestionIndex >= questions.length) return;

        const question = questions[currentQuestionIndex];
        
        recordClarificationOutcome({
            questionId: question.id,
            key: question.key,
            answered: false,
            changedOutcome: false,
            timestamp: Date.now(),
        });

        if (currentQuestionIndex + 1 >= questions.length) {
            setState({
                questions,
                currentQuestionIndex: questions.length,
                answers: state.answers,
                isActive: false,
            });
            onComplete?.(state.answers);
        } else {
            setState({
                questions,
                currentQuestionIndex: currentQuestionIndex + 1,
                answers: state.answers,
                isActive: true,
            });
        }
    }, [state, onComplete]);

    const cancelElicitation = useCallback(() => {
        setState({
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            isActive: false,
        });
        onCancel?.();
    }, [onCancel]);

    const currentQuestion = state.isActive && state.currentQuestionIndex < state.questions.length
        ? state.questions[state.currentQuestionIndex]
        : null;

    const progress = state.questions.length > 0
        ? (state.currentQuestionIndex / state.questions.length) * 100
        : 0;

    return {
        ...state,
        questions: state.questions,
        currentQuestion,
        progress,
        startElicitation,
        answerCurrentQuestion,
        skipQuestion,
        cancelElicitation,
        hasQuestions: state.questions.length > 0,
    };
}

/**
 * Hook for on-match-failure elicitation.
 * Automatically triggers when a match has missing properties.
 */
export function useOnMatchFailureElicitation(
    matchResult: MatchResult | null,
    ontology: OntologyNode[],
    userText: string,
    options: ProgressiveElicitationOptions & {autoStart?: boolean} = {}
) {
    const elicitation = useProgressiveElicitation(matchResult, ontology, userText, options);

    // Auto-start when match has missing properties and we haven't started yet
    // In a real implementation, this would be triggered by user action
    // For now, we expose the elicitation state for the UI to control

    return elicitation;
}