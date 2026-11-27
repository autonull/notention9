import { readFileSync, readdirSync, statSync } from 'node:fs';
import { indexGraph, queryGraph } from './query.js';
import { validateGraph } from './validate.js';
import { scanAll } from './scan.js';
import type { UisgGraph, UisgNode, UisgNodeType, UisgBaseNode } from './types.js';
import { ROOT } from './paths.js';


export interface SyncProposal {
    type: 'add-surface' | 'add-navigation' | 'add-seam' | 'add-journey' | 'add-strategy' | 'update-surface' | 'update-navigation' | 'remove-stale' | 'fix-binding';
    severity: 'info' | 'warning' | 'error';
    description: string;
    graphNodeId?: string;
    scanItemId?: string;
    suggestedChange: string;
    autoFixable: boolean;
}

export interface SyncResult {
    proposals: SyncProposal[];
    stats: {
        graphSurfaces: number;
        scanSurfaces: number;
        graphNavigation: number;
        scanNavigation: number;
        graphSeams: number;
        scanSeams: number;
        graphJourneys: number;
        scanJourneys: number;
        graphStrategies: number;
        scanStrategies: number;
    };
}

interface UisgSurfaceNode extends UisgBaseNode {
    type: 'surface';
    component?: string;
    route?: string;
}

interface UisgCapabilityNode extends UisgBaseNode {
    type: 'capability';
    seam?: string;
    strategy?: string;
}

interface UisgFlowNode extends UisgBaseNode {
    type: 'flow';
    journey?: string;
}

function getGraphSurfaces(graph: UisgGraph): Map<string, UisgSurfaceNode> {
    const surfaces = new Map<string, UisgSurfaceNode>();
    for (const node of graph.nodes) {
        if (node.type === 'surface') {
            surfaces.set(node.id, node as UisgSurfaceNode);
        }
    }
    return surfaces;
}

function getGraphNavigation(graph: UisgGraph): Map<string, UisgSurfaceNode> {
    const nav = new Map<string, UisgSurfaceNode>();
    for (const node of graph.nodes) {
        if (node.type === 'surface' && node.route) {
            nav.set(node.route, node as UisgSurfaceNode);
        }
    }
    return nav;
}

function getGraphSeams(graph: UisgGraph): Map<string, UisgCapabilityNode> {
    const seams = new Map<string, UisgCapabilityNode>();
    for (const node of graph.nodes) {
        if (node.type === 'capability' && node.seam) {
            seams.set(node.seam, node as UisgCapabilityNode);
        }
    }
    return seams;
}

function getGraphJourneys(graph: UisgGraph): Map<string, UisgFlowNode> {
    const journeys = new Map<string, UisgFlowNode>();
    for (const node of graph.nodes) {
        if (node.type === 'flow' && node.journey) {
            journeys.set(node.journey, node as UisgFlowNode);
        }
    }
    return journeys;
}

function getGraphStrategies(graph: UisgGraph): Map<string, UisgCapabilityNode> {
    const strategies = new Map<string, UisgCapabilityNode>();
    for (const node of graph.nodes) {
        if (node.type === 'capability' && node.strategy) {
            strategies.set(node.strategy, node as UisgCapabilityNode);
        }
    }
    return strategies;
}

