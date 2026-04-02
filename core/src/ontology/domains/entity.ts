import type { OntologyNode } from '../../types/index.js';

/**
 * Entity domain ontology - People, Organizations, and Places
 */
export const entityDomain: OntologyNode[] = [
    {
        id: 'entity',
        label: 'Entity',
        description: 'The base for all things that can be identified.',
        children: [
            {
                id: 'product',
                label: 'Product',
                description: 'A product for sale or use.',
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Product name',
                        icon: 'shopping-cart',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    price: {
                        type: 'number',
                        description: 'Product price',
                        icon: 'cash',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
                    },
                    condition: {
                        type: 'enum',
                        options: ['new', 'used', 'refurbished'],
                        description: 'Product condition',
                        icon: 'star',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    category: {
                        type: 'string',
                        description: 'Product category',
                        icon: 'tag',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    }
                }
            },
            {
                id: 'person',
                label: 'Person',
                description: 'An individual human being.',
                requiredAttributes: ['name'],
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Full name.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    firstName: {
                        type: 'string',
                        description: 'First/given name.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    lastName: {
                        type: 'string',
                        description: 'Last/family name.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    email: {
                        type: 'string',
                        description: 'Email address',
                        icon: 'send',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    phone: {
                        type: 'string',
                        description: 'Phone number',
                        icon: 'chat',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    role: {
                        type: 'string',
                        description: 'Professional role or position',
                        icon: 'briefcase',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                        aliases: ['job', 'position', 'dev', 'title'],
                    },
                    organization: {
                        type: 'string',
                        description: 'Associated organization',
                        icon: 'building',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    relationships: {
                        type: 'relationship',
                        description: 'Relationships to other entities',
                        icon: 'link',
                        operators: { real: ['has'], imaginary: ['not has'] },
                        referenceType: 'entity'
                    },
                    intent: {
                        type: 'enum',
                        options: ['reminder', 'schedule', 'task', 'shopping', 'health', 'communication', 'monitor', 'automation'],
                        description: 'The inferred intent of the note',
                        icon: 'brain',
                        operators: { real: ['is'], imaginary: ['is not'] }
                    }
                },
            },
            {
                id: 'organization',
                label: 'Organization',
                description: 'A group of people with a particular purpose.',
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Organization name',
                        icon: 'building',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    website: {
                        type: 'string',
                        description: 'Official website URL',
                        icon: 'world',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    industry: {
                        type: 'string',
                        description: 'Industry or sector',
                        icon: 'industry',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    employees: {
                        type: 'number',
                        description: 'Number of employees',
                        icon: 'users',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] },
                    },
                    founded: {
                        type: 'date',
                        description: 'Founding date',
                        icon: 'calendar',
                        operators: { real: ['is'], imaginary: ['before', 'after'] },
                    },
                    location: {
                        type: 'geo',
                        description: 'Headquarters location',
                        icon: 'map-pin',
                        operators: { real: ['is'], imaginary: ['near'] },
                    }
                },
            },
            {
                id: 'place',
                label: 'Place',
                description: 'A physical location or venue.',
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Place name',
                        icon: 'map-pin',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    address: {
                        type: 'string',
                        description: 'Street address',
                        icon: 'home',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    city: {
                        type: 'string',
                        description: 'City name',
                        icon: 'building',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        aliases: ['loc', 'location'],
                    },
                    country: {
                        type: 'string',
                        description: 'Country name',
                        icon: 'world',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    coordinates: {
                        type: 'geo',
                        description: 'GPS coordinates',
                        icon: 'map',
                        operators: { real: ['is'], imaginary: ['near'] },
                    },
                    capacity: {
                        type: 'number',
                        description: 'Maximum capacity',
                        icon: 'users',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
                    },
                    amenities: {
                        type: 'enum',
                        options: ['wifi', 'parking', 'food', 'accessibility', 'av-equipment'],
                        description: 'Available amenities',
                        icon: 'star',
                        operators: { real: ['has'], imaginary: ['not has', 'contains'] }
                    }
                },
            }
        ]
    }
];
