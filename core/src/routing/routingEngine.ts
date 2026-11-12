import {
    SpacetimeNode,
    SpacetimeEdge,
    RoutingRequest,
    RoutingResult,
    VehicleProfile,
    RiskAssessment,
    ToleranceBreach,
    TimelineEvent,
    MapLayer,
    CompassFallback,
    GeoCoords,
    ManifestNeed,
    ManifestTolerance,
    ResourceAmount,
    HazardExposure,
    DEFAULT_VEHICLES,
    compareSeverity,
    compareRisk,
    calculateEnergyCost,
    calculateHazardPenalty,
    calculateResourceBonus,
    SEVERITY_ORDER,
    RISK_ORDER,
    type GeoJSONFeature,
    type GeoJSONFeatureCollection
} from './survivalRouting.js';
import { haversineDistance } from '../utils/geo.js';
import type { OntologyNode } from '../types/index.js';

interface AStarNode {
    id: string;
    fScore: number;
    gScore: number;
    hScore: number;
    parent: string | null;
}

interface SearchContext {
    nodes: Map<string, SpacetimeNode>;
    edges: Map<string, SpacetimeEdge[]>;
    request: RoutingRequest;
    vehicle: VehicleProfile;
    startNodeId: string;
    goalNodeId: string;
    openSet: Set<string>;
    closedSet: Set<string>;
    nodeData: Map<string, AStarNode>;
    needs: ManifestNeed[];
    tolerances: ManifestTolerance[];
}

/**
 * Build spacetime grid from request and ontology data
 */
export const buildSpacetimeGrid = (
    request: RoutingRequest,
    ontologyNodes: OntologyNode[],
    existingNotes: any[]
): { nodes: Map<string, SpacetimeNode>; edges: Map<string, SpacetimeEdge[]> } => {
    const nodes = new Map<string, SpacetimeNode>();
    const edges = new Map<string, SpacetimeEdge[]>();
    
    const horizonHours = request.horizonHours ?? 24;
    const gridResolutionKm = request.gridResolutionKm ?? 5;
    const vehicle = request.vehicle ?? DEFAULT_VEHICLES.foot;
    
    const startTime = new Date(request.startTime).getTime();
    const endTime = request.deadline ? new Date(request.deadline).getTime() : startTime + horizonHours * 3600 * 1000;
    const timeStepMinutes = 30; // 30-minute time steps
    
    // Create start node
    const startNodeId = `start-${Date.now()}`;
    const startNode: SpacetimeNode = {
        id: startNodeId,
        location: request.start,
        time: request.startTime,
        type: 'start',
        ontologyRefs: [],
        provides: [],
        imposes: [],
        metadata: {}
    };
    nodes.set(startNodeId, startNode);
    
    // Create goal node
    const goalNodeId = `goal-${Date.now()}`;
    const goalNode: SpacetimeNode = {
        id: goalNodeId,
        location: request.goal,
        time: new Date(endTime).toISOString(),
        type: 'end',
        ontologyRefs: [],
        provides: [],
        imposes: [],
        metadata: {}
    };
    nodes.set(goalNodeId, goalNode);
    
    // Add hazard zones as nodes
    const hazardNodes = ontologyNodes
        .find(n => n.id === 'hazard')
        ?.children?.flatMap(child => 
            child.id === 'hazard-zone' ? [child] : 
            child.children?.filter(c => c.id === 'hazard-zone') ?? []
        ) ?? [];
    
    for (const hazard of hazardNodes) {
        // In real implementation, these would come from actual notes/events
        // For now, create sample hazard nodes
    }
    
    // Add resource caches as nodes
    const resourceNodes = ontologyNodes
        .find(n => n.id === 'resource')
        ?.children?.flatMap(child => 
            child.id === 'resource-cache' ? [child] : 
            child.children?.filter(c => c.id === 'resource-cache') ?? []
        ) ?? [];
    
    // Add shelter sites as nodes
    const shelterNodes = ontologyNodes
        .find(n => n.id === 'shelter')
        ?.children?.flatMap(child => 
            child.id === 'shelter-site' ? [child] : 
            child.children?.filter(c => c.id === 'shelter-site') ?? []
        ) ?? [];
    
    // Create grid of waypoints between start and goal
    const waypointNodes = createWaypointGrid(
        request.start,
        request.goal,
        startTime,
        endTime,
        gridResolutionKm,
        timeStepMinutes,
        vehicle
    );
    
    for (const node of waypointNodes) {
        nodes.set(node.id, node);
    }
    
    // Build edges between nearby nodes in spacetime
    buildEdges(nodes, edges, vehicle, gridResolutionKm * 2, timeStepMinutes * 2);
    
    return { nodes, edges };
};

