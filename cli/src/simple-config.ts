import fs from 'fs';
import path from 'path';
import os from 'os';

// Simple configuration interface
export interface SimpleConfig {
  provider: string;
  model: string;
  baseURL?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

// Simple configuration manager
export class SimpleConfigManager {
  private configPath: string;
  private config: SimpleConfig;

  constructor() {
    // Use a simple config file in the home directory
    const homedir = os.homedir();
    this.configPath = path.join(homedir, '.notention-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): SimpleConfig {
    // Default config
    const defaultConfig: SimpleConfig = {
      provider: 'ollama',
      model: 'llama3.2', // Use the same default as the original system
      temperature: 0.7,
      maxTokens: 2000
    };

    // Try to load from file
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const savedConfig = JSON.parse(fileContent);
        return { ...defaultConfig, ...savedConfig };
      }
    } catch (error) {
      console.warn('Could not load config file, using defaults:', error);
    }

    return defaultConfig;
  }

  public saveConfig(config: SimpleConfig): void {
    this.config = { ...this.config, ...config };
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Could not save config file:', error);
    }
  }

  public getConfig(): SimpleConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SimpleConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig(this.config);
  }
}

// Export singleton instance
export const simpleConfig = new SimpleConfigManager();