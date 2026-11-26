import type { HelpTopic, HelpCategory, HelpSearchResult, HelpEngineConfig, ContextualTrigger } from '../types/help.js';
import { validateHelpTopic } from './validation.js';
import MiniSearch from 'minisearch';

export class HelpEngine {
  private topics: Map<string, HelpTopic> = new Map();
  private categories: Map<string, HelpCategory> = new Map();
  private miniSearch: MiniSearch<HelpTopic>;
  readonly config: HelpEngineConfig;
  
  private contextualTriggers: ContextualTrigger[] = [
    {
      id: 'idle-create-first-note',
      name: 'Idle: Create First Note',
      condition: 'idle',
      config: { thresholdMs: 60000 },
      targetTopicId: 'create-first-note',
      priority: 10,
      cooldownMs: 300000,
      maxShowsPerSession: 1,
      enabled: true,
    },
    {
      id: 'idle-describe-it',
      name: 'Idle: Discover Describe It',
      condition: 'idle',
      config: { thresholdMs: 120000 },
      targetTopicId: 'describe-it-basics',
      priority: 8,
      cooldownMs: 600000,
      maxShowsPerSession: 1,
      enabled: true,
    },
    {
      id: 'error-network-connect',
      name: 'Error: Network Connection Failed',
      condition: 'error',
      config: {},
      targetTopicId: 'connect-network',
      priority: 15,
      cooldownMs: 60000,
      maxShowsPerSession: 2,
      enabled: true,
    },
    {
      id: 'feature-gate-describe-it',
      name: 'Feature Gate: Describe It',
      condition: 'feature_gate',
      config: { feature: 'describe-it' },
      targetTopicId: 'describe-it-basics',
      priority: 12,
      cooldownMs: 300000,
      maxShowsPerSession: 1,
      enabled: true,
    },
    {
      id: 'first-visit-search',
      name: 'First Visit: Search',
      condition: 'first_visit',
      config: { topicId: 'search-basics' },
      targetTopicId: 'search-basics',
      priority: 5,
      cooldownMs: 0,
      maxShowsPerSession: 1,
      enabled: true,
    },
  ];

