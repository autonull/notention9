import { SparklesIcon } from '../ui/icons';
import {Badge} from '../ui/Badge';
import { Tabs } from '../ui/Primitives';
import { ScoredMatch } from '@notention/core';
import { Suggestion } from '@notention/core';

interface AssistantHeaderProps {
    suggestions: Suggestion[];
    localMatches: ScoredMatch[];
    networkMatches: ScoredMatch[];
    propertiesCount: number;
    isOpen: boolean;
    onToggleOpen: (e?: React.MouseEvent) => void;
    activeTab: string;
    onChangeTab: (id: string) => void;
}

export function AssistantHeader({
    suggestions,
    localMatches,
    networkMatches,
    propertiesCount,
    isOpen,
    onToggleOpen,
    activeTab,
    onChangeTab
}: AssistantHeaderProps) {
    return (
        <>
            <div
                className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={onToggleOpen}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className={`w-4 h-4 ${suggestions.length > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`}/>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Assistant
                    </span>
                </div>
                <div className="flex gap-1 data-assistant-badges">
                    {suggestions.length > 0 && (
                        <Badge variant="warning" size="sm" pill>{suggestions.length}</Badge>
                    )}
                    {localMatches.length > 0 && (
                        <Badge variant="primary" size="sm" pill>{localMatches.length}</Badge>
                    )}
                    {networkMatches.length > 0 && (
                        <Badge variant="success" size="sm" pill>{networkMatches.length}</Badge>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="p-2 border-b border-gray-800 bg-gray-900/50">
                    <Tabs
                        activeTab={activeTab}
                        onChange={(id) => onChangeTab(id)}
                        tabs={[
                            { id: 'properties', label: 'Props', count: propertiesCount },
                            { id: 'suggestions', label: 'AI', count: suggestions.length },
                            { id: 'local', label: 'Local', count: localMatches.length },
                            { id: 'network', label: 'Net', count: networkMatches.length }
                        ]}
                        className="w-full justify-between"
                    />
                </div>
            )}
        </>
    );
}