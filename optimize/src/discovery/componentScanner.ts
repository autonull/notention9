import { globSync } from 'glob';
import { join } from 'node:path';
import type { Node, PropertySignature, SourceFile } from 'ts-morph';
import { Node as N, SyntaxKind } from 'ts-morph';
import { createAstProject, DEFAULT_PROJECT_ROOT } from './astProject.js';

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

interface ComponentDeclaration {
    name: string;
    node: Node;
}

export class ComponentScanner {
    private components: Map<string, ComponentInfo> = new Map();
    private routes: DiscoveredRoute[] = [];
    private dialogs: DiscoveredDialog[] = [];
    private actions: DiscoveredAction[] = [];

    scan(projectRoot: string = DEFAULT_PROJECT_ROOT): DiscoveryResult {
        this.components.clear();
        this.routes = [];
        this.dialogs = [];
        this.actions = [];

        const project = createAstProject(projectRoot);
        const uiRoot = join(projectRoot, 'ui', 'src');
        const files = globSync('**/*.tsx', {
            cwd: uiRoot,
            absolute: true,
            ignore: ['**/*.test.tsx', '**/*.spec.tsx'],
        });

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

        this.analyzeRoutes();
        this.analyzeDialogs();
        this.analyzeActions();

        return {
            routes: this.routes,
            dialogs: this.dialogs,
            actions: this.actions,
            components: Array.from(this.components.values()),
        };
    }

    private parseComponent(sourceFile: SourceFile): ComponentInfo | null {
        const declarations = this.componentDeclarations(sourceFile);
        if (declarations.length === 0) return null;

        return {
            name: declarations[0].name,
            file: sourceFile.getFilePath(),
            props: this.extractProps(sourceFile, declarations),
            jsx: this.extractJsx(sourceFile),
            hooks: this.extractHooks(sourceFile),
            exports: this.extractExports(sourceFile),
        };
    }

    private componentDeclarations(sourceFile: SourceFile): ComponentDeclaration[] {
        const found: ComponentDeclaration[] = [];

        for (const fn of sourceFile.getFunctions()) {
            if (!fn.isExported() && !fn.isDefaultExport()) continue;
            const name = fn.getName() ?? this.basename(sourceFile);
            found.push({ name, node: fn });
        }

        for (const cls of sourceFile.getClasses()) {
            if (!cls.isExported() && !cls.isDefaultExport()) continue;
            const name = cls.getName() ?? this.basename(sourceFile);
            found.push({ name, node: cls });
        }

        for (const statement of sourceFile.getVariableStatements()) {
            if (!statement.isExported()) continue;
            for (const declaration of statement.getDeclarations()) {
                const name = declaration.getName();
                if (!/^[A-Z]/.test(name)) continue;
                found.push({ name, node: declaration });
            }
        }

        const capitalised = found.filter(declaration => /^[A-Z]/.test(declaration.name));
        return capitalised.length > 0 ? capitalised : found;
    }

    private basename(sourceFile: SourceFile): string {
        return sourceFile.getBaseNameWithoutExtension();
    }

    private extractProps(sourceFile: SourceFile, declarations: ComponentDeclaration[]): PropInfo[] {
        const referenced = this.referencedPropsTypeName(declarations);
        if (referenced) {
            const props = this.propsFromNamedType(sourceFile, referenced, new Set());
            if (props.length > 0) return props;
        }

        for (const candidate of this.propsCandidateNames(sourceFile)) {
            const props = this.propsFromNamedType(sourceFile, candidate, new Set());
            if (props.length > 0) return props;
        }

        return [];
    }

    private referencedPropsTypeName(declarations: ComponentDeclaration[]): string | null {
        for (const declaration of declarations) {
            const parameter = this.firstParameter(declaration.node);
            const typeNode = parameter?.getTypeNode();
            if (!typeNode) continue;
            const name = this.typeReferenceName(typeNode);
            if (name) return name;
        }
        return null;
    }

    private firstParameter(node: Node) {
        if (N.isFunctionDeclaration(node) || N.isArrowFunction(node) || N.isFunctionExpression(node) || N.isMethodDeclaration(node)) {
            return node.getParameters()[0];
        }
        if (N.isVariableDeclaration(node)) {
            const initializer = node.getInitializer();
            if (initializer && (N.isArrowFunction(initializer) || N.isFunctionExpression(initializer))) {
                return initializer.getParameters()[0];
            }
        }
        return undefined;
    }

