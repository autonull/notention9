import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {ProfileSettings} from '../../../components/settings/ProfileSettings';
import {profileRegistry, DEFAULT_PROFILES, DEFAULT_POLICY, DEFAULT_MATCH_DISPLAY_EXPERIMENT} from '@notention/core/ui/profile';
import {strategyRegistry} from '@notention/core/ui/strategy';
import {StrategyProvider} from '../../../hooks/useStrategyResolver';

// Mock the strategy resolver hook
vi.mock('../hooks/useStrategyResolver', () => ({
    ...vi.requireActual('../hooks/useStrategyResolver'),
    useStrategy: () => ({
        getActiveProfile: () => profileRegistry.getProfile('default'),
        setActiveProfile: vi.fn(),
        setOverride: vi.fn(),
        removeOverride: vi.fn(),
        setManualMode: vi.fn(),
        userId: 'test-user',
        isManualMode: false,
        activeProfileId: 'default',
        overrides: {},
        resolveStrategy: vi.fn(),
    }),
}));

describe('ProfileSettings', () => {
    beforeEach(() => {
        // Reset registry
        profileRegistry.profiles.clear();
        profileRegistry.policies.clear();
        profileRegistry.userConfigs.clear();
        profileRegistry.experiments.clear();
        profileRegistry.assignments.clear();

        for (const profile of DEFAULT_PROFILES) {
            profileRegistry.profiles.set(profile.id, profile);
        }
        profileRegistry.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        profileRegistry.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
    });

    it('renders profile settings panel', () => {
        render(
            <StrategyProvider>
                <ProfileSettings />
            </StrategyProvider>
        );

        expect(screen.getByText('Profile & Strategy Settings')).toBeInTheDocument();
        expect(screen.getByText('Manual Profile Selection')).toBeInTheDocument();
        expect(screen.getByText('Active Profile')).toBeInTheDocument();
    });

    it('shows available profiles', () => {
        render(
            <StrategyProvider>
                <ProfileSettings />
            </StrategyProvider>
        );

        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Compact')).toBeInTheDocument();
        expect(screen.getByText('Guided')).toBeInTheDocument();
        expect(screen.getByText('Accessible')).toBeInTheDocument();
    });

    it('shows strategy overrides section', () => {
        render(
            <StrategyProvider>
                <ProfileSettings />
            </StrategyProvider>
        );

        expect(screen.getByText('Strategy Overrides')).toBeInTheDocument();
    });

    it('shows available profiles in details', () => {
        render(
            <StrategyProvider>
                <ProfileSettings />
            </StrategyProvider>
        );

        // Click details
        fireEvent.click(screen.getByText('Available Profiles'));
        
        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Compact')).toBeInTheDocument();
    });
});