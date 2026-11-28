/**
 * Build-Time Codegen Pipeline
 * 
 * Extends UISG codegen with:
 * - Strategy resolution decision trees
 * - Property validation → TypeScript types
 * - Routes → type-safe navigation
 * - Metaphors → component registry
 * - Reactive store selectors
 * 
 * @example
 * ```typescript
 * import { runCodegenPipeline } from '@notention/optimize/codegenPipeline';
 * 
 * await runCodegenPipeline({
 *   graphPath: 'doc/uisg/graph.json',
 *   outputDir: 'core/src/generated',
 *   targets: ['strategy-decision-trees', 'property-types', 'route-types', 'metaphor-registry', 'reactive-selectors']
 * });
 * ```
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './uisg/paths.js';
import type { UisgGraph, UisgSurface, UisgNode, UisgEdge } from './uisg/types.js';
import type { StrategyRegistrable, Seam, SeamRole, ParamDef } from '@notention/core/ui/strategy.js';
import type { UnifiedMetaphor } from '@notention/core/skills/metaphor/UnifiedMetaphor.js';
import type { View, NoteMode, NotesSection, NoteTab, SettingsTab } from '@notention/core/types/ui.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Types
// ============================================================================

export interface CodegenPipelineOptions {
    /** Path to UISG graph */
    graphPath: string;
    /** Output directory for generated files */
    outputDir: string;
    /** Targets to generate */
    targets: CodegenTarget[];
    /** Whether to write files (default: true) */
    write?: boolean;
    /** Dry run mode (default: false) */
    dryRun?: boolean;
    /** Verbose output (default: false) */
    verbose?: boolean;
}

export type CodegenTarget = 
    | 'strategy-decision-trees'
    | 'property-types'
    | 'route-types'
    | 'metaphor-registry'
    | 'reactive-selectors'
    | 'all';

export interface CodegenResult {
    generated: string[];
    skipped: string[];
    errors: string[];
}

// ============================================================================
// Graph Loading
// ============================================================================

function loadGraph(graphPath: string): UisgGraph {
    const fullPath = resolve(ROOT, graphPath);
    const rawGraph = JSON.parse(readFileSync(fullPath, 'utf8'));
    return rawGraph as UisgGraph;
}

// ============================================================================
// Target 1: Strategy Decision Trees
// ============================================================================

type ConditionOperator = 'contains' | 'equals' | 'exists' | 'gt' | 'gte' | 'lt' | 'lte' | 'notContains' | 'notEquals' | 'notExists';

interface DecisionTreeNode {
    type: 'condition' | 'result';
    // Condition node
    condition?: {
        field: string;
        operator: ConditionOperator;
        value?: any;
    };
    // Branches
    trueBranch?: DecisionTreeNode;
    falseBranch?: DecisionTreeNode;
    // Result node
    strategyId?: string;
    reason?: string;
    priority?: number;
}

interface StrategyDecisionTree {
    seamRole: SeamRole;
    root: DecisionTreeNode;
    metadata: {
        generatedAt: string;
        nodeCount: number;
        strategyCount: number;
    };
}

function buildDecisionTree(
    seamRole: SeamRole,
    strategies: StrategyRegistrable[],
    graph: UisgGraph
): DecisionTreeNode {
    // Sort strategies by priority (if available) or registration order
    const sortedStrategies = [...strategies].sort((a, b) => {
        const priorityA = (a as any).priority ?? 0;
        const priorityB = (b as any).priority ?? 0;
        return priorityB - priorityA;
    });

    // Build a simple decision tree based on strategy conditions
    // For now, create a linear chain - can be enhanced with actual condition parsing
    let root: DecisionTreeNode = { type: 'result', strategyId: sortedStrategies[0]?.id, reason: 'Default strategy' };
    
    // Build from bottom up
    for (let i = sortedStrategies.length - 1; i >= 0; i--) {
        const strategy = sortedStrategies[i];
        const conditions = extractConditions(strategy, graph);
        
        if (conditions.length > 0) {
            root = buildConditionChain(conditions, strategy.id, root);
        } else if (i === 0) {
            root = { type: 'result', strategyId: strategy.id, reason: 'Default strategy' };
        }
    }

    return root;
}

