import React from 'react';
import { CheckCircleIcon, InformationCircleIcon, LinkIcon, PlusIcon } from './common/icons';
import { Suggestion } from '../hooks/index';
import { FeedbackWidget } from './common/FeedbackWidget';
import { agentService } from '../services/AgentService';

interface SuggestionItemProps {
    suggestion: Suggestion;
    isActive: boolean;
    onApply: () => void;
    onMouseEnter: () => void;
}

export function SuggestionItem({ suggestion, isActive, onApply, onMouseEnter }: SuggestionItemProps) {

    const getIconForType = (type: string) => {
        switch (type) {
            case 'property':
                return <PlusIcon className="w-5 h-5 text-green-400" />;
            case 'link':
                return <LinkIcon className="w-5 h-5 text-blue-400" />;
            default:
                return <InformationCircleIcon className="w-5 h-5 text-purple-400" />;
        }
    };

    const handleFeedback = (type: 'positive' | 'negative' | 'comment', val: string) => {
        agentService.send({
            type: 'feedback',
            payload: {
                id: crypto.randomUUID(),
                entityId: suggestion.id,
                entityType: 'suggestion',
                value: type === 'positive' ? 1 : -1,
                context: { details: val, text: suggestion.text },
                timestamp: Date.now()
            }
        });
        // FeedbackWidget handles the 'Thanks' state
    };

    return (
        <div
            className={`
                w-full relative group flex items-start gap-3 p-3 rounded-lg transition-all duration-200 border cursor-pointer select-none
                ${isActive
                    ? 'bg-gray-800 border-gray-600 shadow-md transform scale-[1.01]'
                    : 'bg-transparent border-transparent hover:bg-gray-800/50 hover:border-gray-700 hover:shadow-sm'
                }
            `}
            onClick={onApply}
            onMouseEnter={onMouseEnter}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
        >
            <div className="mt-0.5 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {getIconForType(suggestion.type)}
            </div>

            <div className="flex-1 min-w-0 pr-8">
                <p className={`text-sm font-medium truncate transition-colors ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                    {suggestion.text}
                </p>

                {suggestion.confidence && (
                    <div className="flex items-center gap-2 mt-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${suggestion.confidence > 0.8 ? 'bg-green-500' : suggestion.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${suggestion.confidence * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">
                            {Math.round(suggestion.confidence * 100)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Apply Action Indicator */}
            <div className={`
                absolute right-3 top-3 transition-all duration-200
                ${isActive
                    ? 'opacity-100 text-green-400 translate-x-0'
                    : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 group-hover:text-gray-400'
                }
            `}>
                 <CheckCircleIcon className="w-5 h-5 hover:text-green-400 hover:scale-110 transition-transform" />
            </div>

            {/* Feedback Widget */}
            <div
                className={`absolute right-2 bottom-2 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} translate-y-2 group-hover:translate-y-0`}
                onClick={(e) => e.stopPropagation()}
            >
                <FeedbackWidget
                    entityId={suggestion.id}
                    entityType="suggestion"
                    onFeedback={handleFeedback}
                    className="bg-gray-900/80 backdrop-blur rounded-full shadow-sm scale-90 border border-gray-700"
                />
            </div>
        </div>
    );
}
