export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: unknown;
  error?: Error;
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

interface LoggerConfig {
  logLevel: LogLevel;
  logHandler: (level: LogLevel, message: string, context?: unknown, error?: Error) => void;
  logHistory: LogEntry[];
  maxLogEntries: number;
}

const defaultConfig: LoggerConfig = {
  logLevel: 'info',
  logHandler: defaultLogHandler,
  logHistory: [],
  maxLogEntries: 1000,
};

function defaultLogHandler(level: LogLevel, message: string, context?: unknown, error?: Error): void {
  const consoleArgs = [context].filter(arg => arg !== undefined);
  if (error) consoleArgs.push(error);
  const logFn = console[level] ?? console.log;
  logFn(`[${level.toUpperCase()}] ${message}`, ...consoleArgs);
}

function shouldLog(level: LogLevel, config: LoggerConfig): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(config.logLevel);
}

function createLogger(scope: string | null, config: LoggerConfig): Logger {
  return new Logger(scope, config);
}

export class Logger {
  readonly scope: string | null;
  private readonly config: LoggerConfig;

  private constructor(scope: string | null, config: LoggerConfig) {
    this.scope = scope;
    this.config = config;
  }

  static create(scope?: string): Logger {
    return createLogger(scope ?? null, defaultConfig);
  }

  static getInstance(): Logger {
    return rootLogger;
  }

  child(scope: string): Logger {
    const childScope = this.scope ? `${this.scope}:${scope}` : scope;
    return createLogger(childScope, this.config);
  }

  setLogLevel(level: LogLevel): void {
    this.config.logLevel = level;
  }

  setLogHandler(handler: (level: LogLevel, message: string, context?: unknown, error?: Error) => void): void {
    this.config.logHandler = handler;
  }

  private log(level: LogLevel, message: string, context?: unknown, error?: Error): void {
    if (!shouldLog(level, this.config)) return;

    const scopedMessage = this.scope ? `[${this.scope}] ${message}` : message;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: scopedMessage,
      context,
      error,
    };

    this.config.logHistory.push(entry);
    if (this.config.logHistory.length > this.config.maxLogEntries) {
      this.config.logHistory.shift();
    }

    this.config.logHandler(level, scopedMessage, context, error);
  }

  debug(message: string, context?: unknown): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: unknown): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: unknown): void {
    this.log('error', message, context, error);
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let logs = this.config.logHistory;
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    if (limit) {
      logs = logs.slice(-limit);
    }
    return logs;
  }

  clearLogs(): void {
    this.config.logHistory.length = 0;
  }
}

const rootLogger = Logger.create();

export const logDebug = (message: string, context?: unknown) => rootLogger.debug(message, context);
export const logInfo = (message: string, context?: unknown) => rootLogger.info(message, context);
export const logWarn = (message: string, context?: unknown) => rootLogger.warn(message, context);
export const logError = (message: string, error?: Error, context?: unknown) => rootLogger.error(message, error, context);

export const log = (context: string, message: string, data?: unknown): void => {
  rootLogger.info(`[${context}] ${message}`, data);
};

export const error = (context: string, message: string, err?: unknown, data?: unknown): void => {
  const errorObj = err instanceof Error ? err : (err ? new Error(String(err)) : undefined);
  rootLogger.error(`[${context}] ERROR: ${message}`, errorObj, { context, ...(data as any) });
};

export const getRootLogger = () => rootLogger;