import type { ComponentInfo, JSXElement, DiscoveredRoute, DiscoveredDialog, DiscoveredAction, FieldInfo, SelectorInfo } from './componentScanner.js';
import { traverseJsx } from './componentJsx.js';
import { 
    ROUTING_COMPONENT_TAGS, 
    LINK_COMPONENT_TAGS, 
    DIALOG_COMPONENT_TAGS, 
    FORM_INPUT_TAGS, 
    CLICK_HANDLERS 
} from '../../constants.js';

export interface ComponentAnalysisResult {
    routes: DiscoveredRoute[];
    dialogs: DiscoveredDialog[];
    actions: DiscoveredAction[];
}

const VIEW_COMPONENT_SUFFIX = 'View';
const ROUTE_PATH_PREFIX = '#';

/**
 * Unified component analyzer that extracts routes, dialogs, and actions in a single pass
 * Avoids multiple traversals of the same JSX trees
 */
export class ComponentAnalyzer {
    private routes = new Map<string, { path: string; guards: string[] }>();
    private dialogs: DiscoveredDialog[] = [];
    private actions: DiscoveredAction[] = [];
    private processedComponents = new Set<string>();

    analyze(components: Map<string, ComponentInfo>): ComponentAnalysisResult {
        this.reset();

        for (const [compName, comp] of components) {
            if (this.processedComponents.has(compName)) continue;
            this.processedComponents.add(compName);

            for (const jsx of comp.jsx) {
                this.analyzeJsxTree(compName, jsx);
            }
        }

        // Post-process: add fallback View routes
        this.addViewRoutes(components);

        return {
            routes: this.buildRoutes(),
            dialogs: this.dialogs,
            actions: this.actions,
        };
    }

    private reset(): void {
        this.routes.clear();
        this.dialogs = [];
        this.actions = [];
        this.processedComponents.clear();
    }

    private analyzeJsxTree(compName: string, jsx: JSXElement): void {
        traverseJsx(jsx, (node) => {
            this.checkRoutingComponents(compName, node);
            this.checkLinkComponents(node);
            this.checkDialogComponents(compName, node);
            this.checkActionHandlers(compName, node);
        });
    }

    private checkRoutingComponents(compName: string, node: JSXElement): void {
        if (ROUTING_COMPONENT_TAGS.some(tag => node.tag === tag)) {
            const path = node.props.path || node.props.from;
            if (path) {
                const guards: string[] = [];
                if (node.props.guard) guards.push(node.props.guard);
                if (node.props.requireAuth) guards.push('auth');
                this.routes.set(path, { path, guards });
            }
        }
    }

    private checkLinkComponents(node: JSXElement): void {
        if (LINK_COMPONENT_TAGS.some(tag => node.tag === tag) && node.props.to) {
            const path = node.props.to;
            if (!this.routes.has(path)) {
                this.routes.set(path, { path, guards: [] });
            }
        }
    }

    private checkDialogComponents(compName: string, node: JSXElement): void {
        const isDialogComponent = DIALOG_COMPONENT_TAGS.some(d =>
            node.tag === d || node.tag.endsWith(d)
        );

        if (isDialogComponent) {
            const fields = this.extractFormFieldsFromJsx(node);
            this.dialogs.push({
                name: compName,
                trigger: this.inferDialogTrigger(compName, node),
                component: compName,
                fields,
            });
        }
    }

    private checkActionHandlers(compName: string, node: JSXElement): void {
        for (const handler of CLICK_HANDLERS) {
            if (node.props[handler]) {
                const intent = this.inferIntentFromHandler(handler, node.props[handler], compName);
                const selector = this.extractSelector(node);

                this.actions.push({
                    component: compName,
                    action: handler.replace('on', '').toLowerCase(),
                    selector,
                    intent,
                });
                return; // Only process first matching handler
            }
        }
    }

    private extractFormFieldsFromJsx(jsx: JSXElement): FieldInfo[] {
        const fields: FieldInfo[] = [];

        traverseJsx(jsx, (node) => {
            if (FORM_INPUT_TAGS.some(tag => node.tag === tag || node.tag.endsWith(tag))) {
                const field = this.parseFormField(node);
                if (field) fields.push(field);
            }
        });

        return fields;
    }

    private parseFormField(jsx: JSXElement): FieldInfo | null {
        const name = jsx.props.name ?? jsx.props.id ?? jsx.props['data-field'];
        if (!name) return null;

        let type: FieldInfo['type'] = 'text';
        if (jsx.tag === 'select' || jsx.tag === 'Select') type = 'select';
        else if (jsx.props.type === 'checkbox' || jsx.props.type === 'radio') type = 'select';
        else if (jsx.tag === 'textarea' || jsx.tag === 'Textarea') type = 'text';

        const options: string[] = [];
        if (type === 'select') {
            for (const child of jsx.children) {
                if (child.tag === 'option' || child.tag === 'Option') {
                    options.push(child.props.value ?? child.props.children?.[0] ?? '');
                }
            }
        }

        return {
            name,
            type,
            label: jsx.props.label ?? jsx.props.placeholder ?? name,
            required: jsx.props.required === 'true' || jsx.props.required === '' || jsx.props.required === 'required',
            options: options.length > 0 ? options : undefined,
        };
    }

    private inferDialogTrigger(compName: string, _jsx: JSXElement): string {
        if (compName.includes('InsertProperty')) return 'toolbar "Add detail" button';
        if (compName.includes('Confirm')) return 'delete/destructive action';
        if (compName.includes('Alert')) return 'error/notification';
        return 'unknown';
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

    private addViewRoutes(components: Map<string, ComponentInfo>): void {
        for (const name of components.keys()) {
            if (name.endsWith(VIEW_COMPONENT_SUFFIX)) {
                const path = `${ROUTE_PATH_PREFIX}${name.replace(VIEW_COMPONENT_SUFFIX, '').toLowerCase()}`;
                if (!this.routes.has(path)) {
                    this.routes.set(path, { path, guards: [] });
                }
            }
        }
    }

    private buildRoutes(): DiscoveredRoute[] {
        const routes: DiscoveredRoute[] = [];
        for (const [path, info] of this.routes) {
            routes.push({ path, component: info.path.split('/')[1] || 'Unknown', guards: info.guards });
        }
        return routes;
    }
}

/**
 * Convenience function for analyzing components
 */
export function analyzeComponents(components: Map<string, ComponentInfo>): ComponentAnalysisResult {
    const analyzer = new ComponentAnalyzer();
    return analyzer.analyze(components);
}