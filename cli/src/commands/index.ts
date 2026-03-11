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
    '/exit': (args, cli, tools, session) => handleExit(),
    '/quit': (args, cli, tools, session) => handleExit(),
    '/help': (args, cli, tools, session) => handleHelp(),
    '/clear': (args, cli, tools, session) => handleClear(session),

    // Session
    '/save': (args, cli, tools, session) => handleSave(args, session),
    '/load': (args, cli, tools, session) => handleLoad(args, session),

    // Configuration
    '/config': (args, cli, tools, session) => handleConfig(args, session),
    '/providers': (args, cli, tools, session) => handleProviders(args, session),
    '/provider': (args, cli, tools, session) => handleProvider(args, session),

    // Tools
    '/tools': (args, cli, tools) => handleTools(args, cli, tools),
    '/extract': (args, cli, tools) => handleExtract(args, cli),

    // Context
    '/open': (args, cli, tools, session) => handleOpen(args, cli, session),
    '/close': (args, cli, tools, session) => handleClose(args, cli, session),

    // Security
    '/security': (args, cli, tools) => handleSecurity(args, cli),

    // Setup
    '/setup': (args, cli, tools) => handleSetup(args, cli),
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
