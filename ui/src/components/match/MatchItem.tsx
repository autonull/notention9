import React from 'react';
import { ScoredMatch, PropertyMatch } from '@notention/core';
import {
    SparklesIcon,
    TagIcon,
    NetworkIcon,
    UserPlusIcon,
    ChatIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    QuestionMarkCircleIcon
} from '../common/icons';
import { Button } from '../common/Button';

interface MatchItemProps {
    match: ScoredMatch;
    isLocal: boolean;
    isContact?: boolean;
    onClick?: () => void;
    onConnect?: () => void;
    onChat?: () => void;
}

export const MatchItem: React.FC<MatchItemProps> = ({
    match,
    isLocal,
    isContact = false,
    onClick,
    onConnect,
    onChat
}) => {
    const { note, result, direction } = match;
    const score = Math.round(result.score * 100);

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-blue-400';
        return 'text-yellow-400';
    };

    // Attempt to extract meaningful text if no title
    const extractSummary = (content: string) => {
        // Remove HTML tags and semantic properties for preview
        let clean = content.replace(/<[^>]+>/g, ' ').replace(/\[[^\]]+\]/g, ' ').trim();
        if (!clean) {
            // If it's pure semantic, just show the first few properties
            const propsMatch = content.match(/\[(.*?)\]/g);
            if (propsMatch) return propsMatch.slice(0, 3).join(' ');
            return "No text content";
        }
        return clean.length > 150 ? clean.substring(0, 150) + '...' : clean;
    };

    const summary = note.title || extractSummary(note.content);

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex flex-col p-4 rounded-xl border border-gray-700/60 bg-gray-800/80 shadow-sm
                hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 cursor-pointer mb-4
            `}
        >
            {/* Header: Avatar, Name, Score, Badges */}
            <div className="flex items-start justify-between mb-3 border-b border-gray-700/50 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-800">
                        {isLocal ? (
                            <span className="text-gray-400 font-bold text-sm">Me</span>
                        ) : (
                            <span className="text-gray-400 text-xs text-center break-all px-1 leading-none font-mono">
                                {note.author?.slice(0, 4)}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-200 text-sm">
                                {isLocal ? 'Local Note' : (note.author ? `Network Peer (${note.author.slice(0, 8)})` : 'Anonymous Peer')}
                            </span>
                            {!isLocal && (
                                <span className="bg-blue-900/30 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-medium border border-blue-800/30">
                                    P2P
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">
                            {new Date(note.updatedAt || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className={`text-lg font-bold ${getScoreColor(score)} flex items-center gap-1`}>
                        <SparklesIcon className="w-4 h-4" />
                        {score}%
                    </span>
                    {direction && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                            direction === 'outgoing'
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                                : 'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                        }`}>
                            {direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                        </span>
                    )}
                </div>
            </div>

            {/* Note Content Summary */}
            <div className="text-sm text-gray-300 mb-4 px-1 line-clamp-3 leading-relaxed">
                {summary}
            </div>

            {/* Semantic Matches Evidence */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800/50">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">Match Details</div>
                <div className="flex flex-wrap gap-2">
                    {result.matches.map((m, i) => (
                        <MatchBadge key={`match-${i}`} match={m} />
                    ))}

                    {/* Conflicts */}
                    {result.conflicts?.map((m, i) => (
                        <span
                            key={`conflict-${i}`}
                            className="text-xs px-2 py-1 rounded-md flex items-center gap-1.5 bg-red-900/20 text-red-300 border border-red-900/30 shadow-sm"
                            title={m.reason}
                        >
                            <XMarkIcon className="w-3.5 h-3.5" />
                            {m.reason}
                        </span>
                    ))}

                    {/* Missing */}
                    {result.missing?.map((p, i) => (
                        <span
                            key={`missing-${i}`}
                            className="text-xs px-2 py-1 rounded-md flex items-center gap-1.5 bg-gray-800/50 text-gray-400 border border-gray-700 border-dashed"
                            title={`Missing property: ${p.key}`}
                        >
                            <QuestionMarkCircleIcon className="w-3.5 h-3.5" />
                            Missing: {p.key}
                        </span>
                    ))}
                </div>
            </div>

            {/* Actions */}
            {!isLocal && note.author && (
                <div className="mt-4 pt-3 border-t border-gray-700/30 flex justify-end gap-3">
                    {isContact ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); onChat?.(); }}
                            icon={ChatIcon}
                            className="px-4 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors"
                        >
                            Reply via Chat
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                            icon={UserPlusIcon}
                            className="px-4 shadow-md hover:shadow-lg transition-all"
                        >
                            Connect
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

const MatchBadge: React.FC<{ match: PropertyMatch }> = ({ match }) => {
    const type = match.details?.type || 'unknown';
    const details = match.details;

    let badgeClass = 'bg-gray-800 text-gray-400 border-gray-700';
    let icon = null;
    let text = match.reason;

    switch (type) {
        case 'alias':
            badgeClass = 'bg-purple-900/20 text-purple-300 border-purple-900/30';
            icon = <TagIcon className="w-3 h-3" />;
            text = `Alias: ${details?.aliasUsed} ≈ ${match.requestProp.key}`;
            break;
        case 'fuzzy':
            badgeClass = 'bg-orange-900/20 text-orange-300 border-orange-900/30';
            icon = <SparklesIcon className="w-3 h-3" />;
            text = `~ ${match.offerProp.values[0]}`;
            break;
        case 'range':
            badgeClass = 'bg-blue-900/20 text-blue-300 border-blue-900/30';
            if (details?.valueMatch === 'in') {
                text = `In range: ${match.offerProp.values[0]}`;
            } else if (details?.valueMatch === 'out') {
                badgeClass = 'bg-red-900/20 text-red-300 border-red-900/30';
                text = `Out of range: ${match.offerProp.values[0]}`;
            }
            break;
        case 'geo':
            badgeClass = 'bg-teal-900/20 text-teal-300 border-teal-900/30';
            break;
        case 'date':
            badgeClass = 'bg-cyan-900/20 text-cyan-300 border-cyan-900/30';
            icon = <ClockIcon className="w-3 h-3" />;
            break;
        case 'partial':
            badgeClass = 'bg-yellow-900/20 text-yellow-300 border-yellow-900/30';
            icon = <ExclamationTriangleIcon className="w-3 h-3" />;
            break;
        case 'exact':
            badgeClass = 'bg-green-900/20 text-green-300 border-green-900/30';
            icon = <CheckCircleIcon className="w-3 h-3" />;
            text = `${match.requestProp.key}: ${match.offerProp.values[0]}`;
            break;
    }

    return (
        <span
            className={`
                text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1
                ${badgeClass}
            `}
            title={match.reason}
        >
            {icon}
            {text}
        </span>
    );
};
