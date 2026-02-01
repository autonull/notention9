import React, { useState } from 'react';
import { OnboardingService, SetupConfiguration } from '@notention/core';

interface SetupWizardProps {
    onComplete: (config: SetupConfiguration) => void;
    service: OnboardingService;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, service }) => {
    const [state, setState] = useState(service.getState());
    const currentStep = state.steps[state.currentStepIndex];

    const handleNext = () => {
        service.completeStep(currentStep.id);
        service.nextStep();
        setState({ ...service.getState() });

        if (state.isComplete || (currentStep.id === 'finalize' && state.currentStepIndex === state.steps.length - 1)) {
            onComplete(state.config);
        }
    };

    const handleBack = () => {
        service.prevStep();
        setState({ ...service.getState() });
    };

    const updateConfig = (updates: Partial<SetupConfiguration>) => {
        service.updateConfig(updates);
        setState({ ...service.getState() });
    };

    const renderStepContent = () => {
        switch (currentStep.id) {
            case 'welcome':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Welcome to Notention</h2>
                        <p>Notention is a hybrid workspace where your <strong>Notes</strong> become <strong>Actions</strong> through the power of <strong>Agents</strong>.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Think:</strong> Write normally.</li>
                            <li><strong>Do:</strong> Create tasks and automations.</li>
                            <li><strong>Evolve:</strong> Your system learns from you.</li>
                        </ul>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Privacy Settings</h2>
                        <p>Notention is Local-First by default. You decide what leaves your machine.</p>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="privacy"
                                    value="local-only"
                                    checked={state.config.privacyLevel === 'local-only'}
                                    onChange={() => updateConfig({ privacyLevel: 'local-only' })}
                                    className="form-radio"
                                />
                                <div>
                                    <div className="font-semibold">Local Only</div>
                                    <div className="text-sm text-gray-500">Data never leaves this device.</div>
                                </div>
                            </label>
                            <label className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="privacy"
                                    value="shared-network"
                                    checked={state.config.privacyLevel === 'shared-network'}
                                    onChange={() => updateConfig({ privacyLevel: 'shared-network' })}
                                    className="form-radio"
                                />
                                <div>
                                    <div className="font-semibold">Shared Network</div>
                                    <div className="text-sm text-gray-500">Allow P2P sync for specific shared notes.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                );
            case 'capabilities':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">System Capabilities</h2>
                        <p>Enable features to give your agent hands.</p>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={state.config.enableBrowserAutomation}
                                onChange={(e) => updateConfig({ enableBrowserAutomation: e.target.checked })}
                                className="form-checkbox"
                            />
                            <span>Enable Browser Automation (VoltAgent Browser)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={state.config.enableFileAccess}
                                onChange={(e) => updateConfig({ enableFileAccess: e.target.checked })}
                                className="form-checkbox"
                            />
                            <span>Enable Local File Access</span>
                        </label>
                        <div className="pt-4">
                            <label className="block text-sm font-medium">Your Name (Optional)</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border rounded p-2"
                                placeholder="User"
                                value={state.config.userName || ''}
                                onChange={(e) => updateConfig({ userName: e.target.value })}
                            />
                        </div>
                    </div>
                );
            case 'finalize':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">All Set!</h2>
                        <p>We are ready to initialize your workspace.</p>
                        <div className="bg-gray-100 p-4 rounded text-sm font-mono">
                            <p>Privacy: {state.config.privacyLevel}</p>
                            <p>Browser: {state.config.enableBrowserAutomation ? 'Enabled' : 'Disabled'}</p>
                            <p>Files: {state.config.enableFileAccess ? 'Enabled' : 'Disabled'}</p>
                        </div>
                        <p>Click Finish to generate your configuration note.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-800">Setup Wizard</h1>
                <div className="text-sm text-gray-500">
                    Step {state.currentStepIndex + 1} of {state.steps.length}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {renderStepContent()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                    onClick={handleBack}
                    disabled={state.currentStepIndex === 0}
                    className={`px-4 py-2 rounded ${state.currentStepIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                >
                    {state.currentStepIndex === state.steps.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
};