    private typeReferenceName(typeNode: Node): string | null {
        if (N.isTypeReference(typeNode)) {
            const typeArguments = typeNode.getTypeArguments();
            if (typeArguments.length > 0) return this.typeReferenceName(typeArguments[0]);
            const name = typeNode.getTypeName().getText();
            return name.includes('.') ? name.split('.').pop() ?? null : name;
        }
        if (N.isParenthesizedTypeNode(typeNode)) {
            return this.typeReferenceName(typeNode.getTypeNode());
        }
        return null;
    }

    private propsCandidateNames(sourceFile: SourceFile): string[] {
        return [
            ...sourceFile.getInterfaces().map(declaration => declaration.getName()),
            ...sourceFile.getTypeAliases().map(declaration => declaration.getName()),
        ].filter(name => name === 'Props' || name.endsWith('Props'));
    }

    private propsFromNamedType(sourceFile: SourceFile, name: string, seen: Set<string>): PropInfo[] {
        if (seen.has(name)) return [];
        seen.add(name);

        const iface = sourceFile.getInterface(name);
        if (iface) {
            const props = iface.getProperties().map(property => this.toPropInfo(property));
            for (const extension of iface.getExtends()) {
                const base = this.typeReferenceName(extension) ?? extension.getText();
                props.push(...this.propsFromNamedType(sourceFile, base, seen));
            }
            return props;
        }

        const alias = sourceFile.getTypeAlias(name);
        const typeNode = alias?.getTypeNode();
        if (!typeNode) return [];

        if (N.isTypeLiteral(typeNode)) {
            return this.typeLiteralProps(typeNode);
        }
        if (N.isIntersectionTypeNode(typeNode)) {
            return typeNode.getTypeNodes().flatMap(member => (N.isTypeLiteral(member) ? this.typeLiteralProps(member) : []));
        }
        return [];
    }

    private typeLiteralProps(typeNode: Node): PropInfo[] {
        if (!N.isTypeLiteral(typeNode)) return [];
        return typeNode
            .getMembers()
            .filter(N.isPropertySignature)
            .map(member => this.toPropInfo(member));
    }

    private toPropInfo(property: PropertySignature): PropInfo {
        return {
            name: property.getName(),
            type: property.getTypeNode()?.getText() ?? 'unknown',
            optional: property.hasQuestionToken(),
        };
    }