function extractConditions(strategy: StrategyRegistrable, graph: UisgGraph): Array<{ field: string; operator: ConditionOperator; value: any }> {
    const conditions: Array<{ field: string; operator: ConditionOperator; value: any }> = [];
    
    // Check if strategy has explicit conditions
    const strategyNode = graph.nodes.find(n => n.id === strategy.id || n.id === `strategy.${strategy.id}`);
    if (strategyNode && strategyNode.type === 'capability') {
        // Could extract from node properties
    }
    
    // Check seam for condition requirements
    const seam = strategy.seam;
    if (seam.propsShape) {
        for (const [key, value] of Object.entries(seam.propsShape)) {
            if (value.includes('required')) {
                conditions.push({ field: key, operator: 'exists', value: true });
            }
        }
    }
    
    return conditions;
}

function buildConditionChain(
    conditions: Array<{ field: string; operator: ConditionOperator; value: any }>,
    strategyId: string,
    fallback: DecisionTreeNode
): DecisionTreeNode {
    if (conditions.length === 0) return fallback;
    
    const [first, ...rest] = conditions;
    return {
        type: 'condition',
        condition: first,
        trueBranch: buildConditionChain(rest, strategyId, { type: 'result', strategyId, reason: `Matched: ${first.field} ${first.operator} ${first.value}` }),
        falseBranch: fallback,
    };
}

function generateStrategyDecisionTrees(graph: UisgGraph): Record<string, StrategyDecisionTree> {
    const trees: Record<string, StrategyDecisionTree> = {};
    
    // Get all strategies from graph
    const strategyNodes = graph.nodes.filter(n => n.type === 'capability');
    
    // Group by seam role
    const byRole: Record<string, typeof strategyNodes> = {};
    for (const node of strategyNodes) {
        const role = (node as any).seam ?? 'unknown';
        if (!byRole[role]) byRole[role] = [];
        byRole[role].push(node);
    }
    
    // Convert to StrategyRegistrable format (simplified)
    for (const [role, nodes] of Object.entries(byRole)) {
        const strategies: StrategyRegistrable[] = nodes.map(n => ({
            id: n.id,
            seam: { 
                id: `seam.${role}`, 
                name: role, 
                description: '', 
                role: role as SeamRole, 
                components: [], 
                propsShape: {} 
            },
            version: '1.0.0',
            params: {},
            name: n.name,
            description: n.summary ?? '',
            render: (props: any) => ({ type: 'div', key: n.id, props: { children: n.name, ...props } }) as any,
            getDefaultProps: () => ({}),
            getDefaultConfig: () => ({}),
            validateConfig: () => ({ valid: true, errors: [] }),
            getName: () => n.name,
        }));
        
        if (strategies.length > 0) {
            const root = buildDecisionTree(role as SeamRole, strategies, graph);
            trees[role] = {
                seamRole: role as SeamRole,
                root,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    nodeCount: countNodes(root),
                    strategyCount: strategies.length,
                },
            };
        }
    }
    
    return trees;
}

function countNodes(node: DecisionTreeNode): number {
    if (node.type === 'result') return 1;
    return 1 + (node.trueBranch ? countNodes(node.trueBranch) : 0) + (node.falseBranch ? countNodes(node.falseBranch) : 0);
}

function emitStrategyDecisionTrees(trees: Record<string, StrategyDecisionTree>): string {
    const parts: string[] = [
        '// GENERATED by optimize/src/codegenPipeline.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Strategy Resolution Decision Trees',
        ' * Build-time compiled decision trees for fast strategy resolution',
        ' */',
        '',
        'import type { DecisionTreeNode, StrategyDecisionTree } from "./decisionTreeTypes.js";',
        '',
    ];

    for (const [role, tree] of Object.entries(trees)) {
        parts.push(`export const ${role}DecisionTree: StrategyDecisionTree = {`);
        parts.push(`    seamRole: '${role}',`);
        parts.push(`    root: ${JSON.stringify(tree.root, null, 4).replace(/^/gm, '    ')},`);
        parts.push(`    metadata: ${JSON.stringify(tree.metadata, null, 4).replace(/^/gm, '    ')},`);
        parts.push(`};`);
        parts.push('');
    }

    parts.push('export const ALL_DECISION_TREES: Record<SeamRole, StrategyDecisionTree> = {');
    for (const role of Object.keys(trees)) {
        parts.push(`    ${role}: ${role}DecisionTree,`);
    }
    parts.push('};');
    parts.push('');

    return parts.join('\n');
}

