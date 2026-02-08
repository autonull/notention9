import inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from './config-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { log, withSpinner } from './utils.js';
import { CliClient } from './client.js';

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

export class SetupManager {
  static async runSetup(cli?: CliClient) {
    console.log('\n' + chalk.bold.blue('Welcome to Notention Setup Wizard! 🧙‍♂️') + '\n');

    // Get current config
    let currentConfig = configManager.getAll();

    // 1. Ask for Name and Privacy (System config)
    const systemAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'What should I call you?',
            default: (currentConfig as any).name || 'User'
        },
        {
            type: 'list',
            name: 'privacy',
            message: 'Privacy Mode:',
            choices: ['local-only', 'shared'],
            default: (currentConfig as any).privacy || 'local-only'
        }
    ]);

    // 2. Provider Selection
    const providerAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select LLM provider:',
        choices: ProviderFactory.getSupportedProviders(),
        default: currentConfig.provider || 'ollama',
      },
    ]);
    const provider = providerAnswer.provider;

    // 3. Provider Specific Questions
    const providerKey = provider;
    const questions = PROVIDER_QUESTIONS[providerKey] ?
      [...PROVIDER_QUESTIONS[providerKey]] : [];

    // Add common options if not already asked
    if (!questions.some(q => q.name === 'temperature')) {
        questions.push({
            type: 'number',
            name: 'temperature',
            message: 'Set temperature (0.0-2.0):',
            default: currentConfig.temperature || 0.7,
            min: 0,
            max: 2,
        });
    }
    if (!questions.some(q => q.name === 'maxTokens')) {
        questions.push({
            type: 'number',
            name: 'maxTokens',
            message: 'Set maximum tokens:',
            default: currentConfig.maxTokens || 2000,
            min: 1,
        });
    }

    const answers = await inquirer.prompt(questions);

    // Merge with current config
    const newConfig = {
      ...currentConfig,
      name: systemAnswers.name,
      privacy: systemAnswers.privacy,
      provider: provider,
      model: answers.model || currentConfig.model || configManager.getDefaultModel(provider),
      baseURL: answers.baseURL || currentConfig.baseURL,
      apiKey: answers.apiKey || currentConfig.apiKey,
      temperature: answers.temperature ?? currentConfig.temperature ?? 0.7,
      maxTokens: answers.maxTokens ?? currentConfig.maxTokens ?? 2000,
    };

    // Validate
    const validation = configManager.validateConfig(newConfig);
    if (!validation.valid) {
      console.error('Configuration validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      return;
    }

    // Save
    configManager.saveConfig(newConfig);
    console.log('\n' + chalk.green('✓ Configuration saved locally!'));

    // 4. Create System Configuration Note (if connected)
    if (cli && cli.connected) {
        console.log('\n' + chalk.yellow('Syncing configuration to Agent...') + '\n');

        const properties = [
            `[user:name:is:${newConfig.name}]`,
            `[privacy:level:is:${newConfig.privacy}]`,
            `[ai:provider:is:${newConfig.provider}]`,
            `[ai:model:is:${newConfig.model}]`,
            `[ai:enabled:is:true]`,
            `[capability:files:is:true]`
        ];

        const content = `# System Configuration
@config:active
@setup

Configuration generated by CLI Setup Wizard.

${properties.join('\n')}
        `;

        try {
            await withSpinner('Saving configuration note...', async () => {
                await cli.callTool('create_note', {
                    title: 'System Configuration',
                    content: content,
                    tags: ['@config:active', 'config', 'setup'],
                    properties: [
                        { key: 'user:name', operator: 'is', values: [newConfig.name] },
                        { key: 'privacy:level', operator: 'is', values: [newConfig.privacy] },
                        { key: 'ai:provider', operator: 'is', values: [newConfig.provider] },
                        { key: 'ai:model', operator: 'is', values: [newConfig.model] },
                        { key: 'ai:enabled', operator: 'is', values: ['true'] },
                        { key: 'capability:files', operator: 'is', values: ['true'] }
                    ]
                });
            });

            // Cleanup old onboarding notes
            await withSpinner('Cleaning up old onboarding notes...', async () => {
                const result = await cli.callTool('read_notes', { tags: ['@onboarding:setup'] });
                const content = (result as any).content;
                if (content && content[0] && content[0].text) {
                    try {
                        const notes = JSON.parse(content[0].text);
                        if (Array.isArray(notes)) {
                            for (const note of notes) {
                                await cli.callTool('delete_note', { id: note.id });
                            }
                        }
                    } catch (parseError) {
                        // Ignore parse errors if no notes found or invalid JSON
                    }
                }
            });

            log.success('Agent configuration synced successfully!');
        } catch (e: any) {
            log.warn(`Failed to sync configuration to agent: ${e.message}`);
        }
    } else if (cli && !cli.connected) {
        log.warn('Agent not connected. Configuration saved locally but not synced to agent notes.');
    }

    console.log('\n' + chalk.bold.green('Setup complete! You are ready to go.') + '\n');
  }
}