/**
 * Create waypoint grid in spacetime
 */
function createWaypointGrid(
    start: GeoCoords,
    goal: GeoCoords,
    startTime: number,
    endTime: number,
    gridResolutionKm: number,
    timeStepMinutes: number,
    vehicle: VehicleProfile
): SpacetimeNode[] {
    const nodes: SpacetimeNode[] = [];
    
    const distance = haversineDistance(start, goal);
    const bearing = calculateBearing(start, goal);
    const steps = Math.max(1, Math.ceil(distance / gridResolutionKm));
    const timeSteps = Math.max(1, Math.ceil((endTime - startTime) / (timeStepMinutes * 60 * 1000)));
    
    for (let t = 0; t <= timeSteps; t++) {
        const time = new Date(startTime + t * timeStepMinutes * 60 * 1000).toISOString();
        
        for (let s = 0; s <= steps; s++) {
            const fraction = s / steps;
            const lat = start.lat + (goal.lat - start.lat) * fraction;
            const lng = start.lng + (goal.lng - start.lng) * fraction;
            
            // Add some lateral spread for alternative paths
            const lateralSpread = gridResolutionKm / 111; // degrees per km
            for (let lateral = -1; lateral <= 1; lateral++) {
                const nodeId = `wp-${t}-${s}-${lateral}`;
                const node: SpacetimeNode = {
                    id: nodeId,
                    location: { lat: lat + lateral * lateralSpread * 0.5, lng },
                    time,
                    type: 'waypoint',
                    ontologyRefs: [],
                    provides: [],
                    imposes: [],
                    metadata: { step: s, timeIndex: t, lateral }
                };
                nodes.push(node);
            }
        }
    }
    
    return nodes;
}

/**
 * Build edges between nearby spacetime nodes
 */
function buildEdges(
    nodes: Map<string, SpacetimeNode>,
    edges: Map<string, SpacetimeEdge[]>,
    vehicle: VehicleProfile,
    maxDistanceKm: number,
    maxTimeDiffMinutes: number
): void {
    const nodeArray = Array.from(nodes.values());
    
    for (const fromNode of nodeArray) {
        const fromEdges: SpacetimeEdge[] = [];
        
        for (const toNode of nodeArray) {
            if (fromNode.id === toNode.id) continue;
            
            const timeDiff = new Date(toNode.time).getTime() - new Date(fromNode.time).getTime();
            const timeDiffMinutes = timeDiff / (60 * 1000);
            
            // Only forward in time, within time step window
            if (timeDiffMinutes <= 0 || timeDiffMinutes > maxTimeDiffMinutes) continue;
            
            const distance = haversineDistance(fromNode.location, toNode.location);
            if (distance > maxDistanceKm) continue;
            
            // Check if vehicle can make this trip in time
            const minTimeNeeded = (distance / vehicle.speedKph) * 60; // minutes
            if (timeDiffMinutes < minTimeNeeded * 0.8) continue; // 20% buffer
            
            const energyCost = calculateEnergyCost(distance, vehicle, 'road');
            const hazardExposure = assessHazardExposure(fromNode, toNode);
            
            const edge: SpacetimeEdge = {
                id: `edge-${fromNode.id}-${toNode.id}`,
                from: fromNode.id,
                to: toNode.id,
                travelTime: timeDiffMinutes,
                distance,
                energyCost,
                requiredCapability: vehicle.type,
                hazardExposure,
                metadata: {}
            };
            
            fromEdges.push(edge);
        }
        
        if (fromEdges.length > 0) {
            edges.set(fromNode.id, fromEdges);
        }
    }
}

/**
 * Assess hazard exposure along an edge
 */
