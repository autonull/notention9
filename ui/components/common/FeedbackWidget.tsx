import React, { useState } from 'react';
import { ThumbsUpIcon, ThumbsDownIcon, MessageIcon } from './icons';
import { IconButton } from './IconButton';
import { InputModal } from './InputModal';

interface FeedbackWidgetProps {
  entityId: string;
  entityType?: string;
  onFeedback?: (type: 'positive' | 'negative' | 'comment', value: string) => void;
  className?: string;
}

export function FeedbackWidget({ entityId, entityType = 'note', onFeedback, className = '' }: FeedbackWidgetProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedbackGiven(type);
    if (onFeedback) {
      onFeedback(type, '');
    }
  };

  const handleComment = (comment: string) => {
    if (onFeedback) {
      onFeedback('comment', comment);
    }
    setShowCommentModal(false);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <IconButton
        icon={ThumbsUpIcon}
        variant={feedbackGiven === 'positive' ? 'success' : 'ghost'}
        size="xs"
        onClick={() => handleFeedback('positive')}
        title="Helpful"
        className={feedbackGiven === 'positive' ? 'bg-green-900/30' : ''}
      />
      <IconButton
        icon={ThumbsDownIcon}
        variant={feedbackGiven === 'negative' ? 'danger' : 'ghost'}
        size="xs"
        onClick={() => handleFeedback('negative')}
        title="Not helpful"
        className={feedbackGiven === 'negative' ? 'bg-red-900/30' : ''}
      />
      <IconButton
        icon={MessageIcon}
        variant="ghost"
        size="xs"
        onClick={() => setShowCommentModal(true)}
        title="Provide details"
      />

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
