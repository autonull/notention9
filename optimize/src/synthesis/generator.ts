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
        options: GenerateOptions = {}
    ): Promise<CandidateStrategy> {
        const spec = this.specGenerator.getSpec(seamId) 
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

        return `import React, { useState, useCallback, useEffect } from 'react';
import type { OntologyNode } from '@notention/core';
import { useOntology } from '@notention/ui/hooks';

${props}

${events}

export default function ${componentName}(props: Props): React.ReactElement {
    const { ontology } = useOntology();
    const [localProps, setLocalProps] = useState<Props>(props);
    
    // TODO: Implement strategy logic based on seam: ${spec.seam}
    // Intent: ${spec.intent}
    
    return (
        <div 
            role="region" 
            aria-label="${spec.intent}"
            className="strategy-component"
        >
            <p>Generated strategy for ${spec.seam}</p>
            <p>Intent: ${spec.intent}</p>
        </div>
    );
}
`;
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
    
    // Map discovered seam roles to built-in spec IDs
    const roleToSpecId: Record<string, string> = {
        'capture': 'capture-0',
        'elicit': 'elicit-0',
        'extraction': 'extraction-0',
        'template': 'template-0',
    };
    
    // Generate one candidate per built-in spec that has a matching seam role
    for (const seam of seams) {
        const specId = roleToSpecId[seam.role];
        if (specId) {
            const spec = generator.specGenerator.getSpec(specId);
            if (spec) {
                // Use the built-in spec ID for generation but include discovered seam info
                const candidate = await generator.generateForSeam(specId, [], options);
                await saveCandidate(dir, candidate);
            }
        }
    }
    
    return dir;
}