function assessHazardExposure(from: SpacetimeNode, to: SpacetimeNode): HazardExposure[] {
    const exposures: HazardExposure[] = [];
    
    // Check if either node is in a hazard zone
    for (const ref of [...from.ontologyRefs, ...to.ontologyRefs]) {
        if (ref.startsWith('hazard-')) {
            exposures.push({
                hazardType: ref,
                severity: 'moderate',
                durationMinutes: 30,
                protectionAvailable: false,
                protectionEffectiveness: 0
            });
        }
    }
    
    return exposures;
}

/**
 * Calculate bearing between two coordinates
 */
export function calculateBearing(from: GeoCoords, to: GeoCoords): number {
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

/**
 * A* search on spacetime graph
 */
export const astarSearch = (context: SearchContext): { success: boolean; path: string[]; nodeData: Map<string, AStarNode> } => {
    const { nodes, edges, startNodeId, goalNodeId, openSet, closedSet, nodeData, request } = context;
    
    // Initialize start node
    const startNode = nodes.get(startNodeId)!;
    const goalNode = nodes.get(goalNodeId)!;
    
    const startH = heuristic(startNode, goalNode.location, request);
    nodeData.set(startNodeId, {
        id: startNodeId,
        fScore: startH,
        gScore: 0,
        hScore: startH,
        parent: null
    });
    openSet.add(startNodeId);
    
    while (openSet.size > 0) {
        // Find node with lowest fScore
        let currentId: string | null = null;
        let lowestF = Infinity;
        
        for (const id of openSet) {
            const data = nodeData.get(id)!;
            if (data.fScore < lowestF) {
                lowestF = data.fScore;
                currentId = id;
            }
        }
        
        if (!currentId) break;
        
        if (currentId === goalNodeId) {
            // Reconstruct path
            const path: string[] = [];
            let current: string | null = currentId;
            while (current) {
                path.unshift(current);
                current = nodeData.get(current)?.parent ?? null;
            }
            return { success: true, path, nodeData };
        }
        
        openSet.delete(currentId);
        closedSet.add(currentId);
        
        const currentNode = nodes.get(currentId)!;
        const currentData = nodeData.get(currentId)!;
        const outgoingEdges = edges.get(currentId) ?? [];
        
        for (const edge of outgoingEdges) {
            const neighborId = edge.to;
            
            if (closedSet.has(neighborId)) continue;
            
            const neighborNode = nodes.get(neighborId);
            if (!neighborNode) continue;
            
            // Calculate cost to neighbor
            const edgeCost = calculateEdgeCost(edge, currentNode, neighborNode, context);
            
            if (edgeCost === Infinity) continue; // Hard constraint violation
            
            const tentativeG = currentData.gScore + edgeCost;
            
            let neighborData = nodeData.get(neighborId);
            if (!neighborData) {
                neighborData = {
                    id: neighborId,
                    fScore: Infinity,
                    gScore: Infinity,
                    hScore: 0,
                    parent: null
                };
                nodeData.set(neighborId, neighborData);
            }
            
            if (tentativeG < neighborData.gScore) {
                neighborData.parent = currentId;
                neighborData.gScore = tentativeG;
                neighborData.hScore = heuristic(neighborNode, goalNode.location, request);
                neighborData.fScore = neighborData.gScore + neighborData.hScore;
                
                if (!openSet.has(neighborId)) {
                    openSet.add(neighborId);
                }
            }
        }
    }
    
    return { success: false, path: [], nodeData };
};

/**
 * Calculate edge cost with hazard penalties and resource bonuses
 */
function calculateEdgeCost(
    edge: SpacetimeEdge,
    fromNode: SpacetimeNode,
    toNode: SpacetimeNode,
    context: SearchContext
): number {
    let cost = edge.energyCost;
    
    // Add hazard penalties
    for (const exposure of edge.hazardExposure) {
        const tolerance = context.tolerances.find(t => t.factor === exposure.hazardType) ?? null;
        const penalty = calculateHazardPenalty(exposure, tolerance, exposure.protectionEffectiveness);
        if (penalty === Infinity) return Infinity;
        cost += penalty;
    }
    
    // Subtract resource bonuses at destination
    const bonus = calculateResourceBonus(toNode.provides, context.needs);
    cost -= bonus;
    
    // Add time cost
    cost += edge.travelTime * 0.1; // Small time penalty
    
    // Objective-based adjustments
    switch (context.request.objective) {
        case 'fastest':
            cost += edge.travelTime * 0.5;
            break;
        case 'safest':
            // Already heavily weighted by hazard penalties
            break;
        case 'energy-efficient':
            cost += edge.energyCost * 2;
            break;
        case 'resource-rich':
            cost -= bonus * 2;
            break;
    }
    
    return Math.max(0.1, cost); // Minimum cost
}

/**
 * Heuristic function for A* (admissible)
 */
function heuristic(node: SpacetimeNode, goal: GeoCoords, request: RoutingRequest): number {
    const distance = haversineDistance(node.location, goal);
    const vehicle = request.vehicle ?? DEFAULT_VEHICLES.foot;
    const minTime = (distance / vehicle.speedKph) * 60;
    const minEnergy = distance * vehicle.fuelConsumptionPerKm;
    
    return minTime * 0.1 + minEnergy;
}

/**
 * Main routing function
 */
export const findRoute = async (
    request: RoutingRequest,
    ontologyNodes: OntologyNode[],
    existingNotes: any[]
): Promise<RoutingResult> => {
    const startTime = Date.now();
    const vehicleType = request.vehicle?.type ?? 'foot';
    const vehicle = request.vehicle ?? DEFAULT_VEHICLES[vehicleType] ?? DEFAULT_VEHICLES.foot;
    
    // Build spacetime grid
    const { nodes, edges } = buildSpacetimeGrid(request, ontologyNodes, existingNotes);
    
    const startNodeId = Array.from(nodes.values()).find(n => n.type === 'start')!.id;
    const goalNodeId = Array.from(nodes.values()).find(n => n.type === 'end')!.id;
    
    // Prepare search context
    const context: SearchContext = {
        nodes,
        edges,
        request,
        vehicle,
        startNodeId,
        goalNodeId,
        openSet: new Set(),
        closedSet: new Set(),
        nodeData: new Map(),
        needs: request.manifest?.needs ?? [],
        tolerances: request.manifest?.tolerances ?? []
    };
    
    // Run A* search
    const { success, path, nodeData } = astarSearch(context);
    
    if (!success) {
        return createFailedResult(request, vehicle, nodes, Date.now() - startTime);
    }
    
    // Build result from path
    return buildResult(path, nodes, edges, context, vehicle, Date.now() - startTime);
};

/**
 * Build successful routing result
 */
function buildResult(
    path: string[],
    nodes: Map<string, SpacetimeNode>,
    edges: Map<string, SpacetimeEdge[]>,
    context: SearchContext,
    vehicle: VehicleProfile,
    computationTimeMs: number
): RoutingResult {
    let totalTime = 0;
    let totalDistance = 0;
    let totalEnergy = 0;
    const timeline: TimelineEvent[] = [];
    const resourcesAcquired: ResourceAmount[] = [];
    const hazardExposures: HazardExposure[] = [];
    const toleranceBreaches: ToleranceBreach[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];
        const fromNode = nodes.get(fromId)!;
        const toNode = nodes.get(toId)!;
        const edge = edges.get(fromId)?.find(e => e.to === toId);
        
        if (!edge) continue;
        
        totalTime += edge.travelTime;
        totalDistance += edge.distance;
        totalEnergy += edge.energyCost;
        
        // Timeline events
        timeline.push({
            time: fromNode.time,
            nodeId: fromId,
            eventType: 'depart',
            description: `Depart ${fromNode.type}`,
            data: { location: fromNode.location }
        });
        
        timeline.push({
            time: toNode.time,
            nodeId: toId,
            eventType: 'arrive',
            description: `Arrive ${toNode.type}`,
            data: { location: toNode.location }
        });
        
        // Hazard exposures
        for (const exposure of edge.hazardExposure) {
            hazardExposures.push(exposure);
            
            // Check tolerance breaches
            const tolerance = context.tolerances.find(t => t.factor === exposure.hazardType);
            if (tolerance) {
                const currentLevel = SEVERITY_ORDER[exposure.severity] ?? 2;
                const maxLevel = SEVERITY_ORDER[tolerance.maxLevel.toString()] ?? 2;
                
                if (currentLevel > maxLevel) {
                    toleranceBreaches.push({
                        factor: exposure.hazardType,
                        currentLevel,
                        maxLevel: tolerance.maxLevel,
                        unit: tolerance.unit,
                        consequence: tolerance.consequence,
                        timeOfBreach: toNode.time
                    });
                }
            }
            
            timeline.push({
                time: toNode.time,
                nodeId: toId,
                eventType: 'expose',
                description: `Exposed to ${exposure.hazardType} (${exposure.severity})`,
                data: { exposure }
            });
        }
        
        // Resource acquisition
        for (const resource of toNode.provides) {
            resourcesAcquired.push(resource);
            timeline.push({
                time: toNode.time,
                nodeId: toId,
                eventType: 'acquire',
                description: `Acquired ${resource.amount} ${resource.unit} of ${resource.type}`,
                data: { resource }
            });
        }
    }
    
    // Final arrival
    const lastNode = nodes.get(path[path.length - 1])!;
    timeline.push({
        time: lastNode.time,
        nodeId: path[path.length - 1],
        eventType: 'arrive',
        description: 'Arrived at destination',
        data: { location: lastNode.location }
    });
    
    // Risk assessment
    const maxSeverity = hazardExposures.reduce((max, exp) => 
        compareSeverity(exp.severity, max) > 0 ? exp.severity : max, 'negligible');
    
    const overallRisk = toleranceBreaches.length > 0 ? 'lethal' :
        maxSeverity === 'lethal' ? 'extreme' :
        maxSeverity === 'severe' ? 'high' :
        maxSeverity === 'moderate' ? 'moderate' : 'low';
    
    const risk: RiskAssessment = {
        overall: overallRisk as any,
        maxHazardSeverity: maxSeverity as any,
        hazardExposures,
        toleranceBreaches
    };
    
    // Generate map layers
    const mapLayers = generateMapLayers(nodes, edges, path, context);
    
    return {
        success: true,
        path,
        totalTime,
        totalDistance,
        totalEnergy,
        risk,
        resourcesAcquired,
        timeline,
        mapLayers,
        metadata: {
            nodesExplored: context.closedSet.size,
            computationTimeMs,
            gridResolutionKm: context.request.gridResolutionKm ?? 5,
            horizonHours: context.request.horizonHours ?? 24,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }
    };
}

