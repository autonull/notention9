import type { JourneySpec, Step } from '../journey.js';
import type { Scenario, AgentConfig, Property, EventConfig } from '@notention/simulator';

function prop(key: string, operator: string, ...values: string[]): Property {
    return { key, operator, values };
}

function extractPropertiesFromSeed(seed: JourneySpec['seed']): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const note of seed.notes) {
        for (const p of note.properties) {
            result[p.key] = [...(result[p.key] || []), ...p.values];
        }
    }
    return result;
}

function extractPropertiesFromSteps(steps: Step[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const step of steps) {
        if (step.kind === 'act' && step.action === 'fill' && step.value) {
            const target = step.target;
            if (target && typeof target === 'object' && 'testId' in target) {
                const testId = target.testId as string;
                if (testId.includes('property')) {
                    const keyMatch = testId.match(/property-(key|value)-input/);
                    if (keyMatch) {
                        result[keyMatch[1]] = [...(result[keyMatch[1]] || []), String(step.value)];
                    }
                }
            }
        }
    }
    return result;
}

function inferRoleFromContent(content: string): 'Requester' | 'Offerer' {
    const lower = content.toLowerCase();
    if (lower.includes('need') || lower.includes('looking for') || lower.includes('seeking') || lower.includes('want')) {
        return 'Requester';
    }
    return 'Offerer';
}

function inferPropertiesFromNote(note: JourneySpec['seed']['notes'][0]): Property[] {
    return note.properties.map(p => prop(p.key, p.operator, ...p.values));
}

function inferInterestsFromNote(note: JourneySpec['seed']['notes'][0]): Property[] {
    return note.properties.map(p => prop(p.key, p.operator, ...p.values));
}

export function journeyToSimulatorScenario(journey: JourneySpec, scenarioName?: string): Scenario {
    const seedNotes = journey.seed.notes;
    const steps = journey.steps;

    const requesterNotes = seedNotes.filter(n => inferRoleFromContent(n.content) === 'Requester');
    const offererNotes = seedNotes.filter(n => inferRoleFromContent(n.content) === 'Offerer');

    const requester: AgentConfig = {
        role: 'Requester',
        count: Math.max(1, requesterNotes.length),
        properties: requesterNotes.length > 0
            ? inferPropertiesFromNote(requesterNotes[0])
            : [
                prop('role', 'is', 'developer'),
                prop('skills', 'contains', 'react', 'typescript'),
                prop('location', 'is', 'Berlin'),
            ],
        interests: requesterNotes.length > 0
            ? inferInterestsFromNote(requesterNotes[0])
            : [
                prop('job', 'is', 'developer'),
                prop('budget', 'greater than', '50'),
                prop('remote', 'is', 'true'),
            ],
        traits: ['optimize-regression'],
    };

    const offerer: AgentConfig = {
        role: 'Offerer',
        count: Math.max(1, offererNotes.length),
        properties: offererNotes.length > 0
            ? inferPropertiesFromNote(offererNotes[0])
            : [
                prop('job', 'is', 'developer'),
                prop('budget', 'is', '500'),
                prop('remote', 'is', 'true'),
                prop('skills', 'contains', 'react', 'typescript'),
                prop('location', 'is', 'Berlin'),
            ],
        interests: offererNotes.length > 0
            ? inferInterestsFromNote(offererNotes[0])
            : [
                prop('role', 'is', 'developer'),
                prop('skills', 'contains', 'react'),
            ],
        traits: ['optimize-regression'],
    };

    const events: EventConfig[] = [
        { at: 1, action: 'publish_job', actorRole: 'Requester', cameraFocus: 'Requester 1' },
        { at: 3, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
        { at: 6, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
    ];

    return {
        name: scenarioName ?? `Regression-${journey.id}`,
        description: `Auto-generated from optimize journey: ${journey.intent}`,
        agents: [requester, offerer],
        events,
        duration: 10,
    };
}

export function findingToSimulatorScenario(
    finding: { title: string; location: string; journey: string; reproduction: any },
    journey: JourneySpec
): Scenario {
    return journeyToSimulatorScenario(journey, `regression-${finding.title.replace(/\s+/g, '-')}`);
}