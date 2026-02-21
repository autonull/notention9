import React, {useState} from 'react';
import {AgentStatus} from '../agent/AgentStatus';
import {agentService} from '../../services/AgentService';
import {Toggle} from '../common/Toggle';
import {Input} from '../common/Input';
import {Button} from '../common/Button';

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
                <h3 className="text-lg font-medium text-white">Agent Settings</h3>
                <p className="text-sm text-gray-400">
                    Configure your connection to the VoltAgent.
                </p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
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
                    <h3 className="text-lg font-medium text-white pt-4">Agent Status</h3>
                    <AgentStatus/>
                </>
            )}

            <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">About VoltAgent</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                    VoltAgent is the intelligent backend for Notention. It handles semantic processing,
                    skill execution, and memory management. The agent runs locally or on a private server,
                    ensuring your data remains under your control.
                </p>
            </div>
        </div>
    );
}