/**
 * Create failed result with compass fallback
 */
function createFailedResult(
    request: RoutingRequest,
    vehicle: VehicleProfile,
    nodes: Map<string, SpacetimeNode>,
    computationTimeMs: number
): RoutingResult {
    const startNode = Array.from(nodes.values()).find(n => n.type === 'start')!;
    const goalNode = Array.from(nodes.values()).find(n => n.type === 'end')!;
    
    const distance = haversineDistance(startNode.location, goalNode.location);
    const bearing = calculateBearing(startNode.location, goalNode.location);
    const estimatedTime = (distance / vehicle.speedKph) * 60;
    
    const compassFallback: CompassFallback = {
        bearing,
        distanceKm: distance,
        estimatedTimeMinutes: estimatedTime,
        lastKnownGood: startNode.location,
        confidence: 'low',
        warnings: ['No safe path found', 'Direct route may be hazardous', 'Verify conditions before departure']
    };
    
    return {
        success: false,
        path: [],
        totalTime: 0,
        totalDistance: 0,
        totalEnergy: 0,
        risk: {
            overall: 'extreme',
            maxHazardSeverity: 'lethal',
            hazardExposures: [],
            toleranceBreaches: []
        },
        resourcesAcquired: [],
        timeline: [],
        mapLayers: [],
        compassFallback,
        metadata: {
            nodesExplored: 0,
            computationTimeMs,
            gridResolutionKm: request.gridResolutionKm ?? 5,
            horizonHours: request.horizonHours ?? 24,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }
    };
}

