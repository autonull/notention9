export class NotentionError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'NotentionError';
  }
}