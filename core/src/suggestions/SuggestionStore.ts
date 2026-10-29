import type { SuggestionStore, UISuggestion, OntologySuggestion, ExtensibilitySuggestion, SuggestionFilter, SuggestionTestResult, SuggestionStatus } from './SuggestionTypes.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class FileStorageAdapter implements StorageAdapter {
  private fs: typeof import('fs/promises') | null = null;
  private path: typeof import('path') | null = null;
  private storeDir: string;

  constructor() {
    if (!isBrowser) {
      this.initializeNodeModules();
    }
    this.storeDir = this.getStoreDir();
  }

  private async initializeNodeModules(): Promise<void> {
    if (this.fs) return;
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.fs = fs;
    this.path = path;
    this.storeDir = path.resolve(__dirname, '../../../.suggestions');
  }

  private getStoreDir(): string {
    if (isBrowser) return '';
    return '/tmp/notention-suggestions'; // Fallback, will be overridden after init
  }

  async getItem(key: string): Promise<string | null> {
    if (isBrowser) {
      return localStorage.getItem(key);
    }
    await this.initializeNodeModules();
    try {
      const filePath = this.path!.join(this.storeDir, `${key}.json`);
      return await this.fs!.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (isBrowser) {
      localStorage.setItem(key, value);
      return;
    }
    await this.initializeNodeModules();
    const filePath = this.path!.join(this.storeDir, `${key}.json`);
    await this.fs!.mkdir(this.storeDir, { recursive: true });
    await this.fs!.writeFile(filePath, value);
  }

  async removeItem(key: string): Promise<void> {
    if (isBrowser) {
      localStorage.removeItem(key);
      return;
    }
    await this.initializeNodeModules();
    try {
      const filePath = this.path!.join(this.storeDir, `${key}.json`);
      await this.fs!.unlink(filePath);
    } catch {
      // Ignore if not exists
    }
  }

  async clear(): Promise<void> {
    if (isBrowser) {
      localStorage.clear();
      return;
    }
    await this.initializeNodeModules();
    try {
      await this.fs!.rm(this.storeDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

const storageAdapter = isBrowser ? new FileStorageAdapter() : new MemoryStorageAdapter();

const UI_KEY = 'notention:ui-suggestions';
const ONTOLOGY_KEY = 'notention:ontology-suggestions';
const TEST_RESULTS_KEY = 'notention:test-results';

export class FileSuggestionStore implements SuggestionStore {
  private uiSuggestions: Map<string, UISuggestion> = new Map();
  private ontologySuggestions: Map<string, OntologySuggestion> = new Map();
  private testResults: Map<string, SuggestionTestResult[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadAll();

    this.initialized = true;
  }

  private async loadAll(): Promise<void> {
    await this.loadFile(UI_KEY, this.uiSuggestions);
    await this.loadFile(ONTOLOGY_KEY, this.ontologySuggestions);
    await this.loadTestResults();
  }

  private async loadFile<T extends { id: string }>(key: string, map: Map<string, T>): Promise<void> {
    try {
      const data = await storageAdapter.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            map.set(item.id, item);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to load ${key}:`, e);
    }
  }

  private async loadTestResults(): Promise<void> {
    try {
      const data = await storageAdapter.getItem(TEST_RESULTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const existing = this.testResults.get(item.suggestionId) || [];
            existing.push(item);
            this.testResults.set(item.suggestionId, existing);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load test results:', e);
    }
  }

  private async saveFile<T>(key: string, map: Map<string, T>): Promise<void> {
    const data = Array.from(map.values());
    await storageAdapter.setItem(key, JSON.stringify(data));
  }

  private async saveTestResults(): Promise<void> {
    const data = Array.from(this.testResults.entries()).flatMap(([suggestionId, results]) =>
      results.map(r => ({ ...r, suggestionId }))
    );
    await storageAdapter.setItem(TEST_RESULTS_KEY, JSON.stringify(data));
  }

  // UI Suggestions
  async saveUISuggestion(suggestion: UISuggestion): Promise<void> {
    await this.initialize();
    this.uiSuggestions.set(suggestion.id, suggestion);
    await this.saveFile(UI_KEY, this.uiSuggestions);
  }

  async getUISuggestion(id: string): Promise<UISuggestion | null> {
    await this.initialize();
    return this.uiSuggestions.get(id) ?? null;
  }

  async listUISuggestions(filter?: SuggestionFilter): Promise<UISuggestion[]> {
    await this.initialize();
    return this.applyFilter(Array.from(this.uiSuggestions.values()), filter);
  }

  async updateUISuggestion(id: string, updates: Partial<UISuggestion>): Promise<void> {
    await this.initialize();
    const existing = this.uiSuggestions.get(id);
    if (!existing) throw new Error(`UI suggestion ${id} not found`);

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.uiSuggestions.set(id, updated);
    await this.saveFile(UI_KEY, this.uiSuggestions);
  }

  async deleteUISuggestion(id: string): Promise<void> {
    await this.initialize();
    this.uiSuggestions.delete(id);
    this.testResults.delete(id);
    await this.saveFile(UI_KEY, this.uiSuggestions);
    await this.saveTestResults();
  }

  // Ontology Suggestions
  async saveOntologySuggestion(suggestion: OntologySuggestion): Promise<void> {
    await this.initialize();
    this.ontologySuggestions.set(suggestion.id, suggestion);
    await this.saveFile(ONTOLOGY_KEY, this.ontologySuggestions);
  }

  async getOntologySuggestion(id: string): Promise<OntologySuggestion | null> {
    await this.initialize();
    return this.ontologySuggestions.get(id) ?? null;
  }

  async listOntologySuggestions(filter?: SuggestionFilter): Promise<OntologySuggestion[]> {
    await this.initialize();
    return this.applyFilter(Array.from(this.ontologySuggestions.values()), filter);
  }

  async updateOntologySuggestion(id: string, updates: Partial<OntologySuggestion>): Promise<void> {
    await this.initialize();
    const existing = this.ontologySuggestions.get(id);
    if (!existing) throw new Error(`Ontology suggestion ${id} not found`);

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.ontologySuggestions.set(id, updated);
    await this.saveFile(ONTOLOGY_KEY, this.ontologySuggestions);
  }

  async deleteOntologySuggestion(id: string): Promise<void> {
    await this.initialize();
    this.ontologySuggestions.delete(id);
    this.testResults.delete(id);
    await this.saveFile(ONTOLOGY_KEY, this.ontologySuggestions);
    await this.saveTestResults();
  }

  // Unified
  async listAllSuggestions(filter?: SuggestionFilter): Promise<ExtensibilitySuggestion[]> {
    await this.initialize();
    const ui = await this.listUISuggestions(filter);
    const onto = await this.listOntologySuggestions(filter);
    return [...ui, ...onto].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSuggestion(id: string): Promise<ExtensibilitySuggestion | null> {
    await this.initialize();
    return this.uiSuggestions.get(id) ?? this.ontologySuggestions.get(id) ?? null;
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus, user?: string): Promise<void> {
    await this.initialize();

    const uiSugg = this.uiSuggestions.get(id);
    if (uiSugg) {
      uiSugg.status = status;
      uiSugg.updatedAt = new Date();
      if (status === 'reviewed') { uiSugg.reviewedAt = new Date(); uiSugg.reviewedBy = user; }
      if (status === 'approved') { uiSugg.approvedAt = new Date(); uiSugg.approvedBy = user; }
      if (status === 'implemented') { uiSugg.implementedAt = new Date(); uiSugg.implementedBy = user; }
      await this.saveFile(UI_KEY, this.uiSuggestions);
      return;
    }

    const ontoSugg = this.ontologySuggestions.get(id);
    if (ontoSugg) {
      ontoSugg.status = status;
      ontoSugg.updatedAt = new Date();
      if (status === 'reviewed') { ontoSugg.reviewedAt = new Date(); ontoSugg.reviewedBy = user; }
      if (status === 'approved') { ontoSugg.approvedAt = new Date(); ontoSugg.approvedBy = user; }
      if (status === 'implemented') { ontoSugg.implementedAt = new Date(); ontoSugg.implementedBy = user; }
      await this.saveFile(ONTOLOGY_KEY, this.ontologySuggestions);
      return;
    }

    throw new Error(`Suggestion ${id} not found`);
  }

  async addTestResult(id: string, result: SuggestionTestResult): Promise<void> {
    await this.initialize();
    const existing = this.testResults.get(id) || [];
    existing.push(result);
    this.testResults.set(id, existing);
    await this.saveTestResults();
  }

  private applyFilter<T extends { type: string; severity: string; status: string; targetComponent?: string; targetNode?: string; testScenario?: string; testDomains?: string[]; createdAt: Date }>(
    items: T[],
    filter?: SuggestionFilter
  ): T[] {
    if (!filter) return items;

    return items.filter(item => {
      if (filter.type && !filter.type.includes(item.type as any)) return false;
      if (filter.severity && !filter.severity.includes(item.severity as any)) return false;
      if (filter.status && !filter.status.includes(item.status as any)) return false;
      if (filter.component && item.targetComponent !== filter.component) return false;
      if (filter.domain && item.testDomains && !item.testDomains.includes(filter.domain)) return false;
      if (filter.scenario && item.testScenario !== filter.scenario) return false;
      if (filter.since && item.createdAt < filter.since) return false;
      return true;
    }).slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? items.length));
  }
}

export const suggestionStore = new FileSuggestionStore();