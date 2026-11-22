import React, {useState} from 'react';
import {AgentStatus} from '../agent/AgentStatus';
import {agentService} from '../../services/AgentService';
import {Toggle} from '../ui/Primitives';
import {Input} from '../ui/Input';
import {Button} from '../ui/Button';

export function AgentTab() {
    const [enabled, setEnabled] = useState(agentService.isEnabled());
    const [url, setUrl] = useState(agentService.getEndpoint() || '');

    const handleToggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        agentService.setEnabled(newState);
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
    };

    const handleSaveUrl = () => {
        agentService.setEndpoint(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium text-[var(--app-text)]">Agent Settings</h3>
                <p className="text-sm text-[var(--app-muted)]">
                    Configure your connection to the Agent.
                </p>
            </div>

            <div className="bg-[var(--app-raised)] p-4 rounded-lg border border-[var(--app-line)] space-y-4">
                <Toggle
                    label="Enable Agent Connection"
                    checked={enabled}
                    onChange={handleToggle}
                />

                {enabled && (
                    <div className="flex gap-2 items-end">
                        <Input
                            label="Agent URL"
                            value={url}
                            onChange={handleUrlChange}
                            placeholder="ws://localhost:3000"
                            className="flex-1"
                        />
                        <Button onClick={handleSaveUrl} variant="secondary">
                            Update
                        </Button>
                    </div>
                )}
            </div>

            {enabled && (
                <>
                    <h3 className="text-lg font-medium text-[var(--app-text)] pt-4">Agent Status</h3>
                    <AgentStatus/>
                </>
            )}

            <div className="bg-[var(--app-surface)]/30 p-4 rounded-lg border border-[var(--app-line)]/30">
                <h4 className="text-sm font-semibold text-[var(--app-text-secondary)] mb-2">About Agent</h4>
                <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                    Agent is the intelligent backend for Notention. It handles semantic processing,
                    skill execution, and memory management. The agent runs locally or on a private server,
                    ensuring your data remains under your control.
                </p>
            </div>
        </div>
    );
}
