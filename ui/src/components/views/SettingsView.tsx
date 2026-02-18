import React, {useState} from 'react';

import {useSettingsView} from '../../hooks/useSettingsView';
import {Tabs} from '../common/Tabs';
import {AITab} from '../settings/AITab';
import {DataTab} from '../settings/DataTab';
import {NostrTab} from '../settings/NostrTab';
import {OntologyTab} from '../settings/OntologyTab';
import {AgentTab} from '../settings/AgentTab';

export function SettingsView() {
    const {
        settings,
        setSettings,
    } = useSettingsView();

    const [activeTab, setActiveTab] = useState('ai');

    const tabs = [
        {id: 'ai', label: '🤖 AI Assistant'},
        {id: 'agent', label: '⚡ Agent Status'},
        {id: 'nostr', label: '🔑 Network & Keys'},
        {id: 'data', label: '📦 Data Management'},
        {id: 'ontology', label: '🧬 Ontology Graph'},
    ];

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-800/50 rounded-lg flex flex-col">
            <div
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Settings</h2>
                    <p className="text-gray-400 text-sm">Manage your preferences and data.</p>
                </div>
            </div>

            <div className="flex-shrink-0 mb-6 overflow-x-auto">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id)}
                    className="bg-gray-900/50 p-1 inline-flex min-w-max"
                />
            </div>

            <div className="flex-grow">
                {activeTab === 'ai' && (
                    <AITab settings={settings} setSettings={setSettings}/>
                )}
                {activeTab === 'agent' && <AgentTab/>}
                {activeTab === 'nostr' && (
                    <NostrTab settings={settings} setSettings={setSettings}/>
                )}
                {activeTab === 'data' && <DataTab/>}
                {activeTab === 'ontology' && <OntologyTab/>}
            </div>
        </div>
    );
}