/**
 * Generate map layers for visualization
 */
function generateMapLayers(
    nodes: Map<string, SpacetimeNode>,
    edges: Map<string, SpacetimeEdge[]>,
    path: string[],
    context: SearchContext
): MapLayer[] {
    const layers: MapLayer[] = [];
    
    // Trajectory layer
    const trajectoryCoords = path.map(id => {
        const node = nodes.get(id)!;
        return [node.location.lng, node.location.lat] as [number, number];
    });
    
    layers.push({
        id: 'trajectory',
        name: 'Route Trajectory',
        type: 'trajectory',
        visible: true,
        opacity: 0.8,
        data: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: trajectoryCoords
                },
                properties: { name: 'Calculated Route' }
            }]
        },
        metadata: { pathLength: path.length }
    });
    
    // Hazard zones layer
    const hazardFeatures: GeoJSONFeature[] = [];
    for (const node of nodes.values()) {
        for (const ref of node.ontologyRefs) {
            if (ref.startsWith('hazard-')) {
                hazardFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [node.location.lng, node.location.lat]
                    },
                    properties: { hazardType: ref, time: node.time }
                });
            }
        }
    }
    
    if (hazardFeatures.length > 0) {
        layers.push({
            id: 'hazard-zones',
            name: 'Hazard Zones',
            type: 'hazard-zone',
            visible: true,
            opacity: 0.7,
            data: { type: 'FeatureCollection', features: hazardFeatures } as GeoJSONFeatureCollection,
            colorScale: {
                type: 'categorical',
                domain: [0, 1, 2, 3, 4],
                range: ['#green', '#yellow', '#orange', '#red', '#darkred']
            },
            metadata: {}
        });
    }
    
    // Resource caches layer
    const resourceFeatures: GeoJSONFeature[] = [];
    for (const node of nodes.values()) {
        for (const ref of node.ontologyRefs) {
            if (ref.startsWith('resource-')) {
                resourceFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [node.location.lng, node.location.lat]
                    },
                    properties: { resourceType: ref, time: node.time }
                });
            }
        }
    }
    
    if (resourceFeatures.length > 0) {
        layers.push({
            id: 'resource-caches',
            name: 'Resource Caches',
            type: 'resource-cache',
            visible: true,
            opacity: 0.8,
            data: { type: 'FeatureCollection', features: resourceFeatures } as GeoJSONFeatureCollection,
            metadata: {}
        });
    }
    
    // Shelter sites layer
    const shelterFeatures: GeoJSONFeature[] = [];
    for (const node of nodes.values()) {
        for (const ref of node.ontologyRefs) {
            if (ref.startsWith('shelter-')) {
                shelterFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [node.location.lng, node.location.lat]
                    },
                    properties: { shelterType: ref, time: node.time }
                });
            }
        }
    }
    
    if (shelterFeatures.length > 0) {
        layers.push({
            id: 'shelter-sites',
            name: 'Shelter Sites',
            type: 'shelter-site',
            visible: true,
            opacity: 0.8,
            data: { type: 'FeatureCollection', features: shelterFeatures } as GeoJSONFeatureCollection,
            metadata: {}
        });
    }
    
    // Deficit gradient (resource scarcity)
    const deficitFeatures: GeoJSONFeature[] = [];
    for (const need of context.needs) {
        if (need.urgency === 'critical' || need.urgency === 'urgent') {
            deficitFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0] // Placeholder - would be calculated from resource distribution
                },
                properties: { need: need.item, urgency: need.urgency }
            });
        }
    }
    
    if (deficitFeatures.length > 0) {
        layers.push({
            id: 'deficit-gradient',
            name: 'Resource Deficit Gradient',
            type: 'deficit-gradient',
            visible: true,
            opacity: 0.5,
            data: { type: 'FeatureCollection', features: deficitFeatures } as GeoJSONFeatureCollection,
            colorScale: {
                type: 'sequential',
                domain: [0, 1, 2, 3, 4],
                range: ['#blue', '#cyan', '#yellow', '#orange', '#red']
            },
            metadata: {}
        });
    }
    
    // Lethal exclusion zones
    const lethalFeatures: GeoJSONFeature[] = [];
    for (const node of nodes.values()) {
        for (const ref of node.ontologyRefs) {
            if (ref.includes('lethal')) {
                lethalFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [node.location.lng, node.location.lat]
                    },
                    properties: { hazardType: ref }
                });
            }
        }
    }
    
    if (lethalFeatures.length > 0) {
        layers.push({
            id: 'lethal-exclusion',
            name: 'Lethal Exclusion Zones',
            type: 'lethal-exclusion',
            visible: true,
            opacity: 0.9,
            data: { type: 'FeatureCollection', features: lethalFeatures } as GeoJSONFeatureCollection,
            colorScale: {
                type: 'categorical',
                domain: [1],
                range: ['#darkred']
            },
            metadata: {}
        });
    }
    
    return layers;
}