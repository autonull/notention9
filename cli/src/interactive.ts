import * as readline from 'readline';
import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { handleSlashCommand } from './commands.js';
import { LlmSession, LLMProviderConfig } from './llm.js';
import { getLocalTools } from './tools/index.js';
import { log, withSpinner } from './utils.js';
import { configManager } from './config-manager.js';
import { ProviderFactory } from './providers/index.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

// Main function that can accept options from the CLI commander
export async function startInteractiveSession(options: {
  provider?: string;
  model?: string;
  url?: string;
  key?: string;
  temperature?: number;
  maxTokens?: number;
  sim?: boolean;
  simulation?: boolean;
  command?: string;
} = {}) {
  // Prepare config overrides from options
  const configOverrides: Partial<LLMProviderConfig> = {};
  if (options.provider) configOverrides.provider = options.provider;
  if (options.model) configOverrides.model = options.model;
  if (options.url) configOverrides.baseURL = options.url;
  if (options.key) configOverrides.apiKey = options.key;
  if (options.temperature !== undefined) configOverrides.temperature = options.temperature;
  if (options.maxTokens !== undefined) configOverrides.maxTokens = options.maxTokens;

  // Load configuration using the new config manager
  const config = await configManager.loadConfig(configOverrides);

  // Ensure model is set if not provided
  const finalConfig = {
    ...config,
    model: config.model || configManager.getDefaultModel(config.provider)
  };

  const validation = configManager.validateConfig(finalConfig);

  if (!validation.valid) {
    log.error('Configuration validation failed:');
    validation.errors.forEach(err => log.error(`  - ${err}`));
    process.exit(1);
  }

  // Create provider
  const provider = ProviderFactory.create(finalConfig);

  const cli = new CliClient(MCP_URL);
  const simCli = new CliClient(SIM_MCP_URL);
  const enableSim = options.sim || options.simulation;
  const command = options.command;
  const interactive = !command;

  try {
    if (interactive) log.info("Connecting to Notention Agent...");

    // Connection retry logic
    let connected = false;
    let retries = 3;
    while (!connected && retries > 0) {
      try {
        await cli.connect();
        connected = true;
        if (interactive) log.success(`Connected to Notention Agent at ${MCP_URL}`);
      } catch (e) {
        retries--;
        if (retries > 0) {
          if (interactive) log.warn(`Connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        } else {
          throw new Error(`Failed to connect to Notention Agent after 3 attempts: ${e}`);
        }
      }
    }

    let simTools: any[] = [];

    if (enableSim) {
      try {
        if (interactive) log.info("Connecting to Simulation Agent...");
        await simCli.connect();
        const simToolsResult = await withSpinner('Loading simulation tools...', () => simCli.listTools());
        simTools = simToolsResult.tools;
        if (interactive) log.success(`Connected to Simulation Agent at ${SIM_MCP_URL}`);
      } catch (e) {
        if (interactive) log.warn(`Simulation Agent unavailable (skipping)`);
      }
    }

    const toolsResult = await cli.listTools();
    const coreTools = toolsResult.tools;

    // Initialize local tools
    const localTools = getLocalTools(cli);

    // Aggregate Tools
    const allTools = [
      ...coreTools,
      ...simTools,
      ...localTools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    ];

    // Create Tool Executor Strategy
    const toolExecutor = async (name: string, args: any) => {
      const localTool = localTools.find(t => t.name === name);
      if (localTool) return await localTool.execute(args);

      const isSimTool = simTools.some((t: any) => t.name === name);
      if (isSimTool && simCli.connected) {
        return await simCli.callTool(name, args);
      }

      return await cli.callTool(name, args);
    };

    const session = new LlmSession(allTools, toolExecutor, provider);

    // Perform health check
    if (interactive) {
      try {
        const healthResult: any = await withSpinner(
          'Checking LLM provider connection...',
          () => provider.healthCheck()
        );

        if (!healthResult.healthy) {
          log.warn(`Provider health check failed: ${healthResult.message}`);
          log.warn('Continuing anyway, but you may encounter errors...');
        } else if (healthResult.message) {
          log.success(healthResult.message);
        }
      } catch (healthError: any) {
         log.warn(`Provider health check failed: ${healthError.message || healthError}`);
         log.warn('Continuing anyway, but you may encounter errors...');
      }
    }

    if (command) {
      await session.handleInteraction(command);
      await cli.close();
      await simCli.close();
      process.exit(0);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log("\n" + "=".repeat(50));
      log.info("Welcome to Notention CLI");
      const sessionConfig = session.getConfig();
      log.info(`Provider: ${sessionConfig.provider}`);
      log.info(`Model: ${sessionConfig.model}`);
      if (enableSim) log.info("Simulation Mode: ENABLED");
      console.log("Type /help for commands, or just chat with the agent.");
      console.log("=".repeat(50) + "\n");

      const ask = () => {
        rl.question('> ', async (rawInput) => {
          const input = rawInput.trim();

          if (!input) {
            ask();
            return;
          }

          if (input.startsWith('/')) {
            await handleSlashCommand(input, cli, coreTools, session);
          } else {
            await session.handleInteraction(input);
          }

          ask();
        });
      };

      ask();
    }

  } catch (e) {
    log.error("Failed to connect", e);
    process.exit(1);
  }
}
