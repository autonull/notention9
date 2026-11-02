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
import { FactoryRegistry } from '../../utils/Registry.js';

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

const caseStoreRegistry = new FactoryRegistry({
    errorPrefix: 'CaseStoreRegistry',
});

caseStoreRegistry.register('filesystem', () => new FileSystemCaseStore(), 'File-based storage with JSON cases');
caseStoreRegistry.register('memory', () => new InMemoryCaseStore(), 'In-memory storage for testing');
caseStoreRegistry.register('sqlite', (dbPath: string) => new SQLiteCaseStore(dbPath), 'SQLite-backed storage');

// --- Backward-compatible singleton functions ---

let caseStoreRegistryInstance: typeof caseStoreRegistry | null = null;

export function getCaseStoreRegistry(): typeof caseStoreRegistry {
    if (!caseStoreRegistryInstance) {
        caseStoreRegistryInstance = caseStoreRegistry;
    }
    return caseStoreRegistryInstance;
}

export function resetCaseStoreRegistry(): void {
    caseStoreRegistryInstance = null;
}

export { caseStoreRegistry };