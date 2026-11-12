import { describe, it, expect } from 'vitest';
import {
    createBiologicalProfile,
    createGroupManifest,
    validateProfile,
    validateGroup,
    computeAggregateNeeds,
    computeAggregateTolerances,
    exportManifest,
    importManifest,
    generateManifestQR,
    DEFAULT_BIOLOGICAL_PROFILES,
    type BiologicalProfile,
    type GroupManifest,
    type BiologicalNeed,
    type BiologicalTolerance,
    type BiologicalModifier
} from './biologicalManifest.js';
import { survivalDomains, hazardDomain, resourceDomain, shelterDomain, medicalDomain, transportDomain, commsDomain } from './survivalDomains.js';

describe('survivalDomains', () => {
    it('should export all six survival domains', () => {
        expect(hazardDomain).toBeDefined();
        expect(resourceDomain).toBeDefined();
        expect(shelterDomain).toBeDefined();
        expect(medicalDomain).toBeDefined();
        expect(transportDomain).toBeDefined();
        expect(commsDomain).toBeDefined();
    });

    it('should have hazard domain with hazard-zone and hazard-exposure', () => {
        const hazardZone = hazardDomain[0].children?.find(c => c.id === 'hazard-zone');
        const hazardExposure = hazardDomain[0].children?.find(c => c.id === 'hazard-exposure');
        expect(hazardZone).toBeDefined();
        expect(hazardExposure).toBeDefined();
        expect(hazardZone?.attributes?.hazardType).toBeDefined();
        expect(hazardZone?.attributes?.severity).toBeDefined();
    });

    it('should have resource domain with resource-cache and resource-need', () => {
        const cache = resourceDomain[0].children?.find(c => c.id === 'resource-cache');
        const need = resourceDomain[0].children?.find(c => c.id === 'resource-need');
        expect(cache).toBeDefined();
        expect(need).toBeDefined();
    });

    it('should have shelter domain with shelter-site', () => {
        const site = shelterDomain[0].children?.find(c => c.id === 'shelter-site');
        expect(site).toBeDefined();
        expect(site?.attributes?.protectionLevel).toBeDefined();
    });

    it('should have medical domain with medical-condition and medical-capability', () => {
        const condition = medicalDomain[0].children?.find(c => c.id === 'medical-condition');
        const capability = medicalDomain[0].children?.find(c => c.id === 'medical-capability');
        expect(condition).toBeDefined();
        expect(capability).toBeDefined();
    });

    it('should have transport domain with vehicle and route', () => {
        const vehicle = transportDomain[0].children?.find(c => c.id === 'vehicle');
        const route = transportDomain[0].children?.find(c => c.id === 'route');
        expect(vehicle).toBeDefined();
        expect(route).toBeDefined();
    });

    it('should have comms domain with comms-device and comms-network', () => {
        const device = commsDomain[0].children?.find(c => c.id === 'comms-device');
        const network = commsDomain[0].children?.find(c => c.id === 'comms-network');
        expect(device).toBeDefined();
        expect(network).toBeDefined();
    });

    it('should combine all domains into survivalDomains', () => {
        expect(survivalDomains.length).toBeGreaterThan(0);
        const ids = survivalDomains.map(d => d.id);
        expect(ids).toContain('hazard');
        expect(ids).toContain('resource');
        expect(ids).toContain('shelter');
        expect(ids).toContain('medical');
        expect(ids).toContain('transport');
        expect(ids).toContain('comms');
    });
});

