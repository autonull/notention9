import type { Step, Target } from '../../journey.js';
import type { ParsedGoal, InferredAction } from './goalParser.js';
import type { InferredSelector } from '../analyzer/selectorInference.js';
import { StatePathRegistry } from '../analyzer/statePathRegistry.js';
import { expect } from '../../expectPolyfill.js';

export interface StepBuilderOptions {
    includeTraceAssertions?: boolean;
    includeAriaAssertions?: boolean;
    maxSteps?: number;
}

export function buildSteps(
    parsedGoal: ParsedGoal,
    selectors: Map<string, InferredSelector>,
    statePathRegistry: StatePathRegistry,
    options: StepBuilderOptions = {}
): Step[] {
    const steps: Step[] = [];

    // 1. Navigation step (if needed)
    if (parsedGoal.targetState.type === 'note' || parsedGoal.targetState.type === 'property') {
        const navAction = parsedGoal.actions.find(a => a.intent === 'note.select');
        if (navAction) {
            steps.push(createNavigateStep(navAction, parsedGoal));
        }
    }

    // 2. Initial state assertion
    steps.push(createInitialAssertion(parsedGoal, statePathRegistry));

    // 3. Action steps
    for (const action of parsedGoal.actions) {
        if (action.intent === 'note.select') continue; // Already handled
        const actionSteps = createActionSteps(action, selectors, parsedGoal);
        steps.push(...actionSteps);
    }

    // 4. Final state assertion
    steps.push(createFinalAssertion(parsedGoal, statePathRegistry));

    // 5. Optional: reload and persistence check
    if (parsedGoal.targetState.type === 'property' || parsedGoal.targetState.type === 'note') {
        steps.push(createReloadStep(parsedGoal));
        steps.push(createPersistenceAssertion(parsedGoal, statePathRegistry));
    }

    // 6. Console errors check
    steps.push({ kind: 'assertNoConsoleErrors' });

    return steps;
}

function createNavigateStep(action: InferredAction, parsedGoal: ParsedGoal): Step {
    const noteId = parsedGoal.constraints.privacy === 'public' ? 'public-note' : 'synthesized-note';
    return {
        kind: 'navigate',
        hash: `notes/${noteId}`,
    };
}

function createInitialAssertion(parsedGoal: ParsedGoal, statePathRegistry: StatePathRegistry): Step {
    if (parsedGoal.targetState.type === 'property') {
        const propKey = parsedGoal.targetState.path.split('.').pop();
        return {
            kind: 'assertState',
            path: `note.propertyIndex.${propKey}`,
            equals: [], // Should be empty initially
        };
    }

    return {
        kind: 'assertState',
        path: 'note.id',
        equals: expect.any(String), // Note exists
    };
}

function createActionSteps(
    action: InferredAction,
    selectors: Map<string, InferredSelector>,
    parsedGoal: ParsedGoal
): Step[] {
    const steps: Step[] = [];

    switch (action.intent) {
        case 'note.addProperty':
        case 'note.insertProperty':
            // Open property modal
            steps.push({
                kind: 'act',
                target: resolveSelector(action.selector, selectors) || { role: 'button', name: 'Add detail' },
                action: 'click',
            });

            // Fill property form
            const propKey = parsedGoal.targetState.path.split('.').pop() || 'property';
            steps.push({
                kind: 'act',
                target: { label: 'Detail' },
                action: 'fill',
                value: propKey,
            });

            steps.push({
                kind: 'act',
                target: { label: 'Comparison' },
                action: 'fill',
                value: 'contains',
            });

            steps.push({
                kind: 'act',
                target: { label: 'Value' },
                action: 'fill',
                value: 'test-value',
            });

            // Submit
            steps.push({
                kind: 'act',
                target: { role: 'button', name: 'Add detail' },
                action: 'click',
            });
            break;

        case 'note.publish':
            steps.push({
                kind: 'act',
                target: resolveSelector(action.selector, selectors) || { role: 'button', name: 'Publish' },
                action: 'click',
            });
            break;

        case 'note.acceptExtraction':
            steps.push({
                kind: 'act',
                target: resolveSelector(action.selector, selectors) || { role: 'button', name: 'Accept' },
                action: 'click',
            });
            break;

        case 'note.rejectExtraction':
            steps.push({
                kind: 'act',
                target: resolveSelector(action.selector, selectors) || { role: 'button', name: 'Reject' },
                action: 'click',
            });
            break;
    }

    return steps;
}

function createFinalAssertion(parsedGoal: ParsedGoal, statePathRegistry: StatePathRegistry): Step {
    if (parsedGoal.targetState.type === 'property') {
        const propKey = parsedGoal.targetState.path.split('.').pop();
        return {
            kind: 'assertState',
            path: `note.propertyIndex.${propKey}`,
            equals: ['test-value'],
        };
    }

    if (parsedGoal.targetState.type === 'confirmation') {
        return {
            kind: 'assertState',
            path: 'pendingConfirmations',
            equals: expect.arrayContaining([expect.objectContaining({ action: 'publish' })]),
        };
    }

    if (parsedGoal.targetState.type === 'review') {
        return {
            kind: 'assertState',
            path: 'review',
            equals: expect.arrayContaining([expect.any(Object)]),
        };
    }

    return {
        kind: 'assertState',
        path: 'note.id',
        equals: expect.any(String),
    };
}

function createReloadStep(parsedGoal: ParsedGoal): Step {
    return {
        kind: 'navigate',
        hash: 'notes/synthesized-note',
    };
}

function createPersistenceAssertion(parsedGoal: ParsedGoal, statePathRegistry: StatePathRegistry): Step {
    if (parsedGoal.targetState.type === 'property') {
        const propKey = parsedGoal.targetState.path.split('.').pop();
        return {
            kind: 'assertState',
            path: `note.propertyIndex.${propKey}`,
            equals: ['test-value'],
        };
    }

    return {
        kind: 'assertState',
        path: 'note.id',
        equals: expect.any(String),
    };
}

export function resolveSelector(
    selector: { role?: string; name?: string; testId?: string; label?: string },
    selectors: Map<string, InferredSelector>
): Target | null {
    // Try exact match on testId
    if (selector.testId) {
        const found = Array.from(selectors.values()).find(s => s.target.testId === selector.testId);
        if (found) return found.target as Target;
    }

    // Match on role + name
    if (selector.role && selector.name) {
        const found = Array.from(selectors.values()).find(s =>
            s.target.role === selector.role && s.target.name === selector.name
        );
        if (found) return found.target as Target;
    }

    // Match on label
    if (selector.label) {
        const found = Array.from(selectors.values()).find(s => s.target.label === selector.label);
        if (found) return found.target as Target;
    }

    return null;
}