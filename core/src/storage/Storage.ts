// Unified storage abstraction for browser (localStorage) and Node (file system)

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

class BrowserStorageAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }
    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }
    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
    async clear(): Promise<void> {
        localStorage.clear();
    }
}

class NodeStorageAdapter implements StorageAdapter {
    private fs: typeof import('fs/promises') | null = null;
    private path: typeof import('path') | null = null;
    private storeDir: string;

    constructor(storeDir?: string) {
        this.storeDir = storeDir ?? '/tmp/notention-storage';
    }

    private async init(): Promise<void> {
        if (this.fs) return;
        const { default: fs } = await import('fs/promises');
        const { default: path } = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.fs = fs;
        this.path = path;
        this.storeDir = path.resolve(__dirname, '../../', this.storeDir);
    }

    async getItem(key: string): Promise<string | null> {
        await this.init();
        try {
            const filePath = this.path!.join(this.storeDir, `${key}.json`);
            return await this.fs!.readFile(filePath, 'utf-8');
        } catch {
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        await this.init();
        const filePath = this.path!.join(this.storeDir, `${key}.json`);
        await this.fs!.mkdir(this.storeDir, { recursive: true });
        await this.fs!.writeFile(filePath, value);
    }

    async removeItem(key: string): Promise<void> {
        await this.init();
        try {
            const filePath = this.path!.join(this.storeDir, `${key}.json`);
            await this.fs!.unlink(filePath);
        } catch {
            // Ignore if not exists
        }
    }

    async clear(): Promise<void> {
        await this.init();
        try {
            await this.fs!.rm(this.storeDir, { recursive: true, force: true });
        } catch {
            // Ignore
        }
    }
}

class MemoryStorageAdapter implements StorageAdapter {
    private store = new Map<string, string>();

    async getItem(key: string): Promise<string | null> {
        return this.store.get(key) ?? null;
    }
    async setItem(key: string, value: string): Promise<void> {
        this.store.set(key, value);
    }
    async removeItem(key: string): Promise<void> {
        this.store.delete(key);
    }
    async clear(): Promise<void> {
        this.store.clear();
    }
}

// Default adapter selection
let defaultAdapter: StorageAdapter | null = null;

export function getDefaultAdapter(): StorageAdapter {
    if (defaultAdapter) return defaultAdapter;
    if (isBrowser) {
        defaultAdapter = new BrowserStorageAdapter();
    } else if (typeof process !== 'undefined' && process.versions?.node) {
        defaultAdapter = new NodeStorageAdapter();
    } else {
        defaultAdapter = new MemoryStorageAdapter();
    }
    return defaultAdapter;
}

export function setDefaultAdapter(adapter: StorageAdapter): void {
    defaultAdapter = adapter;
}

/** High-level JSON storage with typed get/set */
export class JsonStore<T> {
    private data: T | null = null;
    private loaded = false;

    constructor(
        private key: string,
        private adapter: StorageAdapter = getDefaultAdapter()
    ) {}

    async load(): Promise<T | null> {
        if (this.loaded) return this.data;
        const stored = await this.adapter.getItem(this.key);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
            } catch {
                this.data = null;
            }
        }
        this.loaded = true;
        return this.data;
    }

    async save(data: T): Promise<void> {
        this.data = data;
        this.loaded = true;
        await this.adapter.setItem(this.key, JSON.stringify(data));
    }

    async clear(): Promise<void> {
        this.data = null;
        this.loaded = false;
        await this.adapter.removeItem(this.key);
    }

    get(): T | null {
        return this.data;
    }
}