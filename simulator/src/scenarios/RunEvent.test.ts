import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScenarioRunner } from '../scenario.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { RunEvent, RunEventSink, Scenario } from '../types.js';

// Use a mock relay URL that won't connect
const mockRelayUrl = 'ws://localhost:9999';

function createTestScenario(): Scenario {
    return {
        name: 'Test Scenario',
        description: 'A test scenario',
        agents: [
            {
                role: 'Requester',
                count: 1,
                properties: [],
                interests: [],
                traits: [],
            },
            {
                role: 'Offerer',
                count: 1,
                properties: [],
                interests: [],
                traits: [],
            },
        ],
        events: [
            { at: 1, action: 'publish_job', actorRole: 'Requester' },
            { at: 2, action: 'publish_offer', actorRole: 'Offerer' },
        ],
        duration: 1,
    };
}

describe('RunEvent sink (Q2)', () => {
    let runner: ScenarioRunner;
    let events: RunEvent[] = [];

    const sink: RunEventSink = (event: RunEvent) => {
        events.push(event);
    };

    beforeEach(() => {
        events = [];
        runner = new ScenarioRunner(mockRelayUrl, DEFAULT_ONTOLOGY);
        runner.runEventSink = sink;
    });

    afterEach(() => {
        runner.runEventSink = undefined;
    });

    it('should emit scenario:start event on prepare', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        
        const startEvents = events.filter(e => e.type === 'scenario:start');
        expect(startEvents).toHaveLength(1);
        expect(startEvents[0].scenarioName).toBe('Test Scenario');
        expect(startEvents[0].data).toEqual({ description: 'A test scenario', duration: 1 });
    });

    it('should emit agent:spawn events for each agent', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        
        const spawnEvents = events.filter(e => e.type === 'agent:spawn');
        expect(spawnEvents).toHaveLength(2);
        
        const roles = spawnEvents.map(e => e.data.role).sort();
        expect(roles).toEqual(['Offerer', 'Requester']);
        
        spawnEvents.forEach(e => {
            expect(e.data.agentName).toBeDefined();
            expect(e.data.id).toBeDefined();
        });
    });

    it('should emit event:scheduled for each scenario event', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        await runner.execute(scenario);
        
        // Wait for scheduled events to fire (at 1s and 2s)
        await new Promise(r => setTimeout(r, 3000));
        
        const scheduledEvents = events.filter(e => e.type === 'event:scheduled');
        expect(scheduledEvents).toHaveLength(2);
        
        const actions = scheduledEvents.map(e => e.data.action).sort();
        expect(actions).toEqual(['publish_job', 'publish_offer']);
    });

    it('should emit agent:action when agents execute actions', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        await runner.execute(scenario);
        
        // Wait for actions to execute
        await new Promise(r => setTimeout(r, 3000));
        
        const actionEvents = events.filter(e => e.type === 'agent:action');
        expect(actionEvents.length).toBeGreaterThanOrEqual(2);
        
        actionEvents.forEach(e => {
            expect(e.data.agentName).toBeDefined();
            expect(e.data.action).toBeDefined();
            expect(e.data.inputMethod).toBeDefined();
        });
    });

    it('should emit event:executed after action completes', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        await runner.execute(scenario);
        
        // Wait for actions to execute
        await new Promise(r => setTimeout(r, 3000));
        
        const executedEvents = events.filter(e => e.type === 'event:executed');
        expect(executedEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('should emit scenario:end after execution', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        await runner.execute(scenario);
        
        // Wait for scenario to complete (duration 1s + buffer)
        await new Promise(r => setTimeout(r, 3000));
        
        const endEvents = events.filter(e => e.type === 'scenario:end');
        expect(endEvents).toHaveLength(1);
        expect(endEvents[0].scenarioName).toBe('Test Scenario');
    });

    it('should have timestamp on all events', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        
        events.forEach(e => {
            expect(e.timestamp).toBeGreaterThan(0);
            expect(typeof e.timestamp).toBe('number');
        });
    });

    it('should include scenarioName on all events', async () => {
        const scenario = createTestScenario();
        await runner.prepare(scenario);
        
        events.forEach(e => {
            expect(e.scenarioName).toBeDefined();
        });
    });

    it('should work with run() method (prepare + execute)', async () => {
        events = [];
        const scenario = createTestScenario();
        runner.runEventSink = sink;
        await runner.run(scenario);
        
        // Wait for scenario to complete
        await new Promise(r => setTimeout(r, 3000));
        
        const types = events.map(e => e.type).sort();
        expect(types).toContain('scenario:start');
        expect(types).toContain('scenario:end');
        expect(types).toContain('agent:spawn');
    });

    it('should not emit events when sink is not set', async () => {
        const runnerWithoutSink = new ScenarioRunner(mockRelayUrl, DEFAULT_ONTOLOGY);
        // Don't set a sink
        
        const scenario = createTestScenario();
        await runnerWithoutSink.prepare(scenario);
        
        // No events should be captured since we have no sink
        expect(events).toHaveLength(0);
    });
});

describe('RunEvent types', () => {
    it('should have correct RunEventType values', () => {
        const types: RunEvent['type'][] = [
            'scenario:start',
            'scenario:end',
            'agent:spawn',
            'agent:action',
            'event:scheduled',
            'event:executed',
            'match:found',
            'error',
        ];
        
        expect(types).toHaveLength(8);
    });

    it('should have correct ScenarioTag values', () => {
        const tags: import('../types.js').ScenarioTag[] = [
            'regression',
            'golden-path',
            'domain',
            'stress',
            'smoke',
        ];
        
        expect(tags).toHaveLength(5);
    });

    it('should have correct ScenarioDifficulty values', () => {
        const difficulties: import('../types.js').ScenarioDifficulty[] = [
            'easy',
            'medium',
            'hard',
        ];
        
        expect(difficulties).toHaveLength(3);
    });
});