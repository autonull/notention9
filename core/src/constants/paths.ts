// Browser-compatible path utilities - no Node.js builtins in browser bundle
function joinPath(...segments: string[]): string {
    return segments.filter(Boolean).join('/');
}

function getHomeDir(): string {
    if (typeof window !== 'undefined') {
        return '/home/user';
    }
    // Dynamic import to avoid bundling Node.js builtins
    const os = require('node:os');
    return os.homedir();
}

export function getNotentionDir(): string {
    const envDir = process.env.NOTENTION_DATA_DIR;
    if (envDir) return envDir;

    const xdgData = process.env.XDG_DATA_HOME;
    if (xdgData) return joinPath(xdgData, 'notention');

    return joinPath(getHomeDir(), '.notention');
}

export function getOptimizeLogPath(): string {
    const override = process.env.NOTENTION_OPTIMIZE_LOG;
    if (override) return override;
    return joinPath(getNotentionDir(), 'optimize.log');
}

export function getEvidenceDir(): string {
    return joinPath(getNotentionDir(), 'evidence');
}