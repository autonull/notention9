import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';

import { handleClear, handleSave, handleLoad } from './session.js';
import { handleConfig, handleProviders, handleProvider } from './config.js';
import { handleTools, handleExtract } from './tools.js';
import { handleOpen, handleClose } from './context.js';
import { handleSecurity } from './security.js';
import { handleExit, handleHelp } from './system.js';
import { handleSetup } from './setup.js';

type CommandHandler = (args: string[], cli: CliClient, tools: any[], session?: LlmSession) => Promise<boolean>;

/**
 * CLI Command Registry
 * 
 * Modular command structure - each command category in its own file:
 * - session.ts: clear, save, load
 * - config.ts: config, providers, provider
 * - tools.ts: tools, extract
 * - context.ts: open, close
 * - security.ts: security
 * - system.ts: exit, quit, help
 * - setup.ts: setup
 */

const COMMANDS: Record<string, CommandHandler> = {
  // System
  '/exit': (_args, _cli, _tools, _session) => handleExit(),
  '/quit': (_args, _cli, _tools, _session) => handleExit(),
  '/help': (_args, _cli, _tools, _session) => handleHelp(),
  '/clear': (_args, _cli, _tools, session) => handleClear(_args, session),

  // Session
  '/save': (args, _cli, _tools, session) => handleSave(args, session),
  '/load': (args, _cli, _tools, session) => handleLoad(args, session),

  // Configuration
  '/config': (args, _cli, _tools, session) => handleConfig(args, session),
  '/providers': (args, _cli, _tools, session) => handleProviders(args, session),
  '/provider': (args, _cli, _tools, session) => handleProvider(args, session),

  // Tools
  '/tools': (args, cli, tools) => handleTools(args, cli, tools),
  '/extract': (args, cli) => handleExtract(args, cli),

  // Context
  '/open': (args, cli, _tools, session) => handleOpen(args, cli, session),
  '/close': (args, cli, _tools, session) => handleClose(args, cli, session),

  // Security
  '/security': (args, cli) => handleSecurity(args, cli),

  // Setup
  '/setup': (args, cli) => handleSetup(args, cli),
};

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[], session?: LlmSession): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    const handler = COMMANDS[cmd];

    if (handler) {
        return handler(args, cli, tools, session);
    }

    console.warn("Unknown command. Type /help.");
    return true;
}

export function getSlashCommands(): string[] {
    return Object.keys(COMMANDS);
}
