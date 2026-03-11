import React from 'react';
import { ScoredMatch } from '@notention/core';
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

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex flex-col gap-2 p-3 rounded-lg border border-gray-800 bg-gray-900/50
                hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-200
                ${isLocal ? 'cursor-pointer' : ''}
            `}
        >
            {/* Header: Score, Direction, Author */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                            {score}% Match
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

                {note.author && !isLocal && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">
                        <NetworkIcon className="w-3 h-3 text-gray-600" />
                        {note.author.slice(0, 8)}...
                    </div>
                )}
            </div>

            {/* Content Preview */}
            <div className="pl-2 border-l-2 border-gray-800 group-hover:border-gray-600 transition-colors">
                <p className="text-xs text-gray-300 line-clamp-2 font-medium">
                    {note.title || note.content}
                </p>
                {!note.title && note.content.length > 100 && (
                     <span className="text-[10px] text-gray-500 italic">...more</span>
                )}
            </div>

            {/* Semantic Matches (Badges) */}
            <div className="flex flex-wrap gap-1.5 mt-1">
                {result.matches.map((m, i) => {
                    const type = m.details?.type || 'unknown';
                    const details = m.details;

                    let badgeClass = 'bg-gray-800 text-gray-400 border-gray-700';
                    let icon = null;
                    let text = m.reason;

                    switch (type) {
                        case 'alias':
                            badgeClass = 'bg-purple-900/20 text-purple-300 border-purple-900/30';
                            icon = <TagIcon className="w-3 h-3" />;
                            text = `Alias: ${details?.aliasUsed} ≈ ${m.requestProp.key}`;
                            break;
                        case 'fuzzy':
                            badgeClass = 'bg-orange-900/20 text-orange-300 border-orange-900/30';
                            icon = <SparklesIcon className="w-3 h-3" />;
                            text = `~ ${m.offerProp.values[0]}`;
                            break;
                        case 'range':
                            badgeClass = 'bg-blue-900/20 text-blue-300 border-blue-900/30';
                            if (details?.valueMatch === 'in') {
                                text = `In range: ${m.offerProp.values[0]}`;
                            } else if (details?.valueMatch === 'out') {
                                badgeClass = 'bg-red-900/20 text-red-300 border-red-900/30';
                                text = `Out of range: ${m.offerProp.values[0]}`;
                            }
                            break;
                        case 'geo':
                            badgeClass = 'bg-teal-900/20 text-teal-300 border-teal-900/30';
                            break;
                        case 'date':
                            badgeClass = 'bg-cyan-900/20 text-cyan-300 border-cyan-900/30';
                            icon = <ClockIcon className="w-3 h-3" />;
                            // Simplify date text if possible, else use reason
                            break;
                        case 'partial':
                            badgeClass = 'bg-yellow-900/20 text-yellow-300 border-yellow-900/30';
                            icon = <ExclamationTriangleIcon className="w-3 h-3" />;
                            break;
                        case 'exact':
                            badgeClass = 'bg-green-900/20 text-green-300 border-green-900/30';
                            icon = <CheckCircleIcon className="w-3 h-3" />;
                            text = `${m.requestProp.key}: ${m.offerProp.values[0]}`;
                            break;
                    }

                    return (
                        <span
                            key={`match-${i}`}
                            className={`
                                text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1
                                ${badgeClass}
                            `}
                            title={m.reason}
                        >
                            {icon}
                            {text}
                        </span>
                    );
                })}

                {/* Conflicts */}
                {result.conflicts?.map((m, i) => (
                    <span
                        key={`conflict-${i}`}
                        className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 bg-red-900/20 text-red-300 border-red-900/30"
                        title={m.reason}
                    >
                        <XMarkIcon className="w-3 h-3" />
                        {m.reason}
                    </span>
                ))}

                {/* Missing */}
                {result.missing?.map((p, i) => (
                    <span
                        key={`missing-${i}`}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-dashed flex items-center gap-1 bg-gray-800/30 text-gray-500 border-gray-700"
                        title={`Missing property: ${p.key}`}
                    >
                        <QuestionMarkCircleIcon className="w-3 h-3" />
                        Missing: {p.key}
                    </span>
                ))}
            </div>

            {/* Actions (Network Only) */}
            {!isLocal && note.author && (
                <div className="mt-2 pt-2 border-t border-gray-800 flex gap-2">
                    {isContact ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onChat?.(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded transition-colors border border-gray-700"
                        >
                            <ChatIcon className="w-3 h-3" />
                            Chat
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded transition-colors shadow-sm shadow-blue-900/20"
                            title="Add to Contacts"
                        >
                            <UserPlusIcon className="w-3 h-3" />
                            Connect
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
