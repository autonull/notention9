/**
 * Logging utilities for Notention system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logHistory: LogEntry[] = [];
  private maxLogEntries = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory.shift();
    }
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      const entry: LogEntry = { timestamp: Date.now(), level: 'debug', message, context };
      this.addToHistory(entry);
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      const entry: LogEntry = { timestamp: Date.now(), level: 'info', message, context };
      this.addToHistory(entry);
      console.info(`[INFO] ${message}`, context);
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      const entry: LogEntry = { timestamp: Date.now(), level: 'warn', message, context };
      this.addToHistory(entry);
      console.warn(`[WARN] ${message}`, context);
    }
  }

  error(message: string, error?: Error, context?: any): void {
    if (this.shouldLog('error')) {
      const entry: LogEntry = { timestamp: Date.now(), level: 'error', message, error, context };
      this.addToHistory(entry);
      console.error(`[ERROR] ${message}`, error || context);
    }
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

// Convenience functions
export const logDebug = (message: string, context?: any) => Logger.getInstance().debug(message, context);
export const logInfo = (message: string, context?: any) => Logger.getInstance().info(message, context);
export const logWarn = (message: string, context?: any) => Logger.getInstance().warn(message, context);
export const logError = (message: string, error?: Error, context?: any) => Logger.getInstance().error(message, error, context);