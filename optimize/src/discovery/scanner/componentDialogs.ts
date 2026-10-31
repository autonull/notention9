import type { ComponentInfo, DiscoveredDialog, JSXElement, FieldInfo } from './componentScanner.js';
import { DIALOG_COMPONENT_TAGS, FORM_INPUT_TAGS } from '../../constants.js';
import { traverseJsx } from './componentJsx.js';

export function analyzeDialogs(components: Map<string, ComponentInfo>): DiscoveredDialog[] {
    const dialogs: DiscoveredDialog[] = [];

    for (const [compName, comp] of components) {
        for (const jsx of comp.jsx) {
            extractDialogsFromJsx(compName, jsx, dialogs);
        }
    }

    return dialogs;
}

function extractDialogsFromJsx(compName: string, jsx: JSXElement, dialogs: DiscoveredDialog[]): void {
    traverseJsx(jsx, (node) => {
        const isDialogComponent = DIALOG_COMPONENT_TAGS.some(d =>
            node.tag === d || node.tag.endsWith(d)
        );

        if (isDialogComponent) {
            const fields = extractFormFieldsFromJsx(node);
            dialogs.push({
                name: compName,
                trigger: inferDialogTrigger(compName, node),
                component: compName,
                fields,
            });
        }
    });
}

function extractFormFieldsFromJsx(jsx: JSXElement): FieldInfo[] {
    const fields: FieldInfo[] = [];

    traverseJsx(jsx, (node) => {
        if (FORM_INPUT_TAGS.some(tag => node.tag === tag || node.tag.endsWith(tag))) {
            const field = parseFormField(node);
            if (field) fields.push(field);
        }
    });

    return fields;
}

function parseFormField(jsx: JSXElement): FieldInfo | null {
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

function inferDialogTrigger(compName: string, jsx: JSXElement): string {
    if (compName.includes('InsertProperty')) return 'toolbar "Add detail" button';
    if (compName.includes('Confirm')) return 'delete/destructive action';
    if (compName.includes('Alert')) return 'error/notification';
    return 'unknown';
}