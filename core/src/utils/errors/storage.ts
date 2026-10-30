import { NotentionError } from './base.js';

export class StorageError extends NotentionError {
    constructor(
        message: string,
        public readonly operation: 'read' | 'write' | 'delete' | 'migrate',
        public readonly key?: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'StorageError';
    }
}

export class StorageMigrationError extends StorageError {
    constructor(message: string, public readonly fromVersion: number, public readonly toVersion: number) {
        super(message, 'migrate', undefined, { fromVersion, toVersion });
        this.name = 'StorageMigrationError';
    }
}

export class StorageCorruptionError extends StorageError {
    constructor(message: string, key?: string, public readonly details?: unknown) {
        super(message, 'read', key, { details });
        this.name = 'StorageCorruptionError';
    }
}