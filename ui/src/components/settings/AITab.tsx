import React, {useState} from 'react';
import {CheckIcon, CpuChipIcon, SparklesIcon} from '../common/icons';
import {isGeminiApiKeyAvailable} from '@/services/ai/RemoteProvider';
import {AVAILABLE_MODELS} from '@/services/ai/WebLLMProvider';
import type {AppSettings} from '@notention/core';
import {useToast} from '../../hooks/useToast';
import {Toggle} from '../common/Toggle';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {Select} from '../common/Select';

interface AITabProps {
    settings: AppSettings;
    setSettings: (updater: (settings: AppSettings) => AppSettings) => void;
}

export function AITab({settings, setSettings}: AITabProps) {
    const {addToast} = useToast();
    const [keyInput, setKeyInput] = useState(settings.googleGeminiApiKey || '');

    const apiKeyAvailable = isGeminiApiKeyAvailable(settings.googleGeminiApiKey);
    const isWebLLM = settings.aiProvider === 'webllm';
    const isEnabled = settings.aiEnabled;

    const handleToggleAI = () => {
        // If provider is remote and no key, don't allow enabling unless switching to webllm?
        // Actually let user enable/disable regardless if WebLLM is selected.

        if (isWebLLM) {
            setSettings((prev) => ({...prev, aiEnabled: !prev.aiEnabled}));
            return;
        }

        if (!apiKeyAvailable && !isEnabled) {
            addToast('Please enter an API key or select Local Browser Model first.', 'error');
            return;
        }
        setSettings((prev) => ({...prev, aiEnabled: !prev.aiEnabled}));
    };

    const saveKey = () => {
        setSettings(prev => ({...prev, googleGeminiApiKey: keyInput}));
        addToast('Gemini API key saved', 'success');
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const provider = e.target.value as 'remote' | 'webllm';
        setSettings(prev => ({...prev, aiProvider: provider}));

        if (provider === 'webllm') {
            // Auto-enable if disabled? No, let user decide.
        } else {
            if (!apiKeyAvailable) {
                // If switching to remote and no key, maybe disable AI to avoid errors?
                // Or just warn.
                setSettings(prev => ({...prev, aiEnabled: false}));
            }
        }
    };

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
                    <SparklesIcon className="h-6 w-6 text-blue-400"/>
                    AI Enhancements
                </h2>
                <p className="text-sm text-gray-400">
                    Configure how the Gardener AI works.
                </p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <Select
                    label="AI Provider"
                    value={settings.aiProvider || 'remote'}
                    onChange={handleProviderChange}
                    options={[
                        {value: 'remote', label: 'Google Gemini (Remote API)'},
                        {value: 'webllm', label: 'Llama 3.2 (Local Browser Model)'},
                    ]}
                    className="mb-4"
                />

                {settings.aiProvider === 'webllm' ? (
                    <>
                        <Select
                            label="Local Model"
                            value={settings.aiModel || AVAILABLE_MODELS[0].id}
                            onChange={(e) => setSettings(prev => ({...prev, aiModel: e.target.value}))}
                            options={AVAILABLE_MODELS.map(m => ({value: m.id, label: m.label}))}
                            className="mb-4"
                        />

                        <div
                            className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-sm text-blue-200 flex gap-2">
                            <CpuChipIcon className="w-5 h-5 flex-shrink-0"/>
                            <div>
                                <p className="font-bold mb-1">Local Processing</p>
                                <p>Uses WebGPU to run the selected model directly in your browser. No data leaves your
                                    device. Requires a modern GPU.</p>
                                <p className="mt-2 text-xs opacity-70">Note: First load requires downloading model
                                    weights (~2GB).</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Input
                                    label="Google Gemini API Key"
                                    type="password"
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder="Enter API Key"
                                />
                            </div>
                            <Button
                                onClick={saveKey}
                                variant="primary"
                                icon={CheckIcon}
                            >
                                Save
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Your key is stored locally in your browser and sent directly to Google. It never touches our
                            servers.
                        </p>
                    </>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex-grow">
                    <label htmlFor="ai-toggle"
                           className={`font-medium ${isEnabled || (isWebLLM) ? 'text-gray-300' : 'text-gray-500'}`}>
                        Enable AI Features
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                        Enables features like note summarization, auto-tagging, and ontology gardening.
                    </p>
                </div>
                <div
                    className="relative"
                >
                    <Toggle
                        id="ai-toggle"
                        checked={settings.aiEnabled}
                        onChange={handleToggleAI}
                        disabled={!isWebLLM && !apiKeyAvailable}
                        ariaLabel="Enable AI Features"
                    />
                </div>
            </div>

            {!isWebLLM && !apiKeyAvailable && (
                <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm rounded-md">
                    <strong>Action Required:</strong> A Google Gemini API key is not
                    configured. AI features are disabled. Please enter a key above or switch to Local Browser Model.
                </div>
            )}
        </div>
    );
};
