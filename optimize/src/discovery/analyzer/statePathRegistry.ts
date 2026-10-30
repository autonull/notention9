export interface StatePathInfo {
    path: string;
    type: string;
    description: string;
    source: string;
    isArray: boolean;
    elementType?: string;
    validated?: boolean;
}

export interface StatePathEntry extends StatePathInfo {
    validated: boolean;
    runtimeType?: string;
}

export class StatePathRegistry {
    private registry: Map<string, StatePathEntry> = new Map();
    private reverseIndex: Map<string, Set<string>> = new Map(); // source -> paths
    private categoryIndex: Map<string, Set<string>> = new Map(); // category -> paths

    constructor(initialPaths?: StatePathInfo[]) {
        // Built-in canonical paths from the SemanticState interface
        this.registerBuiltins();

        if (initialPaths) {
            for (const path of initialPaths) {
                this.register(path);
            }
        }
    }

    private registerBuiltins(): void {
        const builtins: StatePathInfo[] = [
            // Route
            { path: 'route.view', type: 'string', description: 'Current view', source: 'bridge:SemanticState', isArray: false },
            { path: 'route.hash', type: 'string', description: 'Current hash route', source: 'bridge:SemanticState', isArray: false },
            { path: 'route.noteId', type: 'string | null', description: 'Current note ID', source: 'bridge:SemanticState', isArray: false },

            // Note
            { path: 'note.id', type: 'string', description: 'Note ID', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.title', type: 'string', description: 'Note title', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.properties', type: 'Property[]', description: 'Note properties', source: 'bridge:SemanticState', isArray: true, elementType: 'Property' },
            { path: 'note.propertyIndex', type: 'Record<string, string[]>', description: 'Normalized property index', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.propertyIndex.*', type: 'string[]', description: 'Property values by key', source: 'bridge:SemanticState', isArray: true, elementType: 'string' },
            { path: 'note.tags', type: 'string[]', description: 'Note tags', source: 'bridge:SemanticState', isArray: true, elementType: 'string' },
            { path: 'note.privacy', type: 'private | public', description: 'Note privacy level', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.saveStatus', type: 'idle | saving | saved | error', description: 'Save status', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.publishReadiness.ready', type: 'boolean', description: 'Publish ready', source: 'bridge:SemanticState', isArray: false },
            { path: 'note.publishReadiness.blocking', type: 'string[]', description: 'Blocking reasons', source: 'bridge:SemanticState', isArray: true, elementType: 'string' },

            // Editor
            { path: 'editor.dirty', type: 'boolean', description: 'Editor dirty state', source: 'bridge:SemanticState', isArray: false },
            { path: 'editor.propertyDraft', type: '{ key?: string; operator?: string; value?: string } | null', description: 'Property draft', source: 'bridge:SemanticState', isArray: false },

            // Review
            { path: 'review', type: '{ property: Property; confidence: number; presentation: string }[]', description: 'Extraction review items', source: 'bridge:SemanticState', isArray: true, elementType: 'ReviewItem' },
            { path: 'review.*', type: '{ property: Property; confidence: number; presentation: string }', description: 'Review item', source: 'bridge:SemanticState', isArray: false },

            // Validation
            { path: 'validation.errors', type: 'string[]', description: 'Validation errors', source: 'bridge:SemanticState', isArray: true, elementType: 'string' },
            { path: 'validation.missing', type: 'string[]', description: 'Missing required fields', source: 'bridge:SemanticState', isArray: true, elementType: 'string' },

            // Dialogs
            { path: 'dialogs', type: '{ id: string; kind: string; confirmLabel?: string }[]', description: 'Open dialogs', source: 'bridge:SemanticState', isArray: true, elementType: 'Dialog' },
            { path: 'dialogs.*', type: '{ id: string; kind: string; confirmLabel?: string }', description: 'Dialog', source: 'bridge:SemanticState', isArray: false },

            // Pending confirmations
            { path: 'pendingConfirmations', type: '{ action: string; consequence: string }[]', description: 'Pending confirmations', source: 'bridge:SemanticState', isArray: true, elementType: 'PendingConfirmation' },
            { path: 'pendingConfirmations.*', type: '{ action: string; consequence: string }', description: 'Pending confirmation', source: 'bridge:SemanticState', isArray: false },
        ];

        for (const path of builtins) {
            this.register({ ...path, validated: true });
        }
    }

    register(path: StatePathInfo): void {
        const entry: StatePathEntry = {
            ...path,
            validated: path.validated ?? false,
        };

        this.registry.set(path.path, entry);

        // Index by source
        const source = path.source || 'unknown';
        if (!this.reverseIndex.has(source)) {
            this.reverseIndex.set(source, new Set());
        }
        this.reverseIndex.get(source)!.add(path.path);

        // Index by category (first segment)
        const category = path.path.split('.')[0];
        if (!this.categoryIndex.has(category)) {
            this.categoryIndex.set(category, new Set());
        }
        this.categoryIndex.get(category)!.add(path.path);
    }

    get(path: string): StatePathEntry | undefined {
        // Direct match
        if (this.registry.has(path)) {
            return this.registry.get(path);
        }

        // Try prefix match for array elements
        for (const [key, value] of this.registry) {
            if (key.endsWith('.*') && path.startsWith(key.slice(0, -1))) {
                return value;
            }
        }

        return undefined;
    }

    getStrict(path: string): StatePathEntry {
        const entry = this.get(path);
        if (!entry) {
            throw new Error(`StatePath not found: ${path}. Available: ${Array.from(this.registry.keys()).join(', ')}`);
        }
        return entry;
    }

    getOrThrow(path: string): StatePathEntry {
        return this.getStrict(path);
    }

    // Resolve a path against a runtime state object
    resolve(state: unknown, path: string): unknown {
        const entry = this.get(path);
        if (!entry) {
            throw new Error(`StatePath not registered: ${path}`);
        }

        return this.resolvePath(state, path);
    }

    private resolvePath(obj: unknown, path: string): unknown {
        if (obj === null || obj === undefined) {
            throw new Error(`Cannot resolve path on null/undefined`);
        }

        const parts = path.split('.');
        let current: unknown = obj;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (current === null || current === undefined) {
                throw new Error(`Path resolution failed at ${part} (null/undefined)`);
            }

            // Handle array wildcard
            if (part === '*') {
                if (!Array.isArray(current)) {
                    throw new Error(`Expected array for wildcard at ${path}`);
                }
                return current;
            }

            // Handle array index
            if (/^\d+$/.test(part)) {
                if (!Array.isArray(current)) {
                    throw new Error(`Expected array for index access at ${path}`);
                }
                current = current[parseInt(part, 10)];
                continue;
            }

            // Regular property access
            if (typeof current === 'object' && current !== null) {
                current = (current as Record<string, unknown>)[part];
            } else {
                throw new Error(`Cannot access property ${part} on non-object at ${path}`);
            }
        }

        return current;
    }

