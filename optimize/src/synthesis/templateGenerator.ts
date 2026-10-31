/**
 * Template generation utilities for strategy synthesis
 */

import type { StrategySpec } from './StrategySpec.js';

/**
 * Generate a PascalCase component name from a seam ID
 */
export function pascalCase(str: string): string {
    return str
        .split(/[-_]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}

/**
 * Convert JSON Schema type to TypeScript type
 */
export function jsonSchemaTypeToTS(type: string): string {
    switch (type) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'array': return 'unknown[]';
        case 'object': return 'Record<string, unknown>';
        case 'function': return '(...args: unknown[]) => void';
        default: return 'unknown';
    }
}

/**
 * Generate a hash for a prompt string
 */
export function hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
        hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Extract function props and data props from accepts schema
 */
export function extractPropsFromAccepts(accepts: Record<string, unknown>): {
    functionProps: string[];
    dataProps: string[];
    requiredProps: string[];
    acceptsProps: Record<string, { type: string; required?: boolean }>;
} {
    const acceptsProps = accepts.properties as Record<string, { type: string; required?: boolean }> || {};
    const requiredProps = accepts.required as string[] || [];
    
    const functionProps: string[] = [];
    const dataProps: string[] = [];
    
    for (const [key, def] of Object.entries(acceptsProps)) {
        if (def.type === 'function') {
            functionProps.push(key);
        } else {
            dataProps.push(key);
        }
    }
    
    return { functionProps, dataProps, requiredProps, acceptsProps };
}

/**
 * Find common callback patterns in function props
 */
export function findCallbacks(functionProps: string[]): {
    onSave: string | undefined;
    onCancel: string | undefined;
    onChange: string | undefined;
} {
    const onSave = functionProps.find(p => 
        p.startsWith('onSave') || 
        p.startsWith('onApply') || 
        p.startsWith('onSelect') || 
        p.startsWith('onInsert')
    );
    const onCancel = functionProps.find(p => 
        p.startsWith('onCancel') || 
        p.startsWith('onClose')
    );
    const onChange = functionProps.find(p => 
        p.startsWith('onChange') || 
        p.startsWith('onInputChange')
    );
    
    return { onSave, onCancel, onChange };
}

/**
 * Generate input JSX for a single data prop
 */
export function generateDataInput(
    key: string,
    def: { type: string },
    required: boolean,
    acceptsProps: Record<string, { type: string; required?: boolean }>
): string {
    const requiredAttr = required ? ' required' : '';
    const isBoolean = def.type === 'boolean';
    const isArray = def.type === 'array';
    
    if (isBoolean) {
        return `<label>
    <input 
        type="checkbox" 
        checked={localProps.${key} || false}
        onChange={(e) => setLocalProps(prev => ({ ...prev, ${key}: e.target.checked }))}
        aria-label="${key}"
    />
    ${key}
</label>`;
    }
    
    if (isArray && key === 'tags') {
        return `<label htmlFor="${key}" className="sr-only">${key}</label>
<input 
    id="${key}"
    type="text" 
    value={(localProps.${key} || []).join(', ')}
    onChange={(e) => setLocalProps(prev => ({ ...prev, ${key}: e.target.value.split(',').map(s => s.trim()) }))}
    placeholder="${key} (comma-separated)"${requiredAttr}
    aria-label="${key}"
/>`;
    }
    
    // For select-like props (initialKey, templateId), try to use a select if ontology is available
    if ((key === 'initialKey' || key === 'templateId') && acceptsProps.ontology) {
        return `<label htmlFor="${key}" className="sr-only">${key}</label>
<select 
    id="${key}"
    value={localProps.${key} || ''}
    onChange={(e) => setLocalProps(prev => ({ ...prev, ${key}: e.target.value }))}
    aria-label="${key}"${requiredAttr}
>
    <option value="">Select ${key}...</option>
    {props.ontology?.map((node: any) => (
        <option key={node.id} value={node.key || node.id}>{node.label || node.key || node.id}</option>
    ))}
</select>`;
    }
    
    // For textarea-like props
    if (key === 'text' || key === 'content' || key === 'description') {
        return `<label htmlFor="${key}" className="sr-only">${key}</label>
<textarea 
    id="${key}"
    value={localProps.${key} || ''}
    onChange={(e) => setLocalProps(prev => ({ ...prev, ${key}: e.target.value }))}
    placeholder="${key}"${requiredAttr}
    aria-label="${key}"
    rows={4}
/>`;
    }
    
    return `<label htmlFor="${key}" className="sr-only">${key}</label>
<input 
    id="${key}"
    type="text" 
    value={localProps.${key} || ''}
    onChange={(e) => setLocalProps(prev => ({ ...prev, ${key}: e.target.value }))}
    placeholder="${key}"${requiredAttr}
    aria-label="${key}"
/>`;
}

