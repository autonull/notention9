import { useState, useCallback } from 'react';
import { useHelp, useHelpAnalytics } from '@/hooks';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  ThumbsUpIcon, ThumbsDownIcon, MessageSquareIcon, 
  SendIcon, XIcon, StarIcon
} from '../ui/icons';
import type { HelpTopic } from '@notention/core/help';

export interface HelpFeedbackProps {
  topic?: HelpTopic;
  className?: string;
  standalone?: boolean;
}

export function HelpFeedback({ topic, className, standalone = false }: HelpFeedbackProps) {
  const { getProgress, setRating, setFeedback, recordEvent } = useHelp();
  const { trackFeedback } = useHelpAnalytics();
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRatingState] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const progress = topic ? getProgress(topic.id) : undefined;
  const existingRating = progress?.rating;

  const handleRating = useCallback((value: number) => {
    if (!topic) return;
    setRatingState(value);
    setRating(topic.id, value);
    trackFeedback(topic.id, value);
    recordEvent({ type: 'feedback_submit', topicId: topic.id, metadata: { rating: value } });
  }, [topic, setRating, trackFeedback, recordEvent]);

  const handleSubmit = useCallback(() => {
    if (!topic) return;
    if (feedbackText.trim()) {
      setFeedback(topic.id, feedbackText);
      recordEvent({ type: 'feedback_submit', topicId: topic.id, metadata: { comment: feedbackText } });
    }
    setSubmitted(true);
    setShowFeedback(false);
    setFeedbackText('');
  }, [topic, setFeedback, recordEvent]);

  const handleCancel = useCallback(() => {
    setShowFeedback(false);
    setFeedbackText('');
    setRatingState(null);
  }, []);

  if (!topic && !standalone) {
    return null;
  }

  if (standalone && !topic) {
    return (
      <div className={cn('help-feedback', className)}>
        <p className="text-sm text-[var(--app-muted)]">Select a topic to leave feedback</p>
      </div>
    );
  }

  if (!topic) return null;

  const hasFeedback = existingRating || progress?.feedback;

  if (hasFeedback && !showFeedback && !submitted) {
    return (
      <div className={cn('help-feedback', className)}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Your rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <StarIcon 
                  key={star} 
                  className={cn(
                    'w-5 h-5 cursor-pointer transition-colors',
                    star <= (existingRating ?? 0) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-[var(--app-muted)] hover:text-yellow-300'
                  )} 
                />
              ))}
            </div>
          </div>
          {progress?.feedback && (
            <div className="p-3 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
              <p className="text-sm text-[var(--app-text-secondary)]">"{progress.feedback}"</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowFeedback(true)} data-testid="feedback-edit">
              <MessageSquareIcon className="w-4 h-4 mr-1" />
              Edit feedback
            </Button>
            {existingRating && (
              <Button variant="ghost" size="sm" onClick={() => { if (topic) setRating(topic.id, 0); }} data-testid="feedback-clear">
                Clear rating
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('help-feedback', className)}>
      {!showFeedback && !submitted && !hasFeedback ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--app-text-secondary)]">Was this topic helpful?</p>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Rate this topic">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                role="radio"
                aria-checked={rating === star}
                onClick={() => handleRating(star)}
                className={cn(
                  'p-1 rounded transition-colors',
                  rating === star ? 'text-yellow-400' : 'text-[var(--app-muted)] hover:text-yellow-300'
                )}
                aria-label={`Rate ${star} stars`}
                data-testid={`feedback-rating-${star}`}
              >
                <StarIcon className={cn('w-6 h-6', rating && rating >= star ? 'fill-current' : '')} />
              </button>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowFeedback(true)}
            data-testid="feedback-add-comment"
          >
            <MessageSquareIcon className="w-4 h-4 mr-1" />
            Add comment
          </Button>
        </div>
      ) : showFeedback ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Your rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    rating === star ? 'text-yellow-400' : 'text-[var(--app-muted)] hover:text-yellow-300'
                  )}
                  aria-label={`Rate ${star} stars`}
                  data-testid={`feedback-rating-input-${star}`}
                >
                  <StarIcon className={cn('w-6 h-6', rating && rating >= star ? 'fill-current' : '')} />
                </button>
              ))}
            </div>
          </div>
          
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Your feedback helps us improve... (optional)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm resize-none"
            data-testid="feedback-textarea"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit}
              disabled={!rating && !feedbackText.trim()}
              data-testid="feedback-submit"
            >
              <SendIcon className="w-4 h-4 mr-1" />
              Submit
            </Button>
            <Button variant="ghost" onClick={handleCancel} data-testid="feedback-cancel">
              Cancel
            </Button>
          </div>
        </div>
      ) : submitted ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--color-success)]">
            <div className="w-6 h-6 rounded-full bg-[var(--color-success)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-success-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">Thanks for your feedback!</span>
          </div>
          <p className="text-sm text-[var(--app-text-secondary)]">Your input helps us improve the help system.</p>
          <Button variant="ghost" size="sm" onClick={() => { setSubmitted(false); setShowFeedback(false); }} data-testid="feedback-done">
            Done
          </Button>
        </div>
      ) : (
        null
      )}
    </div>
  );
}