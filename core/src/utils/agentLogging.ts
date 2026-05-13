import { Logger } from './logging.js';

const logger = Logger.getInstance();

export const log = (context: string, message: string, data?: unknown): void => {
  logger.info(`[${context}] ${message}`, data);
};

export const error = (context: string, message: string, err?: unknown, data?: unknown): void => {
  const errorObj = err instanceof Error ? err : (err ? new Error(String(err)) : undefined);
  logger.error(`[${context}] ERROR: ${message}`, errorObj, { context, ...(data as any) });
};
