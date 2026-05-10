export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: unknown;
  error?: Error;
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logHistory: LogEntry[] = [];
  private maxLogEntries = 1000;
  private scope: string | null = null;
  private logHandler: (level: LogLevel, message: string, context?: unknown, error?: Error) => void;

  private constructor(scope: string | null = null) {
    this.scope = scope;
    this.logHandler = this.defaultLogHandler;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  child(scope: string): Logger {
    const childScope = this.scope ? `${this.scope}:${scope}` : scope;
    const child = new Logger(childScope);
    // Sync settings from parent
    child.logLevel = this.logLevel;
    child.logHandler = this.logHandler;
    // Proxy log history to the root instance
    child.logHistory = this.logHistory;
    return child;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setLogHandler(handler: (level: LogLevel, message: string, context?: unknown, error?: Error) => void): void {
    this.logHandler = handler;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.logLevel);
  }

  private defaultLogHandler(level: LogLevel, message: string, context?: unknown, error?: Error): void {
    const consoleArgs = [context].filter(arg => arg !== undefined);
    if (error) consoleArgs.push(error);

    const logFn = console[level] ?? console.log;
    logFn(`[${level.toUpperCase()}] ${message}`, ...consoleArgs);
  }

  private log(level: LogLevel, message: string, context?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const scopedMessage = this.scope ? `[${this.scope}] ${message}` : message;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: scopedMessage,
      context,
      error,
    };

    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory.shift();
    }

    this.logHandler(level, scopedMessage, context, error);
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
    let logs = this.logHistory;
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    if (limit) {
      logs = logs.slice(-limit);
    }
    return logs;
  }

  clearLogs(): void {
    this.logHistory = [];
  }
}

export const logDebug = (message: string, context?: unknown) => Logger.getInstance().debug(message, context);
export const logInfo = (message: string, context?: unknown) => Logger.getInstance().info(message, context);
export const logWarn = (message: string, context?: unknown) => Logger.getInstance().warn(message, context);
export const logError = (message: string, error?: Error, context?: unknown) => Logger.getInstance().error(message, error, context);
