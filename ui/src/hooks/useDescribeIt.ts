import {useCallback, useMemo, useState} from 'react';
import type {OntologyNode, Property} from '@notention/core';
import {useGardener} from './useGardener';
import {useSettings} from './useSettingsContext';
import {LocalAIProvider} from '../services/ai/LocalProvider';
import {proposeProperties} from '../services/ai/proposals';
import type {PropertyProposal} from '../services/ai/types';

export type DescribeItStatus = 'idle' | 'loading' | 'error';

export interface DescribedProperty extends PropertyProposal {
    status: 'pending' | 'accepted';
}

/**
 * Free-text composition: the user describes a note, a provider proposes
 * structured properties, and nothing reaches the note until it is accepted.
 * With no model configured the local heuristic provider is used, so the flow
 * never loads a model or calls a provider.
 */
export function useDescribeIt(ontology: OntologyNode[]) {
    const {provider, providerKind} = useGardener();
    const {settings, setSettings} = useSettings();

    const [proposals, setProposals] = useState<DescribedProperty[]>([]);
    const [status, setStatus] = useState<DescribeItStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [pendingRemoteText, setPendingRemoteText] = useState<string | null>(null);

    const propose = useCallback(async (text: string, activeProvider = provider) => {
        setStatus('loading');
        setError(null);
        try {
            const result = await proposeProperties(activeProvider, text, ontology);
            setProposals(result.map(proposal => ({...proposal, status: 'pending' as const})));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        } finally {
            setStatus('idle');
        }
    }, [provider, ontology]);

    const suggest = useCallback(async (text: string) => {
        if (!text.trim()) return;

        if (providerKind === 'remote' && !settings.aiRemoteConsent) {
            setPendingRemoteText(text);
            return;
        }

        await propose(text);
    }, [providerKind, settings.aiRemoteConsent, propose]);

    const allowRemote = useCallback(async () => {
        const text = pendingRemoteText;
        setPendingRemoteText(null);
        setSettings(prev => ({...prev, aiRemoteConsent: true}));
        if (text) await propose(text);
    }, [pendingRemoteText, propose, setSettings]);

    const declineRemote = useCallback(async () => {
        const text = pendingRemoteText;
        setPendingRemoteText(null);
        if (text) await propose(text, new LocalAIProvider());
    }, [pendingRemoteText, propose]);

    const accept = useCallback((proposal: DescribedProperty) => {
        setProposals(prev => prev.map(item => item === proposal ? {...item, status: 'accepted' as const} : item));
    }, []);

    const reject = useCallback((proposal: DescribedProperty) => {
        setProposals(prev => prev.filter(item => item !== proposal));
    }, []);

    const reset = useCallback(() => {
        setProposals([]);
        setError(null);
        setPendingRemoteText(null);
        setStatus('idle');
    }, []);

    const accepted = useMemo<Property[]>(
        () => proposals.filter(item => item.status === 'accepted').map(item => item.property),
        [proposals]
    );

    return {
        proposals,
        accepted,
        status,
        error,
        providerKind,
        providerName: provider.name,
        pendingRemoteText,
        suggest,
        allowRemote,
        declineRemote,
        accept,
        reject,
        reset
    };
}
