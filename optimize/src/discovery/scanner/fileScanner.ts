import { globSync } from 'glob';
import { join } from 'node:path';
import { createAstProject, DEFAULT_PROJECT_ROOT } from './astProject.js';
import type { Project, SourceFile } from 'ts-morph';

export interface FileScannerOptions {
    projectRoot?: string;
    includeDirs?: string[];
    filePatterns?: string[];
    ignorePatterns?: string[];
    absolutePaths?: boolean;
}

export interface ScanResult<T> {
    files: string[];
    project: Project;
    sourceFiles: SourceFile[];
    data: T;
}

/**
 * Shared file scanning utilities for AST-based discovery
 */
export class FileScanner {
    private project: Project;
    private readonly projectRoot: string;

    constructor(options: FileScannerOptions = {}) {
        this.projectRoot = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
        this.project = createAstProject(this.projectRoot);
    }

    /**
     * Get the underlying ts-morph Project instance
     */
    getProject(): Project {
        return this.project;
    }

    /**
     * Discover files matching patterns
     */
    discoverFiles(options: FileScannerOptions = {}): string[] {
        const includeDirs = options.includeDirs ?? ['ui/src'];
        const filePatterns = options.filePatterns ?? ['**/*.tsx', '**/*.ts'];
        const ignorePatterns = options.ignorePatterns ?? ['**/*.test.tsx', '**/*.spec.tsx', '**/*.test.ts', '**/*.spec.ts'];
        const absolutePaths = options.absolutePaths ?? true;

        const allFiles: string[] = [];

        for (const dir of includeDirs) {
            const fullDir = join(this.projectRoot, dir);
            for (const pattern of filePatterns) {
                const files = globSync(pattern, {
                    cwd: fullDir,
                    absolute: absolutePaths,
                    ignore: ignorePatterns,
                });
                allFiles.push(...files);
            }
        }

        return [...new Set(allFiles)]; // Deduplicate
    }

    /**
     * Load discovered files into the project
     */
    loadFiles(files: string[]): SourceFile[] {
        const sourceFiles: SourceFile[] = [];

        for (const file of files) {
            try {
                const sourceFile = this.project.addSourceFileAtPath(file);
                sourceFiles.push(sourceFile);
            } catch {
                // Unparseable or missing file: skip rather than fail
            }
        }

        return sourceFiles;
    }

    /**
     * Discover and load files in one step
     */
    discoverAndLoad(options: FileScannerOptions = {}): ScanResult<SourceFile[]> {
        const files = this.discoverFiles(options);
        const sourceFiles = this.loadFiles(files);
        return { files, project: this.project, sourceFiles, data: sourceFiles };
    }

    /**
     * Create a fresh project instance (useful for isolated scans)
     */
    static createFreshProject(projectRoot?: string): Project {
        return createAstProject(projectRoot ?? DEFAULT_PROJECT_ROOT);
    }
}

/**
 * Default scanner instance for common use cases
 */
export const fileScanner = new FileScanner();

/**
 * Scan TypeScript/TSX files in core, ui, and agent directories
 * Used by TsAstScanner for type schema discovery
 */
export function scanTypeScriptSources(projectRoot: string = DEFAULT_PROJECT_ROOT): string[] {
    const dirs = ['core/src', 'ui/src/hooks', 'ui/src/dev', 'agent/src'];
    const files: string[] = [];

    for (const dir of dirs) {
        const fullDir = join(projectRoot, dir);
        try {
            const tsFiles = globSync('**/*.ts', { cwd: fullDir, absolute: true });
            files.push(...tsFiles);
        } catch {
            // Directory might not exist
        }
    }

    return [...new Set(files)];
}

/**
 * Scan UI components (TSX files)
 * Used by ComponentScanner for component discovery
 */
export function scanUIComponents(projectRoot: string = DEFAULT_PROJECT_ROOT): string[] {
    const uiRoot = join(projectRoot, 'ui', 'src');
    return globSync('**/*.tsx', {
        cwd: uiRoot,
        absolute: true,
        ignore: ['**/*.test.tsx', '**/*.spec.tsx'],
    });
}