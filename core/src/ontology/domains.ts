import type { OntologyNode } from '../types/index.js';
import { survivalDomains } from './survivalDomains.js';
import { governanceDomains } from './governanceDomains.js';

/**
 * Ontology domain definitions - consolidated from separate domain files
 * 
 * The ontology is split into logical domains for maintainability:
 * - entity: People, organizations, places
 * - communication: Messages and conversations
 * - event: Meetings, conferences, scheduled events
 * - work: Jobs, projects, tasks, freelance work
 * - commerce: Products, services, and transactions
 * - survival: Hazard, resource, shelter, medical, transport, comms (GSS)
 */

// ============================================================================
// ENTITY DOMAIN - People, Organizations, Places
// ============================================================================

export const entityDomain: OntologyNode[] = [
    {
        id: 'entity',
        label: 'Entity',
        description: 'The base for all things that can be identified.',
        children: [
            {
                id: 'person',
                label: 'Person',
                description: 'An individual human being.',
                requiredAttributes: ['name'],
                attributes: {
                    name: { type: 'string', description: 'Full name.', icon: 'user', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    email: { type: 'string', description: 'Email address', icon: 'send', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    phone: { type: 'string', description: 'Phone number', icon: 'chat', operators: { real: ['is'], imaginary: ['is not'] } },
                    role: { type: 'string', description: 'Professional role or position', icon: 'briefcase', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    organization: { type: 'string', description: 'Associated organization', icon: 'building', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    relationships: { type: 'relationship', description: 'Relationships to other entities', icon: 'link', operators: { real: ['has'], imaginary: ['not has'] }, referenceType: 'entity' },
                    type: { type: 'enum', options: ['event', 'task', 'person', 'item', 'journal', 'idea', 'request', 'offer', 'project', 'meeting', 'conference'], description: 'The type of note', icon: 'document', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' },
                    intent: { type: 'enum', options: ['request', 'offer', 'reminder', 'schedule', 'task', 'shopping', 'health', 'communication', 'monitor', 'automation'], description: 'The inferred intent of the note', icon: 'brain', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' }
                },
            },
            {
                id: 'organization',
                label: 'Organization',
                description: 'A group of people with a particular purpose.',
                attributes: {
                    name: { type: 'string', description: 'Organization name', icon: 'building', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    website: { type: 'string', description: 'Official website URL', icon: 'world', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    industry: { type: 'string', description: 'Industry or sector', icon: 'industry', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    employees: { type: 'number', description: 'Number of employees', icon: 'users', operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] } },
                    founded: { type: 'date', description: 'Founding date', icon: 'calendar', operators: { real: ['is'], imaginary: ['before', 'after'] } },
                    location: { type: 'geo', description: 'Headquarters location', icon: 'map-pin', operators: { real: ['is', 'contains', 'near'], imaginary: [] }, role: 'constraint' }
                },
            },
            {
                id: 'place',
                label: 'Place',
                description: 'A physical location or venue.',
                attributes: {
                    name: { type: 'string', description: 'Place name', icon: 'map-pin', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    address: { type: 'string', description: 'Street address', icon: 'home', operators: { real: ['is'], imaginary: ['contains'] } },
                    coordinates: { type: 'geo', description: 'GPS coordinates', icon: 'map', operators: { real: ['is'], imaginary: ['near'] } },
                    capacity: { type: 'number', description: 'Maximum capacity', icon: 'users', operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] } },
                    amenities: { type: 'enum', options: ['wifi', 'parking', 'food', 'accessibility', 'av-equipment'], description: 'Available amenities', icon: 'star', operators: { real: ['has'], imaginary: ['not has', 'contains'] } }
                },
            }
        ]
    }
];

// ============================================================================
// COMMUNICATION DOMAIN - Messages and Conversations
// ============================================================================

export const communicationDomain: OntologyNode[] = [
    {
        id: 'communication',
        label: 'Communication',
        description: 'Messages and conversations across channels.',
        children: [
            {
                id: 'message',
                label: 'Message',
                description: 'A communication sent through a channel.',
                attributes: {
                    title: { type: 'string', description: 'Title or subject of the message', icon: 'title', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    description: { type: 'string', description: 'Content of the message', icon: 'text', operators: { real: ['is'], imaginary: ['contains'] } },
                    body: { type: 'string', description: 'Body text of the message', icon: 'text', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    subject: { type: 'string', description: 'Subject line of the message', icon: 'title', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    conversationId: { type: 'string', description: 'Thread or conversation identifier', icon: 'chat-bubble', operators: { real: ['is'], imaginary: ['is not'] } },
                    channel: { type: 'enum', options: ['whatsapp', 'telegram', 'discord', 'sms', 'email', 'slack', 'teams', 'signal', 'call'], description: 'Communication channel', icon: 'share', operators: { real: ['is'], imaginary: ['is not'] } },
                    from: { type: 'string', description: 'Sender identifier (phone, email, username)', icon: 'arrow-left', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    to: { type: 'string', description: 'Recipient identifier', icon: 'arrow-right', operators: { real: ['is'], imaginary: ['send to'] } },
                    cc: { type: 'string', description: 'Carbon copy recipients', icon: 'copy', operators: { real: ['is'], imaginary: ['contains'] } },
                    bcc: { type: 'string', description: 'Blind carbon copy recipients', icon: 'eye-off', operators: { real: ['is'], imaginary: ['contains'] } },
                    messageType: { type: 'enum', options: ['text', 'image', 'voice', 'video', 'file', 'link', 'reaction', 'status'], description: 'Type of message content', icon: 'document', operators: { real: ['is'], imaginary: ['is not'] } },
                    priority: { type: 'enum', options: ['low', 'normal', 'high', 'urgent'], description: 'Priority level of the message', icon: 'priority', operators: { real: ['is'], imaginary: ['is not'] } },
                    status: { type: 'enum', options: ['sent', 'delivered', 'read', 'failed'], description: 'Delivery status of the message', icon: 'status', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' },
                    attachments: { type: 'number', description: 'Number of attachments', icon: 'attachment', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    sentiment: { type: 'enum', options: ['positive', 'neutral', 'negative', 'mixed'], description: 'Sentiment of the message', icon: 'sentiment', operators: { real: ['is'], imaginary: ['is not'] } }
                },
            },
        ],
    }
];

// ============================================================================
// EVENT DOMAIN - Meetings, Conferences, Scheduled Events
// ============================================================================

export const eventDomain: OntologyNode[] = [
    {
        id: 'event',
        label: 'Event',
        description: 'Something that happens, especially something of importance.',
        attributes: {
            title: { type: 'string', description: 'Title or name of the event', icon: 'title', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
            description: { type: 'string', description: 'Detailed description of the event', icon: 'info', operators: { real: ['is'], imaginary: ['contains'] } },
            startTime: { type: 'datetime', description: 'Start date and time', icon: 'clock', operators: { real: ['is'], imaginary: ['is after', 'is before'] } },
            endTime: { type: 'datetime', description: 'End date and time', icon: 'clock', operators: { real: ['is'], imaginary: ['is after', 'is before'] } },
            duration: { type: 'number', description: 'Duration in minutes', icon: 'timer', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
            location: { type: 'string', description: 'Where the event takes place (name, address, or coordinates)', icon: 'map-pin', operators: { real: ['is', 'contains', 'near'], imaginary: ['is not'] }, role: 'constraint' },
            eventType: { type: 'enum', options: ['meeting', 'conference', 'workshop', 'seminar', 'training', 'social', 'celebration', 'performance', 'sports', 'other'], description: 'Type of event', icon: 'calendar', operators: { real: ['is'], imaginary: ['is not'] } },
            status: { type: 'enum', options: ['planned', 'confirmed', 'in-progress', 'completed', 'cancelled', 'postponed'], description: 'Current status of the event', icon: 'status', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' },
            capacity: { type: 'number', description: 'Maximum number of attendees', icon: 'people', operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] } },
            attendees: { type: 'number', description: 'Number of registered attendees', icon: 'users', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
            organizer: { type: 'string', description: 'Organizer of the event', icon: 'organizer', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
            cost: { type: 'number', description: 'Cost of attending the event', icon: 'cash', operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] } },
            registrationUrl: { type: 'string', description: 'URL for event registration', icon: 'link', operators: { real: ['is'], imaginary: ['contains'] } }
        },
        children: [
            {
                id: 'meeting',
                label: 'Meeting',
                description: 'A scheduled gathering for discussion or decision-making.',
                attributes: {
                    meetingType: { type: 'enum', options: ['standup', 'review', 'planning', 'retrospective', 'one-on-one', 'team', 'client'], description: 'Type of meeting', icon: 'users', operators: { real: ['is'], imaginary: ['is not'] } },
                    agenda: { type: 'string', description: 'Meeting agenda items', icon: 'list', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    decisions: { type: 'string', description: 'Decisions made during the meeting', icon: 'check', operators: { real: ['has'], imaginary: ['not has'] } },
                    actionItems: { type: 'number', description: 'Number of action items assigned', icon: 'task', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    recurring: { type: 'boolean', description: 'Whether the meeting is recurring', icon: 'refresh', operators: { real: ['is'], imaginary: ['is not'] } },
                    recurrencePattern: { type: 'enum', options: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'], description: 'Recurrence pattern if recurring', icon: 'calendar-repeat', operators: { real: ['is'], imaginary: ['is not'] } }
                },
            },
            {
                id: 'conference',
                label: 'Conference',
                description: 'A large formal meeting or series of meetings.',
                attributes: {
                    conferenceType: { type: 'enum', options: ['academic', 'industry', 'trade', 'user-group', 'internal'], description: 'Type of conference', icon: 'building', operators: { real: ['is'], imaginary: ['is not'] } },
                    tracks: { type: 'number', description: 'Number of parallel tracks', icon: 'layers', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    keynoteSpeakers: { type: 'string', description: 'Keynote speakers', icon: 'microphone', operators: { real: ['has'], imaginary: ['not has', 'contains'] } },
                    submissionDeadline: { type: 'date', description: 'Paper/submission deadline', icon: 'calendar', operators: { real: ['is'], imaginary: ['before', 'after'] } }
                },
            }
        ]
    }
];

// ============================================================================
// WORK DOMAIN - Jobs, Projects, Tasks, Freelance Work
// ============================================================================

export const workDomain: OntologyNode[] = [
    {
        id: 'work',
        label: 'Work',
        description: 'Activity involving mental or physical effort.',
        children: [
            {
                id: 'job-request',
                label: 'Job Request',
                description: 'A request for work or hiring.',
                actionLabel: 'Post Job',
                extends: ['job', 'request'],
                requiredAttributes: ['role'],
                suggestions: [
                    {
                        id: 'rule-add-budget-for-job',
                        name: 'Add budget for job request',
                        description: 'Suggest adding budget when note is a job request',
                        targetNodeIds: ['work/job-request'],
                        condition: { type: 'nodeType', nodeId: 'work/job-request' },
                        action: {
                            type: 'suggestAddProperty',
                            key: 'budget',
                            operator: 'gte',
                            value: '0',
                            reason: 'Job requests should indicate a budget range'
                        },
                        priority: 10,
                        enabled: true
                    },
                    
                ],
                attributes: {
                    title: { type: 'string', description: 'Job title', icon: 'title', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    role: { type: 'string', description: 'The job title or role.', icon: 'briefcase', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    description: { type: 'string', description: 'Detailed job description', icon: 'info', operators: { real: ['is'], imaginary: ['contains'] } },
                    company: { type: 'string', description: 'Company offering the job', icon: 'building', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    location: { type: 'string', description: 'Job location', icon: 'location', operators: { real: ['is'], imaginary: ['is not', 'contains'] }, role: 'constraint' },
                    employmentType: { type: 'enum', options: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'volunteer'], description: 'Type of employment', icon: 'employment', operators: { real: ['is'], imaginary: ['is not'] } },
                    experienceLevel: { type: 'enum', options: ['entry', 'mid', 'senior', 'executive'], description: 'Required experience level', icon: 'experience', operators: { real: ['is'], imaginary: ['is not'] } },
                    skills: { type: 'string', description: 'Required skills', icon: 'skills', operators: { real: ['is', 'contains'], imaginary: ['is not'] }, role: 'constraint' },
                    budget: { type: 'number', description: 'Total budget amount.', icon: 'cash', operators: { real: ['is', 'less than', 'greater than', 'between'], imaginary: [] }, numericOptions: { unit: 'USD', precision: 2 }, role: 'constraint' },
                    rate: { type: 'number', description: 'Service rate (e.g., per hour, per day, per project).', icon: 'cash-clock', operators: { real: ['is'], imaginary: ['greater than', 'less than', 'between'] }, numericOptions: { unit: 'USD/project', precision: 2 }, role: 'constraint' },
                    remote: { type: 'enum', options: ['true', 'false', 'hybrid'], description: 'Whether the job is remote', icon: 'remote', operators: { real: ['is'], imaginary: ['is not'] } }
                }
            },
            {
                id: 'freelance-offer',
                label: 'Freelance Offer',
                description: 'Offering services as a freelancer.',
                actionLabel: 'Post Offer',
                extends: ['freelance', 'offer'],
                requiredAttributes: ['role', 'rate'],
                suggestions: [
                    {
                        id: 'rule-add-contact-for-offers',
                        name: 'Add contact for offer notes',
                        description: 'Offers should include contact information',
                        targetNodeIds: ['work/freelance-offer'],
                        condition: { type: 'nodeType', nodeId: 'work/freelance-offer' },
                        action: {
                            type: 'suggestAddProperty',
                            key: 'contact',
                            operator: 'is',
                            value: '',
                            reason: 'Offers should include contact information'
                        },
                        priority: 10,
                        enabled: true
                    }
                ],
                attributes: {
                    title: { type: 'string', description: 'Service title', icon: 'title', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    role: { type: 'string', description: 'The role offered.', icon: 'briefcase', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    description: { type: 'string', description: 'Detailed service description', icon: 'info', operators: { real: ['is'], imaginary: ['contains'] } },
                    skills: { type: 'string', description: 'Skills offered', icon: 'skills', operators: { real: ['is', 'contains'], imaginary: ['is not'] }, role: 'constraint' },
                    rate: { type: 'number', description: 'Service rate (e.g., per hour, per day, per project).', icon: 'cash-clock', operators: { real: ['is'], imaginary: ['greater than', 'less than', 'between'] }, numericOptions: { unit: 'USD/project', precision: 2 }, role: 'constraint' },
                    availability: { type: 'string', description: 'When the service is available', icon: 'calendar', operators: { real: ['is'], imaginary: ['contains'] } },
                    deliveryTime: { type: 'number', description: 'Expected delivery time in days', icon: 'timer', operators: { real: ['is'], imaginary: ['greater than', 'less than'] }, numericOptions: { unit: 'day', precision: 0 }, role: 'constraint' }
                }
            },
            {
                id: 'project',
                label: 'Project',
                description: 'A planned piece of work.',
                requiredAttributes: ['deadline'],
                attributes: {
                    title: { type: 'string', description: 'Project title', icon: 'title', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    description: { type: 'string', description: 'Project description', icon: 'info', operators: { real: ['is'], imaginary: ['contains'] } },
                    status: { type: 'enum', options: ['planning', 'active', 'on-hold', 'completed', 'cancelled'], description: 'Project status', icon: 'status', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' },
                    priority: { type: 'enum', options: ['low', 'medium', 'high', 'critical'], description: 'Project priority', icon: 'priority', operators: { real: ['is'], imaginary: ['is not'] } },
                    deadline: { type: 'date', description: 'Project deadline', icon: 'calendar', operators: { real: ['is', 'contains', 'before', 'after', 'less than'], imaginary: [] } },
                    budget: { type: 'number', description: 'Total project budget', icon: 'cash', operators: { real: ['is', 'less than', 'greater than', 'between'], imaginary: [] }, numericOptions: { unit: 'USD', precision: 2 }, role: 'constraint' },
                    teamSize: { type: 'number', description: 'Number of team members', icon: 'team', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } }
                }
            },
            {
                id: 'task',
                label: 'Task',
                description: 'A piece of work to be done.',
                attributes: {
                    title: { type: 'string', description: 'Task title', icon: 'title', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    description: { type: 'string', description: 'Task description', icon: 'info', operators: { real: ['is'], imaginary: ['contains'] } },
                    status: { type: 'enum', options: ['todo', 'in-progress', 'review', 'done', 'blocked'], description: 'Task status', icon: 'status', operators: { real: ['is'], imaginary: ['is not'] }, role: 'marker' },
                    priority: { type: 'enum', options: ['low', 'medium', 'high', 'urgent'], description: 'Task priority', icon: 'priority', operators: { real: ['is'], imaginary: ['is not'] } },
                    dueDate: { type: 'date', description: 'Task due date', icon: 'calendar', operators: { real: ['is', 'contains', 'before', 'after'], imaginary: [] } },
                    estimatedHours: { type: 'number', description: 'Estimated hours to complete', icon: 'clock', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    actualHours: { type: 'number', description: 'Actual hours spent', icon: 'timer', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    assignee: { type: 'string', description: 'Person assigned to the task', icon: 'user', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    labels: { type: 'string', description: 'Task labels or tags', icon: 'tag', operators: { real: ['has'], imaginary: ['not has', 'contains'] } }
                }
            }
        ]
    }
];

// ============================================================================
// COMMERCE DOMAIN - Products, Services, Transactions
// ============================================================================

export const commerceDomain: OntologyNode[] = [
    {
        id: 'commerce',
        label: 'Commerce',
        description: 'Buying and selling of goods and services.',
        children: [
            {
                id: 'product',
                label: 'Product',
                description: 'An article or substance that is manufactured or refined for sale.',
                attributes: {
                    title: { type: 'string', description: 'Product name', icon: 'package', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    price: { type: 'number', description: 'Sale price', icon: 'cash', operators: { real: ['is', 'equals', 'less than', 'greater than', 'between'], imaginary: [] }, numericOptions: { unit: 'USD', precision: 2 }, role: 'constraint' },
                    condition: { type: 'enum', options: ['new', 'like-new', 'used', 'refurbished'], description: 'Product condition', icon: 'star', operators: { real: ['is'], imaginary: ['is not'] } },
                    category: { type: 'string', description: 'Product category', icon: 'tag', operators: { real: ['is'], imaginary: ['contains'] } },
                    brand: { type: 'string', description: 'Product brand', icon: 'copyright', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    sku: { type: 'string', description: 'Stock Keeping Unit', icon: 'barcode', operators: { real: ['is'], imaginary: ['is not'] } },
                    stock: { type: 'number', description: 'Items in stock', icon: 'inventory', operators: { real: ['is'], imaginary: ['greater than', 'less than'] } },
                    purchasePrice: { type: 'number', description: 'Purchase price', icon: 'cash', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] }, numericOptions: { unit: 'USD', precision: 2 }, role: 'constraint' },
                    priceRate: { type: 'number', description: 'Price rate', icon: 'cash-clock', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] }, numericOptions: { unit: 'USD/hour', precision: 2 }, role: 'constraint' }
                }
            }
        ]
    }
];

// ============================================================================
// SOCIAL DOMAIN - Meetups, events, community gatherings
// ============================================================================

export const socialDomain: OntologyNode[] = [
    {
        id: 'social',
        label: 'Social',
        description: 'Social gatherings, meetups, and community events.',
        children: [
            {
                id: 'meetup-request',
                label: 'Meetup Request',
                description: 'A request to organize or join a social gathering.',
                actionLabel: 'Plan Meetup',
                extends: ['event', 'request'],
                requiredAttributes: ['location'],
                suggestions: [
                    {
                        id: 'rule-add-location-for-meetup',
                        name: 'Add location for meetup',
                        description: 'Suggest adding location when note is a meetup request',
                        targetNodeIds: ['social/meetup-request'],
                        condition: { type: 'nodeType', nodeId: 'social/meetup-request' },
                        action: {
                            type: 'suggestAddProperty',
                            key: 'location',
                            operator: 'is',
                            value: '',
                            reason: 'Meetup requests should include a location'
                        },
                        priority: 10,
                        enabled: true
                    }
                ],
                attributes: {
                    location: { type: 'string', description: 'Meetup location', icon: 'location', operators: { real: ['is', 'contains'], imaginary: ['is not', 'contains'] }, role: 'constraint' },
                    date: { type: 'string', description: 'Meetup date and time', icon: 'calendar', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    frequency: { type: 'string', description: 'How often the meetup recurs', icon: 'refresh', operators: { real: ['is'], imaginary: ['is not'] } },
                    capacity: { type: 'number', description: 'Maximum number of attendees', icon: 'users', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] } },
                    topic: { type: 'string', description: 'Topic or theme of the meetup', icon: 'tag', operators: { real: ['is', 'contains'], imaginary: ['is not', 'contains'] } },
                    format: { type: 'enum', options: ['in-person', 'virtual', 'hybrid'], description: 'Meetup format', icon: 'monitor', operators: { real: ['is'], imaginary: ['is not'] } }
                }
            }
        ]
    }
];

// ============================================================================
// REQUEST DOMAIN - Needs, offers, and requests for things
// ============================================================================

export const requestDomain: OntologyNode[] = [
    {
        id: 'request',
        label: 'Request',
        description: 'A stated need or request for a service, item, or action.',
        children: [
            {
                id: 'need-request',
                label: 'Need Request',
                description: 'Something a person is looking for.',
                requiredAttributes: ['need'],
                suggestions: [
                    {
                        id: 'rule-add-schedule-for-recurring',
                        name: 'Add schedule for recurring requests',
                        description: 'Suggest adding schedule when frequency is specified',
                        targetNodeIds: ['request/need-request'],
                        condition: { type: 'hasProperty', key: 'frequency' },
                        action: {
                            type: 'suggestAddProperty',
                            key: 'schedule',
                            operator: 'is',
                            value: '',
                            reason: 'Recurring requests should specify a schedule'
                        },
                        priority: 8,
                        enabled: true
                    },
                    {
                        id: 'rule-add-deadline-for-urgent',
                        name: 'Add deadline for urgent requests',
                        description: 'Suggest adding deadline when priority is high',
                        targetNodeIds: ['request/need-request'],
                        condition: { type: 'propertyValueIn', key: 'priority', values: ['high', 'urgent', 'critical'] },
                        action: {
                            type: 'suggestAddProperty',
                            key: 'deadline',
                            operator: 'is',
                            value: '',
                            reason: 'Urgent requests should have a deadline'
                        },
                        priority: 12,
                        enabled: true
                    },
                    
                ],
                attributes: {
                    need: { type: 'string', description: 'What is needed.', icon: 'sparkles', operators: { real: ['is', 'contains'], imaginary: ['is not', 'contains'] } },
                    schedule: { type: 'string', description: 'When the need applies.', icon: 'clock', operators: { real: ['is', 'contains'], imaginary: ['is not', 'contains'] } },
                    frequency: { type: 'string', description: 'How often the need recurs.', icon: 'refresh', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    item: { type: 'string', description: 'Physical goods requested.', icon: 'package', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    recipient: { type: 'string', description: 'Who the request is for.', icon: 'user', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    audience: { type: 'string', description: 'Intended beneficiaries.', icon: 'users', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    format: { type: 'string', description: 'Delivery format (virtual, in-person, hybrid).', icon: 'monitor', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    level: { type: 'string', description: 'Skill or experience level.', icon: 'trending-up', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    subject: { type: 'string', description: 'Subject taught or discussed.', icon: 'book', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    topic: { type: 'string', description: 'Topic of the service.', icon: 'tag', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    focus: { type: 'string', description: 'Focus area of the service.', icon: 'target', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    student: { type: 'string', description: 'Learner in the request.', icon: 'user', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    patient: { type: 'string', description: 'Care recipient in the request.', icon: 'heart', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    vehicle: { type: 'string', description: 'Vehicle requirements.', icon: 'truck', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    property: { type: 'string', description: 'Property being serviced.', icon: 'home', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    event: { type: 'string', description: 'Occasion of the request.', icon: 'calendar', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    task: { type: 'string', description: 'Task to be performed.', icon: 'check', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    certification: { type: 'string', description: 'Certifications required.', icon: 'badge', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    dietary: { type: 'string', description: 'Dietary constraints.', icon: 'leaf', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                    service: { type: 'string', description: 'Service needed or offered.', icon: 'wrench', operators: { real: ['is', 'contains'], imaginary: ['is not'] } },
                }
            }
        ]
    }
];

// ============================================================================
// COMBINE DOMAINS
// ============================================================================

/**
 * Combine all domains into a single ontology array
 */
export function combineDomains(...domains: OntologyNode[][]): OntologyNode[] {
    return domains.flat();
}

/**
 * Default combined ontology with GSS survival domains
 */
export const DEFAULT_ONTOLOGY: OntologyNode[] = combineDomains(
    entityDomain,
    communicationDomain,
    eventDomain,
    workDomain,
    socialDomain,
    commerceDomain,
    requestDomain,
    survivalDomains,
    governanceDomains
);
