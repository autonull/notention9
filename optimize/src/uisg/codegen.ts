import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UisgGraph, UisgSurface } from './types.js';
import { getTemplate, type TemplateShape } from './templates/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

export interface GeneratedSurface {
    surfaceId: string;
    path: string;
    content: string;
    testPath: string;
    test: string;
    propsSchemaPath: string;
    propsSchema: string;
    hash: string;
}

function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function getTemplateShape(surface: UisgSurface): TemplateShape | undefined {
    if (surface.template) return surface.template as TemplateShape;
    
    const component = surface.component?.toLowerCase() ?? '';
    if (component.includes('item') || component.includes('list') || component.includes('card')) return 'item';
    if (component.includes('panel') || component.includes('rail') || component.includes('sidebar')) return 'panel';
    if (component.includes('editor') || component.includes('form') || component.includes('composer')) return 'editor';
    if (component.includes('status') || component.includes('badge') || component.includes('indicator') || component.includes('banner')) return 'status';
    
    return 'item';
}

export function generateSurface(surface: UisgSurface, graph: UisgGraph): GeneratedSurface {
    const shape = getTemplateShape(surface);
    const template = getTemplate(shape);
    
    if (!template) {
        throw new Error(`No template found for shape: ${shape}`);
    }

    const componentContent = template.generateComponent(surface, graph);
    const testContent = template.generateTest(surface, graph);
    const propsSchemaContent = template.generatePropsSchema(surface, graph);

    const componentName = surface.component ?? surface.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
    const componentPath = `ui/src/components/${shape}s/${componentName}.tsx`;
    const testPath = `ui/src/tests/generated/${componentName}.test.tsx`;
    const propsSchemaPath = `ui/src/components/${shape}s/${componentName}Props.ts`;

    const fullComponentPath = resolve(ROOT, componentPath);
    const fullTestPath = resolve(ROOT, testPath);
    const fullPropsSchemaPath = resolve(ROOT, propsSchemaPath);

    mkdirSync(dirname(fullComponentPath), { recursive: true });
    mkdirSync(dirname(fullTestPath), { recursive: true });
    mkdirSync(dirname(fullPropsSchemaPath), { recursive: true });

    writeFileSync(fullComponentPath, componentContent);
    writeFileSync(fullTestPath, testContent);
    writeFileSync(fullPropsSchemaPath, propsSchemaContent);

    const combined = componentContent + testContent + propsSchemaContent;
    const hash = hashContent(combined);

    return {
        surfaceId: surface.id,
        path: componentPath,
        content: componentContent,
        testPath,
        test: testContent,
        propsSchemaPath,
        propsSchema: propsSchemaContent,
        hash,
    };
}

export function generateAllSurfaces(graph: UisgGraph, surfaceIds?: string[]): GeneratedSurface[] {
    const surfaces = graph.nodes.filter(node => node.type === 'surface') as UisgSurface[];
    const targets = surfaceIds 
        ? surfaces.filter(s => surfaceIds.includes(s.id))
        : surfaces.filter(s => s.status === 'implemented' || s.status === 'partial' || s.status === 'planned');
    
    const generated: GeneratedSurface[] = [];
    
    for (const surface of targets) {
        if (surface.seam) continue; // Skip strategy-backed surfaces
        try {
            const result = generateSurface(surface, graph);
            generated.push(result);
            console.log(`Generated ${result.path}`);
        } catch (error) {
            console.error(`Failed to generate ${surface.id}: ${error}`);
        }
    }
    
    return generated;
}