  constructor(config: Partial<HelpEngineConfig> = {}) {
    this.config = {
      topicsPath: config.topicsPath ?? 'core/src/help/topics',
      defaultLocale: config.defaultLocale ?? 'en',
      supportedLocales: config.supportedLocales ?? ['en'],
      searchIndexPath: config.searchIndexPath,
      videoBaseUrl: config.videoBaseUrl,
    };
    
    this.miniSearch = new MiniSearch({
      fields: ['title', 'description', 'tags', 'category'],
      storeFields: ['id', 'title', 'description', 'category', 'tags', 'locale', 'difficulty', 'estimatedTimeMinutes'],
      searchOptions: {
        boost: { title: 4, tags: 3, description: 2, category: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
      extractField: (document, fieldName) => {
        if (fieldName === 'tags') return document.tags.join(' ');
        return (document as Record<string, unknown>)[fieldName] as string;
      },
    });
  }

  async initialize(): Promise<void> {
    await this.loadTopics();
    this.buildSearchIndex();
    this.buildCategories();
  }

  private async loadTopics(): Promise<void> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    const locale = this.config.defaultLocale ?? 'en';
    const localePath = path.join(this.config.topicsPath, locale);
    const basePath = this.config.topicsPath;
    
    // Load base (English) topics first
    await this.loadTopicsFromDirectory(basePath);
    
    // If locale is not English, load locale-specific topics to override
    if (locale !== 'en') {
      await this.loadTopicsFromDirectory(localePath);
    }
  }

  private async loadTopicsFromDirectory(dirPath: string): Promise<void> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
          const topic = JSON.parse(content) as HelpTopic;
          
          const validation = validateHelpTopic(topic);
          if (!validation.valid) {
            console.warn(`Invalid help topic ${file}:`, validation.errors);
            continue;
          }
          
          this.topics.set(topic.id, topic);
        }
      }
    } catch (error) {
      // Directory might not exist for locale, that's okay
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to load help topics from ${dirPath}:`, error);
      }
    }
  }

  private buildSearchIndex(): void {
    const documents = Array.from(this.topics.values()).map(topic => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      tags: topic.tags,
      category: topic.category,
      locale: topic.locale,
      difficulty: topic.difficulty,
      estimatedTimeMinutes: topic.estimatedTimeMinutes,
    }));
    this.miniSearch.addAll(documents);
  }

  private buildCategories(): void {
    const categoryMap: Map<string, { name: string; description: string; icon: string; order: number; topicIds: string[] }> = new Map();
    
    for (const topic of this.topics.values()) {
      if (!categoryMap.has(topic.category)) {
        categoryMap.set(topic.category, {
          name: this.formatCategoryName(topic.category),
          description: '',
          icon: this.getCategoryIcon(topic.category),
          order: 0,
          topicIds: [],
        });
      }
      const cat = categoryMap.get(topic.category)!;
      cat.topicIds.push(topic.id);
    }

    let order = 0;
    for (const [id, data] of categoryMap) {
      this.categories.set(id, {
        id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        order: data.order || order++,
        topicIds: data.topicIds,
      });
    }
  }

  private formatCategoryName(id: string): string {
    return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private getCategoryIcon(id: string): string {
    const icons: Record<string, string> = {
      'getting-started': '🚀',
      'core-skills': '⚡',
      'network': '🌐',
      'views': '📊',
      'ai-features': '🤖',
      'reference': '📚',
      'advanced': '🔧',
    };
    return icons[id] || '📁';
  }

  getTopic(id: string): HelpTopic | undefined {
    return this.topics.get(id);
  }

  getAllTopics(): HelpTopic[] {
    return Array.from(this.topics.values());
  }

  getTopicsByCategory(categoryId: string): HelpTopic[] {
    const category = this.categories.get(categoryId);
    if (!category) return [];
    return category.topicIds.map(id => this.topics.get(id)!).filter(Boolean);
  }

  getCategories(): HelpCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  search(query: string, options: { category?: string; limit?: number; locale?: string } = {}): HelpSearchResult[] {
    const searchOptions = {
      ...this.miniSearch.options.searchOptions,
      filter: (result: { id: string; title: string; description: string; category: string; tags: string[]; locale: string }) => {
        const topic = this.topics.get(result.id);
        if (!topic) return false;
        if (options.category && topic.category !== options.category) return false;
        if (options.locale && topic.locale !== options.locale) return false;
        return true;
      },
    };

    const results = this.miniSearch.search(query, searchOptions);
    
    return results
      .slice(0, options.limit ?? 10)
      .map(result => {
        const topic = this.topics.get(result.id)!;
        return {
          topicId: result.id,
          title: topic.title,
          category: topic.category,
          snippet: this.generateSnippet(topic, query),
          score: result.score,
          matchedTags: topic.tags.filter(t => query.toLowerCase().includes(t.toLowerCase())),
        };
      });
  }

  private generateSnippet(topic: HelpTopic, query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    for (const step of topic.steps) {
      if (words.some(w => step.description.toLowerCase().includes(w))) {
        return step.description.slice(0, 160) + '...';
      }
    }
    return topic.description.slice(0, 160) + '...';
  }

  getRelatedTopics(topicId: string, limit = 5): HelpTopic[] {
    const topic = this.topics.get(topicId);
    if (!topic) return [];
    
    const related = topic.relatedTopics
      .map(id => this.topics.get(id))
      .filter((t): t is HelpTopic => t !== undefined);
    
    return related.slice(0, limit);
  }

  validateTopic(topic: HelpTopic): { valid: boolean; errors: string[] } {
    return validateHelpTopic(topic);
  }

  getAllTriggers(): ContextualTrigger[] {
    return this.contextualTriggers;
  }

  getTrigger(id: string): ContextualTrigger | undefined {
    return this.contextualTriggers.find(t => t.id === id);
  }

  setTriggerEnabled(id: string, enabled: boolean): void {
    const trigger = this.contextualTriggers.find(t => t.id === id);
    if (trigger) trigger.enabled = enabled;
  }
}

export const helpEngine = new HelpEngine();