// ============================================================================
// Target 2: Property Validation Types
// ============================================================================

interface PropertyTypeInfo {
    key: string;
    type: string;
    required: boolean;
    default?: any;
    enum?: string[];
    min?: number;
    max?: number;
    description?: string;
}

function extractPropertyTypes(graph: UisgGraph): Record<string, PropertyTypeInfo[]> {
    const result: Record<string, PropertyTypeInfo[]> = {};
    
    // Extract from surfaces
    for (const node of graph.nodes) {
        if (node.type === 'surface') {
            const surface = node as UisgSurface;
            if (!surface.propsSchema) continue;
            
            const props: PropertyTypeInfo[] = [];
            
            for (const [key, def] of Object.entries(surface.propsSchema)) {
                props.push({
                    key,
                    type: def.type,
                    required: def.required ?? false,
                    default: def.default,
                    enum: def.options,
                    min: def.min,
                    max: def.max,
                    description: def.description,
                });
            }
            
            result[surface.id] = props;
        }
    }
    
    // Extract from strategies/capabilities
    for (const node of graph.nodes) {
        if (node.type === 'capability') {
            const capability = node as UisgNode & { paramSpec?: Record<string, ParamDef> };
            if (capability.paramSpec) {
                const props: PropertyTypeInfo[] = [];
                
                for (const [key, def] of Object.entries(capability.paramSpec)) {
                    props.push({
                        key,
                        type: def.type,
                        required: def.required ?? false,
                        default: def.default,
                        enum: def.options,
                        min: def.min,
                        max: def.max,
                        description: def.description,
                    });
                }
                
                result[capability.id] = props;
            }
        }
    }
    
    return result;
}

function generatePropertyTypes(propertyTypes: Record<string, PropertyTypeInfo[]>): string {
    const parts: string[] = [
        '// GENERATED by optimize/src/codegenPipeline.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Property Validation Types',
        ' * Build-time extracted property schemas for runtime validation',
        ' */',
        '',
        'import { z } from "zod";',
        '',
    ];

    for (const [entityId, props] of Object.entries(propertyTypes)) {
        const entityName = entityId.replace(/[^a-zA-Z0-9]/g, '_');
        
        parts.push(`export const ${entityName}PropsSchema = z.object({`);
        for (const prop of props) {
            let zodType: string;
            switch (prop.type) {
                case 'string': zodType = 'z.string()'; break;
                case 'number': zodType = `z.number()${prop.min !== undefined ? `.min(${prop.min})` : ''}${prop.max !== undefined ? `.max(${prop.max})` : ''}`; break;
                case 'boolean': zodType = 'z.boolean()'; break;
                case 'enum': zodType = prop.enum && prop.enum.length > 0 ? `z.enum([${prop.enum.map(e => `"${e}"`).join(', ')}])` : 'z.string()'; break;
                case 'object': zodType = 'z.record(z.unknown())'; break;
                case 'array': zodType = 'z.array(z.unknown())'; break;
                default: zodType = 'z.unknown()';
            }
            
            if (!prop.required) zodType += '.optional()';
            if (prop.default !== undefined) {
                if (prop.type === 'string') zodType += `.default("${prop.default}")`;
                else if (prop.type === 'number' || prop.type === 'boolean') zodType += `.default(${prop.default})`;
            }
            
            parts.push(`    ${prop.key}: ${zodType},`);
        }
        parts.push(`});`);
        parts.push('');
        
        // TypeScript interface
        parts.push(`export interface ${entityName}Props {`);
        for (const prop of props) {
            let tsType: string;
            switch (prop.type) {
                case 'string': tsType = 'string'; break;
                case 'number': tsType = 'number'; break;
                case 'boolean': tsType = 'boolean'; break;
                case 'enum': tsType = prop.enum && prop.enum.length > 0 ? prop.enum.map(e => `"${e}"`).join(' | ') : 'string'; break;
                case 'object': tsType = 'Record<string, unknown>'; break;
                case 'array': tsType = 'unknown[]'; break;
                default: tsType = 'unknown';
            }
            parts.push(`    ${prop.key}${prop.required ? '' : '?'}: ${tsType};`);
        }
        parts.push(`}`);
        parts.push('');
    }

    // Export map
    parts.push('export const PROPERTY_SCHEMAS: Record<string, z.ZodSchema> = {');
    for (const entityId of Object.keys(propertyTypes)) {
        const entityName = entityId.replace(/[^a-zA-Z0-9]/g, '_');
        parts.push(`    '${entityId}': ${entityName}PropsSchema,`);
    }
    parts.push('};');
    parts.push('');

    return parts.join('\n');
}

