/**
 * Ontology domain modules
 * 
 * The ontology is split into logical domains for better maintainability:
 * - entity: People, organizations, places
 * - communication: Messages and conversations
 * - event: Meetings, conferences, scheduled events
 * - work: Jobs, projects, tasks
 */

export { entityDomain } from './entity.js';
export { communicationDomain } from './communication.js';
export { eventDomain } from './event.js';
export { workDomain } from './work.js';

/**
 * Combine all domains into a single ontology array
 */
export function combineDomains(...domains: OntologyNode[][]): OntologyNode[] {
    return domains.flat();
}

import type { OntologyNode } from '../../types/index.js';
