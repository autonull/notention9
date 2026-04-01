import React, { useState, useMemo } from 'react';
import { useMatches } from '../../hooks/useMatches';
import { MatchCard } from '../matching/MatchCard';
import { Note, MatchEngine, Logger } from '@notention/core';
import { NetworkDiscoveryService, ScoredMatch } from '@notention/core'; // We need to export this
import { Button } from '../common/Button';
import { useSettings } from '../../hooks/useSettingsContext';

interface LocalDiscoverySidebarProps {
    note: Note | null;
    onSelectMatch: (note: Note) => void;
}

export const LocalDiscoverySidebar: React.FC<LocalDiscoverySidebarProps> = ({ note, onSelectMatch }) => {
    // Local Matches
    const localMatches = useMatches(note);

    // Network Matches
    const { settings } = useSettings();
    const [networkMatches, setNetworkMatches] = useState<ScoredMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const discoveryService = useMemo(() => {
        const engine = new MatchEngine(settings.ontology);
        return new NetworkDiscoveryService(engine);
    }, [settings.ontology]);

    const handleNetworkSearch = async () => {
        if (!note) return;
        setIsSearching(true);
        try {
            const results = await discoveryService.discoverMatches(note);
            setNetworkMatches(results);
        } catch (e) {
            Logger.getInstance().error("Network search failed", e instanceof Error ? e : new Error(String(e)));
        } finally {
            setIsSearching(false);
        }
    };

    if (!note) return null;

    return (
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-full">

            {/* Header / Tabs eventually */}
            <div className="p-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <span>Queries</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-6">

                {/* Local Section */}
                <section>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex justify-between">
                        Local Matches
                        <span className="bg-gray-800 px-1 rounded">{localMatches.length}</span>
                    </h4>
                    <div className="space-y-2">
                        {localMatches.length === 0 ? (
                            <div className="text-xs text-gray-500 py-2">No local matches.</div>
                        ) : (
                            localMatches.slice(0, 5).map(item => (
                                <MatchCard
                                    key={item.note.id}
                                    note={item.note}
                                    match={item.result}
                                    onClick={() => onSelectMatch(item.note)}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Network Section */}
                <section>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
                        Network Matches
                        <span className="bg-gray-800 px-1 rounded">{networkMatches.length}</span>
                    </h4>

                    {networkMatches.length === 0 && !isSearching && (
                        <Button
                            size="xs"
                            variant="secondary"
                            className="w-full justify-center mb-2"
                            onClick={handleNetworkSearch}
                        >
                            🔍 Search Network
                        </Button>
                    )}

                    {isSearching && (
                        <div className="text-xs text-gray-500 animate-pulse py-2">Searching relays...</div>
                    )}

                    <div className="space-y-2">
                        {networkMatches.map(item => (
                            <MatchCard
                                key={item.note.id}
                                note={item.note}
                                match={item.result}
                                onClick={() => onSelectMatch(item.note)}
                            />
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};
