import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { getJourney } from '../src/registry.js';
import { flowToJourney } from '../src/uisg/toJourney.js';
import { emitManifest } from '../src/uisg/manifest.js';
import { validateGraph } from '../src/uisg/validate.js';
import { ROOT } from '../src/uisg/paths.js';
import type { UisgGraph, UisgNode, UisgEdge } from '../src/uisg/types.js';

// Load the registry with journeys
import '../src/journeys.js';

const goldenPathJourney = getJourney('golden-path');
if (!goldenPathJourney) {
    console.error('golden-path journey not found in registry');
    process.exit(1);
}

// ===== Copied from codegenFromYaml.ts with fixes =====
function yamlSurfaceToUisgSurface(yaml: any): UisgNode {
    const variants: Record<string, any> = {};
    if (yaml.variants) {
        for (const [key, variant] of Object.entries(yaml.variants)) {
            variants[key] = {
                template: (variant as any).template,
                description: (variant as any).description,
                status: (variant as any).status,
                promotedAt: (variant as any).status === 'promoted' ? new Date().toISOString() : undefined,
                metrics: {},
            };
        }
    }
    return {
        id: `surface.${yaml.id}`,
        name: yaml.name,
        status: yaml.status,
        type: 'surface',
        component: yaml.component,
        route: yaml.route,
        template: yaml.template,
        description: yaml.description,
        category: yaml.category,
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        defaultVariant: Object.keys(variants).length > 0 ? Object.keys(variants)[0] : undefined,
    } as any;
}

function generateGraphFromYaml(yaml: any): UisgGraph {
    const nodes: UisgNode[] = [];
    const edges: UisgEdge[] = [];

    // Add surfaces as nodes
    for (const surface of yaml.surfaces) {
        nodes.push(yamlSurfaceToUisgSurface(surface));
    }

    // Add templates as capability nodes
    for (const template of yaml.templates) {
        nodes.push({
            id: `template.${template.id}`,
            name: template.name,
            status: 'implemented',
            type: 'capability',
            summary: template.description,
            seam: 'render',
            strategy: template.id,
            shape: template.shape,
            componentTemplate: template.componentTemplate,
            slots: template.slots,
        } as any);
    }

    // Add journeys as flow nodes with step nodes
    for (const journey of yaml.journeys) {
        const flowId = `flow.${journey.id}`;
        const stepIds = journey.steps.map((step: string, i: number) => `step.${journey.id}.${i}`);

        // Create flow node
        nodes.push({
            id: flowId,
            name: journey.name,
            status: journey.status || 'planned',
            type: 'flow',
            entry: stepIds[0] || '',
            outcome: journey.description,
            journey: journey.id,
        });

        // Create step nodes
        for (let i = 0; i < journey.steps.length; i++) {
            const stepId = stepIds[i];
            const stepName = journey.steps[i];
            const isLast = i === journey.steps.length - 1;

            nodes.push({
                id: stepId,
                name: stepName,
                status: 'planned',
                type: 'step',
                kind: isLast ? 'result' : 'action',
                target: { testId: stepName },
                action: 'click',
                ...(isLast && { statePath: `note.${stepName}`, stateEquals: true }),
            });
        }

        // Add contains edges: flow -> steps
        for (const stepId of stepIds) {
            edges.push({
                from: flowId,
                type: 'contains',
                to: stepId,
            });
        }

        // Add next edges between steps
        for (let i = 0; i < stepIds.length - 1; i++) {
            edges.push({
                from: stepIds[i],
                type: 'next',
                to: stepIds[i + 1],
            });
        }

        // Add renders edge: last step -> surface (NOT flow -> surface)
        if (stepIds.length > 0) {
            edges.push({
                from: stepIds[stepIds.length - 1],
                type: 'renders',
                to: `surface.${journey.surface}`,
            });
        }
    }

    // Add metrics as predicate nodes
    for (const metric of yaml.metrics) {
        nodes.push({
            id: `metric.${metric.id}`,
            name: metric.name,
            status: 'implemented',
            type: 'predicate',
            expression: metric.target,
            registryId: metric.id,
        });
    }

    // Add edges: surface -> template (using requires)
    for (const surface of yaml.surfaces) {
        edges.push({
            from: `surface.${surface.id}`,
            type: 'requires',
            to: `template.${surface.template}`,
        });
    }

    // Add edges: flow -> journey surface (REMOVED - was incorrect renders from flow)

    // Add variant edges
    for (const surface of yaml.surfaces) {
        if (surface.variants) {
            for (const variantKey of Object.keys(surface.variants)) {
                const variantId = `variant.${surface.id}.${variantKey}`;
                const variant = (surface.variants as any)[variantKey];
                nodes.push({
                    id: variantId,
                    name: variant.description,
                    status: 'experimental',
                    type: 'surface',
                    template: variant.template,
                    description: variant.description,
                } as any);
                edges.push({
                    from: `surface.${surface.id}`,
                    type: 'variantOf',
                    to: variantId,
                });
            }
        }
    }

    return {
        version: 4,
        nodes,
        edges,
        hyperedges: [],
    };
}
// ===== End copied code =====

// Load YAML
const yamlPath = resolve(ROOT, 'optimize/uisg.yaml');
const yamlContent = readFileSync(yamlPath, 'utf8');
const yaml = load(yamlContent) as any;

// Generate graph from YAML
const graph = generateGraphFromYaml(yaml);
console.log('Generated graph with', graph.nodes.length, 'nodes');

// Validate graph with detailed errors
const validation = validateGraph(graph);
if (!validation.ok) {
    console.error('Graph validation failed:');
    for (const issue of validation.issues) {
        console.error(`  ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
        if (issue.path) console.error(`    Path: ${issue.path}`);
    }
    process.exit(1);
}

console.log('Graph validation passed');

// Write graph.json
const graphPath = resolve(ROOT, 'doc/uisg/graph.json');
writeFileSync(graphPath, JSON.stringify(validation.graph, null, 2));
console.log('Graph written to', graphPath);

// Generate spec from flow
const spec = flowToJourney(validation.graph, 'flow.golden-path', { seed: goldenPathJourney.seed });
console.log('Generated spec:', spec.id);

// Emit manifest
const manifest = emitManifest('flow.golden-path', spec);
console.log('Manifest emitted:', manifest.contentHash);
console.log('Done!');
