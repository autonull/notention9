import { OntologyNode, Template, OntologyAttribute } from '../types/index.js';
import { propertyToHtml } from '../notes/serialization.js';

export function generateTemplatesFromOntology(ontology: OntologyNode[]): Template[] {
    const templates: Template[] = [];

    function traverse(nodes: OntologyNode[]) {
        nodes.forEach(node => {
            if (node.actionLabel && node.attributes) {
                templates.push(createTemplateFromNode(node));
            }
            if (node.children) traverse(node.children);
        });
    }

    traverse(ontology);
    return templates;
}

function createTemplateFromNode(node: OntologyNode): Template {
    const content = generateReferenceContent(node);

    return {
        id: `tpl-${node.id}`,
        label: node.actionLabel || node.label,
        icon: getNodeIcon(node),
        content: content
    };
}

function generateReferenceContent(node: OntologyNode): string {
    // 1. Add Tags
    let content = `#${node.id.replace(/\s+/g, '')}`;
    if (node.extends) {
        content += ` ${node.extends.map(e => `#${e}`).join(' ')}`;
    }
    content += '\n\n';

    // 2. Add Required Attributes
    if (node.attributes) {
        const required = node.requiredAttributes || [];
        const relevantKeys = [...required];

        Object.keys(node.attributes).filter(key => required.includes(key)).forEach(key => {
            const attr = node.attributes![key];
            content += `<p>${propertyToHtml({
                key,
                operator: getDefaultOperator(attr),
                values: [getDefaultValue(attr)],
            }, attr.icon)}</p>\n`;
        });
    }

    content += '\n'; // Spacer
    return content;
}

function getNodeIcon(node: OntologyNode): string {
    const iconMap: Record<string, string> = {
        'Job Request': '💼',
        'Post Job': '💼',
        'Freelance Offer': '👨‍💻',
        'Sell Product': '🏷️',
        'Event': '📅',
        'Meeting': '🤝',
    };

    return iconMap[node.actionLabel || node.label] || '📄';
}

function getDefaultOperator(attr: OntologyAttribute): string {
    return attr.operators.real[0] || 'is';
}

function getDefaultValue(attr: OntologyAttribute): string {
    switch (attr.type) {
        case 'number': return '0';
        case 'date': return 'YYYY-MM-DD';
        case 'datetime': return 'YYYY-MM-DD HH:mm';
        case 'enum': return attr.options ? attr.options[0] : 'value';
        case 'geo': return 'Location';
        case 'string': return 'text';
        default: return 'value';
    }
}