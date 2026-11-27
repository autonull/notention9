import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJourney } from '../src/registry.js';
import { flowToJourney } from '../src/uisg/toJourney.js';
import { emitManifest, buildManifest, loadManifest } from '../src/uisg/manifest.js';
import { validateGraph } from '../src/uisg/validate.js';
import { ROOT } from '../src/uisg/paths.js';

// Load the registry with journeys
import '../src/journeys.js';

const goldenPathJourney = getJourney('golden-path');
if (!goldenPathJourney) {
    console.error('golden-path journey not found in registry');
    process.exit(1);
}

// Load legacy graph
const legacyGraphPath = resolve(ROOT, 'optimize/src/uisg/__fixtures__/legacy-graph.json');
const legacyGraph = JSON.parse(readFileSync(legacyGraphPath, 'utf8'));
const validation = validateGraph(legacyGraph);
if (!validation.ok || !validation.graph) {
    console.error('Legacy graph validation failed');
    process.exit(1);
}

console.log('Legacy graph loaded with', validation.graph.nodes.length, 'nodes');

// Generate spec from flow
const spec = flowToJourney(validation.graph, 'flow.golden-path', { seed: goldenPathJourney.seed });
console.log('Generated spec:', spec.id);
console.log('Spec version:', spec.version);

// Load existing manifest
const manifest = loadManifest('flow.golden-path');
if (manifest) {
    console.log('Existing manifest found:', manifest.contentHash);
    console.log('Existing manifest spec version:', manifest.spec.version);
    console.log('Specs match:', JSON.stringify(manifest.spec) === JSON.stringify(spec));
} else {
    console.log('No existing manifest found');
}

// Build new manifest
const newManifest = buildManifest('flow.golden-path', spec);
console.log('New manifest contentHash:', newManifest.contentHash);

// Emit manifest
const emittedManifest = emitManifest('flow.golden-path', spec);
console.log('Emitted manifest:', emittedManifest.contentHash);
console.log('Done!');
