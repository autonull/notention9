/**
 * Task derivation logic for discover subcommand
 */

import type { Seam, OntologyData } from '@notention/optimize/discovery';

export interface DerivedTask {
    id: string;
    name: string;
    type: string;
    seam: string;
    acceptance: Record<string, unknown>;
}

export function deriveTasks(
    taxonomy: unknown,
    ontology: OntologyData,
    seams: Seam[]
): DerivedTask[] {
    const tasks: DerivedTask[] = [];

    // Task 1: Capture need with ≥3 properties in <20s
    tasks.push({
        id: 'task-1',
        name: 'Capture need with ≥3 properties in <20s',
        type: 'capture',
        seam: 'capture',
        acceptance: { minProperties: 3, maxTimeSeconds: 20 },
    });

    // Task 2: Capture offer → ≥1 match without re-edit
    tasks.push({
        id: 'task-2',
        name: 'Capture offer → ≥1 match without re-edit',
        type: 'match',
        seam: 'match-display',
        acceptance: { minMatches: 1, maxReedits: 0 },
    });

    // Task 3: Paragraph → valid structured note
    tasks.push({
        id: 'task-3',
        name: 'Paragraph → valid structured note',
        type: 'extraction',
        seam: 'extraction',
        acceptance: { schemaValid: true, minFields: 3 },
    });

    // Task 4: Open note → commitment with status+deadline
    tasks.push({
        id: 'task-4',
        name: 'Open note → commitment with status+deadline',
        type: 'commitment',
        seam: 'intent-surface',
        acceptance: { hasStatus: true, hasDeadline: true },
    });

    // Task 5: Find note by intent
    tasks.push({
        id: 'task-5',
        name: 'Find note by intent',
        type: 'search',
        seam: 'intent-surface',
        acceptance: { findsTarget: true },
    });

    // Task 6: Add missing detail after failed match
    tasks.push({
        id: 'task-6',
        name: 'Add missing detail after failed match',
        type: 'recovery',
        seam: 'detail-elicitation',
        acceptance: { recoversFromFailure: true },
    });

    return tasks;
}