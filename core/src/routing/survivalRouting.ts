import type { GeoCoords } from '../utils/geo.js';
import type { OntologyNode, OntologyAttribute } from '../types/index.js';

/** GeoJSON types for map layers */
export interface GeoJSONFeature {
    type: 'Feature';
    geometry: GeoJSONGeometry | null;
    properties: Record<string, unknown> | null;
    id?: string | number;
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

export interface GeoJSONGeometry {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection';
    coordinates: any;
    geometries?: GeoJSONGeometry[];
}

/** GeoCoords is re-exported from utils/geo */
export type { GeoCoords } from '../utils/geo.js';

/**
 * Survival Routing Types
 * 
 * Implements Time-Expanded Network A* for survival coordination.
 * Nodes represent locations at specific times (spacetime nodes).
 * Edges represent movement between locations over time.
 */

export interface SpacetimeNode {
    /** Unique identifier */
    id: string;
    /** Spatial coordinates */
    location: GeoCoords;
    /** Time in ISO 8601 or Unix timestamp */
    time: string;
    /** Node type for rendering */
    type: 'start' | 'end' | 'waypoint' | 'resource' | 'hazard' | 'shelter' | 'transit';
    /** Associated ontology node IDs (e.g., hazard-zone, resource-cache) */
    ontologyRefs: string[];
    /** Provides: resources available at this node */
    provides: ResourceAmount[];
    /** Imposes: costs/risks incurred at this node */
    imposes: CostFactor[];
    /** Metadata */
    metadata: Record<string, unknown>;
}

export interface ResourceAmount {
    /** Resource type (matches ontology resourceType) */
    type: string;
    /** Specific item name */
    item: string;
    /** Amount available */
    amount: number;
    /** Unit */
    unit: string;
    /** Quality/condition modifier (0-1) */
    quality: number;
}

export interface CostFactor {
    /** Cost type */
    type: 'energy' | 'hazard' | 'time' | 'risk' | 'opportunity';
    /** Base cost value */
    value: number;
    /** Whether this cost is a hard constraint (infinite if breached) */
    hardConstraint: boolean;
    /** Condition for breach */
    breachCondition?: string;
    /** Metadata */
    metadata: Record<string, unknown>;
}

export interface SpacetimeEdge {
    /** Unique identifier */
    id: string;
    /** From node ID */
    from: string;
    /** To node ID */
    to: string;
    /** Travel time in minutes */
    travelTime: number;
    /** Distance in km */
    distance: number;
    /** Energy cost (calories or fuel units) */
    energyCost: number;
    /** Required vehicle/capability */
    requiredCapability?: string;
    /** Hazard exposure along edge */
    hazardExposure: HazardExposure[];
    /** Metadata */
    metadata: Record<string, unknown>;
}

export interface HazardExposure {
    hazardType: string;
    severity: 'lethal' | 'severe' | 'moderate' | 'low' | 'negligible';
    durationMinutes: number;
    protectionAvailable: boolean;
    protectionEffectiveness: number; // 0-1
}

export interface RoutingRequest {
    /** Start location */
    start: GeoCoords;
    /** Start time (ISO 8601) */
    startTime: string;
    /** Goal location */
    goal: GeoCoords;
    /** Latest arrival time (ISO 8601) */
    deadline?: string;
    /** Manifest for biological constraints */
    manifest?: BiologicalManifestRef;
    /** Vehicle/mode of transport */
    vehicle?: VehicleProfile;
    /** Maximum risk tolerance */
    maxRisk?: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
    /** Optimization objective */
    objective?: 'fastest' | 'safest' | 'energy-efficient' | 'resource-rich' | 'balanced';
    /** Search horizon in hours */
    horizonHours?: number;
    /** Grid resolution in km */
    gridResolutionKm?: number;
}

export interface BiologicalManifestRef {
    /** Profile or group ID */
    id: string;
    /** Aggregate needs */
    needs: ManifestNeed[];
    /** Aggregate tolerances */
    tolerances: ManifestTolerance[];
}

export interface ManifestNeed {
    category: string;
    item: string;
    quantity: number;
    unit: string;
    period: string;
    urgency: 'critical' | 'urgent' | 'normal' | 'low';
    ontologyKey: string;
}

export interface ManifestTolerance {
    factor: string;
    maxLevel: number;
    unit: string;
    consequence: string;
    ontologyKey: string;
}

export interface VehicleProfile {
    type: string;
    speedKph: number;
    rangeKm: number;
    fuelType: string;
    fuelCapacity: number;
    fuelConsumptionPerKm: number;
    offRoad: boolean;
    capacity: number;
    cargoCapacityKg: number;
}

export interface RoutingResult {
    /** Whether a path was found */
    success: boolean;
    /** Path as sequence of node IDs */
    path: string[];
    /** Total travel time in minutes */
    totalTime: number;
    /** Total distance in km */
    totalDistance: number;
    /** Total energy cost */
    totalEnergy: number;
    /** Risk assessment */
    risk: RiskAssessment;
    /** Resource acquisition along path */
    resourcesAcquired: ResourceAmount[];
    /** Timeline of events */
    timeline: TimelineEvent[];
    /** Map layers for visualization */
    mapLayers: MapLayer[];
    /** Compass fallback if path not found */
    compassFallback?: CompassFallback;
    /** Metadata */
    metadata: RoutingMetadata;
}

export interface RiskAssessment {
    overall: 'none' | 'low' | 'moderate' | 'high' | 'extreme' | 'lethal';
    maxHazardSeverity: 'lethal' | 'severe' | 'moderate' | 'low' | 'negligible';
    hazardExposures: HazardExposure[];
    toleranceBreaches: ToleranceBreach[];
}

export interface ToleranceBreach {
    factor: string;
    currentLevel: number;
    maxLevel: number;
    unit: string;
    consequence: string;
    timeOfBreach: string;
}

export interface TimelineEvent {
    time: string;
    nodeId: string;
    eventType: 'depart' | 'arrive' | 'acquire' | 'expose' | 'rest' | 'breach';
    description: string;
    data: Record<string, unknown>;
}

export interface MapLayer {
    id: string;
    name: string;
    type: 'deficit-gradient' | 'lethal-exclusion' | 'cache-surplus' | 'trajectory' | 'hazard-zone' | 'resource-cache' | 'shelter-site' | 'compass-bearing';
    visible: boolean;
    opacity: number;
    data: GeoJSONFeatureCollection | GeoJSONFeature;
    timeExtent?: { start: string; end: string };
    colorScale?: ColorScale;
    metadata: Record<string, unknown>;
}

export interface ColorScale {
    type: 'sequential' | 'diverging' | 'categorical';
    domain: number[];
    range: string[];
}

export interface CompassFallback {
    bearing: number; // degrees from north
    distanceKm: number;
    estimatedTimeMinutes: number;
    lastKnownGood: GeoCoords;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
}

export interface RoutingMetadata {
    nodesExplored: number;
    computationTimeMs: number;
    gridResolutionKm: number;
    horizonHours: number;
    timestamp: string;
    version: string;
}

/**
 * Default vehicle profiles
 */
export const DEFAULT_VEHICLES: Record<string, VehicleProfile> = {
    foot: {
        type: 'foot',
        speedKph: 5,
        rangeKm: 100,
        fuelType: 'human',
        fuelCapacity: 1,
        fuelConsumptionPerKm: 0.05,
        offRoad: true,
        capacity: 1,
        cargoCapacityKg: 15
    },
    bicycle: {
        type: 'bicycle',
        speedKph: 15,
        rangeKm: 80,
        fuelType: 'human',
        fuelCapacity: 1,
        fuelConsumptionPerKm: 0.02,
        offRoad: false,
        capacity: 1,
        cargoCapacityKg: 25
    },
    motorcycle: {
        type: 'motorcycle',
        speedKph: 60,
        rangeKm: 300,
        fuelType: 'gasoline',
        fuelCapacity: 15,
        fuelConsumptionPerKm: 0.05,
        offRoad: true,
        capacity: 2,
        cargoCapacityKg: 50
    },
    car: {
        type: 'car',
        speedKph: 80,
        rangeKm: 500,
        fuelType: 'gasoline',
        fuelCapacity: 50,
        fuelConsumptionPerKm: 0.08,
        offRoad: false,
        capacity: 5,
        cargoCapacityKg: 300
    },
    truck: {
        type: 'truck',
        speedKph: 70,
        rangeKm: 800,
        fuelType: 'diesel',
        fuelCapacity: 100,
        fuelConsumptionPerKm: 0.15,
        offRoad: true,
        capacity: 3,
        cargoCapacityKg: 2000
    }
};

/**
 * Severity ordering for comparison
 */
export const SEVERITY_ORDER: Record<string, number> = {
    'negligible': 0,
    'low': 1,
    'moderate': 2,
    'severe': 3,
    'lethal': 4
};

export const RISK_ORDER: Record<string, number> = {
    'none': 0,
    'low': 1,
    'moderate': 2,
    'high': 3,
    'extreme': 4,
    'lethal': 5
};

/**
 * Compare severity levels
 */
export const compareSeverity = (a: string, b: string): number => {
    return (SEVERITY_ORDER[a] ?? 0) - (SEVERITY_ORDER[b] ?? 0);
};

/**
 * Compare risk levels
 */
export const compareRisk = (a: string, b: string): number => {
    return (RISK_ORDER[a] ?? 0) - (RISK_ORDER[b] ?? 0);
};

/**
 * Calculate movement energy cost
 */
export const calculateEnergyCost = (
    distanceKm: number,
    vehicle: VehicleProfile,
    terrain: 'road' | 'offroad' | 'mixed' = 'road'
): number => {
    let multiplier = 1;
    if (terrain === 'offroad' && !vehicle.offRoad) multiplier = 3;
    else if (terrain === 'offroad') multiplier = 1.5;
    else if (terrain === 'mixed') multiplier = 1.2;
    
    return distanceKm * vehicle.fuelConsumptionPerKm * multiplier;
};

/**
 * Calculate hazard penalty cost
 */
export const calculateHazardPenalty = (
    exposure: HazardExposure,
    tolerance: ManifestTolerance | null,
    protectionEffectiveness: number
): number => {
    const severityWeight = SEVERITY_ORDER[exposure.severity] ?? 2;
    const basePenalty = severityWeight * 100 * exposure.durationMinutes / 60;
    
    // If tolerance exists and would be breached, apply infinite penalty
    if (tolerance && exposure.hazardType === tolerance.factor) {
        const effectiveLevel = exposure.severity === 'lethal' ? tolerance.maxLevel + 1 : 
                               exposure.severity === 'severe' ? tolerance.maxLevel * 0.8 :
                               tolerance.maxLevel * 0.5;
        
        if (effectiveLevel > tolerance.maxLevel) {
            return Infinity;
        }
    }
    
    // Reduce by protection
    return basePenalty * (1 - protectionEffectiveness * 0.8);
};

/**
 * Calculate resource bonus (negative cost)
 */
export const calculateResourceBonus = (
    resources: ResourceAmount[],
    needs: ManifestNeed[]
): number => {
    let bonus = 0;
    
    for (const resource of resources) {
        for (const need of needs) {
            if (resource.type === need.category || resource.type === need.item || resource.item === need.item) {
                const urgencyWeight = need.urgency === 'critical' ? 4 : 
                                      need.urgency === 'urgent' ? 3 :
                                      need.urgency === 'normal' ? 2 : 1;
                bonus += resource.amount * resource.quality * urgencyWeight * 10;
            }
        }
    }
    
    return bonus;
};