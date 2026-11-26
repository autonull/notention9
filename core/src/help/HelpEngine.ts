import type { HelpTopic, HelpCategory, HelpSearchResult, HelpEngineConfig } from '../types/help.js';
import { validateHelpTopic } from './validation.js';

export class HelpEngine {
  private topics: Map<string, HelpTopic> = new Map();
  private categories: Map<string, HelpCategory> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  readonly config: HelpEngineConfig;

  constructor(config: Partial<HelpEngineConfig> = {}) {
    this.config = {
      topicsPath: config.topicsPath ?? 'core/src/help/topics',
      defaultLocale: config.defaultLocale ?? 'en',
      supportedLocales: config.supportedLocales ?? ['en'],
      searchIndexPath: config.searchIndexPath,
      videoBaseUrl: config.videoBaseUrl,
    };
  }

  async initialize(): Promise<void> {
    await this.loadTopics();
    this.buildSearchIndex();
    this.buildCategories();
  }

  private async loadTopics(): Promise<void> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    try {
      const files = await fs.readdir(this.config.topicsPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.config.topicsPath, file), 'utf-8');
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
      console.error('Failed to load help topics:', error);
    }
  }

  private buildSearchIndex(): void {
    for (const [topicId, topic] of this.topics) {
      const tokens = this.tokenize(`${topic.title} ${topic.description} ${topic.tags.join(' ')}`);
      for (const token of tokens) {
        if (!this.searchIndex.has(token)) {
          this.searchIndex.set(token, new Set());
        }
        this.searchIndex.get(token)!.add(topicId);
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
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
    const tokens = this.tokenize(query);
    const scores = new Map<string, number>();

    for (const token of tokens) {
      const matchingTopics = this.searchIndex.get(token);
      if (matchingTopics) {
        for (const topicId of matchingTopics) {
          const topic = this.topics.get(topicId);
          if (!topic) continue;
          if (options.category && topic.category !== options.category) continue;
          if (options.locale && topic.locale !== options.locale) continue;
          
          let score = 1;
          if (topic.title.toLowerCase().includes(query.toLowerCase())) score += 10;
          if (topic.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))) score += 5;
          scores.set(topicId, (scores.get(topicId) || 0) + score);
        }
      }
    }

    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, options.limit ?? 10)
      .map(([topicId, score]) => {
        const topic = this.topics.get(topicId)!;
        return {
          topicId,
          title: topic.title,
          category: topic.category,
          snippet: this.generateSnippet(topic, query),
          score,
          matchedTags: topic.tags.filter(t => query.toLowerCase().includes(t.toLowerCase())),
        };
      });

    return results;
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
}

export const helpEngine = new HelpEngine();