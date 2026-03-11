import type { OntologyNode } from '../../types/index.js';

/**
 * Event domain ontology - Meetings, conferences, and scheduled events
 */
export const eventDomain: OntologyNode[] = [
    {
        id: 'event',
        label: 'Event',
        description: 'Something that happens, especially something of importance.',
        attributes: {
            title: {
                type: 'string',
                description: 'Title or name of the event',
                icon: 'title',
                operators: { real: ['is'], imaginary: ['is not', 'contains'] },
            },
            description: {
                type: 'string',
                description: 'Detailed description of the event',
                icon: 'info',
                operators: { real: ['is'], imaginary: ['contains'] },
            },
            startDateTime: {
                type: 'datetime',
                description: 'The start date and time',
                icon: 'clock',
                operators: { real: ['is'], imaginary: ['is after', 'is before'] },
            },
            endDateTime: {
                type: 'datetime',
                description: 'The end date and time',
                icon: 'clock',
                operators: { real: ['is'], imaginary: ['is after', 'is before'] },
            },
            duration: {
                type: 'number',
                description: 'Duration in minutes',
                icon: 'timer',
                operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
            },
            venue: {
                type: 'string',
                description: 'The name of the place where the event takes place',
                icon: 'map-pin',
                operators: { real: ['is'], imaginary: ['is not'] },
            },
            location: {
                type: 'geo',
                description: 'Geographic coordinates of the venue',
                icon: 'map',
                operators: { real: ['is'], imaginary: ['is near'] },
            },
            eventType: {
                type: 'enum',
                options: ['meeting', 'conference', 'workshop', 'seminar', 'training', 'social', 'celebration', 'performance', 'sports', 'other'],
                description: 'Type of event',
                icon: 'calendar',
                operators: { real: ['is'], imaginary: ['is not'] },
            },
            status: {
                type: 'enum',
                options: ['planned', 'confirmed', 'in-progress', 'completed', 'cancelled', 'postponed'],
                description: 'Current status of the event',
                icon: 'status',
                operators: { real: ['is'], imaginary: ['is not'] },
            },
            capacity: {
                type: 'number',
                description: 'Maximum number of attendees',
                icon: 'people',
                operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
            },
            attendees: {
                type: 'number',
                description: 'Number of registered attendees',
                icon: 'users',
                operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
            },
            organizer: {
                type: 'string',
                description: 'Organizer of the event',
                icon: 'organizer',
                operators: { real: ['is'], imaginary: ['is not', 'contains'] },
            },
            cost: {
                type: 'number',
                description: 'Cost of attending the event',
                icon: 'cash',
                operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] },
            },
            registrationUrl: {
                type: 'string',
                description: 'URL for event registration',
                icon: 'link',
                operators: { real: ['is'], imaginary: ['contains'] },
            }
        },
        children: [
            {
                id: 'meeting',
                label: 'Meeting',
                description: 'A scheduled gathering for discussion or decision-making.',
                attributes: {
                    meetingType: {
                        type: 'enum',
                        options: ['standup', 'review', 'planning', 'retrospective', 'one-on-one', 'team', 'client'],
                        description: 'Type of meeting',
                        icon: 'users',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    agenda: {
                        type: 'string',
                        description: 'Meeting agenda items',
                        icon: 'list',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    decisions: {
                        type: 'string',
                        description: 'Decisions made during the meeting',
                        icon: 'check',
                        operators: { real: ['has'], imaginary: ['not has'] },
                    },
                    actionItems: {
                        type: 'number',
                        description: 'Number of action items assigned',
                        icon: 'task',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    recurring: {
                        type: 'boolean',
                        description: 'Whether the meeting is recurring',
                        icon: 'refresh',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    recurrencePattern: {
                        type: 'enum',
                        options: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'],
                        description: 'Recurrence pattern if recurring',
                        icon: 'calendar-repeat',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    }
                },
            },
            {
                id: 'conference',
                label: 'Conference',
                description: 'A large formal meeting or series of meetings.',
                attributes: {
                    conferenceType: {
                        type: 'enum',
                        options: ['academic', 'industry', 'trade', 'user-group', 'internal'],
                        description: 'Type of conference',
                        icon: 'building',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    tracks: {
                        type: 'number',
                        description: 'Number of parallel tracks',
                        icon: 'layers',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    keynoteSpeakers: {
                        type: 'string',
                        description: 'Keynote speakers',
                        icon: 'microphone',
                        operators: { real: ['has'], imaginary: ['not has', 'contains'] },
                    },
                    submissionDeadline: {
                        type: 'date',
                        description: 'Paper/submission deadline',
                        icon: 'calendar',
                        operators: { real: ['is'], imaginary: ['before', 'after'] },
                    }
                },
            }
        ]
    }
];
