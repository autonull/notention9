import { UIMetaphor } from '../../types/metaphor.js';
import { UnifiedMetaphor, toUIMetaphor } from './UnifiedMetaphor.js';
import { logInfo, logWarn } from '../../utils/logging.js';
import { DEFAULT_METAPHORS } from './DefaultMetaphors.js';

export class MetaphorRegistry {
  private metaphors: Map<string, UIMetaphor> = new Map();
  private unifiedMetaphors: Map<string, UnifiedMetaphor> = new Map();
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
   * Register a new metaphor definition (core or unified)
   */
  registerMetaphor(metaphor: UIMetaphor | UnifiedMetaphor): void {
    const coreMetaphor = toUIMetaphor(metaphor);
    if (this.metaphors.has(coreMetaphor.id)) {
      logWarn(`Overwriting existing metaphor: ${coreMetaphor.id}`, { id: coreMetaphor.id });
    }
    this.metaphors.set(coreMetaphor.id, coreMetaphor);
    
    // Store unified version if provided
    if ('uiView' in metaphor) {
      this.unifiedMetaphors.set(coreMetaphor.id, metaphor as UnifiedMetaphor);
    }
    
    logInfo(`Registered metaphor: ${coreMetaphor.name}`, { id: coreMetaphor.id });
  }

  /**
   * Register a unified metaphor with UI components
   */
  registerUnifiedMetaphor(metaphor: UnifiedMetaphor): void {
    this.registerMetaphor(metaphor);
  }

  /**
   * Get a unified metaphor by ID (includes UI components)
   */
  getUnifiedMetaphor(id: string): UnifiedMetaphor | undefined {
    return this.unifiedMetaphors.get(id);
  }

  /**
   * Get all unified metaphors
   */
  getAllUnifiedMetaphors(): UnifiedMetaphor[] {
    return Array.from(this.unifiedMetaphors.values());
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
