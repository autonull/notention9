import React, {useState} from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {Toggle} from '../ui/Primitives';
import {SparklesIcon, CpuChipIcon, InformationCircleIcon, ArrowRightIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {cn} from '../../utils/ui';

export function AutomationTab() {
    const {settings, setSettings} = useSettings();
    const [enabled, setEnabled] = useState(settings.automationEnabled ?? false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleToggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        setSettings(prev => ({...prev, automationEnabled: newState}));
    };

    return (
        <div className="bg-[var(--app-surface)] p-6 rounded-lg animate-fade-in space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--app-text)] flex items-center gap-3">
                    <SparklesIcon className="h-6 w-6 text-purple-400"/>
                    Automation
                </h2>
                <p className="text-sm text-[var(--app-muted)]">
                    Let the assistant help with repetitive tasks and smart suggestions.
                </p>
            </div>

            <div className="p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]">
                <div className="flex items-center justify-between">
                    <div className="flex-grow">
                        <label className="font-medium text-[var(--app-text-secondary)]">Enable Automation</label>
                        <p className="text-sm text-[var(--app-muted)] mt-1">
                            When enabled, the assistant can auto-tag notes, suggest matches, and run automation rules.
                        </p>
                    </div>
                    <Toggle
                        checked={enabled}
                        onChange={handleToggle}
                        ariaLabel="Enable Automation"
                    />
                </div>
            </div>

            {enabled && (
                <div className="space-y-4">
                    <div className="p-3 bg-purple-900/20 border border-purple-800 rounded-lg flex gap-3">
                        <CpuChipIcon className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <p className="text-sm text-purple-200 font-medium">Automation Active</p>
                            <p className="text-xs text-purple-400 mt-1">
                                The assistant will process notes in the background. You can create automation rules in the
                                <span className="text-blue-400 underline">Actions</span> view.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--app-line)]">
                        <div className="flex-grow">
                            <label className="font-medium text-[var(--app-text-secondary)]">Advanced Settings</label>
                            <p className="text-sm text-[var(--app-muted)] mt-1">
                                Configure agent connection, automation rules, and processing options.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1"
                        >
                            {showAdvanced ? (
                                <>
                                    <span>Hide</span>
                                    <ArrowRightIcon className="w-4 h-4 rotate-180" />
                                </>
                            ) : (
                                <>
                                    <span>Show</span>
                                    <ArrowRightIcon className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </div>

                    {showAdvanced && (
                        <div className="space-y-4 pt-4 border-t border-[var(--app-line)] animate-fade-in">
                            <div className="p-3 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]">
                                <h4 className="font-medium text-[var(--app-text)] mb-2 flex items-center gap-2">
                                    <InformationCircleIcon className="w-4 h-4 text-blue-400"/>
                                    Agent Connection
                                </h4>
                                <p className="text-sm text-[var(--app-muted)] mb-3">
                                    The agent handles semantic processing, skill execution, and memory management.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setSettings(prev => ({...prev, activeView: 'actions'}))}
                                    >
                                        Open Actions View
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSettings(prev => ({...prev, activeView: 'settings', activeTab: 'agent'}))}
                                    >
                                        Legacy Agent Settings
                                    </Button>
                                </div>
                            </div>

                            <div className="p-3 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]">
                                <h4 className="font-medium text-[var(--app-text)] mb-2">Automation Rules</h4>
                                <p className="text-sm text-[var(--app-muted)] mb-3">
                                    Create <code className="text-blue-400">if/then</code> rules that run automatically on your notes.
                                </p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSettings(prev => ({...prev, activeView: 'actions'}))}
                                >
                                    Manage Rules
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!enabled && (
                <div className="p-3 bg-[var(--app-raised)] border border-[var(--app-line)]/30 rounded-lg text-center">
                    <p className="text-sm text-[var(--app-muted)]">
                        Enable automation to unlock smart features like auto-tagging, match suggestions, and conditional rules.
                    </p>
                </div>
            )}
        </div>
    );
}