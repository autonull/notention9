export type TemplateShape = 'item' | 'panel' | 'editor' | 'status';

export interface Template {
    shape: TemplateShape;
    name: string;
    description: string;
    generateComponent(surface: any, graph: any): string;
    generateTest(surface: any, graph: any): string;
    generatePropsSchema(surface: any, graph: any): string;
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
registerTemplate(itemTemplate);