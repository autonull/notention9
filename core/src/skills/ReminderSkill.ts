import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';

/**
 * ReminderSkill - Semantic Reminder & Scheduling
 *
 * Matches notes with temporal intent and standardizes their date/time properties.
 */
export class ReminderSkill implements Skill {
    id = 'skill-reminder-v1';
    name = 'Semantic Reminder';
    description = 'Standardizes and schedules reminders based on semantic properties.';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['intent'],
            optional: ['date', 'time', 'datetime', 'due'],
            minProperties: 1
        },
        {
            required: ['dueDate'],
            optional: ['priority']
        },
        {
            required: ['deadline'],
            optional: ['status']
        }
    ];

    canHandle(note: Note): number {
        // 1. Explicit Intent
        const intent = note.properties.find(p => p.key === 'intent');
        if (intent && ['reminder', 'schedule', 'task'].some(v => intent.values.includes(v))) {
            return 1.0;
        }

        // 2. Temporal Properties (Implicit Reminder)
        const temporalKeys = ['dueDate', 'deadline', 'startDateTime', 'date', 'time'];
        if (note.properties.some(p => temporalKeys.includes(p.key))) {
            return 0.8;
        }

        return 0;
    }

    exportToActions(note: Note): ActionSequence {
        // This skill is primarily internal (data standardization),
        // but could export to an external Calendar API in the future.
        // For now, it returns a "no-op" or validation action.

        return {
            id: `reminder-check-${Date.now()}`,
            name: `Validate Reminder`,
            sourceNote: note,
            actions: [], // Internal processing only
            expectedOutcome: 'Reminder scheduled in system'
        };
    }

    importFromData(data: unknown, sourceNote: Note): Note[] {
        // Not used for this skill
        return [];
    }

    /**
     * Skill-specific method: Standardize date properties
     * (This logic could be moved to a transform method if the Skill interface supported it)
     */
    standardize(note: Note): Note {
        // Implementation would normalize 'tomorrow at 5pm' to ISO string
        // But for now we rely on the PropertyExtractor's date strategy
        return note;
    }
}
