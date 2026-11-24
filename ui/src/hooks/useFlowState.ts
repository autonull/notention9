import { useReducer, useCallback, useMemo, useEffect, useRef, useContext, createContext } from 'react';
import type { FlowReducer } from './reducers';

export interface FlowState {
    currentStep: string;
    history: string[];
    satisfiedGuards: Set<string>;
    completedEffects: Set<string>;
    isComplete: boolean;
    isBlocked: boolean;
    blockReason?: string;
}

export type FlowAction =
    | { type: 'ADVANCE'; condition?: string }
    | { type: 'SATISFY_GUARD'; guardId: string }
    | { type: 'COMPLETE_EFFECT'; effectId: string }
    | { type: 'RESET' }
    | { type: 'SET_INITIAL'; step: string };

interface FlowContextValue {
    state: FlowState;
    dispatch: React.Dispatch<FlowAction>;
    canAdvance: () => boolean;
    getNextSteps: () => Array<{ to: string; when?: string }>;
    getCurrentGuards: () => string[];
    getCurrentEffects: () => string[];
    satisfyGuard: (guardId: string) => void;
    completeEffect: (effectId: string) => void;
    advance: (condition?: string) => void;
    reset: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlowContext(): FlowContextValue {
    const context = useContext(FlowContext);
    if (!context) {
        throw new Error('useFlowContext must be used within a FlowProvider');
    }
    return context;
}

function createInitialState(reducer: FlowReducer): FlowState {
    return {
        currentStep: reducer.initial,
        history: [reducer.initial],
        satisfiedGuards: new Set(),
        completedEffects: new Set(),
        isComplete: false,
        isBlocked: false,
    };
}

function flowReducerFactory(reducer: FlowReducer) {
    return (state: FlowState, action: FlowAction): FlowState => {
        const currentStateDef = reducer.states[state.currentStep];
        if (!currentStateDef) {
            return { ...state, isBlocked: true, blockReason: `Unknown step: ${state.currentStep}` };
        }

        switch (action.type) {
            case 'SET_INITIAL': {
                return createInitialState(reducer);
            }

            case 'SATISFY_GUARD': {
                const newSatisfiedGuards = new Set(state.satisfiedGuards);
                newSatisfiedGuards.add(action.guardId);
                return { ...state, satisfiedGuards: newSatisfiedGuards };
            }

            case 'COMPLETE_EFFECT': {
                const newCompletedEffects = new Set(state.completedEffects);
                newCompletedEffects.add(action.effectId);
                return { ...state, completedEffects: newCompletedEffects };
            }

            case 'ADVANCE': {
                const { condition } = action;
                const { guards, effects, transitions } = currentStateDef;

                // Check if all guards are satisfied
                const unsatisfiedGuards = guards.filter(g => !state.satisfiedGuards.has(g));
                if (unsatisfiedGuards.length > 0) {
                    return {
                        ...state,
                        isBlocked: true,
                        blockReason: `Guards not satisfied: ${unsatisfiedGuards.join(', ')}`,
                    };
                }

                // Find the next transition
                let nextStep: string | undefined;
                if (condition) {
                    const matchingTransition = transitions.find(t => t.when === condition);
                    nextStep = matchingTransition?.to;
                } else if (transitions.length === 1) {
                    nextStep = transitions[0].to;
                } else if (transitions.length > 1) {
                    // Multiple transitions need a condition
                    return {
                        ...state,
                        isBlocked: true,
                        blockReason: `Multiple transitions available; need condition: ${transitions.map(t => t.when ?? 'default').join(', ')}`,
                    };
                }

                if (!nextStep) {
                    // No next step - check if this is a result state
                    if (transitions.length === 0) {
                        return { ...state, isComplete: true, isBlocked: false };
                    }
                    return {
                        ...state,
                        isBlocked: true,
                        blockReason: `No transition found${condition ? ` for condition: ${condition}` : ''}`,
                    };
                }

                // Check if the target step has guards that need to be satisfied immediately
                const nextStateDef = reducer.states[nextStep];
                const nextUnsatisfiedGuards = nextStateDef?.guards.filter(g => !state.satisfiedGuards.has(g)) ?? [];

                return {
                    ...state,
                    currentStep: nextStep,
                    history: [...state.history, nextStep],
                    isBlocked: nextUnsatisfiedGuards.length > 0,
                    blockReason: nextUnsatisfiedGuards.length > 0
                        ? `Guards not satisfied: ${nextUnsatisfiedGuards.join(', ')}`
                        : undefined,
                };
            }

            case 'RESET': {
                return createInitialState(reducer);
            }

            default:
                return state;
        }
    };
}

export interface FlowProviderProps {
    reducer: FlowReducer;
    children: React.ReactNode;
    initialStep?: string;
    autoAdvance?: boolean;
    onStepChange?: (step: string, previousStep: string) => void;
    onComplete?: () => void;
    onBlocked?: (reason: string, step: string) => void;
}

export function FlowProvider({
    reducer,
    children,
    initialStep,
    autoAdvance = false,
    onStepChange,
    onComplete,
    onBlocked,
}: FlowProviderProps) {
    const reducerFn = useMemo(() => flowReducerFactory(reducer), [reducer]);
    const [state, dispatch] = useReducer(reducerFn, reducer, createInitialState);

    // Set initial step if provided
    useEffect(() => {
        if (initialStep && initialStep !== reducer.initial) {
            dispatch({ type: 'SET_INITIAL', step: initialStep });
        }
    }, [initialStep, reducer.initial]);

    // Track step changes for callbacks
    const previousStepRef = useRef(state.currentStep);
    useEffect(() => {
        if (previousStepRef.current !== state.currentStep) {
            onStepChange?.(state.currentStep, previousStepRef.current);
            previousStepRef.current = state.currentStep;
        }
    }, [state.currentStep, onStepChange]);

    // Track completion
    useEffect(() => {
        if (state.isComplete) {
            onComplete?.();
        }
    }, [state.isComplete, onComplete]);

    // Track blocked state
    useEffect(() => {
        if (state.isBlocked && state.blockReason) {
            onBlocked?.(state.blockReason, state.currentStep);
        }
    }, [state.isBlocked, state.blockReason, state.currentStep, onBlocked]);

    // Auto-advance when guards are satisfied and only one transition
    useEffect(() => {
        if (!autoAdvance || state.isComplete || state.isBlocked) return;

        const currentStateDef = reducer.states[state.currentStep];
        if (!currentStateDef) return;

        const { guards, transitions } = currentStateDef;
        const unsatisfiedGuards = guards.filter(g => !state.satisfiedGuards.has(g));
        if (unsatisfiedGuards.length > 0) return;

        if (transitions.length === 1) {
            dispatch({ type: 'ADVANCE' });
        }
    }, [state.satisfiedGuards, state.currentStep, reducer, autoAdvance]);

    const canAdvance = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        if (!currentStateDef) return false;
        const { guards, transitions } = currentStateDef;
        const unsatisfiedGuards = guards.filter(g => !state.satisfiedGuards.has(g));
        return unsatisfiedGuards.length === 0 && transitions.length > 0;
    }, [reducer, state.currentStep, state.satisfiedGuards]);

    const getNextSteps = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.transitions ?? [];
    }, [reducer, state.currentStep]);

    const getCurrentGuards = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.guards ?? [];
    }, [reducer, state.currentStep]);

    const getCurrentEffects = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.effects ?? [];
    }, [reducer, state.currentStep]);

    const satisfyGuard = useCallback((guardId: string) => {
        dispatch({ type: 'SATISFY_GUARD', guardId });
    }, []);

    const completeEffect = useCallback((effectId: string) => {
        dispatch({ type: 'COMPLETE_EFFECT', effectId });
    }, []);

    const advance = useCallback((condition?: string) => {
        dispatch({ type: 'ADVANCE', condition });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    const value = useMemo(() => ({
        state,
        dispatch,
        canAdvance,
        getNextSteps,
        getCurrentGuards,
        getCurrentEffects,
        satisfyGuard,
        completeEffect,
        advance,
        reset,
    }), [
        state,
        canAdvance,
        getNextSteps,
        getCurrentGuards,
        getCurrentEffects,
        satisfyGuard,
        completeEffect,
        advance,
        reset,
    ]);

    return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlowState(reducer: FlowReducer): FlowContextValue {
    const reducerFn = useMemo(() => flowReducerFactory(reducer), [reducer]);
    const [state, dispatch] = useReducer(reducerFn, reducer, createInitialState);

    const canAdvance = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        if (!currentStateDef) return false;
        const { guards, transitions } = currentStateDef;
        const unsatisfiedGuards = guards.filter(g => !state.satisfiedGuards.has(g));
        return unsatisfiedGuards.length === 0 && transitions.length > 0;
    }, [reducer, state.currentStep, state.satisfiedGuards]);

    const getNextSteps = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.transitions ?? [];
    }, [reducer, state.currentStep]);

    const getCurrentGuards = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.guards ?? [];
    }, [reducer, state.currentStep]);

    const getCurrentEffects = useCallback(() => {
        const currentStateDef = reducer.states[state.currentStep];
        return currentStateDef?.effects ?? [];
    }, [reducer, state.currentStep]);

    const satisfyGuard = useCallback((guardId: string) => {
        dispatch({ type: 'SATISFY_GUARD', guardId });
    }, []);

    const completeEffect = useCallback((effectId: string) => {
        dispatch({ type: 'COMPLETE_EFFECT', effectId });
    }, []);

    const advance = useCallback((condition?: string) => {
        dispatch({ type: 'ADVANCE', condition });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    return useMemo(() => ({
        state,
        dispatch,
        canAdvance,
        getNextSteps,
        getCurrentGuards,
        getCurrentEffects,
        satisfyGuard,
        completeEffect,
        advance,
        reset,
    }), [
        state,
        canAdvance,
        getNextSteps,
        getCurrentGuards,
        getCurrentEffects,
        satisfyGuard,
        completeEffect,
        advance,
        reset,
    ]);
}

// Re-export types
export type { FlowReducer } from './reducers';