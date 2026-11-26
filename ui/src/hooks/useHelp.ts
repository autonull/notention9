import { useState, useCallback, useEffect, useMemo } from 'react';
import { helpEngine, progressStore, getProgressStore, ProgressStore, type HelpTopic, type HelpCategory, type HelpSearchResult, type HelpProgress, type HelpAnalyticsEvent, type HelpSettings } from '@/lib/helpConfig';

export interface UseHelpReturn {
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
  openTopic: (topicId: string) => void;
  
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
  settings: HelpSettings;
  updateSettings: (settings: Partial<HelpSettings>) => void;
  
  // Import/Export
  exportProgress: () => string;
  importProgress: (json: string) => { success: boolean; error?: string };
  
  // Computed
  completionRate: number;
  averageTimeSpent: number;
  popularTopics: Array<{ topicId: string; count: number }>;
}

function getStore(): ProgressStore {
  return progressStore ?? getProgressStore();
}

export function useHelp(): UseHelpReturn {
  const [topics] = useState(() => helpEngine.getAllTopics());
  const [categories] = useState(() => helpEngine.getCategories());
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, HelpProgress>>(new Map());
  const store = getStore();
  
  const currentTopic = useMemo(() => 
    currentTopicId ? helpEngine.getTopic(currentTopicId) : undefined, 
    [currentTopicId]
  );

  useEffect(() => {
    const unsubscribe = store.subscribe((newProgress: Map<string, HelpProgress>) => {
      setProgressMap(new Map(newProgress));
    });
    setProgressMap(new Map(store.getAllProgress().reduce((acc: Map<string, HelpProgress>, p: HelpProgress) => { acc.set(p.topicId, p); return acc; }, new Map<string, HelpProgress>())));
    return unsubscribe;
  }, [store]);

  const setCurrentTopic = useCallback((topicId: string | null) => {
    setCurrentTopicId(topicId);
    if (topicId) {
      store.startTopic(topicId);
    }
  }, [store]);

  const openTopic = useCallback((topicId: string) => {
    setCurrentTopicId(topicId);
    store.startTopic(topicId);
  }, [store]);

  const search = useCallback((query: string, options?: { category?: string; limit?: number }) => {
    return helpEngine.search(query, options);
  }, []);

  const getRelatedTopics = useCallback((topicId: string, limit = 5) => {
    return helpEngine.getRelatedTopics(topicId, limit);
  }, []);

  const getProgress = useCallback((topicId: string) => {
    return store.getProgress(topicId);
  }, [store]);

  const startTopic = useCallback((topicId: string) => {
    return store.startTopic(topicId);
  }, [store]);

  const updateStep = useCallback((topicId: string, stepIndex: number, stepId: string) => {
    return store.updateStep(topicId, stepIndex, stepId);
  }, [store]);

  const completeTopic = useCallback((topicId: string) => {
    return store.completeTopic(topicId);
  }, [store]);

  const resetTopic = useCallback((topicId: string) => {
    store.resetTopic(topicId);
  }, [store]);

  const setRating = useCallback((topicId: string, rating: number) => {
    store.setRating(topicId, rating);
  }, [store]);

  const setFeedback = useCallback((topicId: string, feedback: string) => {
    store.setFeedback(topicId, feedback);
  }, [store]);

  const recordEvent = useCallback((event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>) => {
    store.recordEvent(event);
  }, [store]);

  const getAnalytics = useCallback((type?: HelpAnalyticsEvent['type']) => {
    return store.getAnalytics(type);
  }, [store]);

  const settings = store.getSettings();
  const updateSettings = useCallback((newSettings: Partial<HelpSettings>) => {
    store.updateSettings(newSettings);
  }, [store]);

  const exportProgress = useCallback(() => {
    return store.export();
  }, [store]);

  const importProgress = useCallback((json: string) => {
    return store.import(json);
  }, [store]);

  const completionRate = store.getCompletionRate();
  const averageTimeSpent = store.getAverageTimeSpent();
  const popularTopics = store.getMostPopularTopics(10);
  const getAllProgress = store.getAllProgress.bind(store);

  return {
    topics,
    categories,
    getTopic: helpEngine.getTopic.bind(helpEngine),
    search,
    getRelatedTopics,
    currentTopicId,
    currentTopic,
    setCurrentTopic,
    openTopic,
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