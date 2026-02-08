import { Command } from 'commander';
import { configManager } from './config-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { LLMProviderConfig } from './providers/base.js';
import { SetupManager } from './setup-manager.js';

export class CLICommander {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands() {
    this.program
      .name('notention')
      .description('Notention CLI - Agentic text UI for knowledge management')
      .version('1.0.0');

    this.setupConfigCommand();
    this.setupProviderCommand();
    this.setupSetupCommand();
    this.setupRunCommand();
  }

  private setupConfigCommand() {
    this.program
      .command('config')
      .description('Manage configuration')
      .option('-g, --get <key>', 'Get a specific configuration value')
      .option('-s, --set <key=value>', 'Set a configuration value')
      .option('-l, --list', 'List all configuration values')
      .option('-r, --reset', 'Reset configuration to defaults')
      .action(async (options) => {
        if (options.get) {
          const config = configManager.getAll();
          const value = (config as any)[options.get];
          console.log(value !== undefined ? value : `Configuration key '${options.get}' not found`);
        } else if (options.set) {
          const [key, value] = options.set.split('=');
          if (!key || value === undefined) {
            console.error('Invalid format. Use: --set key=value');
            return;
          }
          
          const parsedValue = this.validateConfigValue(value);
          
          configManager.saveConfig({ [key]: parsedValue });
          console.log(`Configuration '${key}' set to: ${parsedValue}`);
        } else if (options.list) {
          this.listConfig();
        } else if (options.reset) {
          configManager.reset();
          console.log('Configuration reset to defaults');
        } else {
          this.listConfig();
        }
      });
  }

  private setupProviderCommand() {
    this.program
      .command('provider')
      .description('Manage LLM providers')
      .option('-l, --list', 'List available providers')
      .option('-c, --current', 'Show current provider')
      .option('-s, --switch <provider>', 'Switch to a different provider')
      .action(async (options) => {
        if (options.list) {
          const providers = ProviderFactory.getSupportedProviders();
          console.log('Supported providers:');
          providers.forEach(provider => {
            const desc = ProviderFactory.getProviderDescription(provider);
            console.log(`  ${provider}: ${desc}`);
          });
        } else if (options.current) {
          const config = configManager.getAll();
          console.log(`Current provider: ${config.provider || 'default'}`);
        } else if (options.switch) {
          console.log('Launching setup wizard for provider switch...');
          await SetupManager.runSetup();
        } else {
          const config = configManager.getAll();
          console.log(`Current provider: ${config.provider || 'default'}`);
        }
      });
  }

  private setupSetupCommand() {
    this.program
      .command('setup')
      .description('Interactive setup wizard')
      .action(async () => {
        await SetupManager.runSetup();
      });
  }

  private setupRunCommand() {
    this.program
      .command('run')
      .description('Run the Notention CLI')
      .option('--provider <provider>', 'LLM provider to use')
      .option('--model <model>', 'Model to use')
      .option('--url <url>', 'Base URL for the provider')
      .option('--key <key>', 'API key for the provider')
      .option('--temperature <temp>', 'Temperature for generation', parseFloat)
      .option('--max-tokens <tokens>', 'Maximum tokens to generate', parseInt)
      .option('--sim, --simulation', 'Enable simulation mode')
      .argument('[command]', 'Optional command to run directly')
      .action(async (command, options) => {
        const { startInteractiveSession } = await import('./interactive.js');
        await startInteractiveSession({ ...options, command });
      });
  }

  private validateConfigValue(value: string): any {
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(Number(value))) return Number(value);
      return value;
  }

  private listConfig() {
      const config = configManager.getAll();
      console.log('Current configuration:');
      for (const [key, value] of Object.entries(config)) {
        console.log(`  ${key}: ${value}`);
      }
  }

  /**
   * Parse command line arguments and return as LLMProviderConfig
   */
  parseArgs(): Partial<LLMProviderConfig> {
    this.program.parse();
    const options = this.program.opts();
    
    return {
      provider: options.provider,
      model: options.model,
      baseURL: options.url,
      apiKey: options.key,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
  }

  /**
   * Run the CLI
   */
  async run() {
    if (!process.argv.slice(2).length) {
      const { startInteractiveSession } = await import('./interactive.js');
      await startInteractiveSession({});
    } else {
      this.program.parse();
    }
  }
}
