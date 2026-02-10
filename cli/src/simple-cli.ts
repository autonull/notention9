#!/usr/bin/env node

import * as readline from 'readline';
import { simpleConfig } from './simple-config.js';
import { ProviderFactory } from './providers/index.js';
import { LlmSession } from './proper-llm-integration.js';
import { getLocalTools } from './tools/index.js';
import { CliClient } from './client.js';
import { log, withSpinner } from './utils.js';

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

// Parse command line arguments
const args = process.argv.slice(2);
const configOverrides: any = {};

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' && args[i + 1]) {
    configOverrides.provider = args[++i];
  } else if (args[i] === '--model' && args[i + 1]) {
    configOverrides.model = args[++i];
  } else if (args[i] === '--url' && args[i + 1]) {
    configOverrides.baseURL = args[++i];
  } else if (args[i] === '--key' && args[i + 1]) {
    configOverrides.apiKey = args[++i];
  } else if (args[i] === '--temperature' && args[i + 1]) {
    configOverrides.temperature = parseFloat(args[++i]);
  } else if (args[i] === '--max-tokens' && args[i + 1]) {
    configOverrides.maxTokens = parseInt(args[++i]);
  }
}

// Get configuration
const config = simpleConfig.getConfig();
const finalConfig = { ...config, ...configOverrides };

// If no model is set, set a default based on provider
if (!finalConfig.model) {
  if (finalConfig.provider === 'ollama') {
    finalConfig.model = 'llama3.2';
  } else if (finalConfig.provider === 'transformers') {
    finalConfig.model = 'onnx-community/Qwen2.5-0.5B-Instruct';
  } else {
    finalConfig.model = 'gpt-4o';
  }
}

console.log(`\n🚀 Using provider: ${finalConfig.provider}, model: ${finalConfig.model}\n`);

// Save the updated config
simpleConfig.updateConfig(finalConfig);

// Create provider
const provider = ProviderFactory.create(finalConfig);

async function main() {
  const cli = new CliClient(MCP_URL);
  const simCli = new CliClient(SIM_MCP_URL);
  const enableSim = args.includes('--sim') || args.includes('--simulation');
  const commandArg = args.filter(arg => !arg.startsWith('--')).join(' ').trim();
  const interactive = !commandArg;

  try {
    if (interactive) log.info("Connecting to Notention Agent...");

    // Add connection retry logic
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
        if (interactive) log.warn(`Simulation Agent unavailable (skipping): ${e}`);
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
      try {
        const localTool = localTools.find(t => t.name === name);
        if (localTool) {
          return await localTool.execute(args);
        }

        const isSimTool = simTools.some((t: any) => t.name === name);
        if (isSimTool && simCli.connected) {
          return await simCli.callTool(name, args);
        }

        return await cli.callTool(name, args);
      } catch (error) {
        log.error(`Tool execution failed: ${name}`, error);
        throw error;
      }
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

    if (commandArg) {
      await session.handleInteraction(commandArg);
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
            // Handle slash commands
            if (input === '/help') {
              console.log(`
Commands:
  /help - Show this help
  /config - Show current configuration
  /providers - List available providers
  /provider <name> [model] - Switch to a different provider
  /setup - Quick setup information
  /quit - Exit the CLI
              `);
            } else if (input === '/config') {
              const config = session.getConfig();
              console.log('Current configuration:');
              console.log(`  Provider: ${config.provider}`);
              console.log(`  Model: ${config.model}`);
              console.log(`  Base URL: ${config.baseURL || 'default'}`);
            } else if (input === '/providers') {
              const providers = ['openai', 'ollama', 'transformers', 'local'];
              console.log('Available providers:');
              providers.forEach(p => console.log(`  - ${p}`));
            } else if (input.startsWith('/provider')) {
              const parts = input.split(' ');
              if (parts.length < 2) {
                console.log('Usage: /provider <name> [model]');
                ask();
                return;
              }

              const newProvider = parts[1];
              const newModel = parts[2] || null;

              // Update configuration
              const updates: any = { provider: newProvider };
              if (newModel) updates.model = newModel;

              simpleConfig.updateConfig(updates);
              console.log(`Configuration updated. Provider: ${newProvider}, Model: ${newModel || updates.model}`);
              console.log('Restart the CLI to use the new configuration.');
            } else if (input === '/setup') {
              console.log('\n📋 Quick Setup Wizard');
              console.log('Available providers: ollama, transformers, openai, local');
              console.log('Example: /provider ollama -- then restart CLI');
              console.log('For Ollama, make sure to run: ollama pull llama3.2 (or gemma3:4b)\n');
            } else if (input === '/quit' || input === '/exit') {
              rl.close();
              await cli.close();
              await simCli.close();
              process.exit(0);
            } else {
              console.log('Unknown command. Type /help for available commands.');
            }
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

// Run the main function
main();