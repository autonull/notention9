import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

interface SeamDefinition {
    id: string;
    name: string;
    description: string;
    role: string;
    propsShape: Record<string, string>;
    components: string[];
    paramSpec: Record<string, ParamDef>;
    evaluator: unknown;
    governanceLevel: string;
    evidenceClasses: string[];
    version: string;
    createdAt: string;
    updatedAt: string;
}

interface ParamDef {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: string[];
    min?: number;
    max?: number;
    mechanism?: string;
}

interface StrategyConfig {
    id: string;
    seamId: string;
    seamName: string;
    seamRole: string;
    version: string;
    componentPath: string;
    componentName: string;
    paramSpec: Record<string, ParamDef>;
    defaultProps: Record<string, unknown>;
}

function loadGeneratedDefinitions(): { seams: SeamDefinition[]; strategies: StrategyConfig[] } {
    const defsPath = resolve(ROOT, 'core/src/schemas/generated/seam-definitions.ts');
    const source = readFileSync(defsPath, 'utf8');

    const seamsMatch = source.match(/export const SEAM_DEFINITIONS: SeamDefinition\[\] = (\[[\s\S]*?\]);/);
    const strategiesMatch = source.match(/export const STRATEGY_CONFIGS = (\[[\s\S]*?\]);/);

    if (!seamsMatch || !strategiesMatch) {
        throw new Error('Failed to parse generated definitions');
    }

    const seams = JSON.parse(seamsMatch[1]);
    const strategies = JSON.parse(strategiesMatch[1]);

    return { seams, strategies };
}

function getDefaultPropsForRole(seams: SeamDefinition[], strategies: StrategyConfig[], role: string): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (const seam of seams) {
        if (seam.role !== role) continue;
        for (const [key, value] of Object.entries(seam.propsShape)) {
            merged[key] = value;
        }
    }

    for (const strategy of strategies) {
        if (strategy.seamRole !== role) continue;
        for (const [key, value] of Object.entries(strategy.defaultProps)) {
            merged[key] = value;
        }
    }

    return merged;
}

function getParamSpecForRole(seams: SeamDefinition[], strategies: StrategyConfig[], role: string): Record<string, ParamDef> {
    const merged: Record<string, ParamDef> = {};

    for (const seam of seams) {
        if (seam.role !== role) continue;
        for (const [key, def] of Object.entries(seam.paramSpec)) {
            merged[key] = def;
        }
    }

    for (const strategy of strategies) {
        if (strategy.seamRole !== role) continue;
        for (const [key, def] of Object.entries(strategy.paramSpec)) {
            merged[key] = def;
        }
    }

    return merged;
}

function getPropsShapeForRole(seams: SeamDefinition[], role: string): Record<string, string> {
    const merged: Record<string, string> = {};

    for (const seam of seams) {
        if (seam.role !== role) continue;
        for (const [key, value] of Object.entries(seam.propsShape)) {
            merged[key] = value;
        }
    }

    return merged;
}

function zodTypeFromParamDef(def: ParamDef): string {
    switch (def.type) {
        case 'string':
            return 'z.string()';
        case 'number': {
            const parts: string[] = ['z.number()'];
            if (def.min !== undefined) parts.push(`.min(${def.min})`);
            if (def.max !== undefined) parts.push(`.max(${def.max})`);
            return parts.join('');
        }
        case 'boolean':
            return 'z.boolean()';
        case 'enum':
            return def.options && def.options.length > 0
                ? `z.enum([${def.options.map(o => `"${o}"`).join(', ')}])`
                : 'z.string()';
        case 'object':
            return 'z.record(z.unknown())';
        case 'array':
            return 'z.array(z.unknown())';
        default:
            return 'z.unknown()';
    }
}

