import { OntologyNode } from './types/index.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';

/**
 * Factory for creating ontology services with different configurations
 */
export class OntologyServiceFactory {
    /**
     * Create a standard ontology service with default ontology
     */
    static createStandardService(): OntologyService {
        return new OntologyService(DEFAULT_ONTOLOGY);
    }

    /**
     * Create an ontology service with custom ontology
     */
    static createCustomService(ontology: OntologyNode[]): OntologyService {
        return new OntologyService(ontology);
    }

    /**
     * Create an ontology service with cached results
     */
    static createCachedService(ontology: OntologyNode[]): OntologyService {
        return new OntologyService(ontology);
    }
}