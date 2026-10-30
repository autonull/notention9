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
        // Derive routes from JSX: look for routing components and path patterns
        const routeComponents = new Map<string, { path: string; guards: string[] }>();
        
        for (const [compName, comp] of this.components) {
            for (const jsx of comp.jsx) {
                this.extractRoutesFromJsx(compName, jsx, routeComponents);
            }
        }
        
        // Add discovered routes
        for (const [path, info] of routeComponents) {
            this.routes.push({ path, component: info.path.split('/')[1] || 'Unknown', guards: info.guards });
        }
        
        // Fallback: detect View components
        for (const name of this.components.keys()) {
            if (name.endsWith('View')) {
                const path = `#${name.replace('View', '').toLowerCase()}`;
                if (!this.routes.some(r => r.path === path)) {
                    this.routes.push({ path, component: name, guards: [] });
                }
            }
        }
    }
    
    private extractRoutesFromJsx(compName: string, jsx: JSXElement, routes: Map<string, { path: string; guards: string[] }>): void {
        // Look for routing patterns in JSX
        if (jsx.tag === 'Route' || jsx.tag === 'Routes' || jsx.tag === 'Switch') {
            const path = jsx.props.path || jsx.props.from;
            if (path) {
                const guards: string[] = [];
                if (jsx.props.guard) guards.push(jsx.props.guard);
                if (jsx.props.requireAuth) guards.push('auth');
                routes.set(path, { path, guards });
            }
        }
        
        // Look for Link/NavLink components with to prop
        if ((jsx.tag === 'Link' || jsx.tag === 'NavLink') && jsx.props.to) {
            const path = jsx.props.to;
            routes.set(path, { path, guards: [] });
        }
        
        // Recurse into children
        for (const child of jsx.children) {
            this.extractRoutesFromJsx(compName, child, routes);
        }
    }

    private analyzeDialogs(): void {
        // Derive dialogs from JSX: look for Modal, Dialog, Popover components
        for (const [compName, comp] of this.components) {
            for (const jsx of comp.jsx) {
                this.extractDialogsFromJsx(compName, jsx);
            }
        }
    }
    
    private extractDialogsFromJsx(compName: string, jsx: JSXElement): void {
        // Check if this component renders a Modal/Dialog
        const isDialogComponent = ['Modal', 'Dialog', 'Popover', 'Drawer'].some(d => 
            jsx.tag === d || jsx.tag.endsWith(d)
        );
        
        if (isDialogComponent) {
            const fields = this.extractFormFieldsFromJsx(jsx);
            this.dialogs.push({
                name: compName,
                trigger: this.inferDialogTrigger(compName, jsx),
                component: compName,
                fields,
            });
        }
        
        // Recurse into children
        for (const child of jsx.children) {
            this.extractDialogsFromJsx(compName, child);
        }
    }
    
    private extractFormFieldsFromJsx(jsx: JSXElement): FieldInfo[] {
        const fields: FieldInfo[] = [];
        
        // Look for form inputs
        const inputTags = ['input', 'select', 'textarea', 'Input', 'Select', 'Textarea'];
        if (inputTags.includes(jsx.tag) || inputTags.some(t => jsx.tag.endsWith(t))) {
            const field = this.parseFormField(jsx);
            if (field) fields.push(field);
        }
        
        // Recurse into children
        for (const child of jsx.children) {
            fields.push(...this.extractFormFieldsFromJsx(child));
        }
        
        return fields;
    }
    
    private parseFormField(jsx: JSXElement): FieldInfo | null {
        const name = jsx.props.name || jsx.props.id || jsx.props['data-field'];
        if (!name) return null;
        
        let type: FieldInfo['type'] = 'text';
        if (jsx.tag === 'select' || jsx.tag === 'Select') type = 'select';
        else if (jsx.props.type === 'checkbox' || jsx.props.type === 'radio') type = 'select';
        else if (jsx.tag === 'textarea' || jsx.tag === 'Textarea') type = 'text';
        
        const options: string[] = [];
        if (type === 'select') {
            // Extract options from children
            for (const child of jsx.children) {
                if (child.tag === 'option' || child.tag === 'Option') {
                    options.push(child.props.value || child.props.children?.[0] || '');
                }
            }
        }
        
        return {
            name,
            type,
            label: jsx.props.label || jsx.props.placeholder || name,
            required: jsx.props.required === 'true' || jsx.props.required === true,
            options: options.length > 0 ? options : undefined,
        };
    }
    
    private inferDialogTrigger(compName: string, jsx: JSXElement): string {
        // Try to infer what triggers this dialog
        if (compName.includes('InsertProperty')) return 'toolbar "Add detail" button';
        if (compName.includes('Confirm')) return 'delete/destructive action';
        if (compName.includes('Alert')) return 'error/notification';
        return 'unknown';
    }

    private analyzeActions(): void {
        // Derive actions from JSX: look for onClick handlers, buttons with intents
        for (const [compName, comp] of this.components) {
            for (const jsx of comp.jsx) {
                this.extractActionsFromJsx(compName, jsx);
            }
        }
    }
    
    private extractActionsFromJsx(compName: string, jsx: JSXElement): void {
        // Look for click handlers
        const clickHandlers = ['onClick', 'onPress', 'onSubmit', 'onSelect'];
        for (const handler of clickHandlers) {
            if (jsx.props[handler]) {
                const intent = this.inferIntentFromHandler(handler, jsx.props[handler], compName);
                const selector = this.extractSelector(jsx);
                
                this.actions.push({
                    component: compName,
                    action: handler.replace('on', '').toLowerCase(),
                    selector,
                    intent,
                });
                break; // Only record first click handler per element
            }
        }
        
        // Recurse into children
        for (const child of jsx.children) {
            this.extractActionsFromJsx(compName, child);
        }
    }
    
    private inferIntentFromHandler(handler: string, handlerValue: string, compName: string): string {
        const handlerLower = handlerValue.toLowerCase();
        const compLower = compName.toLowerCase();
        
        if (handlerLower.includes('add') && handlerLower.includes('detail')) return 'note.addProperty';
        if (handlerLower.includes('insert') && handlerLower.includes('propert')) return 'note.insertProperty';
        if (handlerLower.includes('cancel')) return 'note.cancelProperty';
        if (handlerLower.includes('accept') || handlerLower.includes('approve')) return 'note.acceptExtraction';
        if (handlerLower.includes('reject') || handlerLower.includes('decline')) return 'note.rejectExtraction';
        if (handlerLower.includes('publish')) return 'note.publish';
        if (handlerLower.includes('select') && compLower.includes('sidebar')) return 'note.select';
        if (handlerLower.includes('save')) return 'note.save';
        if (handlerLower.includes('delete') || handlerLower.includes('remove')) return 'note.delete';
        
        return `ui.${compName.toLowerCase()}.${handler.toLowerCase()}`;
    }
    
    private extractSelector(jsx: JSXElement): SelectorInfo {
        return {
            role: jsx.props.role,
            name: jsx.props.name || jsx.props['aria-label'] || jsx.props['data-testid'],
            testId: jsx.props['data-testid'],
            label: jsx.props['aria-label'] || jsx.props.label,
            css: jsx.props.className || jsx.props.id ? `#${jsx.props.id}` : undefined,
        };
    }
}

export const scanner = new ComponentScanner();
