import { Command } from 'commander';
import { configManager, AppConfig } from './config-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { LLMProviderConfig } from './providers/base.js';
import { SetupManager } from './setup-manager.js';

interface ConfigOptions {
    get?: string;
    set?: string;
    list?: boolean;
    reset?: boolean;
}

interface ProviderOptions {
    list?: boolean;
    current?: boolean;
    switch?: string;
}

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
      .action((options: ConfigOptions) => this.handleConfigAction(options));
  }

  private async handleConfigAction(options: ConfigOptions) {
      if (options.get) {
          this.handleConfigGet(options.get);
      } else if (options.set) {
          this.handleConfigSet(options.set);
      } else if (options.reset) {
          configManager.reset();
          console.log('Configuration reset to defaults');
      } else {
          this.listConfig();
      }
  }

  private handleConfigGet(key: string) {
      const config = configManager.getAll();
      const value = config[key as keyof AppConfig];
      console.log(value !== undefined ? value : `Configuration key '${key}' not found`);
  }

  private handleConfigSet(keyValue: string) {
      const [key, value] = keyValue.split('=');

      if (!key || value === undefined) {
          console.error('Invalid format. Use: --set key=value');
          return;
      }

      const parsedValue = this.validateConfigValue(value);
      configManager.saveConfig({ [key]: parsedValue });
      console.log(`Configuration '${key}' set to: ${parsedValue}`);
  }

  private setupProviderCommand() {
    this.program
      .command('provider')
      .description('Manage LLM providers')
      .option('-l, --list', 'List available providers')
      .option('-c, --current', 'Show current provider')
      .option('-s, --switch <provider>', 'Switch to a different provider')
      .action(async (options: ProviderOptions) => {
        if (options.list) {
            this.listProviders();
        } else if (options.switch) {
            console.log('Launching setup wizard for provider switch...');
            await SetupManager.runSetup();
        } else {
            const { provider } = configManager.getAll();
            console.log(`Current provider: ${provider || 'default'}`);
        }
      });
  }

  private listProviders() {
      const providers = ProviderFactory.getSupportedProviders();
      console.log('Supported providers:');
      providers.forEach(provider => {
          const desc = ProviderFactory.getProviderDescription(provider);
          console.log(`  ${provider}: ${desc}`);
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

  private validateConfigValue(value: string): boolean | number | string {
      if (value === 'true') return true;
      if (value === 'false') return false;
      const num = Number(value);
      return !isNaN(num) ? num : value;
  }

  private listConfig() {
      const config = configManager.getAll();
      console.log('Current configuration:');
      Object.entries(config).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
      });
  }

  /**
   * Parse command line arguments and return as LLMProviderConfig
   */
  parseArgs(): Partial<LLMProviderConfig> {
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
    const args = process.argv.slice(2);

    if (!args.length) {
        const { startInteractiveSession } = await import('./interactive.js');
        await startInteractiveSession({});
    } else if (args[0].startsWith('/')) {
        const { startInteractiveSession } = await import('./interactive.js');
        await startInteractiveSession({ command: args.join(' ') });
    } else {
        await this.program.parseAsync(process.argv);
    }
  }
}
