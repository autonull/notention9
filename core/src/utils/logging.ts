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

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

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
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
      if (!this.shouldLog(level)) return;

      const entry: LogEntry = {
          timestamp: Date.now(),
          level,
          message,
          context,
          error
      };

      this.logHistory.push(entry);
      if (this.logHistory.length > this.maxLogEntries) {
          this.logHistory.shift();
      }

      const consoleArgs = [context].filter(arg => arg !== undefined);
      if (error) consoleArgs.push(error);

      switch (level) {
          case 'debug': console.debug(`[DEBUG] ${message}`, ...consoleArgs); break;
          case 'info': console.info(`[INFO] ${message}`, ...consoleArgs); break;
          case 'warn': console.warn(`[WARN] ${message}`, ...consoleArgs); break;
          case 'error': console.error(`[ERROR] ${message}`, ...consoleArgs); break;
      }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: any): void {
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

// Convenience functions
export const logDebug = (message: string, context?: any) => Logger.getInstance().debug(message, context);
export const logInfo = (message: string, context?: any) => Logger.getInstance().info(message, context);
export const logWarn = (message: string, context?: any) => Logger.getInstance().warn(message, context);
export const logError = (message: string, error?: Error, context?: any) => Logger.getInstance().error(message, error, context);
