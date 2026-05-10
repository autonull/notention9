import { OntologyNode, Template, OntologyAttribute } from '../types/index.js';

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

        // Also add a few non-required ones if they seem important? 
        // For now let's just do required + maybe others later.
        // But we should prioritize required ones.

        Object.keys(node.attributes).filter(key => required.includes(key)).forEach(key => {
            const attr = node.attributes![key];
            content += `[${key} ${getDefaultOperator(attr)} ${getDefaultValue(attr)}]\n`;
        });
    }

    content += '\n'; // Spacer
    return content;
}

function getNodeIcon(node: OntologyNode): string {
    // Try to find an icon in attributes (sometimes stored there in current ontology)
    // Or just use a default
    // In the updated Ontology definition, nodes don't strictly have icons, but attributes do.
    // However, the example usage implies nodes have icons or we infer them.
    // Let's check if the node has an icon property we missed in types or just use a default.

    // Re-checking types: OntologyNode doesn't explicitly have 'icon' in the interface I read earlier,
    // but the DEFAULT_ONTOLOGY might have them or we can infer from label.

    // Quick heuristic map
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
