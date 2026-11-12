import { describe, it, expect } from 'vitest';
import { DEFAULT_ONTOLOGY } from './domains.js';
import { survivalDomains } from './survivalDomains.js';

describe('DEFAULT_ONTOLOGY includes survival domains', () => {
    it('should contain all six survival domain root nodes', () => {
        const rootIds = DEFAULT_ONTOLOGY.map(d => d.id);
        expect(rootIds).toContain('hazard');
        expect(rootIds).toContain('resource');
        expect(rootIds).toContain('shelter');
        expect(rootIds).toContain('medical');
        expect(rootIds).toContain('transport');
        expect(rootIds).toContain('comms');
    });

    it('should have hazard domain with correct structure', () => {
        const hazard = DEFAULT_ONTOLOGY.find(d => d.id === 'hazard');
        expect(hazard).toBeDefined();
        expect(hazard?.label).toBe('Hazard');
        expect(hazard?.children?.length).toBeGreaterThan(0);
        const zone = hazard?.children?.find(c => c.id === 'hazard-zone');
        expect(zone).toBeDefined();
        expect(zone?.attributes?.hazardType).toBeDefined();
        expect(zone?.attributes?.severity).toBeDefined();
    });

    it('should have resource domain with correct structure', () => {
        const resource = DEFAULT_ONTOLOGY.find(d => d.id === 'resource');
        expect(resource).toBeDefined();
        expect(resource?.label).toBe('Resource');
        const cache = resource?.children?.find(c => c.id === 'resource-cache');
        expect(cache).toBeDefined();
        expect(cache?.attributes?.resourceType).toBeDefined();
        expect(cache?.attributes?.quantity).toBeDefined();
    });

    it('should have shelter domain with correct structure', () => {
        const shelter = DEFAULT_ONTOLOGY.find(d => d.id === 'shelter');
        expect(shelter).toBeDefined();
        expect(shelter?.label).toBe('Shelter');
        const site = shelter?.children?.find(c => c.id === 'shelter-site');
        expect(site).toBeDefined();
        expect(site?.attributes?.shelterType).toBeDefined();
        expect(site?.attributes?.protectionLevel).toBeDefined();
    });

    it('should have medical domain with correct structure', () => {
        const medical = DEFAULT_ONTOLOGY.find(d => d.id === 'medical');
        expect(medical).toBeDefined();
        expect(medical?.label).toBe('Medical');
        const condition = medical?.children?.find(c => c.id === 'medical-condition');
        expect(condition).toBeDefined();
        expect(condition?.attributes?.conditionType).toBeDefined();
        expect(condition?.attributes?.severity).toBeDefined();
    });

    it('should have transport domain with correct structure', () => {
        const transport = DEFAULT_ONTOLOGY.find(d => d.id === 'transport');
        expect(transport).toBeDefined();
        expect(transport?.label).toBe('Transport');
        const vehicle = transport?.children?.find(c => c.id === 'vehicle');
        expect(vehicle).toBeDefined();
        expect(vehicle?.attributes?.vehicleType).toBeDefined();
        expect(vehicle?.attributes?.capacity).toBeDefined();
    });

    it('should have comms domain with correct structure', () => {
        const comms = DEFAULT_ONTOLOGY.find(d => d.id === 'comms');
        expect(comms).toBeDefined();
        expect(comms?.label).toBe('Communications');
        const device = comms?.children?.find(c => c.id === 'comms-device');
        expect(device).toBeDefined();
        expect(device?.attributes?.deviceType).toBeDefined();
        expect(device?.attributes?.range).toBeDefined();
    });

    it('should have ontology attributes with proper operators', () => {
        const hazard = DEFAULT_ONTOLOGY.find(d => d.id === 'hazard');
        const zone = hazard?.children?.find(c => c.id === 'hazard-zone');
        const hazardType = zone?.attributes?.hazardType;
        expect(hazardType?.operators?.real).toContain('is');
        expect(hazardType?.operators?.imaginary).toContain('is not');
        expect(hazardType?.role).toBe('constraint');
    });

    it('should have numeric attributes with numericOptions', () => {
        const resource = DEFAULT_ONTOLOGY.find(d => d.id === 'resource');
        const cache = resource?.children?.find(c => c.id === 'resource-cache');
        const quantity = cache?.attributes?.quantity;
        expect(quantity?.numericOptions).toBeDefined();
        expect(quantity?.numericOptions?.unit).toBe('units');
    });

    it('should have enum attributes with options', () => {
        const medical = DEFAULT_ONTOLOGY.find(d => d.id === 'medical');
        const condition = medical?.children?.find(c => c.id === 'medical-condition');
        const conditionType = condition?.attributes?.conditionType;
        expect(conditionType?.options).toBeDefined();
        expect(conditionType?.options?.length).toBeGreaterThan(10);
        expect(conditionType?.options).toContain('diabetes');
        expect(conditionType?.options).toContain('cardiac');
    });

    it('should have geo attributes', () => {
        const shelter = DEFAULT_ONTOLOGY.find(d => d.id === 'shelter');
        const site = shelter?.children?.find(c => c.id === 'shelter-site');
        const location = site?.attributes?.location;
        expect(location?.type).toBe('geo');
    });

    it('survivalDomains export should match combined domains', () => {
        const survivalIds = survivalDomains.map(d => d.id);
        expect(survivalIds).toContain('hazard');
        expect(survivalIds).toContain('resource');
        expect(survivalIds).toContain('shelter');
        expect(survivalIds).toContain('medical');
        expect(survivalIds).toContain('transport');
        expect(survivalIds).toContain('comms');
    });
});