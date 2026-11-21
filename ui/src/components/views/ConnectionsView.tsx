import React, {useState} from 'react';
import {useView} from '../../hooks/useViewContext';
import {NetworkView} from './NetworkView';
import {ChatView} from './ChatView';
import {ResponsesView} from './ResponsesView';
import {MatchesView} from './MatchesView';

const CONNECTIONS_TABS = [
    {id: 'feed', label: 'Feed', icon: '📡'},
    {id: 'matches', label: 'Matches', icon: '🎯'},
    {id: 'replies', label: 'Replies', icon: '💬'},
    {id: 'chat', label: 'Chat', icon: '💭'},
] as const;

export function ConnectionsView() {
    const {activeView, setActiveView, setSelectedNoteId} = useView();
    const [currentTab, setCurrentTab] = useState<'feed' | 'matches' | 'replies' | 'chat'>('feed');

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-4">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold">Connections</h1>
                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-700/50" role="tablist" aria-label="Connections tabs">
                            {CONNECTIONS_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={currentTab === tab.id}
                                    onClick={() => setCurrentTab(tab.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        currentTab === tab.id
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="space-y-2">
                    {currentTab === 'feed' && <NetworkView />}
                    {currentTab === 'matches' && <MatchesView />}
                    {currentTab === 'replies' && <ResponsesView />}
                    {currentTab === 'chat' && <ChatView />}
                </div>
            </div>
        </div>
    );
}