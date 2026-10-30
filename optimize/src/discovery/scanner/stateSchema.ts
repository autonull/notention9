import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

export interface StatePath {
    path: string;
    type: string;
    description: string;
    source: string; // which hook/component provides it
    isArray: boolean;
    elementType?: string;
}

export interface HookState {
    name: string;
    file: string;
    returns: StatePath[];
}

export class StateSchemaInferencer {
    private statePaths: Map<string, StatePath> = new Map();
    private hooks: HookState[] = [];

    infer(projectRoot: string = '/home/me/notention9'): InferredStateSchema {
        this.statePaths.clear();
        this.hooks = [];

        // Scan hooks for state shape
        this.scanHooks(`${projectRoot}/ui/src/hooks`);
        // Scan bridge for exposed state
        this.scanBridge(`${projectRoot}/ui/src/dev/bridge.ts`);
        // Scan core types
        this.scanCoreTypes(`${projectRoot}/core/src`);

        return {
            paths: Array.from(this.statePaths.values()),
            hooks: this.hooks,
        };
    }

    private scanHooks(hooksDir: string): void {
        const files = globSync('**/use*.ts', { cwd: hooksDir, absolute: true });

        for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            const hookName = file.match(/use(\w+)\.ts$/)?.[1];
            if (!hookName) continue;

            const returns = this.extractReturnType(content);
            if (returns.length > 0) {
                this.hooks.push({ name: hookName, file, returns });
                for (const r of returns) {
                    this.statePaths.set(r.path, r);
                }
            }
        }
    }

    private extractReturnType(content: string): StatePath[] {
        const paths: StatePath[] = [];

        // Look for return statements with object literals
        const returnMatch = content.match(/return\s+\{([\s\S]*?)\};/);
        if (returnMatch) {
            const objContent = returnMatch[1];
            this.parseObjectLiteral(objContent, '', paths, `hook:${content.substring(0, 50)}`);
        }

        // Also look for interface definitions
        const interfaceMatches = content.matchAll(/interface\s+(\w+)\s*\{([\s\S]*?)\}/g);
        for (const match of interfaceMatches) {
            const [, name, body] = match;
            if (name.includes('State') || name.includes('Context')) {
                this.parseObjectLiteral(body, name.toLowerCase(), paths, `interface:${name}`);
            }
        }

        return paths;
    }

    private parseObjectLiteral(objContent: string, prefix: string, paths: StatePath[], source: string): void {
        const lines = objContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            // Match: key: type, or key: value,
            const match = trimmed.match(/^(\w+)\??\s*:\s*([^,;]+)[,;]?$/);
            if (match) {
                const [, key, type] = match;
                const fullPath = prefix ? `${prefix}.${key}` : key;
                const isArray = type.includes('[]') || type.includes('Array<');
                const elementType = type.match(/Array<(.+)>|(.+)\[\]/)?.[1];

                paths.push({
                    path: fullPath,
                    type: type.trim(),
                    description: `${key} from ${source}`,
                    source,
                    isArray,
                    elementType: elementType?.trim(),
                });

                // Recurse for nested objects (simplified)
                if (type.includes('{') && !isArray) {
                    // Would need more sophisticated parsing
                }
            }
        }
    }

    private scanBridge(bridgeFile: string): void {
        const content = readFileSync(bridgeFile, 'utf-8');

        // Extract SemanticState interface
        const semanticStateMatch = content.match(/interface\s+SemanticState\s*\{([\s\S]*?)\}/);
        if (semanticStateMatch) {
            this.parseObjectLiteral(semanticStateMatch[1], '', [], 'bridge:SemanticState');
        }

        // Also look for the actual state builder in DevBridge
        const stateBuilderMatch = content.match(/const\s+state\s*:\s*SemanticState\s*=\s*\{([\s\S]*?)\};/);
        if (stateBuilderMatch) {
            this.parseObjectLiteral(stateBuilderMatch[1], '', [], 'bridge:stateBuilder');
        }
    }

    private scanCoreTypes(coreDir: string): void {
        const files = globSync('**/*.ts', { cwd: coreDir, absolute: true });

        for (const file of files) {
            const content = readFileSync(file, 'utf-8');

            // Find Note, Property, AppSettings types
            const typeMatches = content.matchAll(/export\s+(?:interface|type)\s+(\w+)\s*[\{=]\s*([\s\S]*?)(?=\n\nexport|\ninterface|\ntype\s|\nclass|$)/g);
            for (const match of typeMatches) {
                const [, name, body] = match;
                if (['Note', 'Property', 'AppSettings', 'SemanticState', 'PromptTrace', 'ActionTrace'].includes(name)) {
                    this.parseObjectLiteral(body, name.toLowerCase(), [], `core:${name}`);
                }
            }
        }
    }
}

export interface InferredStateSchema {
    paths: StatePath[];
    hooks: HookState[];
}

export const stateSchemaInferencer = new StateSchemaInferencer();