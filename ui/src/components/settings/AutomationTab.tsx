import React, {useState} from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {Toggle} from '../ui/Primitives';
import {SparklesIcon, CpuChipIcon, InformationCircleIcon, ArrowRightIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {SectionHeader} from '../ui/kit';
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
        <div className="space-y-8">
            <SectionHeader
                title="Automation"
                description="Let the assistant help with repetitive tasks and smart suggestions."
                icon={SparklesIcon}
            />

            <div className="p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]">
                <div className="flex items-center justify-between">
                    <div className="flex-grow">
                        <label className="font-medium text-[var(--app-text-secondary)]">Enable Automation</label>
                        <p className="text-[12px] text-[var(--app-muted)] mt-1">
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
                    <div className="p-3 bg-[var(--app-accent-soft)] border border-[var(--app-accent-line)] rounded-lg flex gap-3">
                        <CpuChipIcon tone="accent" className="w-6 h-6 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <p className="text-sm text-[var(--app-accent-text)] font-medium">Automation Active</p>
                            <p className="text-xs text-[var(--app-accent-text)] mt-1">
                                The assistant will process notes in the background. You can create automation rules in the
                                <span className="text-[var(--app-accent-text)] underline">Actions</span> view.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--app-line)]">
                        <div className="flex-grow">
                            <label className="font-medium text-[var(--app-text-secondary)]">Advanced Settings</label>
                            <p className="text-[12px] text-[var(--app-muted)] mt-1">
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
                        <div className="space-y-4 pt-4 border-t border-[var(--app-line)]">
                            <div className="p-3 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]">
                                <h4 className="font-medium text-[var(--app-text)] mb-2 flex items-center gap-2">
                                    <InformationCircleIcon tone="accent" className="w-4 h-4"/>
                                    Agent Connection
                                </h4>
                                <p className="text-[12px] text-[var(--app-muted)] mb-3">
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
                                <p className="text-[12px] text-[var(--app-muted)] mb-3">
                                    Create <code className="text-[var(--app-accent-text)]">if/then</code> rules that run automatically on your notes.
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
                    <p className="text-[12px] text-[var(--app-muted)]">
                        Enable automation to unlock smart features like auto-tagging, match suggestions, and conditional rules.
                    </p>
                </div>
            )}
        </div>
    );
}