function zodTypeFromPropShape(propType: string): string {
    if (propType.includes('=>')) {
        return 'z.function().args(z.unknown()).returns(z.unknown())';
    }
    if (propType.startsWith('Array<') || propType.endsWith('[]')) {
        return 'z.array(z.unknown())';
    }
    if (propType.includes('<') || propType.includes('{') || propType === 'any') {
        return 'z.unknown()';
    }
    return 'z.string()';
}

function zodDefaultFromParamDef(def: ParamDef): string | null {
    if (def.default === undefined) return null;
    if (def.type === 'string') return `.default("${def.default}")`;
    if (def.type === 'number') return `.default(${def.default})`;
    if (def.type === 'boolean') return `.default(${def.default})`;
    return null;
}

function tsTypeFromParamDef(def: ParamDef): string {
    switch (def.type) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'enum': return def.options && def.options.length > 0 ? def.options.map(o => `"${o}"`).join(' | ') : 'string';
        case 'object': return 'Record<string, unknown>';
        case 'array': return 'unknown[]';
        default: return 'unknown';
    }
}

function generateRoleSchema(role: string, seams: SeamDefinition[], strategies: StrategyConfig[]): { zod: string; ts: string } {
    const paramSpec = getParamSpecForRole(seams, strategies, role);
    const propsShape = getPropsShapeForRole(seams, role);
    const defaultProps = getDefaultPropsForRole(seams, strategies, role);

    const allKeys = new Set([...Object.keys(paramSpec), ...Object.keys(propsShape), ...Object.keys(defaultProps)]);

    const zodFields: string[] = [];
    const tsFields: string[] = [];

    for (const key of allKeys) {
        const paramDef = paramSpec[key];
        const propType = propsShape[key];
        const hasDefault = key in defaultProps;

        if (paramDef) {
            let zod = zodTypeFromParamDef(paramDef);
            const defaultVal = zodDefaultFromParamDef(paramDef);
            if (defaultVal) zod += defaultVal;
            if (!paramDef.required && !hasDefault) zod += '.optional()';
            zodFields.push(`    ${key}: ${zod},`);
            tsFields.push(`  ${key}${paramDef.required && !hasDefault ? '' : '?'}: ${tsTypeFromParamDef(paramDef)};`);
        } else if (propType) {
            const zod = zodTypeFromPropShape(propType);
            zodFields.push(`    ${key}: ${zod},`);
            tsFields.push(`  ${key}?: ${propType};`);
        } else {
            zodFields.push(`    ${key}: z.unknown(),`);
            tsFields.push(`  ${key}?: unknown;`);
        }
    }

    const zodSchema = `export const ${role}SeamPropsSchema = z.object({\n${zodFields.join('\n')}\n});`;
    const tsInterface = `export interface ${role.charAt(0).toUpperCase() + role.slice(1)}SeamProps {\n${tsFields.join('\n')}\n}`;

    return { zod: zodSchema, ts: tsInterface };
}

export function emitSeamProps(): string {
    const { seams, strategies } = loadGeneratedDefinitions();
    const roles = [...new Set(seams.map(s => s.role))].sort();

    const parts: string[] = [
        '// GENERATED by optimize/src/uisg/seamProps.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        'import { z } from "zod";',
        '',
    ];

    for (const role of roles) {
        const { zod, ts } = generateRoleSchema(role, seams, strategies);
        parts.push(zod);
        parts.push('');
        parts.push(ts);
        parts.push('');
    }

    const roleType = roles.map(r => `"${r}"`).join(' | ');
    parts.push(`export type SeamRole = ${roleType};`);
    parts.push('');
    parts.push('export type SeamPropsMap = {');
    for (const role of roles) {
        parts.push(`  ${role}: ${role.charAt(0).toUpperCase() + role.slice(1)}SeamProps;`);
    }
    parts.push('};');
    parts.push('');

    return parts.join('\n');
}

export function writeSeamProps(): void {
    const content = emitSeamProps();
    const outPath = resolve(ROOT, 'ui/src/strategies/seamProps.ts');
    writeFileSync(outPath, content);
    console.log(`Wrote ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    writeSeamProps();
}