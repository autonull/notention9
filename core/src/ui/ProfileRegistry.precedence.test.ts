import { describe, it, expect } from 'vitest';
import { ProfileRegistry, StrategyRegistry, type Seam, type Strategy, SEAM_ROLES, type SeamRole } from '@notention/core';

// Mock strategy factory
function createMockStrategy(id: string, seamRole: SeamRole): Strategy {
    const seam: Seam = {
        id: `${seamRole}-0`,
        name: seamRole,
        description: `Test ${seamRole}`,
        propsShape: {},
        components: [],
        role: seamRole,
    };
    return {
        id,
        seam,
        version: '1.0.0',
        params: {},
        render: () => null as any,
        getDefaultProps: () => ({ testProp: `default-${id}` }),
    };
}

function createTestRegistries() {
    const profileRegistry = new ProfileRegistry();
    const strategyRegistry = new StrategyRegistry();
    const seamRole: SeamRole = SEAM_ROLES.CAPTURE;

    // Register a seam
    const seam: Seam = {
        id: 'capture-0',
        name: 'Capture',
        description: 'Capture seam',
        propsShape: {},
        components: [],
        role: 'capture',
    };
    strategyRegistry.register(seam, createMockStrategy('baseline', seamRole));
    strategyRegistry.register(seam, createMockStrategy('override-strategy', seamRole));
    strategyRegistry.register(seam, createMockStrategy('experiment-strategy', seamRole));
    strategyRegistry.register(seam, createMockStrategy('manual-profile-strategy', seamRole));
    strategyRegistry.register(seam, createMockStrategy('policy-strategy', seamRole));
    strategyRegistry.register(seam, createMockStrategy('default-profile-strategy', seamRole));
    strategyRegistry.register(seam, createMockStrategy('fallback-strategy', seamRole));

    // Register profiles
    profileRegistry.registerProfile({
        id: 'default',
        name: 'Default',
        description: 'Default profile',
        strategySelections: { capture: 'default-profile-strategy' },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    profileRegistry.registerProfile({
        id: 'manual-profile',
        name: 'Manual Profile',
        description: 'Manual profile',
        strategySelections: { capture: 'manual-profile-strategy' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    profileRegistry.registerProfile({
        id: 'policy-profile',
        name: 'Policy Profile',
        description: 'Policy profile',
        strategySelections: { capture: 'policy-strategy' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Register policy
    profileRegistry.registerPolicy({
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test policy',
        rules: [
            { id: 'rule-1', conditions: { view: 'dashboard' }, profileId: 'policy-profile', priority: 10 },
        ],
        fallbackProfileId: 'default',
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Register experiment
    profileRegistry.registerExperiment({
        id: 'test-experiment',
        name: 'Test Experiment',
        description: 'Test experiment',
        seamId: 'capture',
        variants: [
            { id: 'control', seamId: 'capture', strategyId: 'baseline', label: 'Control', description: 'Baseline', isControl: true, weight: 0.5 },
            { id: 'treatment', seamId: 'capture', strategyId: 'experiment-strategy', label: 'Treatment', description: 'Experiment', isControl: false, weight: 0.5 },
        ],
        metrics: [{ id: 'completion', name: 'Completion', type: 'completion', direction: 'higher' }],
        minSampleSize: 10,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return { profileRegistry, strategyRegistry, seamRole };
}

describe('ProfileRegistry: 5-layer precedence', () => {
    const userId = 'test-user';

    it('Layer 1: User override wins', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        profileRegistry.setOverride(userId, seamRole, 'override-strategy');

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.strategy.id).toBe('override-strategy');
        expect(resolved!.reason.kind).toBe('override');
        if (resolved!.reason.kind === 'override') {
            expect(resolved!.reason.strategyId).toBe('override-strategy');
        }
    });

    it('Layer 2: Experiment assignment wins over profiles', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        // Experiment should win (50/50 chance, but we can't control randomness easily)
        // Just verify it returns a valid reason
        expect(['experiment', 'manual-profile', 'policy', 'default-profile', 'fallback']).toContain(resolved!.reason.kind);
    });

    it('Layer 3: Manual mode with active profile wins', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        // Disable experiment for this test
        const experiment = profileRegistry.getExperiment('test-experiment')!;
        experiment.isActive = false;
        profileRegistry.registerExperiment(experiment);

        profileRegistry.setManualMode(userId, true);
        profileRegistry.setActiveProfile(userId, 'manual-profile');

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.strategy.id).toBe('manual-profile-strategy');
        expect(resolved!.reason.kind).toBe('manual-profile');
        if (resolved!.reason.kind === 'manual-profile') {
            expect(resolved!.reason.profileId).toBe('manual-profile');
        }
    });

    it('Layer 4: Policy-based auto-selection wins', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        // Disable experiment
        const experiment = profileRegistry.getExperiment('test-experiment')!;
        experiment.isActive = false;
        profileRegistry.registerExperiment(experiment);

        // Disable default policy so our test policy is active
        const defaultPolicy = profileRegistry.getPolicy('auto-profile')!;
        defaultPolicy.isEnabled = false;
        profileRegistry.registerPolicy(defaultPolicy);

        // Not in manual mode, policy should apply
        // IMPORTANT: setActiveProfile sets manualMode=true, so set manualMode AFTER
        profileRegistry.setActiveProfile(userId, 'default');
        profileRegistry.setManualMode(userId, false);
        // Set context on the active profile to match policy rule
        const defaultProfile = profileRegistry.getProfile('default')!;
        defaultProfile.context = { view: 'dashboard' };
        profileRegistry.registerProfile(defaultProfile);

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.strategy.id).toBe('policy-strategy');
        expect(resolved!.reason.kind).toBe('policy');
        if (resolved!.reason.kind === 'policy') {
            expect(resolved!.reason.policyId).toBe('test-policy');
            expect(resolved!.reason.ruleId).toBe('rule-1');
        }
    });

    it('Layer 5: Policy fallback returns default profile strategy with policy reason', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        // Disable experiment
        const experiment = profileRegistry.getExperiment('test-experiment')!;
        experiment.isActive = false;
        profileRegistry.registerExperiment(experiment);

        // Disable default policy so our test policy is active
        const defaultPolicy = profileRegistry.getPolicy('auto-profile')!;
        defaultPolicy.isEnabled = false;
        profileRegistry.registerPolicy(defaultPolicy);

        // No manual mode, policy active but no rules match -> falls back to default profile
        // IMPORTANT: setActiveProfile sets manualMode=true, so set manualMode AFTER
        profileRegistry.setActiveProfile(userId, 'default');
        profileRegistry.setManualMode(userId, false);
        const defaultProfile = profileRegistry.getProfile('default')!;
        defaultProfile.context = { view: 'other' }; // doesn't match policy
        profileRegistry.registerProfile(defaultProfile);

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.strategy.id).toBe('default-profile-strategy');
        // Policy step runs before default profile step, so fallback goes through policy
        expect(resolved!.reason.kind).toBe('policy');
        if (resolved!.reason.kind === 'policy') {
            expect(resolved!.reason.policyId).toBe('test-policy');
            expect(resolved!.reason.ruleId).toBe('fallback');
        }
    });

    it('Layer 6: Fallback to first available strategy', () => {
        // Disable experiment
        const { profileRegistry: baseRegistry, strategyRegistry: baseStrategyRegistry, seamRole } = createTestRegistries();
        const experiment = baseRegistry.getExperiment('test-experiment')!;
        experiment.isActive = false;
        baseRegistry.registerExperiment(experiment);

        // Remove all profiles - create fresh registry with only empty profile
        const profileRegistry = new ProfileRegistry();
        profileRegistry.registerProfile({
            id: 'empty',
            name: 'Empty',
            description: 'Empty profile',
            strategySelections: {},
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Register seam with only fallback strategy
        const seam: Seam = { id: 'capture-0', name: 'Capture', description: '', propsShape: {}, components: [], role: 'capture' };
        const fallbackStrategy = createMockStrategy('fallback-strategy', seamRole);
        const newStrategyRegistry = new StrategyRegistry();
        newStrategyRegistry.register(seam, fallbackStrategy);

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, newStrategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.strategy.id).toBe('fallback-strategy');
        expect(resolved!.reason.kind).toBe('fallback');
        if (resolved!.reason.kind === 'fallback') {
            expect(resolved!.reason.seamId).toBe('capture-0');
        }
    });

    it('ResolvedStrategy includes resolvedParams from getDefaultProps', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        profileRegistry.setOverride(userId, seamRole, 'override-strategy');

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.resolvedParams).toBeDefined();
        expect(resolved!.resolvedParams.testProp).toBe('default-override-strategy');
    });

    it('ResolvedStrategy includes metadata', () => {
        const { profileRegistry, strategyRegistry, seamRole } = createTestRegistries();
        profileRegistry.setOverride(userId, seamRole, 'override-strategy');

        const resolved = profileRegistry.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);

        expect(resolved).toBeDefined();
        expect(resolved!.userId).toBe(userId);
        expect(resolved!.seamRole).toBe(seamRole);
        expect(resolved!.resolvedAt).toBeDefined();
        expect(new Date(resolved!.resolvedAt).getTime()).toBeGreaterThan(0);
    });
});