// ============================================================================
// Target 3: Route Types
// ============================================================================

interface RouteInfo {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
    component?: string;
}

function extractRoutes(graph: UisgGraph): RouteInfo[] {
    const routes: RouteInfo[] = [];
    
    for (const node of graph.nodes) {
        if (node.type === 'surface' && node.route) {
            const surface = node as UisgSurface;
            const path: string = surface.route!; // Asserted non-null due to check above
            
            // Parse path parameters
            const paramMatches = path.match(/:([^/]+)/g) ?? [];
            const params: Record<string, string> = {};
            for (const match of paramMatches) {
                params[match.slice(1)] = 'string';
            }
            
            // Query parameters from propsSchema
            const query: Record<string, string> = {};
            if (surface.propsSchema) {
                for (const [key, def] of Object.entries(surface.propsSchema)) {
                    query[key] = String(def.type);
                }
            }
            
            routes.push({
                path,
                params,
                query,
                component: surface.component,
            });
        }
    }
    
    return routes;
}

function generateRouteTypes(routes: RouteInfo[]): string {
    const parts: string[] = [
        '// GENERATED by optimize/src/codegenPipeline.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Type-Safe Navigation Routes',
        ' * Build-time generated route types for type-safe navigation',
        ' */',
        '',
        'import type { View, NoteMode, NotesSection, NoteTab, SettingsTab } from "@notention/core/types/ui.js";',
        '',
    ];

    // Route path type
    const routePaths = routes.map(r => `'${r.path}'`).join(' | ');
    parts.push(`export type RoutePath = ${routePaths};`);
    parts.push('');

    // Route params
    parts.push('export interface RouteParamsMap {');
    for (const route of routes) {
        const paramKeys = Object.keys(route.params);
        if (paramKeys.length > 0) {
            const paramType = paramKeys.map(k => `${k}: string`).join('; ');
            parts.push(`    '${route.path}': { ${paramType} };`);
        }
    }
    parts.push('}');
    parts.push('');

    // Route query
    parts.push('export interface RouteQueryMap {');
    for (const route of routes) {
        const queryKeys = Object.keys(route.query);
        if (queryKeys.length > 0) {
            const queryType = queryKeys.map(k => `${k}: ${route.query[k]}`).join('; ');
            parts.push(`    '${route.path}': { ${queryType} };`);
        }
    }
    parts.push('}');
    parts.push('');

    // Navigate function type
    parts.push('/**');
    parts.push(' * Type-safe navigate function');
    parts.push(' * Usage: navigate("/notes/:noteId", { params: { noteId: "123" }, query: { tab: "next" } })');
    parts.push(' */');
    parts.push('export interface NavigateOptions<P extends RoutePath> {');
    parts.push('    params?: P extends `${string}:${infer Param}/${string}` ? { [K in Param]: string } :');
    parts.push('             P extends `${string}:${infer Param}` ? { [K in Param]: string } :');
    parts.push('             Record<string, string>;');
    parts.push('    query?: RouteQueryMap[P];');
    parts.push('}');
    parts.push('');

    return parts.join('\n');
}

