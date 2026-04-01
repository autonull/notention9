import React from 'react';
import { CheckCircleIcon, InformationCircleIcon, LinkIcon, PlusIcon } from './common/icons';
import { Suggestion } from '../hooks/useNoteAnalysis';
import { FeedbackWidget } from './common/FeedbackWidget';
import { agentService } from '../services/AgentService';
import { useToast } from '../hooks/useToast';

interface SuggestionItemProps {
    suggestion: Suggestion;
    isActive: boolean;
    onApply: () => void;
    onMouseEnter: () => void;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, isActive, onApply, onMouseEnter }) => {
    const { addToast } = useToast();

    const getIconForType = (type: string) => {
        switch (type) {
            case 'property':
                return <PlusIcon className="w-4 h-4 text-green-400"/>;
            case 'link':
                return <LinkIcon className="w-4 h-4 text-blue-400"/>;
            default:
                return <InformationCircleIcon className="w-4 h-4 text-purple-400"/>;
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
                context: {details: val, text: suggestion.text},
                timestamp: Date.now()
            }
        });
        // FeedbackWidget handles the 'Thanks' state, but we could toast if needed
    };

    return (
        <div
            className={`w-full relative group flex items-start gap-2.5 p-2 rounded-lg transition-all border border-transparent cursor-pointer
                ${isActive ? 'bg-gray-700 border-gray-600' : 'hover:bg-gray-700/50 hover:border-gray-600'}
              `}
            onClick={onApply}
            onMouseEnter={onMouseEnter}
        >
            <div className="mt-0.5 flex-shrink-0">
                {getIconForType(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0 pr-8"> {/* Extra padding right for feedback */}
                <p className="text-sm text-gray-200 group-hover:text-white truncate">
                    {suggestion.text}
                </p>
                {suggestion.confidence && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-1 w-12 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500/50"
                                style={{width: `${suggestion.confidence * 100}%`}}
                            />
                        </div>
                        <span className="text-[10px] text-gray-500">
                            {Math.round(suggestion.confidence * 100)}% match
                        </span>
                    </div>
                )}
            </div>

            {/* Action Icon (Apply) */}
            <div className={`absolute right-2 top-2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                 <CheckCircleIcon className="w-4 h-4 text-gray-400 hover:text-green-400"/>
            </div>

            {/* Feedback Widget (Bottom Right, visible on hover) */}
            <div className={`absolute right-2 bottom-1 transition-opacity ${isActive || 'group-hover:opacity-100'} opacity-0`}>
                <FeedbackWidget
                    entityId={suggestion.id}
                    entityType="suggestion"
                    onFeedback={handleFeedback}
                    className="bg-gray-800 rounded-full shadow-sm scale-75 origin-bottom-right"
                />
            </div>
        </div>
    );
};
