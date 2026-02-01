// Extension interface for adding new functionality to the ClawdBot agent
export interface Extension {
  /**
   * Unique identifier for the extension
   */
  getId(): string;

  /**
   * Human-readable name of the extension
   */
  getName(): string;

  /**
   * Description of what the extension does
   */
  getDescription(): string;

  /**
   * Version of the extension
   */
  getVersion(): string;

  /**
   * Initialize the extension
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources when extension is unloaded
   */
  destroy(): Promise<void>;

  /**
   * Get the priority of this extension (higher numbers are loaded first)
   */
  getPriority(): number;

  /**
   * Check if this extension can handle a specific event or request
   */
  canHandle(context: ExtensionContext): boolean;

  /**
   * Execute the extension's functionality
   */
  execute(context: ExtensionContext): Promise<ExtensionResult>;
}

// Context passed to extensions
export interface ExtensionContext {
  /**
   * The original request or event
   */
  request: any;

  /**
   * Reference to the ClawdBot gateway
   */
  gateway: any;

  /**
   * Reference to the strategy manager
   */
  strategyManager: any;

  /**
   * Reference to the plugin manager
   */
  pluginManager: any;

  /**
   * Logger instance
   */
  logger: any;

  /**
   * Additional context-specific data
   */
  [key: string]: any;
}

// Result returned by extensions
export interface ExtensionResult {
  /**
   * Whether the extension successfully handled the request
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message: string;

  /**
   * Any data returned by the extension
   */
  data?: any;

  /**
   * Whether other extensions should continue processing
   */
  continue: boolean;
}

// Manager for handling extensions
export class ExtensionManager {
  private extensions: Extension[] = [];

  /**
   * Register a new extension
   */
  async registerExtension(extension: Extension): Promise<void> {
    await extension.initialize();
    this.extensions.push(extension);
    // Sort by priority (highest first)
    this.extensions.sort((a, b) => b.getPriority() - a.getPriority());
    console.log(`Registered extension: ${extension.getName()} (${extension.getId()})`);
  }

  /**
   * Unregister an extension
   */
  async unregisterExtension(id: string): Promise<boolean> {
    const index = this.extensions.findIndex(ext => ext.getId() === id);
    if (index !== -1) {
      const extension = this.extensions[index];
      await extension.destroy();
      this.extensions.splice(index, 1);
      console.log(`Unregistered extension: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Execute extensions that can handle a given context
   */
  async executeExtensions(context: ExtensionContext): Promise<ExtensionResult[]> {
    const results: ExtensionResult[] = [];

    for (const extension of this.extensions) {
      if (extension.canHandle(context)) {
        try {
          const result = await extension.execute(context);
          results.push(result);

          // If extension indicates not to continue, stop processing
          if (!result.continue) {
            break;
          }
        } catch (error) {
          console.error(`Error executing extension ${extension.getId()}:`, error);
          results.push({
            success: false,
            message: `Error in extension ${extension.getName()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            continue: true
          });
        }
      }
    }

    return results;
  }

  /**
   * Get all registered extensions
   */
  getExtensions(): Extension[] {
    return [...this.extensions];
  }

  /**
   * Find an extension by ID
   */
  getExtensionById(id: string): Extension | undefined {
    return this.extensions.find(ext => ext.getId() === id);
  }
}