// ============================================================================
// Target 4: Metaphor Registry
// ============================================================================

function extractMetaphors(graph: UisgGraph): UnifiedMetaphor[] {
    const metaphors: UnifiedMetaphor[] = [];
    
    for (const node of graph.nodes) {
        if (node.type === 'surface' && (node as any).metaphor) {
            const surface = node as any;
            // Could extract metaphor info from surface
        }
    }
    
    // For now, return empty - would need to load from core registry
    return metaphors;
}

function generateMetaphorRegistry(metaphors: UnifiedMetaphor[]): string {
    const parts: string[] = [
        '// GENERATED by optimize/src/codegenPipeline.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Metaphor Component Registry',
        ' * Build-time generated registry of metaphor -> component mappings',
        ' */',
        '',
        'import type { UnifiedMetaphor } from "@notention/core/skills/metaphor/UnifiedMetaphor.js";',
        'import type { ReactComponentType } from "@notention/core";',
        '',
    ];

    parts.push('export const METAPHOR_REGISTRY: Record<string, {');
    parts.push('    metaphor: UnifiedMetaphor;');
    parts.push('    component?: ReactComponentType<{ note: any; metaphor?: UnifiedMetaphor }>;');
    parts.push('}> = {');
    parts.push('};');
    parts.push('');

    return parts.join('\n');
}

// ============================================================================
// Target 5: Reactive Store Selectors
// ============================================================================

function generateReactiveSelectors(graph: UisgGraph): string {
    const parts: string[] = [
        '// GENERATED by optimize/src/codegenPipeline.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Reactive Store Selectors',
        ' * Build-time generated typed selectors for the reactive store',
        ' */',
        '',
        'import type { ReactiveStoreState } from "@notention/core/utils/ReactiveStore.js";',
        'import { createComputed } from "@notention/core/utils/signals.js";',
        '',
    ];

    // Extract all surface IDs for surface-specific selectors
    const surfaceIds = graph.nodes
        .filter(n => n.type === 'surface')
        .map(n => n.id);

    parts.push('/** Surface-specific note selectors */');
    for (const surfaceId of surfaceIds) {
        const selectorName = surfaceId.replace(/[^a-zA-Z0-9]/g, '_');
        parts.push(`export const selectNotesBySurface_${selectorName} = createComputed(() => store.get().notes.filter(n => n.properties.some(p => p.key === 'surface' && p.values.includes('${surfaceId}')));`);
    }
    parts.push('');

    // Seam-specific selectors
    const seamRoles = graph.nodes
        .filter(n => n.type === 'capability')
        .map(n => (n as any).seam)
        .filter(Boolean);

    parts.push('/** Seam-specific strategy selectors */');
    for (const role of [...new Set(seamRoles)]) {
        parts.push(`export const selectStrategyFor_${role} = createComputed(() => store.select(s => s.navigation.${role}));`);
    }
    parts.push('');

    return parts.join('\n');
}

// ============================================================================
// Main Pipeline
// ============================================================================

