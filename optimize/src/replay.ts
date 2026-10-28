import type { EvidenceBundle } from './evidence.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getEvidenceDir } from '@notention/core';

export async function loadBundle(runId: string): Promise<EvidenceBundle | null> {
    const bundlePath = join(await getEvidenceDir(), runId, 'bundle.json');
    if (!existsSync(bundlePath)) return null;
    return JSON.parse(readFileSync(bundlePath, 'utf-8'));
}

export function planReplay(bundle: EvidenceBundle): { command: string; env: Record<string, string> } {
    return {
        command: `pnpm optimize --replay ${bundle.runId}`,
        env: {
            NOTENTION_REPORT_ONLY: '1',
        },
    };
}