    // Validate a path against a runtime state
    validate(state: unknown, path: string): { valid: boolean; value?: unknown; error?: string } {
        try {
            const value = this.resolve(state, path);
            return { valid: true, value };
        } catch (e) {
            return { valid: false, error: String(e) };
        }
    }

    // Get all registered paths
    getAll(): StatePathEntry[] {
        return Array.from(this.registry.values());
    }

    // Get paths by prefix
    getByPrefix(prefix: string): StatePathEntry[] {
        return Array.from(this.registry.values()).filter(p => p.path.startsWith(prefix));
    }

    // Get paths by category
    getByCategory(category: string): StatePathEntry[] {
        const paths = this.categoryIndex.get(category);
        if (!paths) return [];
        return Array.from(paths).map(p => this.registry.get(p)!).filter(Boolean);
    }

    // Get paths by source
    getBySource(source: string): StatePathEntry[] {
        const paths = this.reverseIndex.get(source);
        if (!paths) return [];
        return Array.from(paths).map(p => this.registry.get(p)!).filter(Boolean);
    }

    // Check if a path exists
    has(path: string): boolean {
        return this.get(path) !== undefined;
    }

    // Get all categories
    getCategories(): string[] {
        return Array.from(this.categoryIndex.keys()).sort();
    }

    // Get all sources
    getSources(): string[] {
        return Array.from(this.reverseIndex.keys()).sort();
    }

    // Mark a path as validated at runtime
    markValidated(path: string): void {
        const entry = this.registry.get(path);
        if (entry) {
            entry.validated = true;
        }
    }

    // Get unvalidated paths
    getUnvalidated(): StatePathEntry[] {
        return Array.from(this.registry.values()).filter(p => !p.validated);
    }

    // Merge another registry
    merge(other: StatePathRegistry): void {
        for (const entry of other.getAll()) {
            if (!this.registry.has(entry.path)) {
                this.register(entry);
            }
        }
    }

    // Export for serialization
    toJSON(): StatePathEntry[] {
        return this.getAll();
    }

    static fromJSON(data: StatePathEntry[]): StatePathRegistry {
        const registry = new StatePathRegistry();
        for (const entry of data) {
            registry.register(entry);
        }
        return registry;
    }
}

// Global singleton for journey use
let globalRegistry: StatePathRegistry | null = null;

export function getStatePathRegistry(): StatePathRegistry {
    if (!globalRegistry) {
        globalRegistry = new StatePathRegistry();
    }
    return globalRegistry;
}

export function setStatePathRegistry(registry: StatePathRegistry): void {
    globalRegistry = registry;
}