import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

interface ComponentInfo {
    name: string;
    file: string;
    props: PropInfo[];
    jsx: JSXElement[];
    hooks: string[];
    exports: string[];
}

interface PropInfo {
    name: string;
    type: string;
    optional: boolean;
}

interface JSXElement {
    tag: string;
    props: Record<string, string>;
    children: JSXElement[];
    location: { line: number; column: number };
}

interface DiscoveredRoute {
    path: string;
    component: string;
    guards: string[];
}

interface DiscoveredDialog {
    name: string;
    trigger: string;
    component: string;
    fields: FieldInfo[];
}

interface FieldInfo {
    name: string;
    type: 'text' | 'select' | 'custom';
    label: string;
    required: boolean;
    options?: string[];
}

interface DiscoveredAction {
    component: string;
    action: string;
    selector: SelectorInfo;
    intent: string;
}

interface SelectorInfo {
    role?: string;
    name?: string;
    testId?: string;
    label?: string;
    css?: string;
}

export class ComponentScanner {
    private components: Map<string, ComponentInfo> = new Map();
    private routes: DiscoveredRoute[] = [];
    private dialogs: DiscoveredDialog[] = [];
    private actions: DiscoveredAction[] = [];

    scan(projectRoot: string = '/home/me/notention9'): DiscoveryResult {
        this.components.clear();
        this.routes = [];
        this.dialogs = [];
        this.actions = [];

        const uiRoot = `${projectRoot}/ui/src`;
        const files = globSync('**/*.tsx', { cwd: uiRoot, absolute: true });

        for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            const info = this.parseComponent(file, content);
            if (info) {
                this.components.set(info.name, info);
            }
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

    private parseComponent(file: string, content: string): ComponentInfo | null {
        let name = '';
        const props: PropInfo[] = [];
        const jsx: JSXElement[] = [];
        const hooks: string[] = [];
        const exports: string[] = [];

        // Simple regex-based extraction (TypeScript AST is heavy)
        const exportMatch = content.match(/export\s+(?:function|const|class)\s+(\w+)/);
        if (exportMatch) name = exportMatch[1];

        // Props interface
        const propsMatch = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/);
        if (propsMatch) {
            const propLines = propsMatch[1].split('\n');
            for (const line of propLines) {
                const m = line.trim().match(/^(\??\w+)\s*:\s*([^;]+);?$/);
                if (m) {
                    props.push({ name: m[1].replace('?', ''), type: m[2].trim(), optional: m[1].startsWith('?') });
                }
            }
        }

        // Hooks used
        const hookMatches = content.matchAll(/use[A-Z]\w+/g);
        for (const m of hookMatches) hooks.push(m[0]);

        // JSX elements with semantic meaning
        const jsxMatches = content.matchAll(/<(\w+)(?:\s+[^>]*)?>/g);
        for (const m of jsxMatches) {
            const tag = m[1];
            if (this.isSemanticElement(tag)) {
                jsx.push({ tag, props: this.extractProps(m[0]), children: [], location: { line: 0, column: 0 } });
            }
        }

        return name ? { name, file, props, jsx, hooks, exports } : null;
    }

    private isSemanticElement(tag: string): boolean {
        const semantic = [
            'Modal', 'Dialog', 'Button', 'Input', 'Select', 'Form',
            'TiptapEditor', 'InsertPropertyModal', 'ExtractionReview',
            'NotesView', 'EditorManager', 'DashboardView', 'SettingsView',
            'Sidebar', 'Header', 'CommandPalette', 'PropertyForm'
        ];
        return semantic.some(s => tag.includes(s)) || tag[0] === tag[0].toUpperCase();
    }

    private extractProps(jsxString: string): Record<string, string> {
        const props: Record<string, string> = {};
        const propRegex = /(\w+)\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g;
        let match;
        while ((match = propRegex.exec(jsxString)) !== null) {
            props[match[1]] = match[2] ?? match[3] ?? '';
        }
        return props;
    }

    private analyzeRoutes(): void {
        // AppShell -> NotesView (when selectedNote) -> EditorManager -> TiptapEditor
        // DashboardView (when no selectedNote)
        const notesView = this.components.get('NotesView');
        const editorManager = this.components.get('EditorManager');
        const tiptapEditor = this.components.get('TiptapEditor');
        const dashboardView = this.components.get('DashboardView');

        if (notesView && editorManager && tiptapEditor) {
            this.routes.push({
                path: '#notes/:noteId',
                component: 'NotesView',
                guards: ['selectedNoteId'],
            });
        }
        if (dashboardView) {
            this.routes.push({
                path: '#dashboard',
                component: 'DashboardView',
                guards: ['!selectedNoteId'],
            });
        }
        // Settings, Ontology, Network, Map, Chat, Trash, Timeline, Actions
        for (const [name, comp] of this.components) {
            if (name.endsWith('View') && !['NotesView', 'DashboardView'].includes(name)) {
                this.routes.push({
                    path: `#${name.replace('View', '').toLowerCase()}`,
                    component: name,
                    guards: [],
                });
            }
        }
    }

    private analyzeDialogs(): void {
        const insertModal = this.components.get('InsertPropertyModal');
        if (insertModal) {
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

        // Other modals
        for (const [name, comp] of this.components) {
            if ((name.includes('Modal') || name.includes('Dialog')) && name !== 'InsertPropertyModal') {
                this.dialogs.push({
                    name,
                    trigger: 'unknown',
                    component: name,
                    fields: [],
                });
            }
        }
    }

    private analyzeActions(): void {
        // Toolbar "Add detail" button
        this.actions.push({
            component: 'TiptapToolbar',
            action: 'openPropertyModal',
            selector: { role: 'button', name: 'Add detail' },
            intent: 'note.addProperty',
        });

        // Modal submit
        this.actions.push({
            component: 'InsertPropertyModal',
            action: 'submit',
            selector: { role: 'button', name: 'Add detail' },
            intent: 'note.insertProperty',
        });

        // Modal cancel
        this.actions.push({
            component: 'InsertPropertyModal',
            action: 'cancel',
            selector: { role: 'button', name: 'Cancel' },
            intent: 'note.cancelProperty',
        });

        // Extraction review accept/reject
        this.actions.push({
            component: 'ExtractionReview',
            action: 'accept',
            selector: { role: 'button', name: 'Accept' },
            intent: 'note.acceptExtraction',
        });

        this.actions.push({
            component: 'ExtractionReview',
            action: 'reject',
            selector: { role: 'button', name: 'Reject' },
            intent: 'note.rejectExtraction',
        });

        // Publish button
        this.actions.push({
            component: 'EditorHeader',
            action: 'publish',
            selector: { role: 'button', name: 'Publish' },
            intent: 'note.publish',
        });

        // Sidebar note selection
        this.actions.push({
            component: 'Sidebar',
            action: 'selectNote',
            selector: { role: 'button', name: 'note' },
            intent: 'note.select',
        });
    }
}

export interface DiscoveryResult {
    routes: DiscoveredRoute[];
    dialogs: DiscoveredDialog[];
    actions: DiscoveredAction[];
    components: ComponentInfo[];
}

export const scanner = new ComponentScanner();