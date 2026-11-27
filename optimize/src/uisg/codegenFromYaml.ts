import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import type { UisgGraph, UisgSurface, UisgNode, UisgEdge } from './types.js';
import { generateSurface, generateAllSurfaces } from './codegen.js';
import { ROOT } from './paths.js';

export interface UisgYaml {
  version: number;
  surfaces: UisgYamlSurface[];
  templates: UisgYamlTemplate[];
  journeys: UisgYamlJourney[];
  metrics: UisgYamlMetric[];
  experiments: UisgYamlExperiment[];
}

export interface UisgYamlSurface {
  id: string;
  name: string;
  component: string;
  route?: string;
  template: string;
  description: string;
  status: 'implemented' | 'partial' | 'planned' | 'candidate' | 'experimental' | 'removed' | 'rejected';
  category: string;
  variants?: Record<string, UisgYamlVariant>;
}

export interface UisgYamlVariant {
  template: string;
  description: string;
  status: 'experimental' | 'candidate' | 'promoted' | 'archived';
}

export interface UisgYamlTemplate {
  id: string;
  name: string;
  shape: 'item' | 'panel' | 'status' | 'editor';
  description: string;
  slots: string[];
  componentTemplate: string;
}

export interface UisgYamlJourney {
  id: string;
  name: string;
  surface: string;
  variant?: string;
  description: string;
  status?: 'implemented' | 'partial' | 'planned' | 'candidate' | 'experimental' | 'removed' | 'rejected';
  steps: string[];
  metrics: string[];
}

export interface UisgYamlMetric {
  id: string;
  name: string;
  description: string;
  target: string;
  type: 'ratio' | 'duration' | 'count' | 'size';
  source: string;
}

export interface UisgYamlExperiment {
  id: string;
  name: string;
  surface: string;
  description: string;
  variants: string[];
  runs: number;
  metrics: string[];
}

function loadYaml(): UisgYaml {
  const yamlPath = resolve(ROOT, 'optimize/uisg.yaml');
  const content = readFileSync(yamlPath, 'utf8');
  return load(content) as UisgYaml;
}

