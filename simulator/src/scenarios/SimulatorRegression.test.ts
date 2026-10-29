import {describe, it, expect} from 'vitest';
import {RegressionScenario} from './regression.js';
import {Scenario} from '../types.js';

describe('SimulatorRegression', () => {
    it('has valid scenario structure', () => {
        expect(RegressionScenario.name).toBe('Regression');
        expect(RegressionScenario.description).toContain('Regression test');
        expect(RegressionScenario.duration).toBe(8);
    });

    it('has correct agent configurations', () => {
        expect(RegressionScenario.agents).toHaveLength(2);

        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester');
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer');

        expect(requester).toBeDefined();
        expect(offerer).toBeDefined();

        expect(requester!.count).toBe(1);
        expect(offerer!.count).toBe(1);
    });

    it('requester has required properties', () => {
        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester')!;

        const roleProp = requester.properties.find(p => p.key === 'role');
        const skillsProp = requester.properties.find(p => p.key === 'skills');
        const locationProp = requester.properties.find(p => p.key === 'location');

        expect(roleProp).toEqual({key: 'role', operator: 'is', values: ['developer']});
        expect(skillsProp).toEqual({key: 'skills', operator: 'contains', values: ['react', 'typescript']});
        expect(locationProp).toEqual({key: 'location', operator: 'is', values: ['Berlin']});
    });

    it('offerer has required properties', () => {
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer')!;

        const jobProp = offerer.properties.find(p => p.key === 'job');
        const budgetProp = offerer.properties.find(p => p.key === 'budget');
        const remoteProp = offerer.properties.find(p => p.key === 'remote');
        const skillsProp = offerer.properties.find(p => p.key === 'skills');
        const locationProp = offerer.properties.find(p => p.key === 'location');

        expect(jobProp).toEqual({key: 'job', operator: 'is', values: ['developer']});
        expect(budgetProp).toEqual({key: 'budget', operator: 'is', values: ['500']});
        expect(remoteProp).toEqual({key: 'remote', operator: 'is', values: ['true']});
        expect(skillsProp).toEqual({key: 'skills', operator: 'contains', values: ['react', 'typescript']});
        expect(locationProp).toEqual({key: 'location', operator: 'is', values: ['Berlin']});
    });

    it('has correct interests for matching', () => {
        const requester = RegressionScenario.agents.find(a => a.role === 'RegressRequester')!;
        const offerer = RegressionScenario.agents.find(a => a.role === 'RegressOfferer')!;

        const requesterJobInterest = requester.interests.find(p => p.key === 'job');
        const offererRoleInterest = offerer.interests.find(p => p.key === 'role');

        expect(requesterJobInterest).toEqual({key: 'job', operator: 'is', values: ['developer']});
        expect(offererRoleInterest).toEqual({key: 'role', operator: 'is', values: ['developer']});
    });

    it('has correct events sequence', () => {
        expect(RegressionScenario.events).toHaveLength(2);

        const publishJob = RegressionScenario.events[0];
        const publishOffer = RegressionScenario.events[1];

        expect(publishJob).toEqual({at: 1, action: 'publish_job', actorRole: 'RegressRequester'});
        expect(publishOffer).toEqual({at: 3, action: 'publish_offer', actorRole: 'RegressOfferer'});
    });

    it('is a valid Scenario type', () => {
        const scenario: Scenario = RegressionScenario;
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(Array.isArray(scenario.agents)).toBe(true);
        expect(Array.isArray(scenario.events)).toBe(true);
        expect(typeof scenario.duration).toBe('number');
    });
});