import { useState, useCallback, useEffect, useMemo } from 'react';
import { helpEngine, progressStore, type HelpTopic, type HelpCategory, type HelpSearchResult, type HelpProgress, type HelpAnalyticsEvent } from '@notention/core/help';

interface UseHelpReturn {
  // Topics
  topics: HelpTopic[];
  categories: HelpCategory[];
  getTopic: (id: string) => HelpTopic | undefined;
  search: (query: string, options?: { category?: string; limit?: number }) => HelpSearchResult[];
  getRelatedTopics: (topicId: string, limit?: number) => HelpTopic[];
  
  // Current topic state
  currentTopicId: string | null;
  currentTopic: HelpTopic | undefined;
  setCurrentTopic: (topicId: string | null) => void;
  
  // Progress
  progress: Map<string, HelpProgress>;
  getProgress: (topicId: string) => HelpProgress | undefined;
  getAllProgress: () => HelpProgress[];
  startTopic: (topicId: string) => HelpProgress;
  updateStep: (topicId: string, stepIndex: number, stepId: string) => HelpProgress | undefined;
  completeTopic: (topicId: string) => HelpProgress | undefined;
  resetTopic: (topicId: string) => void;
  setRating: (topicId: string, rating: number) => void;
  setFeedback: (topicId: string, feedback: string) => void;
  
  // Analytics
  recordEvent: (event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>) => void;
  getAnalytics: (type?: HelpAnalyticsEvent['type']) => HelpAnalyticsEvent[];
  
  // Settings
  settings: ReturnType<typeof progressStore.getSettings>;
  updateSettings: (settings: Partial<ReturnType<typeof progressStore.getSettings>>) => void;
  
  // Import/Export
  exportProgress: () => string;
  importProgress: (json: string) => { success: boolean; error?: string };
  
  // Computed
  completionRate: number;
  averageTimeSpent: number;
  popularTopics: Array<{ topicId: string; count: number }>;
}

export function useHelp(): UseHelpReturn {
  const [topics] = useState(() => helpEngine.getAllTopics());
  const [categories] = useState(() => helpEngine.getCategories());
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, HelpProgress>>(new Map());
  
  const currentTopic = useMemo(() => 
    currentTopicId ? helpEngine.getTopic(currentTopicId) : undefined, 
    [currentTopicId]
  );

  useEffect(() => {
    const unsubscribe = progressStore.subscribe((newProgress) => {
      setProgressMap(new Map(newProgress));
    });
    setProgressMap(new Map(progressStore.getAllProgress().reduce((acc, p) => { acc.set(p.topicId, p); return acc; }, new Map<string, HelpProgress>())));
    return unsubscribe;
  }, []);

  const setCurrentTopic = useCallback((topicId: string | null) => {
    setCurrentTopicId(topicId);
    if (topicId) {
      progressStore.startTopic(topicId);
    }
  }, []);

  const search = useCallback((query: string, options?: { category?: string; limit?: number }) => {
    return helpEngine.search(query, options);
  }, []);

  const getRelatedTopics = useCallback((topicId: string, limit = 5) => {
    return helpEngine.getRelatedTopics(topicId, limit);
  }, []);

  const getProgress = useCallback((topicId: string) => {
    return progressStore.getProgress(topicId);
  }, []);

  const startTopic = useCallback((topicId: string) => {
    return progressStore.startTopic(topicId);
  }, []);

  const updateStep = useCallback((topicId: string, stepIndex: number, stepId: string) => {
    return progressStore.updateStep(topicId, stepIndex, stepId);
  }, []);

  const completeTopic = useCallback((topicId: string) => {
    return progressStore.completeTopic(topicId);
  }, []);

  const resetTopic = useCallback((topicId: string) => {
    progressStore.resetTopic(topicId);
  }, []);

  const setRating = useCallback((topicId: string, rating: number) => {
    progressStore.setRating(topicId, rating);
  }, []);

  const setFeedback = useCallback((topicId: string, feedback: string) => {
    progressStore.setFeedback(topicId, feedback);
  }, []);

  const recordEvent = useCallback((event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>) => {
    progressStore.recordEvent(event);
  }, []);

  const getAnalytics = useCallback((type?: HelpAnalyticsEvent['type']) => {
    return progressStore.getAnalytics(type);
  }, []);

  const settings = progressStore.getSettings();
  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    progressStore.updateSettings(newSettings);
  }, []);

  const exportProgress = useCallback(() => {
    return progressStore.export();
  }, []);

  const importProgress = useCallback((json: string) => {
    return progressStore.import(json);
  }, []);

  const completionRate = progressStore.getCompletionRate();
  const averageTimeSpent = progressStore.getAverageTimeSpent();
  const popularTopics = progressStore.getMostPopularTopics(10);
  const getAllProgress = progressStore.getAllProgress.bind(progressStore);

  return {
    topics,
    categories,
    getTopic: helpEngine.getTopic.bind(helpEngine),
    search,
    getRelatedTopics,
    currentTopicId,
    currentTopic,
    setCurrentTopic,
    progress: progressMap,
    getProgress,
    getAllProgress,
    startTopic,
    updateStep,
    completeTopic,
    resetTopic,
    setRating,
    setFeedback,
    recordEvent,
    getAnalytics,
    settings,
    updateSettings,
    exportProgress,
    importProgress,
    completionRate,
    averageTimeSpent,
    popularTopics,
  };
}