import { StrategySpecGenerator, type StrategySpec, type CandidateStrategy, type CandidateDir, createCandidateDir, saveCandidate, loadCandidates } from './StrategySpec.js';

/**
 * LLM Strategy Generator - generates T2 strategies (LLM writes strategy behind existing seam)
 */
export class StrategyGenerator {
    readonly specGenerator = new StrategySpecGenerator();

    /**
     * Generate a candidate strategy for a given seam using an LLM
     */
    async generateForSeam(
        seamId: string,
        requirements: string[],
        options: GenerateOptions & { spec?: StrategySpec } = {}
    ): Promise<CandidateStrategy> {
        const spec = options.spec ?? this.specGenerator.getSpec(seamId) 
            ?? this.specGenerator.generateSpec(
                { id: seamId, name: seamId, role: 'capture', propsShape: {} },
                requirements
            );

        const prompt = this.buildPrompt(spec, requirements);
        
        // In production, this would call the LLM
        // For now, return a template-based implementation
        const code = this.generateFromTemplate(spec);
        
        return {
            id: `${seamId}-candidate-${Date.now()}`,
            spec,
            code,
            provenance: {
                generatorModel: options.model || 'template-generator-v1',
                generatorVersion: '1.0.0',
                promptHash: this.hashPrompt(prompt),
                seed: options.seed || 0,
                parentCommit: options.parentCommit || 'unknown',
            },
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * Build prompt for LLM generation
     */
    private buildPrompt(spec: StrategySpec, requirements: string[]): string {
        return `
You are a React component generator for Notention. Generate a strategy component that implements the following seam specification.

SEAM SPECIFICATION:
${JSON.stringify(spec, null, 2)}

ADDITIONAL REQUIREMENTS:
${requirements.map(r => `- ${r}`).join('\n')}

CONSTRAINTS:
- Must be a valid React functional component
- Must use only imports from the "may" list
- Must NOT use any imports from the "mustNot" list
- Must satisfy all "must" requirements (a11y, keyboard, offline, etc.)
- Must conform to the "accepts" input schema and "emits" output schema
- Must be TypeScript with proper types
- Export as default component named "Strategy"

Return ONLY the TypeScript/TSX code, no markdown formatting.
`;
    }

    /**
     * Generate strategy code from template (fallback when no LLM)
     */
    private generateFromTemplate(spec: StrategySpec): string {
        const componentName = this.pascalCase(spec.seam) + 'Strategy';
        
        // Generate props interface from accepts schema
        const props = this.generatePropsInterface(spec.accepts);
        
        // Generate event handlers from emits schema
        const events = this.generateEventHandlers(spec.emits);

        // Generate JSX for the component based on accepts schema
        const jsxContent = this.generateJSXFromAccepts(spec);

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

    private generateJSXFromAccepts(spec: StrategySpec): string {
        const acceptsProps = spec.accepts.properties as Record<string, { type: string; required?: boolean }> || {};
        const requiredProps = spec.accepts.required as string[] || [];
        const seamRole = spec.seam.split('-')[0]; // e.g., "capture", "elicit", "extraction", "template"
        
        // Identify function props (callbacks) and data props
        const functionProps: string[] = [];
        const dataProps: string[] = [];
        
        for (const [key, def] of Object.entries(acceptsProps)) {
            if (def.type === 'function') {
                functionProps.push(key);
            } else {
                dataProps.push(key);
            }
        }
        
        // Find common callback patterns
        const onSave = functionProps.find(p => p.startsWith('onSave') || p.startsWith('onApply') || p.startsWith('onSelect') || p.startsWith('onInsert'));
        const onCancel = functionProps.find(p => p.startsWith('onCancel') || p.startsWith('onClose'));
        const onChange = functionProps.find(p => p.startsWith('onChange') || p.startsWith('onInputChange'));
        
        // Generate inputs for data props (excluding ontology which is typically an array)
        const dataInputs = dataProps
            .filter(key => key !== 'ontology')
            .map(key => {
                const def = acceptsProps[key];
                const required = requiredProps.includes(key) ? ' required' : '';
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
    placeholder="${key} (comma-separated)"${required}
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
    aria-label="${key}"${required}
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
    placeholder="${key}"${required}
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
    placeholder="${key}"${required}
    aria-label="${key}"
/>`;
            })
            .join('\n            ');
        
        // Generate action buttons based on available callbacks
        const actionButtons: string[] = [];
        if (onSave) {
            actionButtons.push(`<button 
    type="button"
    onClick={() => props.${onSave}(localProps)}
    disabled={${dataProps.map(p => `!localProps.${p}`).join(' && ')}}
>
    ${onSave === 'onSave' ? 'Save' : onSave === 'onApply' ? 'Apply' : onSave === 'onSelect' ? 'Select' : 'Insert'}
</button>`);
        }
        if (onCancel) {
            actionButtons.push(`<button 
    type="button"
    onClick={() => props.${onCancel}()}
>
    ${onCancel === 'onCancel' ? 'Cancel' : 'Close'}
</button>`);
        }
        
        if (actionButtons.length === 0) {
            // Default buttons if no recognized callbacks
            actionButtons.push(`<button type="button" disabled>No action</button>`);
        }
        
        const buttonsJsx = actionButtons.join('\n            ');
        
        return `<div className="${seamRole}-strategy">
            ${dataInputs}
            ${buttonsJsx}
        </div>`;
    }

    private generatePropsInterface(accepts: Record<string, unknown>): string {
        if (!accepts.properties) return 'interface Props {}';
        
        const props = accepts.properties as Record<string, { type: string; required?: boolean }>;
        const required = accepts.required as string[] || [];
        
        let result = 'interface Props {\n';
        for (const [key, def] of Object.entries(props)) {
            const optional = required.includes(key) ? '' : '?';
            const tsType = this.jsonSchemaTypeToTS(def.type);
            result += `    ${key}${optional}: ${tsType};\n`;
        }
        result += '}';
        return result;
    }

    private generateEventHandlers(emits: Record<string, unknown>): string {
        if (!emits.properties) return '';
        
        const events = emits.properties as Record<string, { properties: Record<string, { type: string }> }>;
        
        let result = '';
        for (const [eventName, def] of Object.entries(events)) {
            const handlerName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
            const payload = def.properties ? Object.entries(def.properties).map(([k, v]) => `${k}: ${this.jsonSchemaTypeToTS(v.type)}`).join(', ') : '';
            result += `type ${handlerName} = (payload: { ${payload} }) => void;\n`;
        }
        return result;
    }

    private jsonSchemaTypeToTS(type: string): string {
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

    private pascalCase(str: string): string {
        return str
            .split(/[-_]/)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join('');
    }

    private hashPrompt(prompt: string): string {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    }
}

export interface GenerateOptions {
    model?: string;
    seed?: number;
    parentCommit?: string;
}

/**
 * Generate candidates for all discovered seams
 */
export async function generateAllCandidates(
    seams: { id: string; name: string; role: string; propsShape: Record<string, string> }[],
    outputDir: string,
    options: GenerateOptions = {}
): Promise<CandidateDir> {
    const generator = new StrategyGenerator();
    const dir = createCandidateDir(outputDir);
    
    // Generate one candidate per discovered seam that has a built-in spec for its role
    const rolesWithBuiltinSpecs = new Set(['capture', 'elicit', 'extraction', 'template']);
    
    for (const seam of seams) {
        if (!rolesWithBuiltinSpecs.has(seam.role)) continue;
        
        // Generate a spec from the discovered seam (uses built-in as base if available)
        const spec = generator.specGenerator.generateSpec(seam, []);
        
        // Generate candidate using the discovered seam's ID
        const candidate = await generator.generateForSeam(seam.id, [], options);
        // Override the spec with the discovered seam's spec
        candidate.spec = spec;
        await saveCandidate(dir, candidate);
    }
    
    return dir;
}