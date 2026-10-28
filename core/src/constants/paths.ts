// Browser-compatible path utilities - no Node.js builtins in browser bundle
function joinPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/');
}

async function getHomeDir(): Promise<string> {
    if (typeof window !== 'undefined') {
        return '/home/user';
    }
    // Dynamic import to avoid bundling Node.js builtins
    const os = await import('node:os');
    return os.homedir();
}

export async function getNotentionDir(): Promise<string> {
    const envDir = process.env.NOTENTION_DATA_DIR;
    if (envDir) return envDir;

    const xdgData = process.env.XDG_DATA_HOME;
    if (xdgData) return joinPath(xdgData, 'notention');

    return joinPath(await getHomeDir(), '.notention');
}

export async function getOptimizeLogPath(): Promise<string> {
    const override = process.env.NOTENTION_OPTIMIZE_LOG;
    if (override) return override;
    return joinPath(await getNotentionDir(), 'optimize.log');
}

export async function getEvidenceDir(): Promise<string> {
    return joinPath(await getNotentionDir(), 'evidence');
}