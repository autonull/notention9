import { Project, SourceFile, Type, Symbol, SyntaxKind, Node, InterfaceDeclaration, TypeAliasDeclaration, PropertySignature, TypeReferenceNode, ArrayTypeNode, UnionTypeNode, IntersectionTypeNode, TypeLiteralNode, Identifier } from 'ts-morph';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export interface ScannedType {
    name: string;
    kind: 'interface' | 'type';
    file: string;
    properties: ScannedProperty[];
    isExported: boolean;
    extends?: string[];
}

export interface ScannedProperty {
    name: string;
    type: string;
    optional: boolean;
    isArray: boolean;
    elementType?: string;
    description?: string;
}

export interface HookReturnType {
    hookName: string;
    file: string;
    returnType: ScannedType;
}

export interface TypeSchemaData {
    types: Map<string, ScannedType>;
    hooks: HookReturnType[];
    statePaths: StatePathInfo[];
}

export interface StatePathInfo {
    path: string;
    type: string;
    description: string;
    source: string;
    isArray: boolean;
    elementType?: string;
}

export class TsAstScanner {
    private project: Project;
    private scannedTypes: Map<string, ScannedType> = new Map();
    private hookReturns: HookReturnType[] = [];
    private statePaths: StatePathInfo[] = [];

    constructor(projectRoot: string = '/home/me/notention9') {
        this.project = new Project({
            tsConfigFilePath: `${projectRoot}/tsconfig.json`,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                target: 99,
                module: 99,
                moduleResolution: 2,
                jsx: 4,
                allowJs: true,
                skipLibCheck: true,
                strict: false,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                baseUrl: projectRoot,
                paths: {
                    '@notention/*': ['packages/*/src'],
                },
            },
        });
    }

    scanProject(projectRoot: string = '/home/me/notention9'): TypeSchemaData {
        this.scannedTypes.clear();
        this.hookReturns = [];
        this.statePaths = [];

        // Add source files
        const uiFiles = globSync('**/*.ts', { cwd: `${projectRoot}/ui/src`, absolute: true });
        const coreFiles = globSync('**/*.ts', { cwd: `${projectRoot}/core/src`, absolute: true });
        const agentFiles = globSync('**/*.ts', { cwd: `${projectRoot}/agent/src`, absolute: true });

        const allFiles = [...uiFiles, ...coreFiles, ...agentFiles];
        for (const file of allFiles) {
            try {
                this.project.addSourceFileAtPath(file);
            } catch {
                // Ignore files that can't be added
            }
        }

        // Scan for types in core/src and ui/src/hooks
        this.scanTypes(`${projectRoot}/core/src`);
        this.scanTypes(`${projectRoot}/ui/src/hooks`);
        this.scanTypes(`${projectRoot}/ui/src/dev`);
        this.scanTypes(`${projectRoot}/agent/src`);

        // Scan hooks for return types
        this.scanHooks(`${projectRoot}/ui/src/hooks`);

        // Build state paths from scanned types
        this.buildStatePaths();

        return {
            types: this.scannedTypes,
            hooks: this.hookReturns,
            statePaths: this.statePaths,
        };
    }

    private scanTypes(dir: string): void {
        const files = globSync('**/*.ts', { cwd: dir, absolute: true });

        for (const file of files) {
            const sourceFile = this.project.getSourceFile(file);
            if (!sourceFile) continue;

            // Scan interfaces
            for (const iface of sourceFile.getInterfaces()) {
                if (!iface.isExported()) continue;
                const scanned = this.scanInterface(iface, file);
                if (scanned) {
                    this.scannedTypes.set(scanned.name, scanned);
                }
            }

            // Scan type aliases
            for (const typeAlias of sourceFile.getTypeAliases()) {
                if (!typeAlias.isExported()) continue;
                const scanned = this.scanTypeAlias(typeAlias, file);
                if (scanned) {
                    this.scannedTypes.set(scanned.name, scanned);
                }
            }
        }
    }

    private scanInterface(iface: InterfaceDeclaration, file: string): ScannedType | null {
        const name = iface.getName();
        const extendsTypes = iface.getExtends().map(e => e.getText());

        const properties: ScannedProperty[] = [];
        for (const prop of iface.getProperties()) {
            const scanned = this.scanProperty(prop);
            if (scanned) properties.push(scanned);
        }

        return {
            name,
            kind: 'interface',
            file: this.relativePath(file),
            properties,
            isExported: true,
            extends: extendsTypes.length > 0 ? extendsTypes : undefined,
        };
    }

    private scanTypeAlias(typeAlias: TypeAliasDeclaration, file: string): ScannedType | null {
        const name = typeAlias.getName();
        const type = typeAlias.getTypeNode();

        if (!type) return null;

        // If it's a type literal (inline object type), scan its properties
        if (Node.isTypeLiteral(type)) {
            const properties: ScannedProperty[] = [];
            for (const member of type.getMembers()) {
                if (Node.isPropertySignature(member)) {
                    const scanned = this.scanProperty(member);
                    if (scanned) properties.push(scanned);
                }
            }

            return {
                name,
                kind: 'type',
                file: this.relativePath(file),
                properties,
                isExported: true,
            };
        }

        // For other type aliases, just record the type reference
        return {
            name,
            kind: 'type',
            file: this.relativePath(file),
            properties: [],
            isExported: true,
        };
    }

    private scanProperty(prop: PropertySignature): ScannedProperty | null {
        const name = prop.getName();
        const typeNode = prop.getTypeNode();
        const optional = prop.hasQuestionToken();

        if (!typeNode) return null;

        const typeText = typeNode.getText();
        const { isArray, elementType } = this.analyzeTypeNode(typeNode);

        return {
            name,
            type: typeText,
            optional,
            isArray,
            elementType,
        };
    }

    private analyzeTypeNode(typeNode: import('ts-morph').TypeNode): { isArray: boolean; elementType?: string } {
        const text = typeNode.getText();

        // Check for array syntax: Type[] or Array<Type>
        if (text.endsWith('[]')) {
            return { isArray: true, elementType: text.slice(0, -2) };
        }

        if (text.startsWith('Array<') && text.endsWith('>')) {
            return { isArray: true, elementType: text.slice(6, -1) };
        }

        // Check for readonly arrays
        if (text.startsWith('readonly ') && text.endsWith('[]')) {
            return { isArray: true, elementType: text.slice(9, -2) };
        }

        return { isArray: false };
    }

    private analyzeType(type: import('ts-morph').Type): { isArray: boolean; elementType?: string } {
        const text = type.getText();

        if (text.endsWith('[]')) {
            return { isArray: true, elementType: text.slice(0, -2) };
        }

        if (text.startsWith('Array<') && text.endsWith('>')) {
            return { isArray: true, elementType: text.slice(6, -1) };
        }

        return { isArray: false };
    }

    private scanHooks(hooksDir: string): void {
        const files = globSync('**/use*.ts', { cwd: hooksDir, absolute: true });

        for (const file of files) {
            const sourceFile = this.project.getSourceFile(file);
            if (!sourceFile) continue;

            const hookName = file.match(/use(\w+)\.ts$/)?.[1];
            if (!hookName) continue;

            // Find the default export or the main function
            const defaultExport = sourceFile.getDefaultExportSymbol();
            if (defaultExport) {
                const declarations = defaultExport.getDeclarations();
                for (const decl of declarations) {
                    if (Node.isFunctionDeclaration(decl) || Node.isArrowFunction(decl) || Node.isVariableStatement(decl)) {
                        const returnType = this.getFunctionReturnType(decl);
                        if (returnType) {
                            const scannedType = this.typeToScannedType(returnType, hookName);
                            if (scannedType) {
                                this.hookReturns.push({
                                    hookName,
                                    file: this.relativePath(file),
                                    returnType: scannedType,
                                });
                            }
                        }
                    }
                }
            }

            // Also check for exported functions starting with 'use'
            for (const func of sourceFile.getFunctions()) {
                const funcName = func.getName();
                if (funcName && funcName.startsWith('use') && func.isExported()) {
                    const returnType = func.getReturnType();
                    const scannedType = this.typeToScannedType(returnType, funcName);
                    if (scannedType) {
                        this.hookReturns.push({
                            hookName: funcName,
                            file: this.relativePath(file),
                            returnType: scannedType,
                        });
                    }
                }
            }
        }
    }

    private getFunctionReturnType(node: Node): Type | undefined {
        if (Node.isFunctionDeclaration(node)) {
            return node.getReturnType();
        }
        if (Node.isArrowFunction(node)) {
            return node.getReturnType();
        }
        if (Node.isVariableStatement(node)) {
            const declarations = node.getDeclarations();
            for (const decl of declarations) {
                if (Node.isVariableDeclaration(decl)) {
                    const initializer = decl.getInitializer();
                    if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
                        return initializer.getReturnType();
                    }
                    // Could be a type assertion
                    return decl.getType();
                }
            }
        }
        return undefined;
    }

    private typeToScannedType(type: Type, name: string): ScannedType | null {
        const properties: ScannedProperty[] = [];

        // If it's an object type, get its properties
        if (type.isObject()) {
            const symbol = type.getSymbol();
            if (symbol) {
                for (const prop of type.getProperties()) {
                    const declarations = prop.getDeclarations();
                    if (declarations.length === 0) continue;
                    const propType = prop.getTypeAtLocation(declarations[0]);
                    const scanned = this.propertySymbolToScannedProperty(prop, propType);
                    if (scanned) properties.push(scanned);
                }

                return {
                    name: `${name}Return`,
                    kind: 'interface',
                    file: '',
                    properties,
                    isExported: true,
                };
            }
        }

        // For union types or other complex types, try to get the apparent properties
        const apparentProps = type.getApparentProperties();
        if (apparentProps.length > 0) {
            for (const prop of apparentProps) {
                const declarations = prop.getDeclarations();
                if (declarations.length === 0) continue;
                const propType = prop.getTypeAtLocation(declarations[0]);
                const scanned = this.propertySymbolToScannedProperty(prop, propType);
                if (scanned) properties.push(scanned);
            }

            return {
                name: `${name}Return`,
                kind: 'interface',
                file: '',
                properties,
                isExported: true,
            };
        }

        return null;
    }

    private propertySymbolToScannedProperty(symbol: Symbol, type: Type): ScannedProperty | null {
        const name = symbol.getName();
        const typeText = type.getText();
        const { isArray, elementType } = this.analyzeType(type);

        // Check if optional
        const declarations = symbol.getDeclarations();
        const optional = declarations.some(d => Node.isPropertySignature(d) && d.hasQuestionToken());

        return {
            name,
            type: typeText,
            optional,
            isArray,
            elementType,
        };
    }

    private buildStatePaths(): void {
        // Build state paths from known important types
        const importantTypes = [
            'SemanticState',
            'Note',
            'Property',
            'AppSettings',
            'PromptTrace',
            'ActionTrace',
        ];

        for (const typeName of importantTypes) {
            const scanned = this.scannedTypes.get(typeName);
            if (scanned) {
                this.extractStatePaths(scanned, '');
            }
        }

        // Also extract from hook returns
        for (const hook of this.hookReturns) {
            this.extractStatePaths(hook.returnType, hook.hookName.toLowerCase());
        }
    }

    private extractStatePaths(type: ScannedType, prefix: string): void {
        for (const prop of type.properties) {
            const fullPath = prefix ? `${prefix}.${prop.name}` : prop.name;
            this.statePaths.push({
                path: fullPath,
                type: prop.type,
                description: `${prop.name} from ${type.name} (${type.file})`,
                source: `${type.kind}:${type.name}`,
                isArray: prop.isArray,
                elementType: prop.elementType,
            });

            // Recurse for nested objects (if we have the type scanned)
            if (!prop.isArray && (prop.type.includes('{') || this.scannedTypes.has(prop.type))) {
                const nestedType = this.scannedTypes.get(prop.type);
                if (nestedType) {
                    this.extractStatePaths(nestedType, fullPath);
                }
            }
        }
    }

    private relativePath(file: string): string {
        return relative('/home/me/notention9', file);
    }

    // Get all state paths for registry
    getStatePaths(): StatePathInfo[] {
        return [...this.statePaths];
    }

    // Get hook return types
    getHookReturns(): HookReturnType[] {
        return [...this.hookReturns];
    }

    // Get all scanned types
    getScannedTypes(): Map<string, ScannedType> {
        return new Map(this.scannedTypes);
    }
}

export const tsAstScanner = new TsAstScanner();