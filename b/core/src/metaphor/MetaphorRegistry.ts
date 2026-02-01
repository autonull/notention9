import { UIMetaphor } from '../types/metaphor.js';
import { logInfo, logWarn } from '../utils/logging.js';
import { DEFAULT_METAPHORS } from './DefaultMetaphors.js';

export class MetaphorRegistry {
  private metaphors: Map<string, UIMetaphor> = new Map();
  private static instance: MetaphorRegistry;

  constructor() {
    this.registerDefaults();
  }

  public static getInstance(): MetaphorRegistry {
    if (!MetaphorRegistry.instance) {
      MetaphorRegistry.instance = new MetaphorRegistry();
    }
    return MetaphorRegistry.instance;
  }

  /**
   * Register a new metaphor definition
   */
  registerMetaphor(metaphor: UIMetaphor): void {
    if (this.metaphors.has(metaphor.id)) {
      logWarn(`Overwriting existing metaphor: ${metaphor.id}`, { id: metaphor.id });
    }
    this.metaphors.set(metaphor.id, metaphor);
    logInfo(`Registered metaphor: ${metaphor.name}`, { id: metaphor.id });
  }

  /**
   * Unregister a metaphor
   */
  unregisterMetaphor(id: string): boolean {
    const deleted = this.metaphors.delete(id);
    if (deleted) {
      logInfo(`Unregistered metaphor: ${id}`, { id });
    }
    return deleted;
  }

  /**
   * Get a metaphor by ID
   */
  getMetaphor(id: string): UIMetaphor | undefined {
    return this.metaphors.get(id);
  }

  /**
   * Get all registered metaphors
   */
  getAllMetaphors(): UIMetaphor[] {
    return Array.from(this.metaphors.values());
  }

  /**
   * Get metaphors by category
   */
  getMetaphorsByCategory(category: string): UIMetaphor[] {
    return Array.from(this.metaphors.values()).filter(m => m.category === category);
  }

  /**
   * Clear all metaphors
   */
  clear(): void {
    this.metaphors.clear();
    logInfo('Cleared all metaphors');
  }

  /**
   * Register default metaphors
   */
  private registerDefaults(): void {
    DEFAULT_METAPHORS.forEach(metaphor => {
      this.metaphors.set(metaphor.id, metaphor);
    });
    logInfo(`Registered ${DEFAULT_METAPHORS.length} default metaphors`);
  }
}

// Export singleton
export const metaphorRegistry = MetaphorRegistry.getInstance();
