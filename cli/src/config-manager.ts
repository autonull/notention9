import fs from 'fs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';
import Conf from 'conf';
import { z } from 'zod';
import { LLMProviderConfig } from './providers/base.js';

// Define configuration schema
const ConfigSchema = z.object({
  provider: z.string().default('ollama'),
  model: z.string().optional(),
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(2000),
  // Add provider-specific fields as needed
  additionalProperties: z.record(z.unknown()).optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// Configuration manager class
export class ConfigManager {
  private static readonly CONFIG_NAME = 'notention';
  private static readonly CONFIG_FILE_EXTENSIONS = ['json', 'yaml', 'yml', 'js', 'ts'];
  
  private store: Conf<AppConfig>;
  private explorer: ReturnType<typeof cosmiconfig>;

  constructor() {
    // Initialize persistent config store
    this.store = new Conf<AppConfig>({
      projectName: 'notention',
      defaults: {
        provider: 'ollama',
        temperature: 0.7,
        maxTokens: 2000,
      },
    });

    // Initialize cosmiconfig for file-based configs
    this.explorer = cosmiconfig(ConfigManager.CONFIG_NAME, {
      searchPlaces: ConfigManager.CONFIG_FILE_EXTENSIONS.map(ext => 
        `${ConfigManager.CONFIG_NAME}.config.${ext}`
      ).concat([
        'config.json',
        '.notentionrc',
        '.notentionrc.json',
        '.notentionrc.yaml',
        '.notentionrc.yml',
      ]),
      loaders: {
        '.json': (filepath: string) => {
          const content = fs.readFileSync(filepath, 'utf8');
          return JSON.parse(content);
        },
        '.yaml': (filepath: string) => {
          const content = fs.readFileSync(filepath, 'utf8');
          // Using a simple YAML parser - in production, use js-yaml
          return this.parseYaml(content);
        },
        '.yml': (filepath: string) => {
          const content = fs.readFileSync(filepath, 'utf8');
          return this.parseYaml(content);
        },
      },
    });
  }

  private parseYaml(content: string): any {
    // Simplified YAML parsing - in production, use js-yaml
    try {
      // Basic YAML to JSON conversion for simple cases
      return JSON.parse(content.replace(/(\w+):\s*(.*)/g, '"$1": "$2"'));
    } catch {
      throw new Error('Invalid YAML format');
    }
  }

  /**
   * Load configuration from all sources with priority:
   * 1. CLI arguments (highest)
   * 2. Environment variables
   * 3. Configuration files
   * 4. Persistent store
   * 5. Defaults (lowest)
   */
  async loadConfig(cliArgs: Partial<LLMProviderConfig> = {}): Promise<AppConfig> {
    // Start with defaults
    let config: AppConfig = {
      provider: 'ollama',
      temperature: 0.7,
      maxTokens: 2000,
    };

    // Merge with persistent store
    const storedConfig = this.getAll();
    config = { ...config, ...storedConfig };

    // Search for config files
    try {
      const result = await this.explorer.search();
      if (result && result.config) {
        config = { ...config, ...result.config };
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file: ${(error as Error).message}`);
    }

    // Apply environment variables
    config = {
      ...config,
      provider: process.env.LLM_PROVIDER || config.provider,
      model: process.env.LLM_MODEL || config.model,
      baseURL: process.env.LLM_BASE_URL || config.baseURL,
      apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || config.apiKey,
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '') || config.temperature,
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '') || config.maxTokens,
    };

    // Apply CLI arguments (highest priority)
    for (const [key, value] of Object.entries(cliArgs)) {
      if (value !== undefined) {
        (config as any)[key] = value;
      }
    }

    // Validate the final configuration
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Configuration validation failed: ${messages}`);
      }
      throw error;
    }
  }

  /**
   * Save configuration to persistent store
   */
  saveConfig(config: Partial<AppConfig>): void {
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        this.store.set(key, value);
      }
    }
  }

  /**
   * Get all configuration values from persistent store
   */
  getAll(): AppConfig {
    return { ...this.store.store };
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.store.clear();
  }

  /**
   * Get default model for a provider
   */
  getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      ollama: 'llama3.2',
      transformers: 'onnx-community/Qwen2.5-0.5B-Instruct',
      local: 'local-model',
    };

    return defaults[provider] || 'gpt-4o';
  }

  /**
   * Validate configuration and provide helpful error messages
   */
  validateConfig(config: AppConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.model) {
      errors.push('Model name is required');
    }

    // Provider-specific validation
    if (config.provider === 'openai' && !config.apiKey) {
      if (!config.baseURL?.includes('localhost')) {
        errors.push('OpenAI API key is required (set LLM_API_KEY or OPENAI_API_KEY)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();