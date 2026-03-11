/**
 * Base service class providing common functionality for all services
 */

import { generateId } from './utils/common.js';
import { Logger, logInfo, logError, logWarn } from './utils/logging.js';

export abstract class BaseService {
  protected readonly createdAt: number;
  protected readonly id: string;
  protected readonly logger = Logger.getInstance();

  constructor(idPrefix?: string) {
    this.createdAt = Date.now();
    this.id = idPrefix ? generateId(`${idPrefix}_`) : generateId();
  }

  /**
   * Safely execute a function with error handling and logging
   */
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    try {
      const result = await operation();
      logInfo(`${operationName} completed successfully`, { ...context, serviceId: this.id });
      return { success: true, result };
    } catch (error) {
      logError(`${operationName} failed`, error as Error, { ...context, serviceId: this.id });
      return { success: false, error: error as Error };
    }
  }

  /**
   * Safely execute a synchronous function with error handling and logging
   */
  protected safeExecuteSync<T>(
    operation: () => T,
    operationName: string,
    context?: Record<string, any>
  ): { success: boolean; result?: T; error?: Error } {
    try {
      const result = operation();
      logInfo(`${operationName} completed successfully`, { ...context, serviceId: this.id });
      return { success: true, result };
    } catch (error) {
      logError(`${operationName} failed`, error as Error, { ...context, serviceId: this.id });
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get service info
   */
  public getInfo(): { id: string; createdAt: number; type: string } {
    return {
      id: this.id,
      createdAt: this.createdAt,
      type: this.constructor.name
    };
  }
}