import type { ComponentInfo, DiscoveredAction, JSXElement, SelectorInfo } from './componentScanner.js';
import { CLICK_HANDLERS } from '../../constants.js';
import { traverseJsx } from './componentJsx.js';

export function analyzeActions(components: Map<string, ComponentInfo>): DiscoveredAction[] {
    const actions: DiscoveredAction[] = [];

    for (const [compName, comp] of components) {
        for (const jsx of comp.jsx) {
            extractActionsFromJsx(compName, jsx, actions);
        }
    }

    return actions;
}

function extractActionsFromJsx(compName: string, jsx: JSXElement, actions: DiscoveredAction[]): void {
    traverseJsx(jsx, (node) => {
        for (const handler of CLICK_HANDLERS) {
            if (node.props[handler]) {
                const intent = inferIntentFromHandler(handler, node.props[handler], compName);
                const selector = extractSelector(node);

                actions.push({
                    component: compName,
                    action: handler.replace('on', '').toLowerCase(),
                    selector,
                    intent,
                });
                return;
            }
        }
    });
}

function inferIntentFromHandler(handler: string, handlerValue: string, compName: string): string {
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

function extractSelector(jsx: JSXElement): SelectorInfo {
    return {
        role: jsx.props.role,
        name: jsx.props.name || jsx.props['aria-label'] || jsx.props['data-testid'],
        testId: jsx.props['data-testid'],
        label: jsx.props['aria-label'] || jsx.props.label,
        css: jsx.props.className || jsx.props.id ? `#${jsx.props.id}` : undefined,
    };
}