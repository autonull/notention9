import type { UisgGraph, UisgSurface } from '../types.js';
import type { TemplateTarget } from './render.js';

export type TemplateShape = 'item' | 'panel' | 'editor' | 'status';

export interface Template {
    shape: TemplateShape;
    name: string;
    description: string;
    generateComponent(surface: UisgSurface, graph: UisgGraph, target: TemplateTarget): string;
    generateTest(surface: UisgSurface, graph: UisgGraph, target: TemplateTarget): string;
    generatePropsSchema(surface: UisgSurface, graph: UisgGraph): string;
}

export const TEMPLATE_REGISTRY: Record<TemplateShape, Template> = {} as any;

export function registerTemplate(template: Template): void {
    TEMPLATE_REGISTRY[template.shape] = template;
}

export function getTemplate(shape: TemplateShape): Template | undefined {
    return TEMPLATE_REGISTRY[shape];
}

export function getAvailableTemplates(): TemplateShape[] {
    return Object.keys(TEMPLATE_REGISTRY) as TemplateShape[];
}

// Auto-register built-in templates
import { itemTemplate } from './item.js';
import { panelTemplate } from './panel.js';
import { editorTemplate } from './editor.js';
import { statusTemplate } from './status.js';
registerTemplate(itemTemplate);
registerTemplate(panelTemplate);
registerTemplate(editorTemplate);
registerTemplate(statusTemplate);