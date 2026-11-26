import { useState } from 'react';
import { useHelp, useHelpAnalytics } from '@/hooks';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  PlayCircleIcon, ClockIcon, TagIcon, StarIcon, 
  ThumbsUpIcon, ThumbsDownIcon, MessageSquareIcon,
  ExternalLinkIcon, CheckCircleIcon
} from '../ui/icons';
import type { HelpTopic, HelpProgress } from '@notention/core/help';

export interface HelpTopicCardProps {
  topic: HelpTopic | undefined;
  className?: string;
}

export function HelpTopicCard({ topic, className }: HelpTopicCardProps) {
  const { getProgress, setRating, setFeedback, recordEvent } = useHelp();
  const { trackVideoPlay, trackVideoComplete, trackFeedback } = useHelpAnalytics();
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRatingState] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const progress = topic ? getProgress(topic.id) : undefined;
  const isCompleted = progress?.completedAt;
  const isInProgress = progress?.startedAt && !progress?.completedAt;
  const currentStep = progress ? topic?.steps[progress.currentStepIndex] : topic?.steps[0];

  if (!topic) {
    return (
      <div className={cn('help-topic-card', className)}>
        <div className="text-center py-12 text-[var(--app-muted)]">
          <p>Select a topic from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  const handleRating = (value: number) => {
    setRatingState(value);
    setRating(topic.id, value);
    trackFeedback(topic.id, value);
    recordEvent({ type: 'feedback_submit', topicId: topic.id, metadata: { rating: value } });
  };

  const handleFeedbackSubmit = () => {
    if (feedbackText.trim()) {
      setFeedback(topic.id, feedbackText);
      recordEvent({ type: 'feedback_submit', topicId: topic.id, metadata: { comment: feedbackText } });
      setFeedbackText('');
      setShowFeedback(false);
    }
  };

  const handleVideoPlay = () => {
    if (topic.videoId) {
      trackVideoPlay(topic.id, topic.videoId);
      recordEvent({ type: 'video_play', topicId: topic.id, metadata: { videoId: topic.videoId } });
    }
  };

  const handleVideoComplete = () => {
    if (topic.videoId) {
      trackVideoComplete(topic.id, topic.videoId);
      recordEvent({ type: 'video_complete', topicId: topic.id, metadata: { videoId: topic.videoId } });
    }
  };

  const difficultyColors = {
    beginner: 'bg-[var(--color-success)] text-[var(--color-success-text)]',
    intermediate: 'bg-[var(--color-warning)] text-[var(--color-warning-text)]',
    advanced: 'bg-[var(--color-error)] text-[var(--color-error-text)]',
  };

  return (
    <div className={cn('help-topic-card space-y-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--app-text)]">{topic.title}</h1>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', difficultyColors[topic.difficulty])}>
          {topic.difficulty}
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-success)] text-[var(--color-success-text)]">
            <CheckCircleIcon className="w-3 h-3" /> Completed
          </span>
        )}
        {isInProgress && !isCompleted && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-warning)] text-[var(--color-warning-text)]">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" /> In Progress
          </span>
        )}
      </div>

      <p className="text-[var(--app-text-secondary)] text-lg leading-relaxed">{topic.description}</p>

      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--app-muted)]">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-4 h-4" />
          ~{topic.estimatedTimeMinutes} min
        </span>
        {topic.tags.length > 0 && (
          <span className="flex items-center gap-1">
            <TagIcon className="w-4 h-4" />
            {topic.tags.slice(0, 3).join(', ')}{topic.tags.length > 3 && ` +${topic.tags.length - 3}`}
          </span>
        )}
      </div>

      {topic.videoId && (
        <div className="relative aspect-video rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleVideoPlay}
              className="bg-white/10 backdrop-blur-sm"
              data-testid="topic-video-play"
            >
              <PlayCircleIcon className="w-12 h-12 text-white" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm font-medium">Watch Video Tutorial</p>
            <p className="text-white/70 text-xs">Click to play</p>
          </div>
        </div>
      )}

      {topic.interactiveDemo && (
        <div className="p-4 rounded-lg bg-[var(--app-accent-soft)] border border-[var(--app-accent)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--app-accent)] font-medium">Interactive Demo Available</span>
          </div>
          <p className="text-sm text-[var(--app-text-secondary)] mb-3">
            {topic.interactiveDemo.instructions[0] || 'Try this feature hands-on in a safe sandbox environment.'}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => recordEvent({ type: 'demo_start', topicId: topic.id, metadata: { demoId: topic.interactiveDemo?.component } })}
            data-testid="topic-demo-start"
          >
            Start Interactive Demo
          </Button>
        </div>
      )}

      <div className="pt-4 border-t border-[var(--app-line)]">
        <h3 className="text-sm font-medium text-[var(--app-text)] mb-3">Steps</h3>
        <ol className="space-y-2">
          {topic.steps.map((step, index) => {
            const isCurrentStep = progress && progress.currentStepIndex === index && !progress.completedAt;
            const isCompleted = progress && progress.completedSteps.includes(step.id);
            
            return (
              <li 
                key={step.id}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  isCurrentStep && 'text-[var(--app-accent)] font-medium',
                  isCompleted && !isCurrentStep && 'text-[var(--app-muted)]'
                )}
                data-testid={`topic-step-${step.id}`}
              >
                <span className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                  isCompleted ? 'bg-[var(--color-success)] text-[var(--color-success-text)]' :
                  isCurrentStep ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' :
                  'bg-[var(--app-raised)] text-[var(--app-text-secondary)]'
                )}>
                  {isCompleted ? <CheckCircleIcon className="w-3 h-3" /> : index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-[var(--app-text-secondary)]">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {topic.relatedTopics.length > 0 && (
        <div className="pt-4 border-t border-[var(--app-line)]">
          <h3 className="text-sm font-medium text-[var(--app-text)] mb-2">Related Topics</h3>
          <div className="flex flex-wrap gap-2">
            {topic.relatedTopics.slice(0, 5).map(relatedId => {
              const related = topic.relatedTopics.includes(relatedId) ? 
                { id: relatedId, title: relatedId } : // fallback
                { id: relatedId, title: relatedId }; // simplified
              return (
                <Button
                  key={relatedId}
                  variant="ghost"
                  size="sm"
                  onClick={() => recordEvent({ type: 'topic_start', topicId: relatedId })}
                  data-testid={`related-topic-${relatedId}`}
                >
                  {relatedId}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[var(--app-line)]">
        {!showFeedback && progress?.rating ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--app-text-secondary)]">Your rating:</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(star => (
                  <StarIcon 
                    key={star} 
                    className={cn('w-5 h-5 cursor-pointer', star <= (progress?.rating ?? 0) ? 'text-yellow-400 fill-current' : 'text-[var(--app-muted)]')} 
                  />
                ))}
              </div>
            </div>
            {progress?.feedback && (
              <p className="text-sm text-[var(--app-muted)]">"Thanks for your feedback!"</p>
            )}
          </div>
        ) : !showFeedback ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--app-text-secondary)]">Was this topic helpful?</p>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={cn('p-1 rounded transition-colors', rating === star ? 'text-yellow-400' : 'text-[var(--app-muted)] hover:text-yellow-300')}
                  aria-label={`Rate ${star} stars`}
                  data-testid={`rating-star-${star}`}
                >
                  <StarIcon className={cn('w-6 h-6', rating && rating >= star ? 'fill-current' : '')} />
                </button>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowFeedback(true)}
              className="text-sm"
            >
              <MessageSquareIcon className="w-4 h-4 mr-1" />
              Add comment
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Your feedback helps us improve..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm resize-none"
              data-testid="feedback-textarea"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleFeedbackSubmit} data-testid="feedback-submit">Submit</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFeedback(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}