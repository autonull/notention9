import type { OntologyNode } from './types/index.js';
import { entityDomain, communicationDomain, eventDomain, workDomain, commerceDomain } from './ontology/domains/index.js';

/**
 * Default Ontology - Combined from modular domain definitions
 * 
 * The ontology is split into logical domains for maintainability:
 * - entityDomain: People, organizations, places
 * - communicationDomain: Messages and conversations  
 * - eventDomain: Meetings, conferences, scheduled events
 * - workDomain: Jobs, projects, tasks, freelance work
 * - commerceDomain: Products, services, and transactions
 */
export const DEFAULT_ONTOLOGY: OntologyNode[] = [
    ...entityDomain,
    ...communicationDomain,
    ...eventDomain,
    ...workDomain,
    ...commerceDomain
];
