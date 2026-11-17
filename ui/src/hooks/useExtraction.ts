import {useCallback, useRef, useState} from 'react';
import {Property, OntologyNode, ExtractionOptions, ExtractionResult, PropertyExtractor} from '@notention/core';
import {inferenceRouter} from '../services/ai/inference';

interface ExtractionState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    fallbackUsed: boolean;
    providerUsed: string;
    providerKind: string;
    retry: () => Promise<void>;
}

interface UseExtractionOptions {
    onFallback?: (providerUsed: string, providerKind: string) => void;
    onError?: (error: Error) => void;
}

export function useHeuristicExtraction(
    text: string,
    ontology: OntologyNode[],
    options?: ExtractionOptions
): ExtractionState<ExtractionResult> & {extract: () => Promise<void>} {
    const [state, setState] = useState<ExtractionState<ExtractionResult>>({
        data: null,
        loading: false,
        error: null,
        fallbackUsed: false,
        providerUsed: 'heuristic',
        providerKind: 'heuristic',
        retry: async () => {},
    });
    const extractorRef = useRef(new PropertyExtractor(ontology));
    const textRef = useRef(text);
    const ontologyRef = useRef(ontology);
    const optionsRef = useRef(options);

    textRef.current = text;
    ontologyRef.current = ontology;
    optionsRef.current = options;

    const extract = useCallback(async () => {
        setState(prev => ({...prev, loading: true, error: null}));
        try {
            const extractor = extractorRef.current;
            const result = await extractor.extractFromTextWithStages(textRef.current, ontologyRef.current, optionsRef.current);
            setState(prev => ({
                ...prev,
                data: result,
                loading: false,
                fallbackUsed: false,
                providerUsed: 'heuristic',
                providerKind: 'heuristic',
            }));
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            setState(prev => ({
                ...prev,
                loading: false,
                error,
                fallbackUsed: false,
            }));
        }
    }, []);

    const retry = useCallback(async () => {
        await extract();
    }, [extract]);

    return {
        ...state,
        extract,
        retry,
    };
}

export function useAIExtraction(
    text: string,
    ontology: OntologyNode[],
    options?: {onFallback?: (provider: string, kind: string) => void; onError?: (error: Error) => void}
): ExtractionState<Property[]> & {extract: () => Promise<void>} {
    const [state, setState] = useState<ExtractionState<Property[]>>({
        data: null,
        loading: false,
        error: null,
        fallbackUsed: false,
        providerUsed: 'none',
        providerKind: 'none',
        retry: async () => {},
    });
    const textRef = useRef(text);
    const ontologyRef = useRef(ontology);
    const optionsRef = useRef(options);

    textRef.current = text;
    ontologyRef.current = ontology;
    optionsRef.current = options;

    const extract = useCallback(async () => {
        setState(prev => ({...prev, loading: true, error: null}));
        try {
            const result = await inferenceRouter.alignToOntology(textRef.current, ontologyRef.current, {
                timeout: 30000,
                maxRetries: 2,
                autoRepair: true,
            });

            setState(prev => ({
                ...prev,
                data: result.data,
                loading: false,
                fallbackUsed: result.fallbackUsed,
                providerUsed: result.providerUsed,
                providerKind: result.providerKind,
            }));

            if (result.fallbackUsed && optionsRef.current?.onFallback) {
                optionsRef.current.onFallback(result.providerUsed, result.providerKind);
            }
            if (result.error && optionsRef.current?.onError) {
                optionsRef.current.onError(result.error);
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            setState(prev => ({
                ...prev,
                loading: false,
                error,
                fallbackUsed: false,
            }));
            if (optionsRef.current?.onError) {
                optionsRef.current.onError(error);
            }
        }
    }, []);

    const retry = useCallback(async () => {
        await extract();
    }, [extract]);

    return {
        ...state,
        extract,
        retry,
    };
}

export function useNoteExtraction(noteContent: string, ontology: OntologyNode[]) {
    const heuristic = useHeuristicExtraction(noteContent, ontology);
    const ai = useAIExtraction(noteContent, ontology, {
        onFallback: (provider, kind) => {
            console.log(`AI extraction fell back to ${provider} (${kind})`);
        },
        onError: (error) => {
            console.error('AI extraction error:', error);
        },
    });

    // Use AI extraction when available, otherwise heuristic
    const isAIEnabled = inferenceRouter.getAvailableProviders().some(p => p.kind !== 'heuristic');

    return {
        heuristic,
        ai,
        isAIEnabled,
        // Combined state - prefer AI if available and not loading, otherwise heuristic
        data: ai.loading ? heuristic.data?.properties ?? null : ai.data ?? heuristic.data?.properties ?? null,
        loading: ai.loading || heuristic.loading,
        error: ai.error ?? heuristic.error,
        fallbackUsed: ai.fallbackUsed,
        providerUsed: ai.providerUsed,
        providerKind: ai.providerKind,
        extract: async () => {
            await Promise.all([heuristic.extract(), ai.extract()]);
        },
        retry: async () => {
            await Promise.all([heuristic.retry(), ai.retry()]);
        },
    };
}