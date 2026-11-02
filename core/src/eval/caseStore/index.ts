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
} from '../../schemas/caseTypes.js';
import { FileSystemCaseStore } from './fileSystem.js';
import { InMemoryCaseStore } from './inMemory.js';
import { SQLiteCaseStore } from './sqlite.js';
import { createPluginFactoryRegistry, FactoryRegistry } from '../../utils/Registry.js';

// Re-export types from schemas (single source of truth)
export type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';

// Re-export CaseStore interface from schemas
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

import type { CaseStore } from '../../schemas/caseManifest.js';

const { registry: caseStoreRegistry, get: getCaseStoreRegistry, reset: resetCaseStoreRegistry } = 
    createPluginFactoryRegistry<CaseStore>('CaseStore', [
        { name: 'filesystem', create: () => new FileSystemCaseStore(), description: 'File-based storage with JSON cases' },
        { name: 'memory', create: () => new InMemoryCaseStore(), description: 'In-memory storage for testing' },
        { name: 'sqlite', create: (dbPath: string) => new SQLiteCaseStore(dbPath), description: 'SQLite-backed storage' },
    ]) as { registry: FactoryRegistry<CaseStore>; get: () => FactoryRegistry<CaseStore>; reset: () => void };

// --- Export registry and singleton ---
export { caseStoreRegistry, getCaseStoreRegistry, resetCaseStoreRegistry };