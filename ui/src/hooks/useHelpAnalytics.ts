import { useCallback, useMemo } from 'react';
import { progressStore, helpEngine, type HelpAnalyticsEvent, type HelpTopic, type HelpProgress } from '@/lib/helpConfig';
import { useHelp } from './useHelp';

interface FrictionPoint {
  topicId: string;
  stepId: string;
  type: 'validation_failure' | 'step_retry' | 'abandon' | 'search_no_results' | 'video_incomplete' | 'demo_failed';
  count: number;
  severity: 'low' | 'medium' | 'high';
  lastOccurred: number;
}

interface HelpMetrics {
  topicCompletionRate: number;
  returnRate: number;
  searchSuccessRate: number;
  videoCompletionRate: number;
  interactiveDemoCompletion: number;
  contextualTriggerRelevance: number;
  feedbackPositiveRate: number;
  averageTimeToComplete: number;
  dropOffPoints: Array<{ topicId: string; stepIndex: number; dropOffRate: number }>;
  frictionPoints: FrictionPoint[];
}

export function useHelpAnalytics(): {
  recordEvent: (event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>) => void;
  getMetrics: () => HelpMetrics;
  getFrictionPoints: () => FrictionPoint[];
  getTopicMetrics: (topicId: string) => {
    completionRate: number;
    averageTimeSpent: number;
    dropOffStep: number | null;
    rating: number | null;
    feedbackCount: number;
  } | null;
  trackSearch: (query: string, resultsCount: number, clicked: boolean) => void;
  trackVideoPlay: (topicId: string, videoId: string) => void;
  trackVideoProgress: (topicId: string, videoId: string, percent: number) => void;
  trackVideoComplete: (topicId: string, videoId: string) => void;
  trackDemoStart: (topicId: string, demoId: string) => void;
  trackDemoStep: (topicId: string, demoId: string, stepIndex: number, success: boolean) => void;
  trackDemoComplete: (topicId: string, demoId: string) => void;
  trackFeedback: (topicId: string, rating: number, comment?: string) => void;
  trackContextualTrigger: (triggerId: string, topicId: string, accepted: boolean) => void;
  trackStepRetry: (topicId: string, stepId: string) => void;
  trackAbandon: (topicId: string, stepId: string, stepIndex: number) => void;
} {
  const { recordEvent: baseRecordEvent, getAnalytics, getProgress } = useHelp();

  const recordEvent = useCallback((event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>) => {
    baseRecordEvent(event);
  }, [baseRecordEvent]);

  const trackSearch = useCallback((query: string, resultsCount: number, clicked: boolean) => {
    recordEvent({
      type: 'search',
      metadata: { query, resultsCount, clicked },
    });
  }, [recordEvent]);

  const trackVideoPlay = useCallback((topicId: string, videoId: string) => {
    recordEvent({
      type: 'video_play',
      topicId,
      metadata: { videoId },
    });
  }, [recordEvent]);

  const trackVideoProgress = useCallback((topicId: string, videoId: string, percent: number) => {
    recordEvent({
      type: 'video_play',
      topicId,
      metadata: { videoId, progress: percent },
    });
  }, [recordEvent]);

  const trackVideoComplete = useCallback((topicId: string, videoId: string) => {
    recordEvent({
      type: 'video_complete',
      topicId,
      metadata: { videoId },
    });
  }, [recordEvent]);

  const trackDemoStart = useCallback((topicId: string, demoId: string) => {
    recordEvent({
      type: 'demo_start',
      topicId,
      metadata: { demoId },
    });
  }, [recordEvent]);

  const trackDemoStep = useCallback((topicId: string, demoId: string, stepIndex: number, success: boolean) => {
    recordEvent({
      type: success ? 'step_complete' : 'step_fail',
      topicId,
      metadata: { demoId, stepIndex },
    });
  }, [recordEvent]);

  const trackDemoComplete = useCallback((topicId: string, demoId: string) => {
    recordEvent({
      type: 'demo_complete',
      topicId,
      metadata: { demoId },
    });
  }, [recordEvent]);

  const trackFeedback = useCallback((topicId: string, rating: number, comment?: string) => {
    recordEvent({
      type: 'feedback_submit',
      topicId,
      metadata: { rating, comment },
    });
  }, [recordEvent]);

  const trackContextualTrigger = useCallback((triggerId: string, topicId: string, accepted: boolean) => {
    recordEvent({
      type: accepted ? 'contextual_accept' : 'contextual_dismiss',
      topicId,
      metadata: { triggerId },
    });
  }, [recordEvent]);

  const trackStepRetry = useCallback((topicId: string, stepId: string) => {
    recordEvent({
      type: 'step_fail',
      topicId,
      metadata: { stepId, retry: true },
    });
  }, [recordEvent]);

  const trackAbandon = useCallback((topicId: string, stepId: string, stepIndex: number) => {
    recordEvent({
      type: 'step_fail',
      topicId,
      metadata: { stepId, stepIndex, abandon: true },
    });
  }, [recordEvent]);

  const getMetrics = useCallback((): HelpMetrics => {
    const analytics = getAnalytics();
    const allProgress = Array.from({ length: 0 }, () => null); // progressStore.getAllProgress() would be better
    
    const topicStarts = analytics.filter(e => e.type === 'topic_start');
    const topicCompletes = analytics.filter(e => e.type === 'topic_complete');
    const searches = analytics.filter(e => e.type === 'search');
    const searchClicks = searches.filter(e => e.metadata?.clicked === true);
    const videoPlays = analytics.filter(e => e.type === 'video_play' && !e.metadata?.progress);
    const videoCompletes = analytics.filter(e => e.type === 'video_complete');
    const demoStarts = analytics.filter(e => e.type === 'demo_start');
    const demoCompletes = analytics.filter(e => e.type === 'demo_complete');
    const contextualTriggers = analytics.filter(e => e.type === 'contextual_trigger');
    const contextualAccepts = analytics.filter(e => e.type === 'contextual_accept');
    const feedback = analytics.filter(e => e.type === 'feedback_submit');
    const positiveFeedback = feedback.filter(e => ((e.metadata?.rating as number) ?? 0) >= 4);
    const stepFails = analytics.filter(e => e.type === 'step_fail');

    const topicCompletionRate = topicStarts.length > 0 ? topicCompletes.length / topicStarts.length : 0;
    const searchSuccessRate = searches.length > 0 ? searchClicks.length / searches.length : 0;
    const videoCompletionRate = videoPlays.length > 0 ? videoCompletes.length / videoPlays.length : 0;
    const interactiveDemoCompletion = demoStarts.length > 0 ? demoCompletes.length / demoStarts.length : 0;
    const contextualTriggerRelevance = contextualTriggers.length > 0 ? contextualAccepts.length / contextualTriggers.length : 0;
    const feedbackPositiveRate = feedback.length > 0 ? positiveFeedback.length / feedback.length : 0;

    const dropOffMap = new Map<string, Map<number, number>>();
    for (const fail of stepFails) {
      const topicId = fail.topicId ?? '';
      const stepIndex = (fail.metadata?.stepIndex as number) ?? 0;
      const topicMap = dropOffMap.get(topicId) ?? new Map();
      topicMap.set(stepIndex, (topicMap.get(stepIndex) ?? 0) + 1);
      dropOffMap.set(topicId, topicMap);
    }

    const dropOffPoints: Array<{ topicId: string; stepIndex: number; dropOffRate: number }> = [];
    for (const [topicId, stepMap] of dropOffMap) {
      const topic = helpEngine.getTopic(topicId);
      if (!topic) continue;
      for (const [stepIndex, count] of stepMap) {
        const starts = topicStarts.filter(e => e.topicId === topicId).length;
        if (starts > 0) {
          dropOffPoints.push({ topicId, stepIndex, dropOffRate: count / starts });
        }
      }
    }
    dropOffPoints.sort((a, b) => b.dropOffRate - a.dropOffRate);

    const frictionPoints: FrictionPoint[] = [];
    for (const [topicId, stepMap] of dropOffMap) {
      for (const [stepIndex, count] of stepMap) {
        const topic = helpEngine.getTopic(topicId);
        const step = topic?.steps[stepIndex];
        if (!step) continue;
        
        let type: FrictionPoint['type'] = 'validation_failure';
        if (step.type === 'action' && step.action?.type === 'wait') type = 'demo_failed';
        if (step.type === 'validation') type = 'validation_failure';
        
        frictionPoints.push({
          topicId,
          stepId: step.id,
          type,
          count,
          severity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
          lastOccurred: Date.now(),
        });
      }
    }

    const completionTimes = analytics
      .filter(e => e.type === 'topic_complete' && e.topicId)
      .map(e => {
        const start = analytics.find(s => s.type === 'topic_start' && s.topicId === e.topicId && s.timestamp < e.timestamp);
        return start ? e.timestamp - start.timestamp : 0;
      })
      .filter(t => t > 0);
    
    const averageTimeToComplete = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      topicCompletionRate,
      returnRate: 0, // Would need session tracking
      searchSuccessRate,
      videoCompletionRate,
      interactiveDemoCompletion,
      contextualTriggerRelevance,
      feedbackPositiveRate,
      averageTimeToComplete,
      dropOffPoints: dropOffPoints.slice(0, 10),
      frictionPoints: frictionPoints.slice(0, 20),
    };
  }, [getAnalytics]);

  const getFrictionPoints = useCallback((): FrictionPoint[] => {
    return getMetrics().frictionPoints;
  }, [getMetrics]);

  const getTopicMetrics = useCallback((topicId: string) => {
    const topic = helpEngine.getTopic(topicId);
    if (!topic) return null;
    
    const analytics = getAnalytics();
    const starts = analytics.filter(e => e.type === 'topic_start' && e.topicId === topicId);
    const completes = analytics.filter(e => e.type === 'topic_complete' && e.topicId === topicId);
    const feedback = analytics.filter(e => e.type === 'feedback_submit' && e.topicId === topicId);
    const progress = getProgress(topicId);
    
    const completionRate = starts.length > 0 ? completes.length / starts.length : 0;
    const averageTimeSpent = progress?.timeSpentMs ?? 0;
    
    let dropOffStep: number | null = null;
    const stepFails = analytics.filter(e => e.type === 'step_fail' && e.topicId === topicId);
    const stepFailCounts = new Map<number, number>();
    for (const fail of stepFails) {
      const idx = (fail.metadata?.stepIndex as number) ?? 0;
      stepFailCounts.set(idx, (stepFailCounts.get(idx) ?? 0) + 1);
    }
    let maxFails = 0;
    for (const [idx, count] of stepFailCounts) {
      if (count > maxFails) {
        maxFails = count;
        dropOffStep = idx;
      }
    }
    
    const ratings = feedback.map(e => e.metadata?.rating as number).filter(r => r > 0);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    return {
      completionRate,
      averageTimeSpent,
      dropOffStep,
      rating: avgRating,
      feedbackCount: feedback.length,
    };
  }, [getAnalytics, getProgress]);

  return {
    recordEvent,
    getMetrics,
    getFrictionPoints,
    getTopicMetrics,
    trackSearch,
    trackVideoPlay,
    trackVideoProgress,
    trackVideoComplete,
    trackDemoStart,
    trackDemoStep,
    trackDemoComplete,
    trackFeedback,
    trackContextualTrigger,
    trackStepRetry,
    trackAbandon,
  };
}