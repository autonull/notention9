import { describe, it, expect, beforeEach } from 'vitest';
import { profileRegistry, DEFAULT_PROFILES, DEFAULT_POLICY, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from '@notention/core/ui/profile';
import { strategyRegistry } from '@notention/core/ui/strategy';
import { SEAM_ROLES } from '@notention/core/constants/seams';

describe('ProfileRegistry', () => {
    beforeEach(() => {
        // Reset to defaults
        profileRegistry.profiles.clear();
        profileRegistry.policies.clear();
        profileRegistry.userConfigs.clear();
        profileRegistry.experiments.clear();
        profileRegistry.assignments.clear();
        strategyRegistry.strategies.clear();
        
        // Re-register defaults
        for (const profile of DEFAULT_PROFILES) {
            profileRegistry.profiles.set(profile.id, profile);
        }
        profileRegistry.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        profileRegistry.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
    });

    it('should have default profiles', () => {
        const profiles = profileRegistry.getAllProfiles();
        expect(profiles.length).toBeGreaterThanOrEqual(4);
        
        const ids = profiles.map(p => p.id);
        expect(ids).toContain('default');
        expect(ids).toContain('compact');
        expect(ids).toContain('guided');
        expect(ids).toContain('accessible');
    });

    it('should get default profile', () => {
        const defaultProfile = profileRegistry.getDefaultProfile();
        expect(defaultProfile).toBeDefined();
        expect(defaultProfile?.isDefault).toBe(true);
    });

    it('should create user config with defaults', () => {
        const config = profileRegistry.getUserConfig('test-user-1');
        expect(config.userId).toBe('test-user-1');
        expect(config.activeProfileId).toBe('default');
        expect(config.manualMode).toBe(false);
        expect(config.overrides.overrides).toEqual({});
    });

    it('should set active profile', () => {
        const result = profileRegistry.setActiveProfile('test-user-2', 'compact');
        expect(result).toBe(true);
        
        const config = profileRegistry.getUserConfig('test-user-2');
        expect(config.activeProfileId).toBe('compact');
        expect(config.manualMode).toBe(true);
    });

    it('should reject invalid profile', () => {
        const result = profileRegistry.setActiveProfile('test-user-3', 'nonexistent');
        expect(result).toBe(false);
    });

    it('should set and remove overrides', () => {
        profileRegistry.setOverride('test-user-4', SEAM_ROLES.MATCH, 'dashboard-local-match');
        
        let config = profileRegistry.getUserConfig('test-user-4');
        expect(config.overrides.overrides[SEAM_ROLES.MATCH]).toBe('dashboard-local-match');
        
        profileRegistry.removeOverride('test-user-4', SEAM_ROLES.MATCH);
        
        config = profileRegistry.getUserConfig('test-user-4');
        expect(config.overrides.overrides[SEAM_ROLES.MATCH]).toBeUndefined();
    });

    it('should resolve strategy from user override', () => {
        // Register a mock strategy with a proper seam ID that matches the role pattern
        const mockStrategy = {
            id: 'test-strategy',
            seam: { id: 'capture-0', name: 'test', description: '', components: [], propsShape: {}, role: 'capture' as const },
            version: '1.0.0',
            params: {},
            render: () => null,
            getDefaultProps: () => ({}),
        };
        
        // Register directly in strategy registry
        const testSeam = { id: 'capture-0', name: 'test', description: '', components: [], propsShape: {}, role: 'capture' as const };
        strategyRegistry.register(testSeam, mockStrategy);
        
        // Set override using role
        profileRegistry.setOverride('test-user-5', 'capture', 'test-strategy');
        
        const resolved = profileRegistry.resolveStrategy('test-user-5', 'capture', strategyRegistry);
        expect(resolved).toBeDefined();
        expect(resolved?.id).toBe('test-strategy');
    });

    it('should serialize and deserialize', () => {
        const json = profileRegistry.toJSON();
        
        expect(json.profiles.length).toBeGreaterThanOrEqual(4);
        expect(json.policies.length).toBeGreaterThanOrEqual(1);
        expect(json.experiments.length).toBeGreaterThanOrEqual(1);
        
        const { ProfileRegistry } = require('@notention/core/ui/profile');
        const restored = ProfileRegistry.fromJSON(json);
        expect(restored.getAllProfiles().length).toBe(json.profiles.length);
    });

    it('should have default experiment', () => {
        const experiments = profileRegistry.getActiveExperiments();
        expect(experiments.length).toBeGreaterThanOrEqual(1);
        
        const matchExp = experiments.find(e => e.id === 'match-display-v1');
        expect(matchExp).toBeDefined();
        expect(matchExp?.variants.length).toBe(2);
    });

    it('should assign user to experiment variant', () => {
        const experiment = profileRegistry.getExperiment('match-display-v1');
        expect(experiment).toBeDefined();
        
        // Register mock strategies for the experiment
        for (const variant of experiment!.variants) {
            const mockStrategy = {
                id: variant.strategyId,
                seam: { id: variant.seamId, name: 'test', description: '', components: [], propsShape: {}, role: 'display' as const },
                version: '1.0.0',
                params: {},
                render: () => null,
                getDefaultProps: () => ({}),
            };
            strategyRegistry.register(mockStrategy.seam, mockStrategy);
        }
        
        const resolved = profileRegistry.resolveStrategy('test-user-6', SEAM_ROLES.MATCH, strategyRegistry);
        expect(resolved).toBeDefined();
        expect(['local-match-preview', 'dashboard-local-match']).toContain(resolved?.id);
    });
});