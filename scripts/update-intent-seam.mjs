import { readFileSync, writeFileSync } from 'fs';

const graphFile = '/home/me/notention9/doc/uisg/graph.json';
const graph = JSON.parse(readFileSync(graphFile, 'utf8'));

// Add intent seam capability marked as rejected/unsupported
const intentSeamCapability = {
    id: 'cap.intent.recognize',
    type: 'capability',
    name: 'Recognize user intent',
    status: 'rejected',
    seam: 'intent',
    summary: 'No UI implementation; pattern recognition exists in core but no surface/strategy. Declared unsupported per C2 decision.',
    source: [
        'core/src/patternRecognition',
        'optimize/src/optimizer/evaluation/intentCaseRunner.ts'
    ],
    risk: 'normal',
};

// Check if already exists
const existing = graph.nodes.find(n => n.id === 'cap.intent.recognize');
if (!existing) {
    graph.nodes.push(intentSeamCapability);
}

// Add supports edge from capability to relevant intents
const newEdges = [
    { from: 'cap.intent.recognize', type: 'supports', to: 'intent.structured-note' },
    { from: 'cap.intent.recognize', type: 'supports', to: 'intent.express-need' },
    { from: 'cap.intent.recognize', type: 'supports', to: 'intent.publish-safely' },
    { from: 'cap.intent.recognize', type: 'supports', to: 'intent.manage-ontology' },
];

const existingEdges = new Set(graph.edges.map(e => `${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));
for (const edge of newEdges) {
    const key = `${edge.from}|${edge.type}|${edge.to}|${edge.when ?? ''}`;
    if (!existingEdges.has(key)) {
        graph.edges.push(edge);
    }
}

writeFileSync(graphFile, JSON.stringify(graph, null, 2) + '\n');
console.log('Intent seam capability added (rejected/unsupported)');
console.log(`Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);