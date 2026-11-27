import { NotentionError } from './base.js';

export class RegistryError extends NotentionError {
    constructor(
        message: string,
        public readonly registryName: string,
        public readonly itemName?: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'RegistryError';
    }
}

export class AlreadyRegisteredError extends RegistryError {
    constructor(registryName: string, itemName: string) {
        super(`${registryName} '${itemName}' already registered`, registryName, itemName);
        this.name = 'AlreadyRegisteredError';
    }
}

export class NotRegisteredError extends RegistryError {
    constructor(registryName: string, itemName: string, available: string[]) {
        super(`Unknown ${registryName}: ${itemName}. Available: ${available.join(', ')}`, registryName, itemName, { available });
        this.name = 'NotRegisteredError';
    }
}