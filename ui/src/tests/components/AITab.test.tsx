import {fireEvent, render, screen} from '@testing-library/react';
import {AITab} from '../../components/settings/AITab';
import {ToastProvider} from '../../components/contexts/ToastProvider';
import {describe, expect, it, vi} from 'vitest';
import type {AppSettings} from '@notention/core';

describe('AITab', () => {
    const mockSettings: AppSettings = {
        aiEnabled: false,
        developerMode: false,
        theme: 'dark',
        nostr: {privkey: null},
        ontology: [],
        customTemplates: [],
        aiProvider: 'remote'
    };

    const setSettings = vi.fn();

    it('renders provider selector', () => {
        render(
            <ToastProvider>
                <AITab settings={mockSettings} setSettings={setSettings}/>
            </ToastProvider>
        );
        expect(screen.getByText('AI Provider')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows WebLLM info when selected', () => {
        const webllmSettings = {...mockSettings, aiProvider: 'webllm' as const};
        render(
            <ToastProvider>
                <AITab settings={webllmSettings} setSettings={setSettings}/>
            </ToastProvider>
        );
        expect(screen.getByText('Local Processing')).toBeInTheDocument();
        expect(screen.getByText('Local Model')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Enter API Key')).not.toBeInTheDocument();
    });

    it('shows API Key input when remote is selected', () => {
        render(
            <ToastProvider>
                <AITab settings={mockSettings} setSettings={setSettings}/>
            </ToastProvider>
        );
        expect(screen.getByPlaceholderText('Enter API Key')).toBeInTheDocument();
        expect(screen.queryByText('Local Processing')).not.toBeInTheDocument();
    });

    it('calls setSettings when provider changes', () => {
        render(
            <ToastProvider>
                <AITab settings={mockSettings} setSettings={setSettings}/>
            </ToastProvider>
        );

        fireEvent.change(screen.getByRole('combobox'), {target: {value: 'webllm'}});
        expect(setSettings).toHaveBeenCalled();
    });
});
