import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { Logger, type LogLevel } from '@notention/core';

let isVerbose = false;
const suppressedContexts = new Set(['Server', 'WS', 'Init', 'MCP']);

export const setVerbose = (v: boolean): void => { isVerbose = v; };

const logger = Logger.getInstance();

const createCliLogHandler = (verbose: boolean) => (
  level: LogLevel,
  message: string,
  context?: unknown,
  error?: Error
): void => {
  if (!verbose && typeof context === 'string' && suppressedContexts.has(context)) return;
  const showContext = verbose || (context && !suppressedContexts.has(context as string));

  const prefix = { info: chalk.blue('ℹ'), warn: chalk.yellow('⚠'), error: chalk.red('✖'), debug: chalk.gray('🐛') }[level];

  console[level === 'error' ? 'error' : level === 'debug' ? 'debug' : 'log'](prefix, message);
  if (showContext && context) console[level === 'error' ? 'error' : 'log'](context);
  if (error) console.error(chalk.dim(error.message));
};

logger.setLogHandler(createCliLogHandler(isVerbose));

export const log = {
  info: (msg: string, context?: unknown) => logger.info(msg, context),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string, context?: unknown) => logger.warn(msg, context),
  error: (msg: string, err?: unknown) => logger.error(msg, err instanceof Error ? err : new Error(String(err))),
  chat: (role: string, msg: string) => {
    const color = role === 'Agent' ? chalk.blue : chalk.green;
    console.log(`${color.bold(role)}: ${msg}`);
  },
};

export const withSpinner = async <T>(text: string, action: () => Promise<T>): Promise<T> => {
  const spinner = ora(text).start();
  try {
    const result = await action();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
};

export const resolveSafePath = (userPath: string): string => {
  const cwd = process.cwd();
  const resolvedPath = path.resolve(cwd, userPath);
  const rel = path.relative(cwd, resolvedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Access denied: Path '${userPath}' is outside the working directory.`);
  }
  return resolvedPath;
};

export const isBinary = async (filePath: string): Promise<boolean> => {
  try {
    const handle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
    await handle.close();
    return Array.from(buffer).slice(0, bytesRead).some(byte => byte === 0);
  } catch {
    return true;
  }
};
