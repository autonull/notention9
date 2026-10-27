import {Button} from '../ui/Button';
import { SearchSparkleIcon } from '../ui/icons';
import { DiscoveredProperties } from '../network/DiscoveredProperties';
import { MatchList } from '../match/MatchList';
import { OntologyNode, ScoredMatch, Contact, Note } from '@notention/core';

interface NetworkMatchesPanelProps {
    networkMatches: ScoredMatch[];
    isSearching: boolean;
    note: Note;
    settingsOntology: OntologyNode[];
    contacts: Contact[];
    onFindMatches: (e?: React.MouseEvent) => Promise<void>;
    onConnect: (match: ScoredMatch) => Promise<void>;
    onChat: (author: string) => void;
    onAddDiscovered: (key: string, type: string) => void;
    onLinkDiscovered: (key: string, type: string) => void;
}

export function NetworkMatchesPanel({
    networkMatches,
    isSearching,
    note,
    settingsOntology,
    contacts,
    onFindMatches,
    onConnect,
    onChat,
    onAddDiscovered,
    onLinkDiscovered
}: NetworkMatchesPanelProps) {
    if (networkMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-gray-500 mb-3">
                    {isSearching ? 'Searching...' : 'Find matches in P2P network.'}
                </p>
                <button
                    onClick={onFindMatches}
                    disabled={isSearching || note.properties.length === 0}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-full justify-center
                        ${isSearching
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'}
                    `}
                >
                    <SearchSparkleIcon className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`}/>
                    {isSearching ? 'Searching...' : 'Find Matches'}
                </button>
                {note.properties.length === 0 && (
                    <p className="text-[10px] text-red-400 mt-2">
                        Add properties to find matches.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <DiscoveredProperties
                networkMatches={networkMatches}
                ontology={settingsOntology}
                onAdd={onAddDiscovered}
                onLink={onLinkDiscovered}
            />

            <div className="flex justify-end px-1">
                <button
                    onClick={onFindMatches}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    disabled={isSearching}
                >
                    <SearchSparkleIcon className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`}/>
                    Refresh
                </button>
            </div>
            <MatchList
                matches={networkMatches}
                isLocal={false}
                contacts={contacts}
                onConnect={onConnect}
                onChat={onChat}
            />
        </div>
    );
}