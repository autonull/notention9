import type {Property} from '../types/index.js';

export interface PropertyNodeAttrs {
    name: string;
    operator: string;
    value: string;
    icon?: string;
}

const escapeAttribute = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

export const propertyToNodeAttrs = (property: Property, icon?: string): PropertyNodeAttrs => ({
    name: property.key,
    operator: property.operator,
    value: property.values.join(', '),
    ...(icon ? {icon} : {}),
});

export const nodeAttrsToProperty = (attrs: PropertyNodeAttrs): Property => ({
    key: attrs.name,
    operator: attrs.operator || 'is',
    values: attrs.value.split(',').map(value => value.trim()).filter(Boolean),
});

export const propertyNodeToHtml = (attrs: PropertyNodeAttrs): string => {
    const attributes = [
        'data-type="property"',
        `data-name="${escapeAttribute(attrs.name)}"`,
        `data-operator="${escapeAttribute(attrs.operator)}"`,
        `data-value="${escapeAttribute(attrs.value)}"`,
        attrs.icon ? `data-icon="${escapeAttribute(attrs.icon)}"` : '',
    ].filter(Boolean).join(' ');
    return `<span ${attributes}></span>`;
};

export const propertyToHtml = (property: Property, icon?: string): string =>
    propertyNodeToHtml(propertyToNodeAttrs(property, icon));

export const propertiesToHtml = (properties: Property[]): string =>
    properties.map(property => `<p>${propertyToHtml(property)}</p>`).join('\n');