describe('BiologicalManifest', () => {
    describe('createBiologicalProfile', () => {
        it('should create a valid empty profile', () => {
            const profile = createBiologicalProfile();
            expect(profile.id).toBeDefined();
            expect(profile.name).toBe('New Profile');
            expect(profile.needs).toEqual([]);
            expect(profile.tolerances).toEqual([]);
            expect(profile.modifiers).toEqual([]);
            expect(profile.version).toBe(1);
            expect(profile.createdAt).toBeDefined();
            expect(profile.updatedAt).toBeDefined();
        });

        it('should allow overrides', () => {
            const profile = createBiologicalProfile({ name: 'Test Profile' });
            expect(profile.name).toBe('Test Profile');
        });
    });

    describe('createGroupManifest', () => {
        it('should create a valid empty group', () => {
            const group = createGroupManifest();
            expect(group.id).toBeDefined();
            expect(group.name).toBe('New Group');
            expect(group.members).toEqual([]);
            expect(group.aggregateNeeds).toEqual([]);
            expect(group.aggregateTolerances).toEqual([]);
            expect(group.groupModifiers).toEqual([]);
            expect(group.version).toBe(1);
        });
    });

    describe('validateProfile', () => {
        it('should validate a complete profile', () => {
            const profile: BiologicalProfile = {
                id: 'test-1',
                name: 'Test',
                needs: [{
                    id: 'need-1',
                    category: 'water',
                    item: 'Water',
                    quantity: 3,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }],
                tolerances: [{
                    id: 'tol-1',
                    factor: 'heat',
                    maxLevel: 35,
                    unit: 'celsius',
                    breached: false
                }],
                modifiers: [{
                    id: 'mod-1',
                    type: 'age',
                    description: 'Adult',
                    active: true
                }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1
            };
            const result = validateProfile(profile);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject profile missing id', () => {
            const profile = createBiologicalProfile({ id: '' });
            const result = validateProfile(profile);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Profile must have an id');
        });

        it('should reject profile missing name', () => {
            const profile = createBiologicalProfile({ name: '' });
            const result = validateProfile(profile);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Profile must have a name');
        });

        it('should reject need missing required fields', () => {
            const profile: BiologicalProfile = {
                ...createBiologicalProfile(),
                needs: [{
                    id: 'need-1',
                    category: 'water',
                    item: '',
                    quantity: 3,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }]
            };
            const result = validateProfile(profile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('item'))).toBe(true);
        });

        it('should reject tolerance missing required fields', () => {
            const profile: BiologicalProfile = {
                ...createBiologicalProfile(),
                tolerances: [{
                    id: 'tol-1',
                    factor: 'heat',
                    maxLevel: 35,
                    unit: '',
                    breached: false
                }]
            };
            const result = validateProfile(profile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('unit'))).toBe(true);
        });

        it('should reject modifier missing required fields', () => {
            const profile: BiologicalProfile = {
                ...createBiologicalProfile(),
                modifiers: [{
                    id: 'mod-1',
                    type: 'age',
                    description: '',
                    active: true
                }]
            };
            const result = validateProfile(profile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('description'))).toBe(true);
        });
    });

    describe('validateGroup', () => {
        it('should validate a group with valid members', () => {
            const profile = createBiologicalProfile({ name: 'Member 1' });
            const group: GroupManifest = {
                ...createGroupManifest(),
                members: [profile]
            };
            const result = validateGroup(group);
            expect(result.valid).toBe(true);
        });

        it('should reject group missing id', () => {
            const group = createGroupManifest({ id: '' });
            const result = validateGroup(group);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Group must have an id');
        });

        it('should propagate member validation errors', () => {
            const profile = createBiologicalProfile({ name: '' }); // invalid
            const group: GroupManifest = {
                ...createGroupManifest(),
                members: [profile]
            };
            const result = validateGroup(group);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Member 0'))).toBe(true);
        });
    });

    describe('computeAggregateNeeds', () => {
        it('should sum quantities for same need across members', () => {
            const profile1: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P1' }),
                needs: [{
                    id: 'need-1',
                    category: 'water',
                    item: 'Water',
                    quantity: 3,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }]
            };
            const profile2: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P2' }),
                needs: [{
                    id: 'need-2',
                    category: 'water',
                    item: 'Water',
                    quantity: 2,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'urgent',
                    met: false
                }]
            };
            const aggregate = computeAggregateNeeds([profile1, profile2]);
            expect(aggregate.length).toBe(1);
            expect(aggregate[0].quantity).toBe(5);
            expect(aggregate[0].urgency).toBe('critical'); // higher urgency wins
        });

        it('should keep separate needs for different items', () => {
            const profile1: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P1' }),
                needs: [{
                    id: 'need-1',
                    category: 'water',
                    item: 'Water',
                    quantity: 3,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }]
            };
            const profile2: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P2' }),
                needs: [{
                    id: 'need-2',
                    category: 'food',
                    item: 'Food',
                    quantity: 2000,
                    unit: 'kcal',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }]
            };
            const aggregate = computeAggregateNeeds([profile1, profile2]);
            expect(aggregate.length).toBe(2);
        });

        it('should return empty array for empty members', () => {
            const aggregate = computeAggregateNeeds([]);
            expect(aggregate).toEqual([]);
        });
    });

    describe('computeAggregateTolerances', () => {
        it('should take most restrictive (lowest maxLevel) tolerance', () => {
            const profile1: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P1' }),
                tolerances: [{
                    id: 'tol-1',
                    factor: 'heat',
                    maxLevel: 35,
                    unit: 'celsius',
                    breached: false
                }]
            };
            const profile2: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P2' }),
                tolerances: [{
                    id: 'tol-2',
                    factor: 'heat',
                    maxLevel: 30,
                    unit: 'celsius',
                    breached: false
                }]
            };
            const aggregate = computeAggregateTolerances([profile1, profile2]);
            expect(aggregate.length).toBe(1);
            expect(aggregate[0].maxLevel).toBe(30); // more restrictive
        });

        it('should keep separate tolerances for different factors', () => {
            const profile1: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P1' }),
                tolerances: [{
                    id: 'tol-1',
                    factor: 'heat',
                    maxLevel: 35,
                    unit: 'celsius',
                    breached: false
                }]
            };
            const profile2: BiologicalProfile = {
                ...createBiologicalProfile({ name: 'P2' }),
                tolerances: [{
                    id: 'tol-2',
                    factor: 'cold',
                    maxLevel: 5,
                    unit: 'celsius',
                    breached: false
                }]
            };
            const aggregate = computeAggregateTolerances([profile1, profile2]);
            expect(aggregate.length).toBe(2);
        });
    });

    describe('exportManifest', () => {
        it('should export profile as JSON', () => {
            const profile = createBiologicalProfile({ name: 'Test Profile' });
            const json = exportManifest(profile, 'profile');
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(1);
            expect(parsed.type).toBe('profile');
            expect(parsed.data.name).toBe('Test Profile');
            expect(parsed.exportedAt).toBeDefined();
        });

        it('should export group as JSON', () => {
            const group = createGroupManifest({ name: 'Test Group' });
            const json = exportManifest(group, 'group');
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(1);
            expect(parsed.type).toBe('group');
            expect(parsed.data.name).toBe('Test Group');
        });
    });

    describe('importManifest', () => {
        it('should import valid profile JSON', () => {
            const profile = createBiologicalProfile({ name: 'Test Profile' });
            const json = exportManifest(profile, 'profile');
            const imported = importManifest(json);
            expect(imported.type).toBe('profile');
            expect(imported.data.name).toBe('Test Profile');
        });

        it('should import valid group JSON', () => {
            const group = createGroupManifest({ name: 'Test Group' });
            const json = exportManifest(group, 'group');
            const imported = importManifest(json);
            expect(imported.type).toBe('group');
            expect(imported.data.name).toBe('Test Group');
        });

        it('should reject unsupported version', () => {
            const json = JSON.stringify({ version: 2, type: 'profile', data: {}, exportedAt: new Date().toISOString() });
            expect(() => importManifest(json)).toThrow('Unsupported manifest version');
        });

        it('should reject invalid type', () => {
            const json = JSON.stringify({ version: 1, type: 'invalid', data: {}, exportedAt: new Date().toISOString() });
            expect(() => importManifest(json)).toThrow('Invalid manifest type');
        });

        it('should reject missing data', () => {
            const json = JSON.stringify({ version: 1, type: 'profile', exportedAt: new Date().toISOString() });
            expect(() => importManifest(json)).toThrow('Manifest data missing');
        });
    });

    describe('generateManifestQR', () => {
        it('should generate a data URI for profile', () => {
            const profile = createBiologicalProfile({ name: 'Test' });
            const qr = generateManifestQR(profile, 'profile');
            expect(qr).toMatch(/^data:application\/json;base64,/);
        });

        it('should generate a data URI for group', () => {
            const group = createGroupManifest({ name: 'Test' });
            const qr = generateManifestQR(group, 'group');
            expect(qr).toMatch(/^data:application\/json;base64,/);
        });

        it('should be decodable', () => {
            const profile = createBiologicalProfile({ name: 'Test' });
            const qr = generateManifestQR(profile, 'profile');
            const base64 = qr.replace('data:application/json;base64,', '');
            const decoded = JSON.parse(atob(base64));
            expect(decoded.type).toBe('profile');
            expect(decoded.data.name).toBe('Test');
        });
    });

    describe('DEFAULT_BIOLOGICAL_PROFILES', () => {
        it('should have all four default profiles', () => {
            expect(DEFAULT_BIOLOGICAL_PROFILES.infant).toBeDefined();
            expect(DEFAULT_BIOLOGICAL_PROFILES.elderly).toBeDefined();
            expect(DEFAULT_BIOLOGICAL_PROFILES.diabetic).toBeDefined();
            expect(DEFAULT_BIOLOGICAL_PROFILES.healthy).toBeDefined();
        });

        it('should have valid infant profile', () => {
            const profile = DEFAULT_BIOLOGICAL_PROFILES.infant!;
            expect(profile.name).toBe('Infant (0-1 year)');
            expect(profile.needs?.length).toBeGreaterThan(0);
            expect(profile.tolerances?.length).toBeGreaterThan(0);
            expect(profile.modifiers?.length).toBeGreaterThan(0);
            const waterNeed = profile.needs?.find(n => n.category === 'water');
            expect(waterNeed).toBeDefined();
            expect(waterNeed?.urgency).toBe('critical');
        });

        it('should have valid elderly profile', () => {
            const profile = DEFAULT_BIOLOGICAL_PROFILES.elderly!;
            expect(profile.name).toBe('Elderly (75+ years)');
            expect(profile.needs?.length).toBeGreaterThan(0);
            const medNeed = profile.needs?.find(n => n.category === 'medication');
            expect(medNeed).toBeDefined();
            expect(medNeed?.urgency).toBe('critical');
        });

        it('should have valid diabetic profile', () => {
            const profile = DEFAULT_BIOLOGICAL_PROFILES.diabetic!;
            expect(profile.name).toBe('Type 1 Diabetic');
            const insulinNeed = profile.needs?.find(n => n.item.includes('Insulin'));
            expect(insulinNeed).toBeDefined();
            expect(insulinNeed?.urgency).toBe('critical');
            const fridgeNeed = profile.needs?.find(n => n.category === 'power');
            expect(fridgeNeed).toBeDefined();
        });

        it('should have valid healthy profile', () => {
            const profile = DEFAULT_BIOLOGICAL_PROFILES.healthy!;
            expect(profile.name).toBe('Healthy Adult');
            expect(profile.needs?.length).toBeGreaterThan(0);
            expect(profile.tolerances?.length).toBeGreaterThan(0);
        });

        it('should validate all default profiles', () => {
            for (const [key, profileData] of Object.entries(DEFAULT_BIOLOGICAL_PROFILES)) {
                const profile = createBiologicalProfile({ ...profileData, id: key, name: profileData.name! });
                const result = validateProfile(profile);
                if (!result.valid) {
                    console.error(`Profile ${key} validation errors:`, result.errors);
                }
                expect(result.valid).toBe(true);
            }
        });
    });

    describe('round-trip export/import', () => {
        it('should round-trip a profile', () => {
            const original = createBiologicalProfile({
                name: 'Round Trip Test',
                needs: [{
                    id: 'need-1',
                    category: 'water',
                    item: 'Water',
                    quantity: 3,
                    unit: 'liters',
                    period: 'day',
                    urgency: 'critical',
                    met: false
                }],
                tolerances: [{
                    id: 'tol-1',
                    factor: 'heat',
                    maxLevel: 35,
                    unit: 'celsius',
                    breached: false
                }],
                modifiers: [{
                    id: 'mod-1',
                    type: 'age',
                    description: 'Adult',
                    active: true
                }]
            });
            const json = exportManifest(original, 'profile');
            const imported = importManifest(json);
            expect(imported.data.name).toBe(original.name);
            expect((imported.data as BiologicalProfile).needs.length).toBe(original.needs.length);
            expect((imported.data as BiologicalProfile).tolerances.length).toBe(original.tolerances.length);
            expect((imported.data as BiologicalProfile).modifiers.length).toBe(original.modifiers.length);
        });

        it('should round-trip a group', () => {
            const profile = createBiologicalProfile({ name: 'Member' });
            const original = createGroupManifest({
                name: 'Round Trip Group',
                members: [profile]
            });
            const json = exportManifest(original, 'group');
            const imported = importManifest(json);
            expect(imported.data.name).toBe(original.name);
            expect((imported.data as GroupManifest).members.length).toBe(original.members.length);
        });
    });
});