export async function runCodegenPipeline(options: CodegenPipelineOptions): Promise<CodegenResult> {
    const { graphPath, outputDir, targets, write = true, dryRun = false, verbose = false } = options;
    
    const result: CodegenResult = {
        generated: [],
        skipped: [],
        errors: [],
    };

    try {
        if (verbose) console.log(`Loading graph from ${graphPath}...`);
        const graph = loadGraph(graphPath);
        
        if (verbose) console.log(`Graph loaded: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

        const allTargets: CodegenTarget[] = targets.includes('all') 
            ? ['strategy-decision-trees', 'property-types', 'route-types', 'metaphor-registry', 'reactive-selectors']
            : targets;

        const outputDirFull = resolve(ROOT, outputDir);
        if (write && !dryRun && !existsSync(outputDirFull)) {
            mkdirSync(outputDirFull, { recursive: true });
        }

        // Target 1: Strategy Decision Trees
        if (allTargets.includes('strategy-decision-trees')) {
            try {
                if (verbose) console.log('Generating strategy decision trees...');
                const trees = generateStrategyDecisionTrees(graph);
                const content = emitStrategyDecisionTrees(trees);
                const outPath = join(outputDirFull, 'strategyDecisionTrees.ts');
                
                if (write && !dryRun) {
                    writeFileSync(outPath, content);
                }
                result.generated.push(outPath);
            } catch (e) {
                result.errors.push(`strategy-decision-trees: ${(e as Error).message}`);
            }
        }

        // Target 2: Property Types
        if (allTargets.includes('property-types')) {
            try {
                if (verbose) console.log('Generating property validation types...');
                const propertyTypes = extractPropertyTypes(graph);
                const content = generatePropertyTypes(propertyTypes);
                const outPath = join(outputDirFull, 'propertyTypes.ts');
                
                if (write && !dryRun) {
                    writeFileSync(outPath, content);
                }
                result.generated.push(outPath);
            } catch (e) {
                result.errors.push(`property-types: ${(e as Error).message}`);
            }
        }

        // Target 3: Route Types
        if (allTargets.includes('route-types')) {
            try {
                if (verbose) console.log('Generating route types...');
                const routes = extractRoutes(graph);
                const content = generateRouteTypes(routes);
                const outPath = join(outputDirFull, 'routeTypes.ts');
                
                if (write && !dryRun) {
                    writeFileSync(outPath, content);
                }
                result.generated.push(outPath);
            } catch (e) {
                result.errors.push(`route-types: ${(e as Error).message}`);
            }
        }

        // Target 4: Metaphor Registry
        if (allTargets.includes('metaphor-registry')) {
            try {
                if (verbose) console.log('Generating metaphor registry...');
                const metaphors = extractMetaphors(graph);
                const content = generateMetaphorRegistry(metaphors);
                const outPath = join(outputDirFull, 'metaphorRegistry.ts');
                
                if (write && !dryRun) {
                    writeFileSync(outPath, content);
                }
                result.generated.push(outPath);
            } catch (e) {
                result.errors.push(`metaphor-registry: ${(e as Error).message}`);
            }
        }

        // Target 5: Reactive Selectors
        if (allTargets.includes('reactive-selectors')) {
            try {
                if (verbose) console.log('Generating reactive store selectors...');
                const content = generateReactiveSelectors(graph);
                const outPath = join(outputDirFull, 'reactiveSelectors.ts');
                
                if (write && !dryRun) {
                    writeFileSync(outPath, content);
                }
                result.generated.push(outPath);
            } catch (e) {
                result.errors.push(`reactive-selectors: ${(e as Error).message}`);
            }
        }

        if (verbose) {
            console.log(`\nGenerated ${result.generated.length} files:`);
            for (const f of result.generated) console.log(`  - ${f}`);
            if (result.errors.length > 0) {
                console.log(`\nErrors (${result.errors.length}):`);
                for (const e of result.errors) console.log(`  - ${e}`);
            }
        }

    } catch (e) {
        result.errors.push(`Pipeline failed: ${(e as Error).message}`);
    }

    return result;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
    const argv = process.argv.slice(2);
    
    const options: CodegenPipelineOptions = {
        graphPath: argv.find(a => a.startsWith('--graph='))?.split('=')[1] ?? 'doc/uisg/graph.json',
        outputDir: argv.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'core/src/generated',
        targets: argv.includes('--all') 
            ? ['all'] 
            : argv.filter(a => a.startsWith('--target=')).map(a => a.split('=')[1] as CodegenTarget),
        write: !argv.includes('--dry-run'),
        dryRun: argv.includes('--dry-run'),
        verbose: argv.includes('--verbose'),
    };

    if (options.targets.length === 0) {
        options.targets = ['all'];
    }

    const result = await runCodegenPipeline(options);
    
    if (result.errors.length > 0) {
        console.error('Errors:');
        for (const e of result.errors) console.error(`  ${e}`);
        process.exit(1);
    }
    
    console.log(`Codegen complete: ${result.generated.length} files generated`);
}