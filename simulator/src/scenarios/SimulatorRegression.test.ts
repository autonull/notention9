import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ScenarioRunner} from '../scenario.js';
import {RegressionScenario} from '../scenarios/regression.js';

describe('SimulatorRegression', () => {
    let runner: ScenarioRunner;

    beforeEach(() => {
        runner = new ScenarioRunner(RegressionScenario);
    });

    afterEach(async () => {
        await runner.cleanup();
    });

    it('runs regression scenario without errors', async () => {
        const result = await runner.run();

        expect(result.success).toBe(true);
        expect(result.events).toBeDefined();
        expect(result.events.length).toBeGreaterThan(0);
    });

    it('creates request and offer notes', async () => {
        const result = await runner.run();

        const notes = result.finalState.notes;
        expect(notes.length).toBeGreaterThanOrEqual(2);

        const requester = notes.find(n => n.properties.some(p => p.key === 'role' && p.values.includes('developer')));
        const offerer = notes.find(n => n.properties.some(p => p.key === 'job' && p.values.includes('developer')));

        expect(requester).toBeDefined();
        expect(offerer).toBeDefined();
    });

    it('produces a match with score >= 0.8', async () => {
        const result = await runner.run();

        const matches = result.finalState.matches;
        expect(matches.length).toBeGreaterThan(0);

        const bestMatch = matches.reduce((best, m) => m.score > best.score ? m : best, matches[0]);
        expect(bestMatch.score).toBeGreaterThanOrEqual(0.8);
    });

    it('completes within duration', async () => {
        const result = await runner.run();

        expect(result.duration).toBeLessThanOrEqual(RegressionScenario.duration * 1000 + 5000); // 5s buffer
    });

    it('agents have correct properties', async () => {
        const result = await runner.run();

        const requesterNote = result.finalState.notes.find(n =>
            n.properties.some(p => p.key === 'role' && p.operator === 'is' && p.values.includes('developer'))
        );
        const offererNote = result.finalState.notes.find(n =>
            n.properties.some(p => p.key === 'job' && p.operator === 'is' && p.values.includes('developer'))
        );

        expect(requesterNote).toBeDefined();
        expect(offererNote).toBeDefined();

        // Check requester has skills
        const requesterSkills = requesterNote!.properties.find(p => p.key === 'skills' && p.operator === 'contains');
        expect(requesterSkills).toBeDefined();
        expect(requesterSkills?.values).toContain('react');
        expect(requesterSkills?.values).toContain('typescript');

        // Check offerer has budget
        const offererBudget = offererNote!.properties.find(p => p.key === 'budget' && p.operator === 'is');
        expect(offererBudget).toBeDefined();
    });

    it('match explanation is present', async () => {
        const result = await runner.run();

        const matches = result.finalState.matches;
        expect(matches.length).toBeGreaterThan(0);

        const match = matches[0];
        expect(match.explanation).toBeDefined();
        expect(typeof match.explanation).toBe('string');
        expect(match.explanation.length).toBeGreaterThan(0);
    });
});