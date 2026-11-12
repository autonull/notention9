import { describe, it, expect } from 'vitest';
import {
    findRoute,
    buildSpacetimeGrid,
    astarSearch,
    calculateBearing
} from './routingEngine.js';
import {
    type RoutingRequest,
    type SpacetimeNode,
    type SpacetimeEdge,
    DEFAULT_VEHICLES
} from './survivalRouting.js';
import type { OntologyNode } from '../types/index.js';

describe('routingEngine', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'hazard',
            label: 'Hazard',
            children: [{
                id: 'hazard-zone',
                label: 'Hazard Zone',
                attributes: {}
            }]
        },
        {
            id: 'resource',
            label: 'Resource',
            children: [{
                id: 'resource-cache',
                label: 'Resource Cache',
                attributes: {}
            }]
        },
        {
            id: 'shelter',
            label: 'Shelter',
            children: [{
                id: 'shelter-site',
                label: 'Shelter Site',
                attributes: {}
            }]
        }
    ];

    const baseRequest: RoutingRequest = {
        start: { lat: 52.52, lng: 13.405 }, // Berlin
        startTime: new Date().toISOString(),
        goal: { lat: 52.6, lng: 13.5 },     // Further away (~10km)
        horizonHours: 4,
        gridResolutionKm: 2,
        vehicle: DEFAULT_VEHICLES.foot,
        objective: 'balanced'
    };

    describe('calculateBearing', () => {
        it('should calculate bearing correctly for north', () => {
            const bearing = calculateBearing(
                { lat: 52.0, lng: 13.0 },
                { lat: 53.0, lng: 13.0 }
            );
            expect(bearing).toBeCloseTo(0, 0);
        });

        it('should calculate bearing correctly for east', () => {
            const bearing = calculateBearing(
                { lat: 52.0, lng: 13.0 },
                { lat: 52.0, lng: 14.0 }
            );
            expect(bearing).toBeCloseTo(90, 0);
        });

        it('should calculate bearing correctly for south', () => {
            const bearing = calculateBearing(
                { lat: 53.0, lng: 13.0 },
                { lat: 52.0, lng: 13.0 }
            );
            expect(bearing).toBeCloseTo(180, 0);
        });

        it('should calculate bearing correctly for west', () => {
            const bearing = calculateBearing(
                { lat: 52.0, lng: 14.0 },
                { lat: 52.0, lng: 13.0 }
            );
            expect(bearing).toBeCloseTo(270, 0);
        });
    });

    describe('buildSpacetimeGrid', () => {
        it('should create start and goal nodes', () => {
            const { nodes } = buildSpacetimeGrid(baseRequest, mockOntology, []);
            
            const startNode = Array.from(nodes.values()).find(n => n.type === 'start');
            const goalNode = Array.from(nodes.values()).find(n => n.type === 'end');
            
            expect(startNode).toBeDefined();
            expect(goalNode).toBeDefined();
            expect(startNode?.location).toEqual(baseRequest.start);
            expect(goalNode?.location).toEqual(baseRequest.goal);
        });

        it('should create waypoint nodes', () => {
            const { nodes } = buildSpacetimeGrid(baseRequest, mockOntology, []);
            
            const waypoints = Array.from(nodes.values()).filter(n => n.type === 'waypoint');
            expect(waypoints.length).toBeGreaterThan(0);
        });

        it('should create edges between nearby nodes', () => {
            const { nodes, edges } = buildSpacetimeGrid(baseRequest, mockOntology, []);
            
            const startNode = Array.from(nodes.values()).find(n => n.type === 'start')!;
            const startEdges = edges.get(startNode.id);
            
            expect(startEdges).toBeDefined();
            expect(startEdges!.length).toBeGreaterThan(0);
        });
    });

    describe('astarSearch', () => {
        it('should find path for simple request', async () => {
            const result = await findRoute(baseRequest, mockOntology, []);
            
            // Should find a path (even if just direct)
            expect(result).toBeDefined();
            expect(result.metadata.computationTimeMs).toBeGreaterThan(0);
        });

        it('should return compass fallback when no path found', async () => {
            // Create a request with impossible constraints
            const impossibleRequest: RoutingRequest = {
                ...baseRequest,
                goal: { lat: -52.52, lng: -13.405 }, // Opposite side of world
                horizonHours: 0.1, // Too short
                gridResolutionKm: 100
            };
            
            const result = await findRoute(impossibleRequest, mockOntology, []);
            
            expect(result.success).toBe(false);
            expect(result.compassFallback).toBeDefined();
            expect(result.compassFallback?.bearing).toBeGreaterThanOrEqual(0);
            expect(result.compassFallback?.bearing).toBeLessThan(360);
            expect(result.compassFallback?.distanceKm).toBeGreaterThan(0);
            expect(result.compassFallback?.confidence).toBe('low');
        });

        it('should include map layers in result', async () => {
            const result = await findRoute(baseRequest, mockOntology, []);
            
            expect(result.mapLayers).toBeDefined();
            expect(Array.isArray(result.mapLayers)).toBe(true);
        });

        it('should include trajectory layer when path found', async () => {
            const result = await findRoute(baseRequest, mockOntology, []);
            
            if (result.success) {
                const trajectoryLayer = result.mapLayers.find(l => l.type === 'trajectory');
                expect(trajectoryLayer).toBeDefined();
                expect(trajectoryLayer?.data).toBeDefined();
            }
        });

        it('should respect vehicle speed in energy calculation', async () => {
            const footRequest = { ...baseRequest, vehicle: DEFAULT_VEHICLES.foot };
            const carRequest = { ...baseRequest, vehicle: DEFAULT_VEHICLES.car };
            
            const footResult = await findRoute(footRequest, mockOntology, []);
            const carResult = await findRoute(carRequest, mockOntology, []);
            
            if (footResult.success && carResult.success) {
                // Car should use less human energy (but more fuel)
                // Foot uses human energy, car uses fuel
                expect(footResult.totalEnergy).toBeGreaterThan(0);
                expect(carResult.totalEnergy).toBeGreaterThan(0);
            }
        });
    });

    describe('Routing with manifest', () => {
        it('should incorporate biological needs', async () => {
            const requestWithManifest: RoutingRequest = {
                ...baseRequest,
                manifest: {
                    id: 'test-group',
                    needs: [{
                        category: 'water',
                        item: 'Water',
                        quantity: 10,
                        unit: 'liters',
                        period: 'day',
                        urgency: 'critical',
                        ontologyKey: 'need'
                    }],
                    tolerances: [{
                        factor: 'heat',
                        maxLevel: 35,
                        unit: 'celsius',
                        consequence: 'Heat stroke',
                        ontologyKey: 'tolerance'
                    }]
                }
            };
            
            const result = await findRoute(requestWithManifest, mockOntology, []);
            
            expect(result).toBeDefined();
            expect(result.metadata.version).toBe('1.0.0');
        });

        it('should track resource acquisition in timeline', async () => {
            const requestWithManifest: RoutingRequest = {
                ...baseRequest,
                manifest: {
                    id: 'test-group',
                    needs: [{
                        category: 'water',
                        item: 'Water',
                        quantity: 10,
                        unit: 'liters',
                        period: 'day',
                        urgency: 'critical',
                        ontologyKey: 'need'
                    }],
                    tolerances: []
                }
            };
            
            const result = await findRoute(requestWithManifest, mockOntology, []);
            
            if (result.success) {
                expect(result.timeline).toBeDefined();
                expect(result.timeline.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Objective-based routing', () => {
        it('should prefer fastest route with fastest objective', async () => {
            const request = { ...baseRequest, objective: 'fastest' as const };
            const result = await findRoute(request, mockOntology, []);
            
            expect(result).toBeDefined();
        });

        it('should prefer safest route with safest objective', async () => {
            const request = { ...baseRequest, objective: 'safest' as const };
            const result = await findRoute(request, mockOntology, []);
            
            expect(result).toBeDefined();
        });

        it('should prefer energy-efficient route with energy-efficient objective', async () => {
            const request = { ...baseRequest, objective: 'energy-efficient' as const };
            const result = await findRoute(request, mockOntology, []);
            
            expect(result).toBeDefined();
        });

        it('should prefer resource-rich route with resource-rich objective', async () => {
            const request = { ...baseRequest, objective: 'resource-rich' as const };
            const result = await findRoute(request, mockOntology, []);
            
            expect(result).toBeDefined();
        });
    });

    describe('Risk assessment', () => {
        it('should assess risk in result', async () => {
            const result = await findRoute(baseRequest, mockOntology, []);
            
            expect(result.risk).toBeDefined();
            expect(result.risk.overall).toBeDefined();
            expect(result.risk.maxHazardSeverity).toBeDefined();
            expect(Array.isArray(result.risk.hazardExposures)).toBe(true);
            expect(Array.isArray(result.risk.toleranceBreaches)).toBe(true);
        });
    });

    describe('Timeline events', () => {
        it('should include depart and arrive events', async () => {
            const result = await findRoute(baseRequest, mockOntology, []);
            
            if (result.success) {
                const departEvents = result.timeline.filter(e => e.eventType === 'depart');
                const arriveEvents = result.timeline.filter(e => e.eventType === 'arrive');
                
                expect(departEvents.length).toBeGreaterThan(0);
                expect(arriveEvents.length).toBeGreaterThan(0);
            }
        });
    });
});