export function syncGraphWithCode(graph: UisgGraph, apply: boolean = false): SyncResult {
    const scan = scanAll();

    const graphSurfaces = getGraphSurfaces(graph);
    const graphNavigation = getGraphNavigation(graph);
    const graphSeams = getGraphSeams(graph);
    const graphJourneys = getGraphJourneys(graph);
    const graphStrategies = getGraphStrategies(graph);

    const proposals: SyncProposal[] = [];

    // Check for new surfaces in scan not in graph
    for (const scanSurface of scan.surfaces) {
        const exists = Array.from(graphSurfaces.values()).some(g =>
            g.component === scanSurface.component || g.id === scanSurface.id
        );
        if (!exists) {
            proposals.push({
                type: 'add-surface',
                severity: 'info',
                description: `Surface component ${scanSurface.component} found in code but not in graph`,
                scanItemId: scanSurface.id,
                suggestedChange: `Add surface node: { id: '${scanSurface.id}', type: 'surface', name: '${scanSurface.component}', component: '${scanSurface.component}', route: '${scanSurface.route ?? ''}', status: 'planned' }`,
                autoFixable: true,
            });
        }
    }

    // Check for stale surfaces in graph not in scan
    for (const [id, graphSurface] of graphSurfaces) {
        if (graphSurface.status === 'implemented' || graphSurface.status === 'partial') {
            const exists = scan.surfaces.some(s => s.component === graphSurface.component);
            if (!exists && graphSurface.component) {
                proposals.push({
                    type: 'remove-stale',
                    severity: 'warning',
                    description: `Surface ${graphSurface.component} (${id}) in graph but not found in code scan`,
                    graphNodeId: id,
                    suggestedChange: `Update surface ${id} status to 'removed' or remove if deprecated`,
                    autoFixable: false,
                });
            }
        }
    }

    // Check for new navigation routes
    for (const scanNav of scan.navigation) {
        const exists = graphNavigation.has(scanNav.hash);
        if (!exists) {
            proposals.push({
                type: 'add-navigation',
                severity: 'info',
                description: `Navigation route ${scanNav.hash} found in code but not in graph`,
                scanItemId: scanNav.hash,
                suggestedChange: `Add surface with route '${scanNav.hash}' or update existing surface`,
                autoFixable: true,
            });
        }
    }

    // Check for new seams
    for (const scanSeam of scan.seams) {
        const exists = graphSeams.has(scanSeam.role);
        if (!exists) {
            proposals.push({
                type: 'add-seam',
                severity: 'info',
                description: `Seam role ${scanSeam.role} found in code but not in graph`,
                scanItemId: scanSeam.role,
                suggestedChange: `Add capability with seam '${scanSeam.role}' or update existing capability`,
                autoFixable: true,
            });
        }
    }

    // Check for new journeys
    for (const scanJourney of scan.journeys) {
        const exists = graphJourneys.has(scanJourney.id);
        if (!exists) {
            proposals.push({
                type: 'add-journey',
                severity: 'info',
                description: `Journey ${scanJourney.id} found in registry but not linked in graph`,
                scanItemId: scanJourney.id,
                suggestedChange: `Link journey ${scanJourney.id} to a flow in the graph`,
                autoFixable: false,
            });
        }
    }

    // Check for stale journeys in graph
    for (const [id, graphJourney] of graphJourneys) {
        const exists = scan.journeys.some(s => s.id === id);
        if (!exists) {
            proposals.push({
                type: 'remove-stale',
                severity: 'warning',
                description: `Journey ${id} linked in graph but not found in registry`,
                graphNodeId: id,
                suggestedChange: `Remove journey link from flow or restore journey`,
                autoFixable: false,
            });
        }
    }

    // Check for new strategies
    for (const scanStrategy of scan.strategies) {
        const exists = graphStrategies.has(scanStrategy.id);
        if (!exists) {
            proposals.push({
                type: 'add-strategy',
                severity: 'info',
                description: `Strategy ${scanStrategy.id} found in code but not in graph`,
                scanItemId: scanStrategy.id,
                suggestedChange: `Add capability with strategy '${scanStrategy.id}' for seam '${scanStrategy.seam}'`,
                autoFixable: true,
            });
        }
    }

    // Check for stale strategies
    for (const [id, graphStrategy] of graphStrategies) {
        const exists = scan.strategies.some(s => s.id === id);
        if (!exists) {
            proposals.push({
                type: 'remove-stale',
                severity: 'warning',
                description: `Strategy ${id} in graph but not found in code scan`,
                graphNodeId: id,
                suggestedChange: `Update capability strategy or remove if deprecated`,
                autoFixable: false,
            });
        }
    }

    return {
        proposals,
        stats: {
            graphSurfaces: graphSurfaces.size,
            scanSurfaces: scan.surfaces.length,
            graphNavigation: graphNavigation.size,
            scanNavigation: scan.navigation.length,
            graphSeams: graphSeams.size,
            scanSeams: scan.seams.length,
            graphJourneys: graphJourneys.size,
            scanJourneys: scan.journeys.length,
            graphStrategies: graphStrategies.size,
            scanStrategies: scan.strategies.length,
        },
    };
}