import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from '@notention/core';

// Configure Core Logger
const logger = Logger.getInstance();

let isVerbose = false;
const suppressedContexts = ['Server', 'WS', 'Init', 'MCP'];

export const setVerbose = (v: boolean) => {
    isVerbose = v;
};

logger.setLogHandler((level, message, context, error) => {
    // Filter out suppressed contexts unless verbose
    if (!isVerbose && typeof context === 'string' && suppressedContexts.includes(context)) {
        return;
    }

    const shouldShowContext = context && (isVerbose || !suppressedContexts.includes(context as string));

    switch (level) {
        case 'info':
            console.log(chalk.blue('ℹ'), message);
            if (shouldShowContext) console.log(context);
            break;
        case 'warn':
            console.log(chalk.yellow('⚠'), message);
            if (shouldShowContext) console.log(context);
            break;
        case 'error':
            console.error(chalk.red('✖'), message);
            if (error) console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
            if (context) console.error(context);
            break;
        case 'debug':
            if (process.env.DEBUG || isVerbose) {
                 console.debug(chalk.gray('🐛'), message);
                 if (context) console.debug(context);
            }
            break;
    }
});

export const log = {
    info: (msg: string, context?: any) => logger.info(msg, context),
    success: (msg: string) => console.log(chalk.green('✔'), msg),
    warn: (msg: string, context?: any) => logger.warn(msg, context),
    error: (msg: string, err?: unknown) => logger.error(msg, err instanceof Error ? err : new Error(String(err))),
    chat: (role: string, msg: string) => {
        const color = role === 'Agent' ? chalk.blue : chalk.green;
        console.log(`${color.bold(role)}: ${msg}`);
    }
};

export const withSpinner = async <T>(text: string, action: () => Promise<T>): Promise<T> => {
    const spinner = ora(text).start();
    try {
        const result = await action();
        spinner.succeed();
        return result;
    } catch (e) {
        spinner.fail();
        throw e;
    }
};

export function resolveSafePath(userPath: string): string {
    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, userPath);
    const rel = path.relative(cwd, resolvedPath);

    // Allow if it's the cwd itself (rel === '') or a subdirectory
    // Block if it goes up (starts with ..) or is absolute (different drive on windows)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Access denied: Path '${userPath}' is outside the working directory.`);
    }

    return resolvedPath;
}

export async function isBinary(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
        await handle.close();

        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) return true; // Null byte indicates binary
        }
        return false;
    } catch (e) {
        return true; // If can't read, treat as binary/skip
    }
}
