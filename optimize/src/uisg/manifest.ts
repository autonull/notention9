import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JourneySpec } from '../journey.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const MANIFEST_DIR = resolve(ROOT, 'doc/uisg/manifests');

export interface FlowManifest {
    flowId: string;
    spec: JourneySpec;
    journeyFile: string;
    bundle?: string;
    compilerVersion: string;
    warnings: string[];
    sourceMap: string;
    generatedAt: string;
    contentHash: string;
}

function ensureManifestDir(): void {
    mkdirSync(MANIFEST_DIR, { recursive: true });
}

function computeHash(obj: unknown): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function emitManifest(flowId: string, spec: JourneySpec, warnings: string[] = []): FlowManifest {
    ensureManifestDir();

    const journeyFile = resolve(ROOT, 'ui/test/optimize', `${spec.id}.journey.ts`);
    const manifest: FlowManifest = {
        flowId,
        spec,
        journeyFile: journeyFile.replace(ROOT + '/', ''),
        compilerVersion: '1.0.0',
        warnings,
        sourceMap: '', // TODO: generate source map
        generatedAt: new Date().toISOString(),
        contentHash: computeHash(spec),
    };

    const manifestPath = resolve(MANIFEST_DIR, `${flowId}.manifest.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
}

export function loadManifest(flowId: string): FlowManifest | null {
    const manifestPath = resolve(MANIFEST_DIR, `${flowId}.manifest.json`);
    try {
        return JSON.parse(readFileSync(manifestPath, 'utf8')) as FlowManifest;
    } catch {
        return null;
    }
}

export function verifyManifestDeterminism(flowId: string, spec: JourneySpec): boolean {
    const manifest = loadManifest(flowId);
    if (!manifest) return false;
    return manifest.contentHash === computeHash(spec);
}