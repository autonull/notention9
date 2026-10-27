import { homedir } from 'node:os';
import { join } from 'node:path';

export function getNotentionDir(): string {
    const envDir = process.env.NOTENTION_DATA_DIR;
    if (envDir) return envDir;

    const xdgData = process.env.XDG_DATA_HOME;
    if (xdgData) return join(xdgData, 'notention');

    return join(homedir(), '.notention');
}

export function getOptimizeLogPath(): string {
    const override = process.env.NOTENTION_OPTIMIZE_LOG;
    if (override) return override;
    return join(getNotentionDir(), 'optimize.log');
}

export function getEvidenceDir(): string {
    return join(getNotentionDir(), 'evidence');
}