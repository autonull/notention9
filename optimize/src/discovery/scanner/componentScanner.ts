import { createAstProject, DEFAULT_PROJECT_ROOT } from './astProject.js';
import { scanUIComponents } from './fileScanner.js';
import { extractComponentDeclarations } from './componentDeclarations.js';
import { extractProps } from './componentProps.js';
import { extractHooks } from './componentHooks.js';
import { extractExports } from './componentExports.js';
import { extractJsx, traverseJsx, traverseJsxWithContext } from './componentJsx.js';
import { analyzeRoutes } from './componentRoutes.js';
import { analyzeDialogs } from './componentDialogs.js';
import { analyzeActions } from './componentActions.js';

export interface ComponentInfo {
    name: string;
    file: string;
    props: PropInfo[];
    jsx: JSXElement[];
    hooks: string[];
    exports: string[];
}

export interface PropInfo {
    name: string;
    type: string;
    optional: boolean;
}

export interface JSXElement {
    tag: string;
    props: Record<string, string>;
    children: JSXElement[];
    location: { line: number; column: number };
}

export interface DiscoveredRoute {
    path: string;
    component: string;
    guards: string[];
}

export interface DiscoveredDialog {
    name: string;
    trigger: string;
    component: string;
    fields: FieldInfo[];
}

export interface FieldInfo {
    name: string;
    type: 'text' | 'select' | 'custom';
    label: string;
    required: boolean;
    options?: string[];
}

export interface DiscoveredAction {
    component: string;
    action: string;
    selector: SelectorInfo;
    intent: string;
}

export interface SelectorInfo {
    role?: string;
    name?: string;
    testId?: string;
    label?: string;
    css?: string;
}

export interface DiscoveryResult {
    routes: DiscoveredRoute[];
    dialogs: DiscoveredDialog[];
    actions: DiscoveredAction[];
    components: ComponentInfo[];
}

export class ComponentScanner {
    private components = new Map<string, ComponentInfo>();

    scan(projectRoot: string = DEFAULT_PROJECT_ROOT): DiscoveryResult {
        this.components.clear();

        const project = createAstProject(projectRoot);
        const files = scanUIComponents(projectRoot);

        for (const file of files) {
            try {
                project.addSourceFileAtPath(file);
            } catch {
                // Unparseable or missing file: skip rather than fail the whole scan
            }
        }

        for (const file of files) {
            const sourceFile = project.getSourceFile(file);
            if (!sourceFile) continue;
            const info = this.parseComponent(sourceFile);
            if (info) this.components.set(info.name, info);
        }

        const routes = analyzeRoutes(this.components);
        const dialogs = analyzeDialogs(this.components);
        const actions = analyzeActions(this.components);

        return {
            routes,
            dialogs,
            actions,
            components: Array.from(this.components.values()),
        };
    }

    private parseComponent(sourceFile: import('ts-morph').SourceFile): ComponentInfo | null {
        const declarations = extractComponentDeclarations(sourceFile);
        if (declarations.length === 0) return null;

        return {
            name: declarations[0].name,
            file: sourceFile.getFilePath(),
            props: extractProps(sourceFile, declarations),
            jsx: extractJsx(sourceFile),
            hooks: extractHooks(sourceFile),
            exports: extractExports(sourceFile),
        };
    }
}

export { traverseJsx, traverseJsxWithContext };
export const scanner = new ComponentScanner();