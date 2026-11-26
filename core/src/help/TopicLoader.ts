import type { HelpTopic, HelpEngineConfig } from '../types/help.js';
import { HelpEngine } from './HelpEngine.js';

export interface TopicLoaderOptions {
  config: HelpEngineConfig;
  baseUrl?: string;
}

export class TopicLoader {
  private engine: HelpEngine;
  private cache: Map<string, HelpTopic> = new Map();
  private loading: Map<string, Promise<HelpTopic | null>> = new Map();
  private baseUrl: string;
  private locale: string;

  constructor(options: TopicLoaderOptions) {
    this.engine = new HelpEngine(options.config);
    this.baseUrl = options.baseUrl ?? '';
    this.locale = options.config.defaultLocale ?? 'en';
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  async loadTopic(topicId: string): Promise<HelpTopic | null> {
    const cacheKey = `${this.locale}:${topicId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!;
    }

    const promise = this.fetchTopic(topicId);
    this.loading.set(cacheKey, promise);

    try {
      const topic = await promise;
      if (topic) {
        this.cache.set(cacheKey, topic);
      }
      return topic;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  private async fetchTopic(topicId: string): Promise<HelpTopic | null> {
    const topic = this.engine.getTopic(topicId);
    if (topic) {
      return this.localizeTopic(topic);
    }

    try {
      const response = await fetch(`${this.baseUrl}/topics/${this.locale}/${topicId}.json`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to load topic: ${response.statusText}`);
      }
      const topic = await response.json() as HelpTopic;
      return this.localizeTopic(topic);
    } catch (error) {
      console.error(`Failed to fetch topic ${topicId}:`, error);
      return null;
    }
  }

  private localizeTopic(topic: HelpTopic): HelpTopic {
    if (topic.locale === this.locale) return topic;
    
    return {
      ...topic,
      locale: this.locale,
      title: topic.title,
      description: topic.description,
      steps: topic.steps.map(step => ({
        ...step,
        title: step.title,
        description: step.description,
      })),
    };
  }

  async preloadTopics(topicIds: string[]): Promise<void> {
    await Promise.all(topicIds.map(id => this.loadTopic(id)));
  }

  async preloadCategory(categoryId: string): Promise<void> {
    const topics = this.engine.getTopicsByCategory(categoryId);
    await this.preloadTopics(topics.map(t => t.id));
  }

  getEngine(): HelpEngine {
    return this.engine;
  }

  setLocale(locale: string): void {
    if (this.engine.config.supportedLocales.includes(locale)) {
      this.locale = locale;
      this.cache.clear();
    }
  }

  getLocale(): string {
    return this.locale;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCachedTopics(): HelpTopic[] {
    return Array.from(this.cache.values());
  }
}

export async function createTopicLoader(config: Partial<HelpEngineConfig> = {}): Promise<TopicLoader> {
  const loader = new TopicLoader({
    config: {
      topicsPath: config.topicsPath ?? 'core/src/help/topics',
      defaultLocale: config.defaultLocale ?? 'en',
      supportedLocales: config.supportedLocales ?? ['en'],
      searchIndexPath: config.searchIndexPath,
      videoBaseUrl: config.videoBaseUrl,
    },
  });
  await loader.initialize();
  return loader;
}