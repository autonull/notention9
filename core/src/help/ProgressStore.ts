import type { HelpProgress, HelpAnalyticsEvent } from '../types/help.js';

const STORAGE_KEY = 'notention:help:progress';
const ANALYTICS_KEY = 'notention:help:analytics';
const SETTINGS_KEY = 'notention:help:settings';

export interface HelpSettings {
  autoSave: boolean;
  syncEnabled: boolean;
  analyticsEnabled: boolean;
  language: string;
}

const DEFAULT_SETTINGS: HelpSettings = {
  autoSave: true,
  syncEnabled: false,
  analyticsEnabled: true,
  language: 'en',
};

export class ProgressStore {
  private progress: Map<string, HelpProgress> = new Map();
  private analytics: HelpAnalyticsEvent[] = [];
  private settings: HelpSettings = DEFAULT_SETTINGS;
  private listeners: Set<(progress: Map<string, HelpProgress>) => void> = new Set();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxAnalyticsEvents = 1000;
  private loaded = false;

  constructor() {
    if (isBrowser()) {
      this.load();
    }
  }

  private load(): void {
    if (!isBrowser()) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, value] of Object.entries(data)) {
          this.progress.set(key, value as HelpProgress);
        }
      }

      const analyticsStored = localStorage.getItem(ANALYTICS_KEY);
      if (analyticsStored) {
        this.analytics = JSON.parse(analyticsStored);
      }

      const settingsStored = localStorage.getItem(SETTINGS_KEY);
      if (settingsStored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsStored) };
      }
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load help progress:', error);
    }
  }

  private save(): void {
    if (!isBrowser()) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      try {
        const data = Object.fromEntries(this.progress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        if (this.analytics.length > this.maxAnalyticsEvents) {
          this.analytics = this.analytics.slice(-this.maxAnalyticsEvents);
        }
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.analytics));
        
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save help progress:', error);
      }
    }, 100);
  }

  subscribe(listener: (progress: Map<string, HelpProgress>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(new Map(this.progress));
    }
  }

  getProgress(topicId: string): HelpProgress | undefined {
    return this.progress.get(topicId);
  }

  getAllProgress(): HelpProgress[] {
    return Array.from(this.progress.values());
  }

  startTopic(topicId: string): HelpProgress {
    const existing = this.progress.get(topicId);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      this.save();
      this.notify();
      return existing;
    }

    const progress: HelpProgress = {
      topicId,
      startedAt: Date.now(),
      currentStepIndex: 0,
      completedSteps: [],
      stepAttempts: {},
      timeSpentMs: 0,
      lastAccessedAt: Date.now(),
    };

    this.progress.set(topicId, progress);
    this.save();
    this.notify();
    return progress;
  }

  updateStep(topicId: string, stepIndex: number, stepId: string): HelpProgress | undefined {
    const progress = this.progress.get(topicId);
    if (!progress) return undefined;

    progress.currentStepIndex = stepIndex;
    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
    }
    progress.lastAccessedAt = Date.now();

    this.save();
    this.notify();
    return progress;
  }

  recordStepAttempt(topicId: string, stepId: string): void {
    const progress = this.progress.get(topicId);
    if (!progress) return;

    progress.stepAttempts[stepId] = (progress.stepAttempts[stepId] || 0) + 1;
    this.save();
  }

  addTimeSpent(topicId: string, ms: number): void {
    const progress = this.progress.get(topicId);
    if (!progress) return;

    progress.timeSpentMs += ms;
    this.save();
  }

  completeTopic(topicId: string): HelpProgress | undefined {
    const progress = this.progress.get(topicId);
    if (!progress) return undefined;

    progress.completedAt = Date.now();
    progress.currentStepIndex = progress.completedSteps.length;
    this.save();
    this.notify();
    return progress;
  }

  resetTopic(topicId: string): void {
    this.progress.delete(topicId);
    this.save();
    this.notify();
  }

  resetAll(): void {
    this.progress.clear();
    this.save();
    this.notify();
  }

  setRating(topicId: string, rating: number): void {
    const progress = this.progress.get(topicId);
    if (!progress) return;

    progress.rating = Math.max(1, Math.min(5, rating));
    this.save();
    this.notify();
  }

  setFeedback(topicId: string, feedback: string): void {
    const progress = this.progress.get(topicId);
    if (!progress) return;

    progress.feedback = feedback;
    this.save();
    this.notify();
  }

  recordEvent(event: Omit<HelpAnalyticsEvent, 'timestamp' | 'sessionId'>): void {
    if (!this.settings.analyticsEnabled) return;

    const fullEvent: HelpAnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
    };

    this.analytics.push(fullEvent);
    this.save();
  }

  getAnalytics(eventType?: HelpAnalyticsEvent['type']): HelpAnalyticsEvent[] {
    if (eventType) {
      return this.analytics.filter(e => e.type === eventType);
    }
    return [...this.analytics];
  }

  getSettings(): HelpSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<HelpSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.save();
  }

  export(): string {
    return JSON.stringify({
      progress: Object.fromEntries(this.progress),
      analytics: this.analytics,
      settings: this.settings,
      exportedAt: Date.now(),
      version: 1,
    }, null, 2);
  }

  import(json: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(json);
      
      if (data.progress) {
        this.progress = new Map(Object.entries(data.progress));
      }
      
      if (data.analytics) {
        this.analytics = data.analytics;
      }
      
      if (data.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      }

      this.save();
      this.notify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private getSessionId(): string {
    if (!isBrowser()) return 'server-session';
    let sessionId = sessionStorage.getItem('notention:help:session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('notention:help:session', sessionId);
    }
    return sessionId;
  }

  getCompletionRate(): number {
    const all = this.getAllProgress();
    if (all.length === 0) return 0;
    const completed = all.filter(p => p.completedAt).length;
    return completed / all.length;
  }

  getAverageTimeSpent(): number {
    const all = this.getAllProgress();
    if (all.length === 0) return 0;
    const total = all.reduce((sum, p) => sum + p.timeSpentMs, 0);
    return total / all.length;
  }

  getMostPopularTopics(limit = 10): Array<{ topicId: string; count: number }> {
    const counts = new Map<string, number>();
    for (const event of this.analytics) {
      if (event.type === 'topic_start' && event.topicId) {
        counts.set(event.topicId, (counts.get(event.topicId) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topicId, count]) => ({ topicId, count }));
  }
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

let progressStoreInstance: ProgressStore | null = null;

export function getProgressStore(): ProgressStore {
  if (!progressStoreInstance) {
    progressStoreInstance = new ProgressStore();
  }
  return progressStoreInstance;
}

export const progressStore = isBrowser() ? getProgressStore() : null;