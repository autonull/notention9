import { Project, ts } from 'ts-morph';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const COMPILER_OPTIONS = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    skipLibCheck: true,
    strict: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
} as const;

export function findProjectRoot(start: string = process.cwd()): string {
    let dir = start;
    for (;;) {
        if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
        const parent = dirname(dir);
        if (parent === dir) return start;
        dir = parent;
    }
}

export const DEFAULT_PROJECT_ROOT = findProjectRoot();

export function createAstProject(projectRoot: string = DEFAULT_PROJECT_ROOT): Project {
    const tsconfig = join(projectRoot, 'tsconfig.json');
    return new Project({
        ...(existsSync(tsconfig) ? { tsConfigFilePath: tsconfig } : {}),
        skipAddingFilesFromTsConfig: true,
        compilerOptions: {
            ...COMPILER_OPTIONS,
            baseUrl: projectRoot,
            paths: { '@notention/*': ['*/src'] },
        },
    });
}
