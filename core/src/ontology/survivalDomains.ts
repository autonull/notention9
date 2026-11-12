import type { OntologyNode } from '../types/index.js';

/**
 * GSS (General Survival System) Ontology Domains
 * 
 * These domains provide the vocabulary for survival coordination:
 * - hazard: Environmental dangers and threats
 * - resource: Consumable and durable supplies
 * - shelter: Protective structures and locations
 * - medical: Health-related needs and capabilities
 * - transport: Movement and logistics
 * - comms: Communication capabilities
 */

// ============================================================================
// HAZARD DOMAIN - Environmental dangers and threats
// ============================================================================
export const hazardDomain: OntologyNode[] = [
    {
        id: 'hazard',
        label: 'Hazard',
        description: 'Environmental dangers, threats, and exclusion zones.',
        children: [
            {
                id: 'hazard-zone',
                label: 'Hazard Zone',
                description: 'A geographic area with a specific hazard.',
                requiredAttributes: ['hazardType', 'severity'],
                attributes: {
                    hazardType: {
                        type: 'enum',
                        options: ['radiation', 'chemical', 'biological', 'fire', 'flood', 'structural', 'violence', 'fallout', 'contamination', 'extreme-heat', 'extreme-cold', 'storm', 'landslide', 'other'],
                        description: 'Type of hazard present.',
                        icon: 'radiation',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    severity: {
                        type: 'enum',
                        options: ['lethal', 'severe', 'moderate', 'low', 'negligible'],
                        description: 'Severity level of the hazard.',
                        icon: 'alert-triangle',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    radius: {
                        type: 'number',
                        description: 'Radius of hazard zone in meters.',
                        icon: 'circle',
                        operators: { real: ['is', 'less than', 'greater than', 'between'], imaginary: ['is not'] },
                        numericOptions: { unit: 'm', precision: 0 },
                        role: 'fact'
                    },
                    center: {
                        type: 'geo',
                        description: 'Center coordinates of hazard zone.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'fact'
                    },
                    detectedAt: {
                        type: 'datetime',
                        description: 'When the hazard was detected.',
                        icon: 'clock',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    },
                    source: {
                        type: 'string',
                        description: 'Source of hazard detection (sensor, report, official).',
                        icon: 'database',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    expiresAt: {
                        type: 'datetime',
                        description: 'When the hazard is expected to clear (if known).',
                        icon: 'clock',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details about the hazard.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            },
            {
                id: 'hazard-exposure',
                label: 'Hazard Exposure',
                description: 'Record of a person or group being exposed to a hazard.',
                requiredAttributes: ['personId', 'hazardType', 'duration'],
                attributes: {
                    personId: {
                        type: 'string',
                        description: 'ID of the exposed person.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    hazardType: {
                        type: 'enum',
                        options: ['radiation', 'chemical', 'biological', 'fire', 'flood', 'structural', 'violence', 'fallout', 'contamination', 'extreme-heat', 'extreme-cold', 'storm', 'landslide', 'other'],
                        description: 'Type of hazard encountered.',
                        icon: 'radiation',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    severity: {
                        type: 'enum',
                        options: ['lethal', 'severe', 'moderate', 'low', 'negligible'],
                        description: 'Severity of exposure.',
                        icon: 'alert-triangle',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    duration: {
                        type: 'number',
                        description: 'Duration of exposure in minutes.',
                        icon: 'clock',
                        operators: { real: ['is', 'less than', 'greater than'], imaginary: [] },
                        numericOptions: { unit: 'min', precision: 0 },
                        role: 'fact'
                    },
                    protectionUsed: {
                        type: 'boolean',
                        description: 'Whether protective equipment was used.',
                        icon: 'shield',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    protectionType: {
                        type: 'string',
                        description: 'Type of protection used (e.g., N95, hazmat, lead).',
                        icon: 'shield',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    symptoms: {
                        type: 'string',
                        description: 'Observed symptoms after exposure.',
                        icon: 'heart',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    timestamp: {
                        type: 'datetime',
                        description: 'When exposure occurred.',
                        icon: 'clock',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

// ============================================================================
// RESOURCE DOMAIN - Consumable and durable supplies
// ============================================================================
export const resourceDomain: OntologyNode[] = [
    {
        id: 'resource',
        label: 'Resource',
        description: 'Consumable supplies, equipment, and caches.',
        children: [
            {
                id: 'resource-cache',
                label: 'Resource Cache',
                description: 'A stored or discovered cache of resources.',
                requiredAttributes: ['resourceType', 'quantity'],
                attributes: {
                    resourceType: {
                        type: 'enum',
                        options: ['water', 'food', 'medical', 'fuel', 'ammunition', 'tools', 'shelter-material', 'clothing', 'communication', 'power', 'sanitation', 'other'],
                        description: 'Category of resource.',
                        icon: 'package',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Specific name of resource (e.g., "MRE", "IV bags", "5.56mm").',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    quantity: {
                        type: 'number',
                        description: 'Amount available.',
                        icon: 'hash',
                        operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
                        numericOptions: { unit: 'units', precision: 0 },
                        role: 'constraint'
                    },
                    unit: {
                        type: 'enum',
                        options: ['liters', 'kilograms', 'units', 'days', 'rounds', 'watts', 'volts', 'meters', 'square-meters'],
                        description: 'Unit of measurement.',
                        icon: 'ruler',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    location: {
                        type: 'geo',
                        description: 'Location of the cache.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'constraint'
                    },
                    condition: {
                        type: 'enum',
                        options: ['sealed', 'good', 'damaged', 'expired', 'compromised'],
                        description: 'Condition of the resource.',
                        icon: 'check-circle',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    expiresAt: {
                        type: 'datetime',
                        description: 'Expiration date if applicable.',
                        icon: 'calendar',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    },
                    owner: {
                        type: 'string',
                        description: 'Owner or controlling group.',
                        icon: 'users',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    access: {
                        type: 'enum',
                        options: ['open', 'restricted', 'private', 'contested'],
                        description: 'Access level for the cache.',
                        icon: 'lock',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            },
            {
                id: 'resource-need',
                label: 'Resource Need',
                description: 'A stated need for a resource by a person or group.',
                requiredAttributes: ['resourceType', 'quantity', 'urgency'],
                attributes: {
                    resourceType: {
                        type: 'enum',
                        options: ['water', 'food', 'medical', 'fuel', 'ammunition', 'tools', 'shelter-material', 'clothing', 'communication', 'power', 'sanitation', 'other'],
                        description: 'Category of resource needed.',
                        icon: 'package',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Specific resource name.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    quantity: {
                        type: 'number',
                        description: 'Amount needed.',
                        icon: 'hash',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'units', precision: 0 },
                        role: 'constraint'
                    },
                    unit: {
                        type: 'enum',
                        options: ['liters', 'kilograms', 'units', 'days', 'rounds', 'watts', 'volts', 'meters', 'square-meters'],
                        description: 'Unit of measurement.',
                        icon: 'ruler',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    urgency: {
                        type: 'enum',
                        options: ['critical', 'urgent', 'normal', 'low'],
                        description: 'Urgency of the need.',
                        icon: 'alert-triangle',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    personId: {
                        type: 'string',
                        description: 'ID of person with the need.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    groupId: {
                        type: 'string',
                        description: 'ID of group with the need.',
                        icon: 'users',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    deadline: {
                        type: 'datetime',
                        description: 'When the need must be met.',
                        icon: 'clock',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'constraint'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

// ============================================================================
// SHELTER DOMAIN - Protective structures and locations
// ============================================================================
export const shelterDomain: OntologyNode[] = [
    {
        id: 'shelter',
        label: 'Shelter',
        description: 'Protective structures, buildings, and safe locations.',
        children: [
            {
                id: 'shelter-site',
                label: 'Shelter Site',
                description: 'A location suitable for shelter.',
                requiredAttributes: ['shelterType', 'capacity'],
                attributes: {
                    shelterType: {
                        type: 'enum',
                        options: ['building', 'bunker', 'cave', 'vehicle', 'tent', 'improvised', 'underground', 'elevated', 'watercraft', 'aircraft'],
                        description: 'Type of shelter.',
                        icon: 'home',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Name or identifier of the shelter.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    capacity: {
                        type: 'number',
                        description: 'Maximum number of occupants.',
                        icon: 'users',
                        operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
                        numericOptions: { unit: 'people', precision: 0 },
                        role: 'constraint'
                    },
                    currentOccupancy: {
                        type: 'number',
                        description: 'Current number of occupants.',
                        icon: 'users',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'people', precision: 0 },
                        role: 'fact'
                    },
                    location: {
                        type: 'geo',
                        description: 'GPS coordinates of shelter.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'constraint'
                    },
                    protectionLevel: {
                        type: 'enum',
                        options: ['none', 'weather', 'fallout', 'blast', 'chemical', 'biological', 'comprehensive'],
                        description: 'Level of protection provided.',
                        icon: 'shield',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    hasWater: {
                        type: 'boolean',
                        description: 'Access to water at shelter.',
                        icon: 'droplet',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    hasPower: {
                        type: 'boolean',
                        description: 'Access to power at shelter.',
                        icon: 'zap',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    hasSanitation: {
                        type: 'boolean',
                        description: 'Sanitation facilities available.',
                        icon: 'toilet',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    hasMedical: {
                        type: 'boolean',
                        description: 'Medical supplies or facilities at shelter.',
                        icon: 'cross',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    hasComms: {
                        type: 'boolean',
                        description: 'Communication equipment at shelter.',
                        icon: 'radio',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    owner: {
                        type: 'string',
                        description: 'Owner or controlling group.',
                        icon: 'users',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    access: {
                        type: 'enum',
                        options: ['open', 'restricted', 'private', 'contested'],
                        description: 'Access level.',
                        icon: 'lock',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

// ============================================================================
// MEDICAL DOMAIN - Health-related needs and capabilities
// ============================================================================
export const medicalDomain: OntologyNode[] = [
    {
        id: 'medical',
        label: 'Medical',
        description: 'Health conditions, medical needs, and care capabilities.',
        children: [
            {
                id: 'medical-condition',
                label: 'Medical Condition',
                description: 'A health condition affecting a person.',
                requiredAttributes: ['conditionType', 'severity'],
                attributes: {
                    conditionType: {
                        type: 'enum',
                        options: ['diabetes', 'cardiac', 'respiratory', 'mobility', 'cognitive', 'allergy', 'infection', 'injury', 'pregnancy', 'pediatric', 'geriatric', 'psychiatric', 'immunocompromised', 'dialysis', 'oxygen-dependent', 'other'],
                        description: 'Type of medical condition.',
                        icon: 'heart',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    severity: {
                        type: 'enum',
                        options: ['critical', 'severe', 'moderate', 'mild', 'controlled', 'resolved'],
                        description: 'Severity of the condition.',
                        icon: 'alert-triangle',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    personId: {
                        type: 'string',
                        description: 'ID of the person with the condition.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    diagnosedAt: {
                        type: 'datetime',
                        description: 'When the condition was diagnosed.',
                        icon: 'calendar',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    },
                    medications: {
                        type: 'string',
                        description: 'Current medications (comma-separated).',
                        icon: 'pill',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    equipmentNeeded: {
                        type: 'string',
                        description: 'Medical equipment required (e.g., insulin pump, CPAP, oxygen).',
                        icon: 'briefcase',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    suppliesNeeded: {
                        type: 'string',
                        description: 'Ongoing supply needs (e.g., test strips, catheters, dressings).',
                        icon: 'package',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    careRequirements: {
                        type: 'string',
                        description: 'Care requirements (e.g., "needs assistance with mobility", "requires refrigerated meds").',
                        icon: 'user-check',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    emergencyContact: {
                        type: 'string',
                        description: 'Emergency contact for this person.',
                        icon: 'phone',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional medical details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            },
            {
                id: 'medical-capability',
                label: 'Medical Capability',
                description: 'Medical skills, supplies, or facilities available.',
                requiredAttributes: ['capabilityType'],
                attributes: {
                    capabilityType: {
                        type: 'enum',
                        options: ['first-aid', 'emt', 'paramedic', 'nurse', 'physician', 'surgeon', 'dental', 'veterinary', 'pharmacy', 'laboratory', 'imaging', 'dialysis', 'oxygen', 'ventilator', 'defibrillator', 'ultrasound', 'telemedicine', 'other'],
                        description: 'Type of medical capability.',
                        icon: 'stethoscope',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    personId: {
                        type: 'string',
                        description: 'ID of person with this capability.',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    groupId: {
                        type: 'string',
                        description: 'ID of group with this capability.',
                        icon: 'users',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    location: {
                        type: 'geo',
                        description: 'Location where capability is available.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'fact'
                    },
                    supplies: {
                        type: 'string',
                        description: 'Available medical supplies.',
                        icon: 'package',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    equipment: {
                        type: 'string',
                        description: 'Available medical equipment.',
                        icon: 'briefcase',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    capacity: {
                        type: 'number',
                        description: 'Patient capacity per day.',
                        icon: 'users',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'patients/day', precision: 0 },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

// ============================================================================
// TRANSPORT DOMAIN - Movement and logistics
// ============================================================================
export const transportDomain: OntologyNode[] = [
    {
        id: 'transport',
        label: 'Transport',
        description: 'Vehicles, routes, and movement capabilities.',
        children: [
            {
                id: 'vehicle',
                label: 'Vehicle',
                description: 'A transport vehicle.',
                requiredAttributes: ['vehicleType', 'capacity'],
                attributes: {
                    vehicleType: {
                        type: 'enum',
                        options: ['foot', 'bicycle', 'motorcycle', 'atv', 'car', 'truck', 'van', 'bus', 'boat', 'ship', 'helicopter', 'plane', 'drone', 'animal', 'handcart', 'wheelchair', 'other'],
                        description: 'Type of vehicle.',
                        icon: 'truck',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Vehicle identifier.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    capacity: {
                        type: 'number',
                        description: 'Passenger + cargo capacity.',
                        icon: 'users',
                        operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
                        numericOptions: { unit: 'people', precision: 0 },
                        role: 'constraint'
                    },
                    cargoCapacity: {
                        type: 'number',
                        description: 'Cargo capacity in kg.',
                        icon: 'package',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'kg', precision: 0 },
                        role: 'fact'
                    },
                    fuelType: {
                        type: 'enum',
                        options: ['gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'solar', 'human', 'animal', 'none'],
                        description: 'Fuel type.',
                        icon: 'fuel',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    fuelCapacity: {
                        type: 'number',
                        description: 'Fuel capacity.',
                        icon: 'fuel',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'liters', precision: 1 },
                        role: 'fact'
                    },
                    fuelLevel: {
                        type: 'number',
                        description: 'Current fuel level.',
                        icon: 'fuel',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'liters', precision: 1 },
                        role: 'fact'
                    },
                    range: {
                        type: 'number',
                        description: 'Operational range on current fuel.',
                        icon: 'navigation',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'km', precision: 0 },
                        role: 'fact'
                    },
                    offRoad: {
                        type: 'boolean',
                        description: 'Off-road capability.',
                        icon: 'mountain',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    armored: {
                        type: 'boolean',
                        description: 'Armored vehicle.',
                        icon: 'shield',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    location: {
                        type: 'geo',
                        description: 'Current location.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'fact'
                    },
                    owner: {
                        type: 'string',
                        description: 'Owner or operator.',
                        icon: 'user',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    condition: {
                        type: 'enum',
                        options: ['operational', 'degraded', 'damaged', 'inoperable', 'maintenance'],
                        description: 'Vehicle condition.',
                        icon: 'wrench',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            },
            {
                id: 'route',
                label: 'Route',
                description: 'A known travel route.',
                requiredAttributes: ['start', 'end'],
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Route name.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    start: {
                        type: 'geo',
                        description: 'Start coordinates.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'constraint'
                    },
                    end: {
                        type: 'geo',
                        description: 'End coordinates.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'constraint'
                    },
                    waypoints: {
                        type: 'string',
                        description: 'Intermediate waypoints (JSON array of coordinates).',
                        icon: 'map',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    distance: {
                        type: 'number',
                        description: 'Route distance.',
                        icon: 'navigation',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'km', precision: 1 },
                        role: 'fact'
                    },
                    estimatedTime: {
                        type: 'number',
                        description: 'Estimated travel time in minutes.',
                        icon: 'clock',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'min', precision: 0 },
                        role: 'fact'
                    },
                    difficulty: {
                        type: 'enum',
                        options: ['easy', 'moderate', 'difficult', 'extreme', 'impassable'],
                        description: 'Route difficulty.',
                        icon: 'alert-triangle',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    hazards: {
                        type: 'string',
                        description: 'Known hazards on route.',
                        icon: 'alert-triangle',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    vehicleTypes: {
                        type: 'string',
                        description: 'Suitable vehicle types (comma-separated).',
                        icon: 'truck',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    lastVerified: {
                        type: 'datetime',
                        description: 'When route was last verified.',
                        icon: 'calendar',
                        operators: { real: ['is', 'before', 'after'], imaginary: [] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

// ============================================================================
// COMMS DOMAIN - Communication capabilities
// ============================================================================
export const commsDomain: OntologyNode[] = [
    {
        id: 'comms',
        label: 'Communications',
        description: 'Communication equipment, networks, and capabilities.',
        children: [
            {
                id: 'comms-device',
                label: 'Communications Device',
                description: 'A radio, phone, or other communication device.',
                requiredAttributes: ['deviceType', 'range'],
                attributes: {
                    deviceType: {
                        type: 'enum',
                        options: ['hf-radio', 'vhf-radio', 'uhf-radio', 'cb-radio', 'fm-radio', 'satellite-phone', 'cell-phone', 'mesh-radio', 'lorawan', 'wifi', 'internet', 'courier', 'signal-mirror', 'flares', 'whistle', 'other'],
                        description: 'Type of communication device.',
                        icon: 'radio',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Device identifier.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    range: {
                        type: 'number',
                        description: 'Effective range.',
                        icon: 'navigation',
                        operators: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
                        numericOptions: { unit: 'km', precision: 1 },
                        role: 'constraint'
                    },
                    frequency: {
                        type: 'string',
                        description: 'Operating frequency/channel.',
                        icon: 'wave',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    power: {
                        type: 'number',
                        description: 'Transmit power in watts.',
                        icon: 'zap',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'W', precision: 1 },
                        role: 'fact'
                    },
                    encryption: {
                        type: 'boolean',
                        description: 'Supports encryption.',
                        icon: 'lock',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    powerSource: {
                        type: 'enum',
                        options: ['battery', 'rechargeable', 'solar', 'hand-crank', 'vehicle', 'mains', 'generator'],
                        description: 'Power source.',
                        icon: 'battery',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    batteryLife: {
                        type: 'number',
                        description: 'Battery life in hours.',
                        icon: 'battery',
                        operators: { real: ['is', 'greater than', 'less than'], imaginary: [] },
                        numericOptions: { unit: 'hours', precision: 1 },
                        role: 'fact'
                    },
                    location: {
                        type: 'geo',
                        description: 'Device location.',
                        icon: 'map-pin',
                        operators: { real: ['is', 'near'], imaginary: [] },
                        role: 'fact'
                    },
                    owner: {
                        type: 'string',
                        description: 'Owner or operator.',
                        icon: 'user',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    condition: {
                        type: 'enum',
                        options: ['operational', 'degraded', 'damaged', 'inoperable', 'charging'],
                        description: 'Device condition.',
                        icon: 'wrench',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            },
            {
                id: 'comms-network',
                label: 'Communications Network',
                description: 'A communication network or relay.',
                requiredAttributes: ['networkType'],
                attributes: {
                    networkType: {
                        type: 'enum',
                        options: ['mesh', 'repeater', 'satellite', 'cellular', 'internet', 'hf-network', 'vhf-network', 'packet-radio', 'aprs', 'mesh-bridge', 'other'],
                        description: 'Type of network.',
                        icon: 'globe',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    name: {
                        type: 'string',
                        description: 'Network name.',
                        icon: 'tag',
                        operators: { real: ['is', 'contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    coverage: {
                        type: 'string',
                        description: 'Coverage area description.',
                        icon: 'map',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    relays: {
                        type: 'string',
                        description: 'Known relay nodes (JSON).',
                        icon: 'share-2',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    encryption: {
                        type: 'boolean',
                        description: 'Network supports encryption.',
                        icon: 'lock',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    access: {
                        type: 'enum',
                        options: ['open', 'restricted', 'private', 'invite-only'],
                        description: 'Network access level.',
                        icon: 'lock',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'constraint'
                    },
                    status: {
                        type: 'enum',
                        options: ['operational', 'degraded', 'down', 'maintenance'],
                        description: 'Network status.',
                        icon: 'activity',
                        operators: { real: ['is'], imaginary: ['is not'] },
                        role: 'fact'
                    },
                    notes: {
                        type: 'string',
                        description: 'Additional details.',
                        icon: 'file-text',
                        operators: { real: ['contains'], imaginary: ['is not'] },
                        role: 'fact'
                    }
                }
            }
        ]
    }
];

/**
 * All GSS survival domains combined
 */
export const survivalDomains: OntologyNode[] = [
    ...hazardDomain,
    ...resourceDomain,
    ...shelterDomain,
    ...medicalDomain,
    ...transportDomain,
    ...commsDomain
];