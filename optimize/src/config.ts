import { resolve } from 'path';

let projectRoot: string | null = null;

export function setProjectRoot(root: string): void {
    projectRoot = root;
}

export function getProjectRoot(): string {
    if (projectRoot) return projectRoot;
    // Default to workspace root
    return resolve(__dirname, '../../..');
}

export function getOptimizeConfigDir(): string {
    return resolve(getProjectRoot(), 'optimize');
}