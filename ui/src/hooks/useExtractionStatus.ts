import {useEffect, useState} from 'react';
import {inferenceRouter} from '../services/ai/inference';
import type {ProviderConfig} from '../services/ai/inference';

export type ExtractionStatus = 'ai' | 'local' | 'degraded' | 'unknown';

export interface ExtractionStatusState {
    status: ExtractionStatus;
    providerName: string;
    providerKind: string;
    fallbackUsed: boolean;
}

function getBestProviderStatus(providers: ProviderConfig[]): {status: ExtractionStatus; providerName: string; providerKind: string} {
    if (providers.length === 0) {
        return {status: 'degraded', providerName: 'none', providerKind: 'heuristic'};
    }
    const best = providers[0];
    if (best.kind === 'heuristic') {
        return {status: 'degraded', providerName: best.name, providerKind: best.kind};
    }
    if (best.kind === 'local-model') {
        return {status: 'local', providerName: best.name, providerKind: best.kind};
    }
    return {status: 'ai', providerName: best.name, providerKind: best.kind};
}

export function useExtractionStatus(): ExtractionStatusState {
    const [state, setState] = useState<ExtractionStatusState>({
        status: 'unknown',
        providerName: 'none',
        providerKind: 'heuristic',
        fallbackUsed: false,
    });

    useEffect(() => {
        const updateStatus = () => {
            const providers = inferenceRouter.getAvailableProviders();
            const {status, providerName, providerKind} = getBestProviderStatus(providers);
            setState(prev => ({...prev, status, providerName, providerKind}));
        };

        updateStatus();

        const handleStorageChange = () => updateStatus();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('ai-providers-changed', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('ai-providers-changed', handleStorageChange);
        };
    }, []);

    const recordFallback = () => {
        setState(prev => ({...prev, fallbackUsed: true, status: 'degraded'}));
    };

    return {...state, recordFallback};
}

export function useBestProviderStatus(): {status: ExtractionStatus; providerName: string; providerKind: string} {
    const [status, setStatus] = useState<ExtractionStatus>('unknown');
    const [providerName, setProviderName] = useState('none');
    const [providerKind, setProviderKind] = useState('heuristic');

    useEffect(() => {
        const updateStatus = () => {
            const providers = inferenceRouter.getAvailableProviders();
            const {status: newStatus, providerName: newName, providerKind: newKind} = getBestProviderStatus(providers);
            setStatus(newStatus);
            setProviderName(newName);
            setProviderKind(newKind);
        };

        updateStatus();
        window.addEventListener('storage', updateStatus);
        window.addEventListener('ai-providers-changed', updateStatus);
        return () => {
            window.removeEventListener('storage', updateStatus);
            window.removeEventListener('ai-providers-changed', updateStatus);
        };
    }, []);

    return {status, providerName, providerKind};
}