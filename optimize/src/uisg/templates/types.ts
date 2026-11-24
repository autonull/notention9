import type { Project, SourceFile, ClassDeclaration, InterfaceDeclaration, PropertySignature, MethodSignature } from 'ts-morph';
import type { UisgSurface, UisgGraph } from '../types.js';

export type TemplateShape = 'item' | 'panel' | 'editor' | 'status';

export interface TemplateContext {
    surface: UisgSurface;
    graph: UisgGraph;
    project: Project;
    sourceFile: SourceFile;
}

export interface Template {
    shape: TemplateShape;
    name: string;
    description: string;
    generate(context: TemplateContext): void;
}

export interface GeneratedSurfaceOutput {
    componentPath: string;
    componentContent: string;
    testPath: string;
    testContent: string;
    propsSchemaPath: string;
    propsSchemaContent: string;
}