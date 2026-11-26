import { useMemo } from 'react';
import { useHelp } from '@/hooks';
import { cn } from '../../utils/ui';
import { CheckCircleIcon, ClockIcon, TrendingUpIcon } from '../ui/icons';
import type { HelpProgress, HelpTopic } from '@notention/core/help';

export interface HelpProgressBarProps {
  topic?: HelpTopic;
  className?: string;
  showOverall?: boolean;
  compact?: boolean;
}

export function HelpProgressBar({ 
  topic, 
  className, 
  showOverall = true, 
  compact = false 
}: HelpProgressBarProps) {
  const { getProgress, getAllProgress, completionRate, averageTimeSpent, popularTopics } = useHelp();
  
  const topicProgress = topic ? getProgress(topic.id) : undefined;
  const allProgress = getAllProgress();
  
  const topicPercent = topicProgress && topic 
    ? (topicProgress.currentStepIndex / topic.steps.length) * 100 
    : 0;
  
  const overallPercent = completionRate * 100;
  const completedTopics = allProgress.filter((p: HelpProgress) => p.completedAt).length;
  const totalTopics = allProgress.length;
  const inProgressTopics = allProgress.filter((p: HelpProgress) => p.startedAt && !p.completedAt).length;

  const formatTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  if (compact) {
    return (
      <div className={cn('help-progress-bar-compact', className)}>
        {topic && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[var(--app-line)] rounded-full overflow-hidden flex-1">
              <div 
                className="h-full bg-[var(--app-accent)] transition-all duration-300"
                style={{ width: `${topicPercent}%` }}
              />
            </div>
            <span className="text-xs text-[var(--app-muted)] w-10 text-right">
              {Math.round(topicPercent)}%
            </span>
          </div>
        )}
        {showOverall && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[var(--app-line)] rounded-full overflow-hidden flex-1">
              <div 
                className="h-full bg-[var(--color-success)] transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <span className="text-xs text-[var(--app-muted)] w-10 text-right">
              {Math.round(overallPercent)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('help-progress-bar space-y-4', className)}>
      {topic && (
        <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-[var(--app-text)]">
              {topicProgress?.completedAt ? 'Completed' : 'Topic Progress'}
            </h3>
            <span className="text-sm font-medium text-[var(--app-text)]">
              {Math.round(topicPercent)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--app-line)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--app-accent)] transition-all duration-500 ease-out"
              style={{ width: `${topicPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--app-muted)]">
            <span>Step {(topicProgress?.currentStepIndex ?? 0) + 1} of {topic.steps.length}</span>
            {topicProgress?.timeSpentMs && (
              <span><ClockIcon className="w-3 h-3 inline mr-1" /> {formatTime(topicProgress.timeSpentMs)}</span>
            )}
          </div>
          {topicProgress?.completedAt && (
            <div className="mt-3 p-3 rounded-lg bg-[var(--color-success-soft)] border border-[var(--color-success)]">
              <div className="flex items-center gap-2 text-[var(--color-success-text)]">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Topic completed!</span>
              </div>
              <p className="text-sm mt-1">Completed on {new Date(topicProgress.completedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      {showOverall && (
        <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-[var(--app-text)]">Overall Progress</h3>
            <span className="text-sm font-medium text-[var(--color-success)]">
              {Math.round(overallPercent)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--app-line)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-success)] transition-all duration-500 ease-out"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--app-muted)]">
            <span>{completedTopics} of {totalTopics} topics completed</span>
            {inProgressTopics > 0 && (
              <span><ClockIcon className="w-3 h-3 inline mr-1" /> {inProgressTopics} in progress</span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-[var(--app-raised)] text-center">
              <div className="text-2xl font-bold text-[var(--app-text)]">{completedTopics}</div>
              <div className="text-xs text-[var(--app-muted)]">Completed</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--app-raised)] text-center">
              <div className="text-2xl font-bold text-[var(--app-text)]">{inProgressTopics}</div>
              <div className="text-xs text-[var(--app-muted)]">In Progress</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--app-raised)] text-center">
              <div className="text-2xl font-bold text-[var(--app-text)]">{Math.round(averageTimeSpent / 60000) || 0}m</div>
              <div className="text-xs text-[var(--app-muted)]">Avg Time</div>
            </div>
          </div>
        </div>
      )}

      {(popularTopics.length > 0 || totalTopics > 0) && (
        <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
          <h3 className="font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-[var(--app-accent)]" />
            Popular Topics
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {popularTopics.slice(0, 5).map((pop, index) => {
              const t = topic; // This would need the actual topic from engine
              return (
                <div key={pop.topicId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--app-raised)] transition-colors">
                  <span className="w-6 text-center text-sm font-medium text-[var(--app-muted)]">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--app-text)] truncate">{pop.topicId}</p>
                    <p className="text-xs text-[var(--app-muted)]">{pop.count} views</p>
                  </div>
                </div>
              );
            })}
            {popularTopics.length === 0 && (
              <p className="text-sm text-[var(--app-muted)] text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}