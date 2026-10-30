import type { OntologyNode } from '../types/index.js';

/**
 * Facets + Status Ontology
 * 
 * This variant adds a lifecycle/status facet at the note level,
 * enabling explicit tracking of note progression: open → matched → committed → done → lapsed
 * 
 * Compared to the flat ontology (domains.ts), this adds:
 * - A 'note' entity with status, deadline, and commitment fields
 * - Status facet with valid transitions
 * - Commitment metadata support
 */

// ============================================================================
// NOTE DOMAIN - Core note lifecycle with status facet
// ============================================================================

export const noteDomain: OntologyNode[] = [
    {
        id: 'note',
        label: 'Note',
        description: 'A structured note with lifecycle status and commitment tracking',
        requiredAttributes: [],
        attributes: {
            status: { 
                type: 'enum', 
                options: ['open', 'matched', 'committed', 'done', 'lapsed'], 
                description: 'Lifecycle status of the note', 
                icon: 'status', 
                operators: { real: ['is'], imaginary: ['is not'] } 
            },
            deadline: { 
                type: 'date', 
                description: 'Deadline for committed items', 
                icon: 'calendar', 
                operators: { real: ['is'], imaginary: ['before', 'after'] } 
            },
            commitment: { 
                type: 'string', 
                description: 'Commitment metadata (JSON)', 
                icon: 'lock', 
                operators: { real: ['has'], imaginary: ['not has'] } 
            },
            priority: { 
                type: 'enum', 
                options: ['low', 'medium', 'high', 'critical'], 
                description: 'Priority level', 
                icon: 'priority', 
                operators: { real: ['is'], imaginary: ['is not'] } 
            },
        },
        children: [
            // Note can have entity-like properties
            {
                id: 'noteEntity',
                label: 'Note Entity',
                description: 'Entity properties that can be attached to a note',
                attributes: {
                    entityName: { type: 'string', description: 'Entity name', icon: 'user', operators: { real: ['is'], imaginary: ['is not', 'contains'] } },
                    entityType: { type: 'enum', options: ['person', 'organization', 'place'], description: 'Type of entity', icon: 'tag', operators: { real: ['is'], imaginary: ['is not'] } },
                },
            },
        ],
    },
];

// ============================================================================
// COMMITMENT DOMAIN - Explicit commitment tracking
// ============================================================================

export const commitmentDomain: OntologyNode[] = [
    {
        id: 'commitment',
        label: 'Commitment',
        description: 'Explicit commitment with deadline and related notes',
        attributes: {
            committedAt: { type: 'datetime', description: 'When the commitment was made', icon: 'clock', operators: { real: ['is'], imaginary: ['before', 'after'] } },
            expectedCompletion: { type: 'date', description: 'Expected completion date', icon: 'calendar', operators: { real: ['is'], imaginary: ['before', 'after'] } },
            relatedNoteIds: { type: 'string', description: 'Related note IDs (comma-separated)', icon: 'link', operators: { real: ['has'], imaginary: ['not has'] } },
            status: { type: 'enum', options: ['active', 'completed', 'missed', 'cancelled'], description: 'Commitment status', icon: 'status', operators: { real: ['is'], imaginary: ['is not'] } },
        },
    },
];

/**
 * Combine facets+status domains with base domains
 * This creates the "facets+status" variant for the experiment
 */
import { entityDomain, communicationDomain, eventDomain, workDomain, commerceDomain } from './domains.js';

export function combineFacetsStatusDomains(): OntologyNode[] {
    return [
        ...entityDomain,
        ...communicationDomain,
        ...eventDomain,
        ...workDomain,
        ...commerceDomain,
        ...noteDomain,
        ...commitmentDomain,
    ];
}

export const FACETS_STATUS_ONTOLOGY: OntologyNode[] = combineFacetsStatusDomains();