    private extractHooks(sourceFile: SourceFile): string[] {
        const hooks = new Set<string>();
        for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
            const match = call.getExpression().getText().match(/(?:^|\.)(use[A-Z]\w*)$/);
            if (match) hooks.add(match[1]);
        }
        return [...hooks];
    }

    private extractExports(sourceFile: SourceFile): string[] {
        const names = new Set<string>();

        for (const fn of sourceFile.getFunctions()) {
            if (fn.isExported()) names.add(fn.getName() ?? 'default');
        }
        for (const cls of sourceFile.getClasses()) {
            if (cls.isExported()) names.add(cls.getName() ?? 'default');
        }
        for (const statement of sourceFile.getVariableStatements()) {
            if (!statement.isExported()) continue;
            for (const declaration of statement.getDeclarations()) names.add(declaration.getName());
        }
        for (const declaration of sourceFile.getExportDeclarations()) {
            for (const named of declaration.getNamedExports()) names.add(named.getName());
            if (!declaration.getModuleSpecifierValue()) names.add('*');
        }
        if (sourceFile.getDefaultExportSymbol()) names.add('default');

        return [...names];
    }

    private extractJsx(sourceFile: SourceFile): JSXElement[] {
        return this.jsxInNode(sourceFile);
    }

    private jsxInNode(node: Node): JSXElement[] {
        const elements: JSXElement[] = [];
        for (const child of node.getChildren()) {
            if (N.isJsxElement(child)) {
                elements.push(this.fromJsxElement(child));
            } else if (N.isJsxSelfClosingElement(child)) {
                elements.push(this.fromSelfClosing(child));
            } else {
                elements.push(...this.jsxInNode(child));
            }
        }
        return elements;
    }

    private fromJsxElement(element: import('ts-morph').JsxElement): JSXElement {
        const opening = element.getOpeningElement();
        return {
            tag: opening.getTagNameNode().getText(),
            props: this.jsxAttributes(opening.getAttributes()),
            children: this.jsxInNode(element),
            location: this.location(element),
        };
    }

    private fromSelfClosing(element: import('ts-morph').JsxSelfClosingElement): JSXElement {
        return {
            tag: element.getTagNameNode().getText(),
            props: this.jsxAttributes(element.getAttributes()),
            children: [],
            location: this.location(element),
        };
    }

    private jsxAttributes(attributes: Node[]): Record<string, string> {
        const props: Record<string, string> = {};
        for (const attribute of attributes) {
            if (!N.isJsxAttribute(attribute)) continue;
            props[attribute.getNameNode().getText()] = this.attributeValue(attribute.getInitializer());
        }
        return props;
    }

    private attributeValue(initializer: Node | undefined): string {
        if (!initializer) return 'true';
        if (N.isStringLiteral(initializer)) return initializer.getLiteralText();
        if (N.isJsxExpression(initializer)) return initializer.getExpression()?.getText() ?? '';
        return initializer.getText();
    }

    private location(node: Node): { line: number; column: number } {
        const sourceFile = node.getSourceFile();
        const position = node.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(position);
        return { line, column };
    }

    private analyzeRoutes(): void {
        const { notesView, editorManager, tiptapEditor, dashboardView } = {
            notesView: this.components.get('NotesView'),
            editorManager: this.components.get('EditorManager'),
            tiptapEditor: this.components.get('TiptapEditor'),
            dashboardView: this.components.get('DashboardView'),
        };

        if (notesView && editorManager && tiptapEditor) {
            this.routes.push({ path: '#notes/:noteId', component: 'NotesView', guards: ['selectedNoteId'] });
        }
        if (dashboardView) {
            this.routes.push({ path: '#dashboard', component: 'DashboardView', guards: ['!selectedNoteId'] });
        }
        for (const name of this.components.keys()) {
            if (name.endsWith('View') && !['NotesView', 'DashboardView'].includes(name)) {
                this.routes.push({ path: `#${name.replace('View', '').toLowerCase()}`, component: name, guards: [] });
            }
        }
    }

    private analyzeDialogs(): void {
        if (this.components.has('InsertPropertyModal')) {
            this.dialogs.push({
                name: 'InsertPropertyModal',
                trigger: 'handlePrepareNewProperty / toolbar "Add detail" button',
                component: 'InsertPropertyModal',
                fields: [
                    { name: 'key', type: 'text', label: 'Detail', required: true },
                    { name: 'operator', type: 'select', label: 'Comparison', required: true, options: ['is', 'is not', 'greater than', 'less than', 'contains', 'between'] },
                    { name: 'value', type: 'custom', label: 'Value', required: true },
                ],
            });
        }
        for (const name of this.components.keys()) {
            if ((name.includes('Modal') || name.includes('Dialog')) && name !== 'InsertPropertyModal') {
                this.dialogs.push({ name, trigger: 'unknown', component: name, fields: [] });
            }
        }
    }

    private analyzeActions(): void {
        const actions: DiscoveredAction[] = [
            { component: 'TiptapToolbar', action: 'openPropertyModal', selector: { role: 'button', name: 'Add detail' }, intent: 'note.addProperty' },
            { component: 'InsertPropertyModal', action: 'submit', selector: { role: 'button', name: 'Add detail' }, intent: 'note.insertProperty' },
            { component: 'InsertPropertyModal', action: 'cancel', selector: { role: 'button', name: 'Cancel' }, intent: 'note.cancelProperty' },
            { component: 'ExtractionReview', action: 'accept', selector: { role: 'button', name: 'Accept' }, intent: 'note.acceptExtraction' },
            { component: 'ExtractionReview', action: 'reject', selector: { role: 'button', name: 'Reject' }, intent: 'note.rejectExtraction' },
            { component: 'EditorHeader', action: 'publish', selector: { role: 'button', name: 'Publish' }, intent: 'note.publish' },
            { component: 'Sidebar', action: 'selectNote', selector: { role: 'button', name: 'note' }, intent: 'note.select' },
        ];
        for (const action of actions) {
            if (this.components.has(action.component)) this.actions.push(action);
        }
    }
}

export const scanner = new ComponentScanner();
