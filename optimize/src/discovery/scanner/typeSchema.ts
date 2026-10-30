import { TsAstScanner, ScannedType, HookReturnType, StatePathInfo, TypeSchemaData } from './tsAstScanner.js';
import { StatePathRegistry } from '../analyzer/statePathRegistry.js';

export interface ResolvedType {
    name: string;
    properties: ResolvedProperty[];
    isArray: boolean;
    elementType?: ResolvedType;
}

export interface ResolvedProperty {
    name: string;
    type: ResolvedType | string;
    optional: boolean;
    description?: string;
    source: string;
}

export interface TypeSchema {
    types: Map<string, ResolvedType>;
    hooks: Map<string, ResolvedType>;
    statePaths: StatePathInfo[];
    statePathRegistry: StatePathRegistry;
}

export class TypeSchemaBuilder {
    private scanner: TsAstScanner;
    private resolvedTypes: Map<string, ResolvedType> = new Map();
    private hookReturns: Map<string, ResolvedType> = new Map();
    private statePaths: StatePathInfo[] = [];
    private statePathRegistry: StatePathRegistry;

    constructor(projectRoot: string = '/home/me/notention9') {
        this.scanner = new TsAstScanner(projectRoot);
        this.statePathRegistry = new StatePathRegistry();
    }

    static fromProject(projectRoot: string = '/home/me/notention9'): TypeSchema {
        const builder = new TypeSchemaBuilder(projectRoot);
        return builder.build();
    }

    build(): TypeSchema {
        const data = this.scanner.scanProject();

        // Resolve all scanned types
        for (const [name, scanned] of data.types) {
            this.resolvedTypes.set(name, this.resolveType(scanned, new Set()));
        }

        // Resolve hook return types
        for (const hook of data.hooks) {
            this.hookReturns.set(hook.hookName, this.resolveType(hook.returnType, new Set()));
        }

        // Use state paths from scanner
        this.statePaths = data.statePaths;

        // Build state path registry
        this.statePathRegistry = new StatePathRegistry(this.statePaths);

        return {
            types: this.resolvedTypes,
            hooks: this.hookReturns,
            statePaths: this.statePaths,
            statePathRegistry: this.statePathRegistry,
        };
    }

    private resolveType(scanned: ScannedType, visited: Set<string>): ResolvedType {
        if (visited.has(scanned.name)) {
            // Circular reference - return a reference
            return {
                name: scanned.name,
                properties: [],
                isArray: false,
            };
        }

        visited.add(scanned.name);

        const properties: ResolvedProperty[] = [];
        for (const prop of scanned.properties) {
            let resolvedType: ResolvedType | string;

            if (prop.isArray && prop.elementType) {
                const elementType = this.scanner.getScannedTypes().get(prop.elementType);
                if (elementType && !visited.has(elementType.name)) {
                    resolvedType = this.resolveType(elementType, new Set(visited));
                } else {
                    resolvedType = prop.elementType;
                }
            } else {
                const nestedType = this.scanner.getScannedTypes().get(prop.type);
                if (nestedType && !visited.has(nestedType.name)) {
                    resolvedType = this.resolveType(nestedType, new Set(visited));
                } else {
                    resolvedType = prop.type;
                }
            }

            properties.push({
                name: prop.name,
                type: resolvedType,
                optional: prop.optional,
                description: prop.description,
                source: scanned.file,
            });
        }

        return {
            name: scanned.name,
            properties,
            isArray: false,
        };
    }

    getResolvedTypes(): Map<string, ResolvedType> {
        return new Map(this.resolvedTypes);
    }

    getHookReturns(): Map<string, ResolvedType> {
        return new Map(this.hookReturns);
    }

    getStatePaths(): StatePathInfo[] {
        return [...this.statePaths];
    }

    getStatePathRegistry(): StatePathRegistry {
        return this.statePathRegistry;
    }
}