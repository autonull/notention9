// Browser-compatible path utilities - no Node.js builtins in browser bundle
export function joinPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/');
}

function getHomeDirSync(): string {
    if (typeof window !== 'undefined') {
        return '/home/user';
    }
    // Use process.env for home directory - works in Node.js without require
    return process.env.HOME || process.env.USERPROFILE || '/home/user';
}

async function getHomeDir(): Promise<string> {
    if (typeof window !== 'undefined') {
        return '/home/user';
    }
    return process.env.HOME || process.env.USERPROFILE || '/home/user';
}

export async function getNotentionDir(): Promise<string> {
    const envDir = process.env.NOTENTION_DATA_DIR;
    if (envDir) return envDir;

    const xdgData = process.env.XDG_DATA_HOME;
    if (xdgData) return joinPath(xdgData, 'notention');

    return joinPath(await getHomeDir(), '.notention');
}

export function getNotentionDirSync(): string {
    const envDir = process.env.NOTENTION_DATA_DIR;
    if (envDir) return envDir;

    const xdgData = process.env.XDG_DATA_HOME;
    if (xdgData) return joinPath(xdgData, 'notention');

    return joinPath(getHomeDirSync(), '.notention');
}

export async function getOptimizeLogPath(): Promise<string> {
    const override = process.env.NOTENTION_OPTIMIZE_LOG;
    if (override) return override;
    return joinPath(await getNotentionDir(), 'optimize.log');
}

export function getOptimizeLogPathSync(): string {
    const override = process.env.NOTENTION_OPTIMIZE_LOG;
    if (override) return override;
    return joinPath(getNotentionDirSync(), 'optimize.log');
}

export async function getEvidenceDir(): Promise<string> {
    return joinPath(await getNotentionDir(), 'evidence');
}

export function getEvidenceDirSync(): string {
    return joinPath(getNotentionDirSync(), 'evidence');
}