/**
 * Generate action button JSX
 */
export function generateActionButtons(
    onSave: string | undefined,
    onCancel: string | undefined,
    dataProps: string[]
): string {
    const actionButtons: string[] = [];
    
    if (onSave) {
        const label = onSave === 'onSave' ? 'Save' : 
                      onSave === 'onApply' ? 'Apply' : 
                      onSave === 'onSelect' ? 'Select' : 'Insert';
        actionButtons.push(`<button 
    type="button"
    onClick={() => props.${onSave}(localProps)}
    disabled={${dataProps.map(p => `!localProps.${p}`).join(' && ')}}
>
    ${label}
</button>`);
    }
    
    if (onCancel) {
        const label = onCancel === 'onCancel' ? 'Cancel' : 'Close';
        actionButtons.push(`<button 
    type="button"
    onClick={() => props.${onCancel}()}
>
    ${label}
</button>`);
    }
    
    if (actionButtons.length === 0) {
        actionButtons.push(`<button type="button" disabled>No action</button>`);
    }
    
    return actionButtons.join('\n            ');
}

/**
 * Generate JSX content from accepts schema
 */
export function generateJSXFromAccepts(spec: StrategySpec): string {
    const { functionProps, dataProps, requiredProps, acceptsProps } = extractPropsFromAccepts(spec.accepts);
    const { onSave, onCancel } = findCallbacks(functionProps);
    const seamRole = spec.seam.split('-')[0];
    
    // Generate inputs for data props (excluding ontology which is typically an array)
    const dataInputs = dataProps
        .filter(key => key !== 'ontology')
        .map(key => generateDataInput(key, acceptsProps[key], requiredProps.includes(key), acceptsProps))
        .join('\n            ');
    
    const buttonsJsx = generateActionButtons(onSave, onCancel, dataProps);
    
    return `<div className="${seamRole}-strategy">
            ${dataInputs}
            ${buttonsJsx}
        </div>`;
}

/**
 * Generate TypeScript interface for props
 */
export function generatePropsInterface(accepts: Record<string, unknown>): string {
    if (!accepts.properties) return 'interface Props {}';
    
    const props = accepts.properties as Record<string, { type: string; required?: boolean }>;
    const required = accepts.required as string[] || [];
    
    let result = 'interface Props {\n';
    for (const [key, def] of Object.entries(props)) {
        const optional = required.includes(key) ? '' : '?';
        const tsType = jsonSchemaTypeToTS(def.type);
        result += `    ${key}${optional}: ${tsType};\n`;
    }
    result += '}';
    return result;
}

/**
 * Generate TypeScript type aliases for event handlers
 */
export function generateEventHandlers(emits: Record<string, unknown>): string {
    if (!emits.properties) return '';
    
    const events = emits.properties as Record<string, { properties: Record<string, { type: string }> }>;
    
    let result = '';
    for (const [eventName, def] of Object.entries(events)) {
        const handlerName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        const payload = def.properties 
            ? Object.entries(def.properties).map(([k, v]) => `${k}: ${jsonSchemaTypeToTS(v.type)}`).join(', ') 
            : '';
        result += `type ${handlerName} = (payload: { ${payload} }) => void;\n`;
    }
    return result;
}

/**
 * Generate the complete strategy component code from a spec
 */
export function generateStrategyCode(spec: StrategySpec): string {
    const componentName = pascalCase(spec.seam) + 'Strategy';
    const props = generatePropsInterface(spec.accepts);
    const events = generateEventHandlers(spec.emits);
    const jsxContent = generateJSXFromAccepts(spec);
    
    return `import React, { useState, useCallback, useEffect } from 'react';

${props}

${events}

export default function ${componentName}(props: Props): React.ReactElement {
    const [localProps, setLocalProps] = useState<Props>(props);
    
    // TODO: Implement strategy logic based on seam: ${spec.seam}
    // Intent: ${spec.intent}
    
    return (
        <div 
            role="region" 
            aria-label="${spec.intent}"
            className="strategy-component"
            data-seam="${spec.seam}"
        >
            ${jsxContent}
        </div>
    );
}
`;
}