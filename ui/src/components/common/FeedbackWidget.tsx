import React, {useState, useEffect} from 'react';
import {MessageIcon, ThumbsDownIcon, ThumbsUpIcon} from './icons';
import {IconButton} from './IconButton';
import {InputModal} from './InputModal';

interface FeedbackWidgetProps {
    entityId: string;
    entityType?: string;
    onFeedback?: (type: 'positive' | 'negative' | 'comment', value: string) => void;
    className?: string;
}

export function FeedbackWidget({entityId, entityType = 'note', onFeedback, className = ''}: FeedbackWidgetProps) {
    const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showThanks, setShowThanks] = useState(false);

    const handleFeedback = (e: React.MouseEvent, type: 'positive' | 'negative') => {
        e.stopPropagation();
        setFeedbackGiven(type);
        if (onFeedback) {
            onFeedback(type, '');
        }
        setShowThanks(true);
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowCommentModal(true);
    };

    const handleComment = (comment: string) => {
        if (onFeedback) {
            onFeedback('comment', comment);
        }
        setShowCommentModal(false);
        setShowThanks(true);
    };

    useEffect(() => {
        if (showThanks) {
            const timer = setTimeout(() => setShowThanks(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showThanks]);

    return (
        <div className={`flex items-center gap-1 ${className}`} onClick={e => e.stopPropagation()}>
            {showThanks ? (
                <span className="text-xs text-green-400 font-medium animate-fadeIn px-2">Thanks!</span>
            ) : (
                <>
                    <IconButton
                        icon={ThumbsUpIcon}
                        variant={feedbackGiven === 'positive' ? 'success' : 'ghost'}
                        size="xs"
                        onClick={(e) => handleFeedback(e, 'positive')}
                        title="Helpful"
                        className={`transition-transform ${feedbackGiven === 'positive' ? 'scale-110 bg-green-900/30' : 'hover:scale-110'}`}
                    />
                    <IconButton
                        icon={ThumbsDownIcon}
                        variant={feedbackGiven === 'negative' ? 'danger' : 'ghost'}
                        size="xs"
                        onClick={(e) => handleFeedback(e, 'negative')}
                        title="Not helpful"
                        className={`transition-transform ${feedbackGiven === 'negative' ? 'scale-110 bg-red-900/30' : 'hover:scale-110'}`}
                    />
                    <IconButton
                        icon={MessageIcon}
                        variant="ghost"
                        size="xs"
                        onClick={handleCommentClick}
                        title="Provide details"
                        className="hover:scale-110 transition-transform"
                    />
                </>
            )}

            <InputModal
                isOpen={showCommentModal}
                onClose={() => setShowCommentModal(false)}
                onConfirm={handleComment}
                title="Provide Feedback"
                label="Details"
                placeholder="What could be improved?"
                confirmLabel="Send Feedback"
            />
        </div>
    );
}