function yamlSurfaceToUisgSurface(yaml: UisgYamlSurface): UisgSurface {
  const variants: Record<string, any> = {};
  if (yaml.variants) {
    for (const [key, variant] of Object.entries(yaml.variants)) {
      variants[key] = {
        template: variant.template,
        description: variant.description,
        status: variant.status,
        promotedAt: variant.status === 'promoted' ? new Date().toISOString() : undefined,
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
    variants,
    defaultVariant: yaml.variants ? Object.keys(yaml.variants)[0] : undefined,
    source: [`ui/src/components/${yaml.component}.tsx`],
    category: yaml.category, // Custom field for component category
  } as any;
}

function generateGraphFromYaml(yaml: UisgYaml): UisgGraph {
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
    const stepIds = journey.steps.map((step, i) => `step.${journey.id}.${i}`);

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

    // Add renders edge: last step -> surface
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

  // Add edges: surface -> template (using requires instead of uses, since uses is flow->capability)
  for (const surface of yaml.surfaces) {
    edges.push({
      from: `surface.${surface.id}`,
      type: 'requires',
      to: `template.${surface.template}`,
    });
  }

  // Add edges: metric -> journey
  for (const metric of yaml.metrics) {
    const sourceJourney = metric.source.replace('journey:', '').replace('*', '');
    if (sourceJourney) {
      edges.push({
        from: `metric.${metric.id}`,
        type: 'evidencedBy',
        to: `flow.${sourceJourney}`,
      });
    }
  }

  return {
    version: 4,
    nodes,
    edges,
    hyperedges: [],
  };
}

export function codegenFromYaml(options: { target: 'react' | 'html' | 'json'; surface?: string; all?: boolean; dryRun?: boolean; changed?: boolean } = { target: 'react' }): void {
  const yaml = loadYaml();
  const graph = generateGraphFromYaml(yaml);

  // Save graph for other tools
  const graphPath = resolve(ROOT, 'doc/uisg/graph.json');
  mkdirSync(dirname(graphPath), { recursive: true });
  writeFileSync(graphPath, JSON.stringify(graph, null, 2) + '\n');

  // Generate surfaces
  const surfaces = graph.nodes.filter(n => n.type === 'surface') as UisgSurface[];
  const targetSurfaces = options.all 
    ? surfaces 
    : options.surface 
      ? surfaces.filter(s => s.id === `surface.${options.surface}`)
      : surfaces.filter(s => s.status === 'planned' || s.status === 'experimental');

  console.log(`Generating ${targetSurfaces.length} surfaces for target: ${options.target}`);

  for (const surface of targetSurfaces) {
    if (options.dryRun) {
      const result = generateSurface(surface, graph, { target: options.target, write: false, dryRun: true });
      console.log(`  [DRY RUN] ${surface.id} -> ${result.path}`);
    } else {
      generateSurface(surface, graph, { target: options.target, write: true });
      console.log(`  Generated ${surface.id}`);
    }
  }
}

export function syncDocsFromYaml(): void {
  const yaml = loadYaml();
  const graph = generateGraphFromYaml(yaml);

  let markdown = '# UI/UX Specification\n\n';
  markdown += `Generated from \`optimize/uisg.yaml\` on ${new Date().toISOString()}\n\n`;

  // Surfaces
  markdown += '## Surfaces\n\n';
  for (const surface of yaml.surfaces) {
    markdown += `### ${surface.name} (\`${surface.id}\`)\n\n`;
    markdown += `- **Component**: ${surface.component}\n`;
    markdown += `- **Route**: ${surface.route || 'N/A'}\n`;
    markdown += `- **Template**: ${surface.template}\n`;
    markdown += `- **Status**: ${surface.status}\n`;
    markdown += `- **Description**: ${surface.description}\n`;
    if (surface.variants) {
      markdown += '- **Variants**:\n';
      for (const [key, variant] of Object.entries(surface.variants)) {
        markdown += `  - \`${key}\`: ${variant.description} (${variant.status})\n`;
      }
    }
    markdown += '\n';
  }

  // Templates
  markdown += '## Templates\n\n';
  for (const template of yaml.templates) {
    markdown += `### ${template.name} (\`${template.id}\`)\n\n`;
    markdown += `- **Shape**: ${template.shape}\n`;
    markdown += `- **Description**: ${template.description}\n`;
    markdown += `- **Slots**: ${template.slots.join(', ')}\n\n`;
  }

  // Journeys
  markdown += '## Journeys\n\n';
  for (const journey of yaml.journeys) {
    markdown += `### ${journey.name} (\`${journey.id}\`)\n\n`;
    markdown += `- **Surface**: ${journey.surface}${journey.variant ? ` (${journey.variant})` : ''}\n`;
    markdown += `- **Description**: ${journey.description}\n`;
    markdown += `- **Steps**: ${journey.steps.join(' → ')}\n`;
    markdown += `- **Metrics**: ${journey.metrics.join(', ')}\n\n`;
  }

  // Metrics
  markdown += '## Metrics\n\n';
  for (const metric of yaml.metrics) {
    markdown += `### ${metric.name} (\`${metric.id}\`)\n\n`;
    markdown += `- **Description**: ${metric.description}\n`;
    markdown += `- **Target**: ${metric.target}\n`;
    markdown += `- **Type**: ${metric.type}\n`;
    markdown += `- **Source**: ${metric.source}\n\n`;
  }

  // Experiments
  markdown += '## Experiments\n\n';
  for (const experiment of yaml.experiments) {
    markdown += `### ${experiment.name} (\`${experiment.id}\`)\n\n`;
    markdown += `- **Surface**: ${experiment.surface}\n`;
    markdown += `- **Description**: ${experiment.description}\n`;
    markdown += `- **Variants**: ${experiment.variants.join(', ')}\n`;
    markdown += `- **Runs**: ${experiment.runs}\n`;
    markdown += `- **Metrics**: ${experiment.metrics.join(', ')}\n\n`;
  }

  const docsPath = resolve(ROOT, 'docs/UI_UX_SPEC.md');
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(docsPath, markdown);
  console.log(`Synced docs to ${docsPath}`);
}

export function validateYaml(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const yaml = loadYaml();
    
    // Validate version
    if (yaml.version !== 1) {
      errors.push(`Expected version 1, got ${yaml.version}`);
    }

    // Validate required sections
    if (!yaml.surfaces || !Array.isArray(yaml.surfaces)) {
      errors.push('Missing or invalid surfaces array');
    }
    if (!yaml.templates || !Array.isArray(yaml.templates)) {
      errors.push('Missing or invalid templates array');
    }
    if (!yaml.journeys || !Array.isArray(yaml.journeys)) {
      errors.push('Missing or invalid journeys array');
    }
    if (!yaml.metrics || !Array.isArray(yaml.metrics)) {
      errors.push('Missing or invalid metrics array');
    }
    if (!yaml.experiments || !Array.isArray(yaml.experiments)) {
      errors.push('Missing or invalid experiments array');
    }

    // Validate surface references to templates
    const templateIds = new Set(yaml.templates?.map(t => t.id) || []);
    for (const surface of yaml.surfaces || []) {
      if (!templateIds.has(surface.template)) {
        errors.push(`Surface ${surface.id} references unknown template: ${surface.template}`);
      }
      if (surface.variants) {
        for (const variant of Object.values(surface.variants)) {
          if (!templateIds.has(variant.template)) {
            errors.push(`Surface ${surface.id} variant references unknown template: ${variant.template}`);
          }
        }
      }
    }

    // Validate journey references to surfaces
    const surfaceIds = new Set(yaml.surfaces?.map(s => s.id) || []);
    for (const journey of yaml.journeys || []) {
      if (!surfaceIds.has(journey.surface)) {
        errors.push(`Journey ${journey.id} references unknown surface: ${journey.surface}`);
      }
    }

    // Validate metric references to journeys
    const journeyIds = new Set(yaml.journeys?.map(j => j.id) || []);
    for (const metric of yaml.metrics || []) {
      const sourceJourney = metric.source.replace('journey:', '').replace('*', '');
      if (sourceJourney && !journeyIds.has(sourceJourney) && !metric.source.includes('*')) {
        errors.push(`Metric ${metric.id} references unknown journey: ${sourceJourney}`);
      }
    }

    // Validate experiment references to surfaces
    for (const experiment of yaml.experiments || []) {
      if (!surfaceIds.has(experiment.surface)) {
        errors.push(`Experiment ${experiment.id} references unknown surface: ${experiment.surface}`);
      }
    }

  } catch (e) {
    errors.push(`YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { valid: errors.length === 0, errors };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate': {
      const target = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'react';
      const surface = args.find(a => a.startsWith('--surface='))?.split('=')[1];
      const all = args.includes('--all');
      const dryRun = args.includes('--dry-run');
      const changed = args.includes('--changed');
      codegenFromYaml({ target: target as any, surface, all, dryRun, changed });
      break;
    }
    case 'sync-docs':
      syncDocsFromYaml();
      break;
    case 'validate': {
      const result = validateYaml();
      if (result.valid) {
        console.log('✓ uisg.yaml is valid');
        process.exit(0);
      } else {
        console.error('✗ uisg.yaml validation failed:');
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
        process.exit(1);
      }
      break;
    }
    default:
      console.log('Usage: tsx optimize/src/uisg/codegenFromYaml.ts <command>');
      console.log('Commands:');
      console.log('  generate --target=react|html|json [--surface=id] [--all] [--dry-run] [--changed]');
      console.log('  sync-docs');
      console.log('  validate');
      process.exit(1);
  }
}