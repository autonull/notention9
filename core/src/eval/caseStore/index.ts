/**
 * CaseStore Interface + Implementations (E3)
 * Pluggable case storage: filesystem, SQLite, in-memory
 */

import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../caseManifest.js';
import { FileSystemCaseStore } from './fileSystem.js';
import { InMemoryCaseStore } from './inMemory.js';
import { SQLiteCaseStore } from './sqlite.js';

// Re-export types
export type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../caseManifest.js';

// Re-export CaseStore interface from schemas (single source of truth)
export type { CaseStore } from '../../schemas/caseManifest.js';

// Re-export implementations
export { FileSystemCaseStore } from './fileSystem.js';
export { InMemoryCaseStore } from './inMemory.js';
export { SQLiteCaseStore } from './sqlite.js';

// --- Factory functions ---

export function createFileSystemCaseStore(casesDir?: string): FileSystemCaseStore {
    return new FileSystemCaseStore(casesDir);
}

export function createInMemoryCaseStore(): InMemoryCaseStore {
    return new InMemoryCaseStore();
}

export function createSQLiteCaseStore(dbPath: string): SQLiteCaseStore {
    return new SQLiteCaseStore(dbPath);
}

// --- Registry for dynamic selection ---

export class CaseStoreRegistry {
    private stores = new Map<string, { create: () => any; description: string }>();
    
    constructor() {
        this.register('filesystem', () => new FileSystemCaseStore(), 'File-based storage with JSON cases');
        this.register('memory', () => new InMemoryCaseStore(), 'In-memory storage for testing');
        this.register('sqlite', () => { throw new Error('SQLite store requires dbPath - use createSQLiteCaseStore()'); }, 'SQLite-backed storage');
    }
    
    register(name: string, factory: () => any, description: string): void {
        this.stores.set(name, { create: factory, description });
    }
    
    create(name: string, ...args: any[]): any {
        const store = this.stores.get(name);
        if (!store) {
            throw new Error(`Unknown CaseStore: ${name}. Available: ${Array.from(this.stores.keys()).join(', ')}`);
        }
        return store.create(...args);
    }
    
    listNames(): string[] {
        return Array.from(this.stores.keys());
    }
    
    getDescription(name: string): string | undefined {
        return this.stores.get(name)?.description;
    }
}

let caseStoreRegistryInstance: CaseStoreRegistry | null = null;

export function getCaseStoreRegistry(): CaseStoreRegistry {
    if (!caseStoreRegistryInstance) {
        caseStoreRegistryInstance = new CaseStoreRegistry();
    }
    return caseStoreRegistryInstance;
}

export function resetCaseStoreRegistry(): void {
    caseStoreRegistryInstance = null;
}