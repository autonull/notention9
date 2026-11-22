import React, {useEffect, useState} from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {cn} from '../../utils/ui';
import {NetworkView} from './NetworkView';
import {ChatView} from './ChatView';
import {ResponsesView} from './ResponsesView';
import {MatchesView} from './MatchesView';
import {ChatIcon, MessageIcon, SignalIcon, SparklesIcon} from '../ui/icons';

const CONNECTIONS_TABS = [
    {id: 'feed', label: 'Feed', icon: SignalIcon},
    {id: 'matches', label: 'Matches', icon: SparklesIcon},
    {id: 'replies', label: 'Replies', icon: MessageIcon},
    {id: 'chat', label: 'Chat', icon: ChatIcon},
] as const;

export function ConnectionsView() {
    const {activeView, matchingNoteId} = useView();
    const {notes} = useNotes();
    const matchNote = matchingNoteId ? notes.find(note => note.id === matchingNoteId) ?? null : null;
    const routeTab = activeView === 'chat' ? 'chat' : activeView === 'responses' ? 'replies' : 'feed';
    const [currentTab, setCurrentTab] = useState<'feed' | 'matches' | 'replies' | 'chat'>(routeTab);

    useEffect(() => setCurrentTab(routeTab), [routeTab]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-950 text-white p-4 md:p-6 lg:p-8">
            <div className="w-full max-w-3xl mx-auto flex flex-1 min-h-0 flex-col gap-4">
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
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        currentTab === tab.id
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" aria-hidden="true"/>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div
                    className={cn('flex-1 min-h-0', currentTab === 'matches' || currentTab === 'replies' ? 'overflow-y-auto' : 'overflow-hidden')}
                    role="tabpanel"
                    aria-label={CONNECTIONS_TABS.find(tab => tab.id === currentTab)?.label}
                >
                    {currentTab === 'feed' && <NetworkView matchAgainst={matchNote}/>}
                    {currentTab === 'matches' && <MatchesView />}
                    {currentTab === 'replies' && <ResponsesView />}
                    {currentTab === 'chat' && <ChatView />}
                </div>
            </div>
        </div>
    );
}