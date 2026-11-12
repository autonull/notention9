import { describe, it, expect } from 'vitest';
import {
    DEFAULT_VEHICLES,
    SEVERITY_ORDER,
    RISK_ORDER,
    compareSeverity,
    compareRisk,
    calculateEnergyCost,
    calculateHazardPenalty,
    calculateResourceBonus,
    type VehicleProfile,
    type HazardExposure,
    type ManifestTolerance,
    type ResourceAmount,
    type ManifestNeed
} from './survivalRouting.js';

describe('survivalRouting types and utilities', () => {
    describe('DEFAULT_VEHICLES', () => {
        it('should have all standard vehicle types', () => {
            expect(DEFAULT_VEHICLES.foot).toBeDefined();
            expect(DEFAULT_VEHICLES.bicycle).toBeDefined();
            expect(DEFAULT_VEHICLES.motorcycle).toBeDefined();
            expect(DEFAULT_VEHICLES.car).toBeDefined();
            expect(DEFAULT_VEHICLES.truck).toBeDefined();
        });

        it('should have correct foot profile', () => {
            const foot = DEFAULT_VEHICLES.foot;
            expect(foot.type).toBe('foot');
            expect(foot.speedKph).toBe(5);
            expect(foot.fuelType).toBe('human');
            expect(foot.offRoad).toBe(true);
        });

        it('should have correct car profile', () => {
            const car = DEFAULT_VEHICLES.car;
            expect(car.type).toBe('car');
            expect(car.speedKph).toBe(80);
            expect(car.fuelType).toBe('gasoline');
            expect(car.offRoad).toBe(false);
            expect(car.capacity).toBe(5);
        });
    });

    describe('SEVERITY_ORDER', () => {
        it('should order severity correctly', () => {
            expect(SEVERITY_ORDER.negligible).toBe(0);
            expect(SEVERITY_ORDER.low).toBe(1);
            expect(SEVERITY_ORDER.moderate).toBe(2);
            expect(SEVERITY_ORDER.severe).toBe(3);
            expect(SEVERITY_ORDER.lethal).toBe(4);
        });
    });

    describe('RISK_ORDER', () => {
        it('should order risk correctly', () => {
            expect(RISK_ORDER.none).toBe(0);
            expect(RISK_ORDER.low).toBe(1);
            expect(RISK_ORDER.moderate).toBe(2);
            expect(RISK_ORDER.high).toBe(3);
            expect(RISK_ORDER.extreme).toBe(4);
            expect(RISK_ORDER.lethal).toBe(5);
        });
    });

    describe('compareSeverity', () => {
        it('should return negative when a < b', () => {
            expect(compareSeverity('low', 'moderate')).toBeLessThan(0);
        });

        it('should return positive when a > b', () => {
            expect(compareSeverity('severe', 'moderate')).toBeGreaterThan(0);
        });

        it('should return zero when equal', () => {
            expect(compareSeverity('moderate', 'moderate')).toBe(0);
        });

        it('should handle unknown severity', () => {
            expect(compareSeverity('unknown', 'moderate')).toBeLessThan(0);
        });
    });

    describe('compareRisk', () => {
        it('should return negative when a < b', () => {
            expect(compareRisk('low', 'moderate')).toBeLessThan(0);
        });

        it('should return positive when a > b', () => {
            expect(compareRisk('high', 'moderate')).toBeGreaterThan(0);
        });

        it('should return zero when equal', () => {
            expect(compareRisk('moderate', 'moderate')).toBe(0);
        });
    });

    describe('calculateEnergyCost', () => {
        it('should calculate base energy cost for foot', () => {
            const cost = calculateEnergyCost(10, DEFAULT_VEHICLES.foot, 'road');
            expect(cost).toBeCloseTo(10 * 0.05, 2);
        });

        it('should apply offroad multiplier for non-offroad vehicle', () => {
            const cost = calculateEnergyCost(10, DEFAULT_VEHICLES.car, 'offroad');
            expect(cost).toBeCloseTo(10 * 0.08 * 3, 2);
        });

        it('should apply reduced offroad multiplier for offroad vehicle', () => {
            const cost = calculateEnergyCost(10, DEFAULT_VEHICLES.truck, 'offroad');
            expect(cost).toBeCloseTo(10 * 0.15 * 1.5, 2);
        });

        it('should apply mixed terrain multiplier', () => {
            const cost = calculateEnergyCost(10, DEFAULT_VEHICLES.car, 'mixed');
            expect(cost).toBeCloseTo(10 * 0.08 * 1.2, 2);
        });
    });

    describe('calculateHazardPenalty', () => {
        it('should return base penalty for exposure', () => {
            const exposure: HazardExposure = {
                hazardType: 'radiation',
                severity: 'moderate',
                durationMinutes: 60,
                protectionAvailable: false,
                protectionEffectiveness: 0
            };
            
            const penalty = calculateHazardPenalty(exposure, null, 0);
            // severity 2 * 100 * 60/60 = 200
            expect(penalty).toBe(200);
        });

        it('should scale with duration', () => {
            const exposure: HazardExposure = {
                hazardType: 'radiation',
                severity: 'moderate',
                durationMinutes: 120,
                protectionAvailable: false,
                protectionEffectiveness: 0
            };
            
            const penalty = calculateHazardPenalty(exposure, null, 0);
            expect(penalty).toBe(400); // 2 * 100 * 2
        });

        it('should reduce penalty with protection', () => {
            const exposure: HazardExposure = {
                hazardType: 'radiation',
                severity: 'moderate',
                durationMinutes: 60,
                protectionAvailable: true,
                protectionEffectiveness: 0.5
            };
            
            const penalty = calculateHazardPenalty(exposure, null, 0.5);
            // 200 * (1 - 0.5 * 0.8) = 200 * 0.6 = 120
            expect(penalty).toBeCloseTo(120, 1);
        });

        it('should return Infinity when tolerance breached', () => {
            const exposure: HazardExposure = {
                hazardType: 'heat',
                severity: 'lethal',
                durationMinutes: 60,
                protectionAvailable: false,
                protectionEffectiveness: 0
            };
            
            const tolerance: ManifestTolerance = {
                factor: 'heat',
                maxLevel: 35,
                unit: 'celsius',
                consequence: 'Heat stroke',
                ontologyKey: 'tolerance'
            };
            
            const penalty = calculateHazardPenalty(exposure, tolerance, 0);
            expect(penalty).toBe(Infinity);
        });

        it('should not return Infinity when tolerance not breached', () => {
            const exposure: HazardExposure = {
                hazardType: 'heat',
                severity: 'moderate',
                durationMinutes: 60,
                protectionAvailable: false,
                protectionEffectiveness: 0
            };
            
            const tolerance: ManifestTolerance = {
                factor: 'heat',
                maxLevel: 35,
                unit: 'celsius',
                consequence: 'Heat stroke',
                ontologyKey: 'tolerance'
            };
            
            const penalty = calculateHazardPenalty(exposure, tolerance, 0);
            expect(penalty).toBeLessThan(Infinity);
        });
    });

    describe('calculateResourceBonus', () => {
        it('should return zero for no matching needs', () => {
            const resources: ResourceAmount[] = [
                { type: 'water', item: 'Water', amount: 10, unit: 'liters', quality: 1 }
            ];
            const needs: ManifestNeed[] = [
                { category: 'food', item: 'Food', quantity: 5, unit: 'kg', period: 'day', urgency: 'critical', ontologyKey: 'need' }
            ];
            
            const bonus = calculateResourceBonus(resources, needs);
            expect(bonus).toBe(0);
        });

        it('should calculate bonus for matching category', () => {
            const resources: ResourceAmount[] = [
                { type: 'water', item: 'Water', amount: 10, unit: 'liters', quality: 1 }
            ];
            const needs: ManifestNeed[] = [
                { category: 'water', item: 'Water', quantity: 5, unit: 'liters', period: 'day', urgency: 'critical', ontologyKey: 'need' }
            ];
            
            const bonus = calculateResourceBonus(resources, needs);
            // 10 * 1 * 4 * 10 = 400
            expect(bonus).toBe(400);
        });

        it('should calculate bonus for matching item', () => {
            const resources: ResourceAmount[] = [
                { type: 'medical', item: 'Insulin', amount: 5, unit: 'vials', quality: 1 }
            ];
            const needs: ManifestNeed[] = [
                { category: 'medication', item: 'Insulin', quantity: 2, unit: 'vials', period: 'day', urgency: 'critical', ontologyKey: 'need' }
            ];
            
            const bonus = calculateResourceBonus(resources, needs);
            expect(bonus).toBeGreaterThan(0);
        });

        it('should weight by urgency', () => {
            const resources: ResourceAmount[] = [
                { type: 'water', item: 'Water', amount: 10, unit: 'liters', quality: 1 }
            ];
            
            const needsCritical: ManifestNeed[] = [
                { category: 'water', item: 'Water', quantity: 5, unit: 'liters', period: 'day', urgency: 'critical', ontologyKey: 'need' }
            ];
            const needsLow: ManifestNeed[] = [
                { category: 'water', item: 'Water', quantity: 5, unit: 'liters', period: 'day', urgency: 'low', ontologyKey: 'need' }
            ];
            
            const bonusCritical = calculateResourceBonus(resources, needsCritical);
            const bonusLow = calculateResourceBonus(resources, needsLow);
            
            expect(bonusCritical).toBeGreaterThan(bonusLow);
        });

        it('should apply quality modifier', () => {
            const resourcesHigh: ResourceAmount[] = [
                { type: 'water', item: 'Water', amount: 10, unit: 'liters', quality: 1 }
            ];
            const resourcesLow: ResourceAmount[] = [
                { type: 'water', item: 'Water', amount: 10, unit: 'liters', quality: 0.5 }
            ];
            const needs: ManifestNeed[] = [
                { category: 'water', item: 'Water', quantity: 5, unit: 'liters', period: 'day', urgency: 'critical', ontologyKey: 'need' }
            ];
            
            const bonusHigh = calculateResourceBonus(resourcesHigh, needs);
            const bonusLow = calculateResourceBonus(resourcesLow, needs);
            
            expect(bonusHigh).toBe(bonusLow * 2);
        });
    });
});