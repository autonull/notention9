import { Command } from 'commander';
import inquirer from 'inquirer';
import { configManager } from './config-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { log } from './utils.js';
import { LLMProviderConfig } from './providers/base.js';

// Define provider-specific questions
const PROVIDER_QUESTIONS: Record<string, any[]> = {
  openai: [
    {
      type: 'input',
      name: 'model',
      message: 'Enter OpenAI model (e.g., gpt-4o):',
      default: 'gpt-4o',
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter OpenAI API key:',
      mask: '*',
    },
  ],
  ollama: [
    {
      type: 'input',
      name: 'model',
      message: 'Enter Ollama model (e.g., llama3.2):',
      default: 'llama3.2',
    },
    {
      type: 'input',
      name: 'baseURL',
      message: 'Enter Ollama base URL:',
      default: 'http://localhost:11434/v1',
    },
  ],
  transformers: [
    {
      type: 'input',
      name: 'model',
      message: 'Enter Transformers.js model (e.g., onnx-community/Qwen2.5-0.5B-Instruct):',
      default: 'onnx-community/Qwen2.5-0.5B-Instruct',
    },
  ],
  local: [
    {
      type: 'input',
      name: 'model',
      message: 'Enter local model name:',
      default: 'local-model',
    },
    {
      type: 'input',
      name: 'baseURL',
      message: 'Enter local server base URL:',
      default: 'http://localhost:3000/v1',
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter API key (if required):',
      mask: '*',
    },
  ],
};

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

    // Config command
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
          
          // Convert value to appropriate type
          let parsedValue: any = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);
          
          configManager.saveConfig({ [key]: parsedValue });
          console.log(`Configuration '${key}' set to: ${parsedValue}`);
        } else if (options.list) {
          const config = configManager.getAll();
          console.log('Current configuration:');
          for (const [key, value] of Object.entries(config)) {
            console.log(`  ${key}: ${value}`);
          }
        } else if (options.reset) {
          configManager.reset();
          console.log('Configuration reset to defaults');
        } else {
          // Default: show current config
          const config = configManager.getAll();
          console.log('Current configuration:');
          for (const [key, value] of Object.entries(config)) {
            console.log(`  ${key}: ${value}`);
          }
        }
      });

    // Provider command
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
          await this.interactiveSetup(options.switch);
        } else {
          // Default: show current provider
          const config = configManager.getAll();
          console.log(`Current provider: ${config.provider || 'default'}`);
        }
      });

    // Setup command
    this.program
      .command('setup')
      .description('Interactive setup wizard')
      .action(async () => {
        await this.interactiveSetup();
      });

    // Run command (the main functionality)
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
        // Import and run the main CLI here
        const { main } = await import('./index.js');
        await main({ ...options, command });
      });
  }

  /**
   * Interactive setup wizard
   */
  async interactiveSetup(provider?: string) {
    console.log('🚀 Notention Setup Wizard\n');

    // Get current config
    let currentConfig = configManager.getAll();

    // Select provider if not specified
    if (!provider) {
      const providerAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select LLM provider:',
          choices: ProviderFactory.getSupportedProviders(),
          default: currentConfig.provider || 'ollama',
        },
      ]);
      provider = providerAnswer.provider;
    }

    // Get provider-specific questions - ensure provider is defined
    const providerKey = provider || currentConfig.provider || 'ollama';
    const questions = PROVIDER_QUESTIONS[providerKey] ?
      [...PROVIDER_QUESTIONS[providerKey]] : [];
    
    // Add common options
    questions.push(
      {
        type: 'number',
        name: 'temperature',
        message: 'Set temperature (0.0-2.0):',
        default: currentConfig.temperature || 0.7,
        min: 0,
        max: 2,
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Set maximum tokens:',
        default: currentConfig.maxTokens || 2000,
        min: 1,
      }
    );

    // Ask provider-specific questions
    const answers = await inquirer.prompt(questions);

    // Merge with current config
    const newConfig = {
      provider: provider || currentConfig.provider || 'ollama',
      model: answers.model || currentConfig.model || configManager.getDefaultModel(provider || currentConfig.provider || 'ollama'),
      baseURL: answers.baseURL || currentConfig.baseURL,
      apiKey: answers.apiKey || currentConfig.apiKey,
      temperature: answers.temperature ?? currentConfig.temperature ?? 0.7,
      maxTokens: answers.maxTokens ?? currentConfig.maxTokens ?? 2000,
    };

    // Validate the new configuration
    const validation = configManager.validateConfig(newConfig);
    if (!validation.valid) {
      console.error('Configuration validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      return;
    }

    // Save the new configuration
    configManager.saveConfig(newConfig);
    console.log('\n✅ Configuration saved successfully!');
    console.log(`Provider: ${newConfig.provider}`);
    console.log(`Model: ${newConfig.model}`);
  }

  /**
   * Parse command line arguments and return as LLMProviderConfig
   */
  parseArgs(): Partial<LLMProviderConfig> {
    this.program.parse();
    const options = this.program.opts();
    
    // Map commander options to LLMProviderConfig
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
    // If no command is specified, run the default behavior
    if (!process.argv.slice(2).length) {
      // Import and run the main CLI here
      const { main } = await import('./index.js');
      await main({});
    } else {
      this.program.parse();
    }
  }
}