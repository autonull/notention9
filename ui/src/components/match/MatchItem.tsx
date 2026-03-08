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
    const { note, result } = match;
    const score = Math.round(result.score * 100);

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-blue-400';
        return 'text-yellow-400';
    };

    // Attempt to extract meaningful text if no title
    const extractSummary = (content: string) => {
        let clean = content.replace(/<[^>]+>/g, ' ').replace(/\[[^\]]+\]/g, ' ').trim();
        if (!clean) return "No text content";
        return clean.length > 150 ? clean.substring(0, 150) + '...' : clean;
    };

    const summary = note.title || extractSummary(note.content);

    // Build the "Matched:" text evidence
    const matchedKeys = result.matches.map(m => m.requestProp.key).join(' ✓ ');
    const evidenceText = result.matches.length > 0 ? `Matched: ${matchedKeys} ✓` : 'Matched: General semantic overlap';

    // Highlight key properties to show under the name (like spec: 💼 React Dev • 📍 Austin • 💰 $5k/mo)
    const highlightProps = note.properties?.slice(0, 3) || [];

    // Icon mapping by key prefix (from spec)
    const getSpecIcon = (key: string) => {
        const k = key.toLowerCase();
        if (/^(role|job|skill|title)/.test(k)) return '💼';
        if (/^(budget|price|salary|cost)/.test(k)) return '💰';
        if (/^(location|city|country|remote)/.test(k)) return '📍';
        if (/^(deadline|date|when|start)/.test(k)) return '📅';
        if (/^(experience|years|seniority)/.test(k)) return '⏱';
        return '';
    };

    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col p-4 rounded-xl border border-gray-700/60 bg-gray-800/80 shadow-sm hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 cursor-pointer mb-4"
        >
            {/* Header: Name, Score, Privacy */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-200 text-base flex items-center gap-2">
                                <span className="text-gray-400 text-lg">👤</span>
                                {isLocal ? 'Local Note' : (note.author ? `Network Peer (${note.author.slice(0, 8)})` : 'Anonymous Peer')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${getScoreColor(score)} flex items-center gap-1`}>
                        ⭐ {score}%
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-900/50 px-2 py-1 rounded border border-gray-700/50">
                        {isLocal ? '🔒' : '🌐'}
                    </span>
                </div>
            </div>

            {/* Key Properties Highlight */}
            {highlightProps.length > 0 && (
                <div className="text-sm text-gray-400 mb-3 flex items-center flex-wrap gap-2">
                    {highlightProps.map((p, i) => {
                        const icon = getSpecIcon(p.key);
                        return (
                            <span key={i} className="flex items-center">
                                {icon && <span className="mr-1">{icon}</span>}
                                {p.values[0]}
                                {i < highlightProps.length - 1 && <span className="mx-2 text-gray-600">•</span>}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Note Content Summary */}
            <div className="text-sm text-gray-300 mb-3 italic px-1 line-clamp-2 leading-relaxed opacity-80 border-l-2 border-gray-700 pl-3 ml-1">
                "{summary}"
            </div>

            {/* Semantic Matches Evidence */}
            <div className="text-xs text-blue-400/80 font-medium mb-4 flex items-center gap-1">
                {evidenceText}
            </div>

            {/* Actions */}
            <div className="mt-1 flex justify-start gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="text-xs text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors border border-gray-600/50"
                >
                    [View Note]
                </button>
                {!isLocal && note.author && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onChat ? onChat() : onConnect?.(); }}
                        className="text-xs text-blue-300 hover:text-white bg-blue-900/30 hover:bg-blue-800 px-3 py-1.5 rounded transition-colors border border-blue-800/50"
                    >
                        [Start Chat]
                    </button>
                )}
            </div>
        </div>
    );
};
