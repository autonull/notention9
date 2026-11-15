import type { OntologyNode } from '../types/index.js';

/**
 * Governance domain - collective, legal, and institutional notes.
 * Covers contracts, permits, labor disputes, credentials, allocations,
 * referrals, kinship care, and generational stewardship.
 */

type Operators = { real: string[]; imaginary: string[] };

const text: Operators = { real: ['is', 'contains'], imaginary: ['is not'] };
const bounded: Operators = { real: ['is', 'less than', 'greater than', 'between'], imaginary: [] };
const temporal: Operators = { real: ['is', 'contains', 'before', 'after'], imaginary: [] };

export const governanceDomains: OntologyNode[] = [
    {
        id: 'governance',
        label: 'Governance',
        description: 'Collective decisions, rights, and institutional arrangements.',
        children: [
            {
                id: 'legal-contract',
                label: 'Legal Contract',
                description: 'A binding agreement between parties.',
                attributes: {
                    contractType: { type: 'string', description: 'Kind of agreement', icon: 'document', operators: text },
                    parties: { type: 'string', description: 'Parties bound by the contract', icon: 'users', operators: text },
                    jurisdiction: { type: 'string', description: 'Legal jurisdiction', icon: 'map-pin', operators: text },
                    governingLaw: { type: 'string', description: 'Law that governs the contract', icon: 'scale', operators: text },
                    terms: { type: 'string', description: 'Key contractual terms', icon: 'list', operators: text },
                    ipAssignment: { type: 'string', description: 'Intellectual property assignment', icon: 'key', operators: text },
                    effectiveDate: { type: 'date', description: 'Date the contract takes effect', icon: 'calendar', operators: temporal },
                    expiresAt: { type: 'date', description: 'Date the contract expires', icon: 'calendar', operators: temporal },
                },
            },
            {
                id: 'permit-request',
                label: 'Permit Request',
                description: 'An application to an authority for permission.',
                attributes: {
                    serviceNeed: { type: 'string', description: 'The permission or service requested', icon: 'sparkles', operators: text },
                    eligibility: { type: 'string', description: 'Eligibility basis for the request', icon: 'check', operators: text },
                    documentation: { type: 'string', description: 'Required supporting documents', icon: 'folder', operators: text },
                    jurisdiction: { type: 'string', description: 'Authority with jurisdiction', icon: 'map-pin', operators: text },
                    department: { type: 'string', description: 'Department handling the case', icon: 'building', operators: text },
                    authority: { type: 'string', description: 'Authority level of the decision maker', icon: 'scale', operators: text },
                    caseLoad: { type: 'string', description: 'Case load of the handler', icon: 'inbox', operators: text },
                },
            },
            {
                id: 'labor-dispute',
                label: 'Labor Dispute',
                description: 'A collective dispute between workers and an employer.',
                attributes: {
                    bargainingUnit: { type: 'string', description: 'Workers represented in bargaining', icon: 'users', operators: text },
                    demands: { type: 'string', description: 'Demands made by the representatives', icon: 'list', operators: text },
                    strikeAuthorization: { type: 'string', description: 'Status of strike authorization', icon: 'alert', operators: text },
                    parties: { type: 'string', description: 'Parties to the dispute', icon: 'users', operators: text },
                },
            },
            {
                id: 'credential',
                label: 'Credential',
                description: 'A verifiable claim about an identity.',
                attributes: {
                    credentials: { type: 'string', description: 'Credentials presented', icon: 'badge', operators: text },
                    issuers: { type: 'string', description: 'Entities that issued the credentials', icon: 'building', operators: text },
                    wallet: { type: 'string', description: 'Wallet holding the credentials', icon: 'wallet', operators: text },
                    accepts: { type: 'string', description: 'Credential types accepted', icon: 'check', operators: text },
                    trustAnchors: { type: 'string', description: 'Roots of trust', icon: 'anchor', operators: text },
                    presentation: { type: 'string', description: 'Presentation or disclosure mode', icon: 'eye', operators: text },
                    context: { type: 'string', description: 'Verification context', icon: 'info', operators: text },
                },
            },
            {
                id: 'resource-allocation',
                label: 'Resource Allocation',
                description: 'Assignment of a limited shared resource.',
                attributes: {
                    resource: { type: 'string', description: 'Resource being allocated', icon: 'droplet', operators: text },
                    allocationRule: { type: 'string', description: 'Rule used to allocate the resource', icon: 'scale', operators: text },
                    authority: { type: 'string', description: 'Authority of the allocator', icon: 'shield', operators: text },
                    discretion: { type: 'string', description: 'Discretion available to the allocator', icon: 'sliders', operators: text },
                    jurisdiction: { type: 'string', description: 'Jurisdiction of the allocation', icon: 'map-pin', operators: text },
                    priority: { type: 'string', description: 'Priority class of the claim', icon: 'priority', operators: text },
                    quantity: { type: 'number', description: 'Amount of the resource', icon: 'hash', operators: bounded },
                },
            },
            {
                id: 'referral',
                label: 'Referral',
                description: 'A hand-off between trusted providers.',
                attributes: {
                    trustSource: { type: 'string', description: 'Source of trust for the referral', icon: 'link', operators: text },
                    referralQuality: { type: 'string', description: 'Quality signal of the referral', icon: 'star', operators: text },
                    feedbackLoop: { type: 'string', description: 'Whether feedback returns to the referrer', icon: 'refresh', operators: text },
                    specialty: { type: 'string', description: 'Specialty of the receiving provider', icon: 'stethoscope', operators: text },
                    acceptsReferrals: { type: 'string', description: 'Referral types accepted', icon: 'check', operators: text },
                    reciprocity: { type: 'string', description: 'Expected reciprocity', icon: 'swap', operators: text },
                    availability: { type: 'string', description: 'Availability of the provider', icon: 'calendar', operators: text },
                    urgency: { type: 'string', description: 'Urgency of the referral', icon: 'alert', operators: text },
                },
            },
            {
                id: 'kinship-care',
                label: 'Kinship Care',
                description: 'Care of a ward by family or kin.',
                attributes: {
                    guardian: { type: 'string', description: 'Guardian responsible for the ward', icon: 'user', operators: text },
                    ward: { type: 'string', description: 'Person receiving care', icon: 'user', operators: text },
                    careSchedule: { type: 'string', description: 'When care is provided', icon: 'calendar', operators: text },
                    medicalAuthority: { type: 'string', description: 'Who decides medical matters', icon: 'medical', operators: text },
                    financialResponsibility: { type: 'string', description: 'Who bears care costs', icon: 'cash', operators: text },
                    visitationRights: { type: 'string', description: 'Visitation arrangements', icon: 'users', operators: text },
                    careNeed: { type: 'string', description: 'Care needs of the ward', icon: 'heart', operators: text },
                    coordination: { type: 'string', description: 'How care is coordinated', icon: 'network', operators: text },
                    appreciation: { type: 'string', description: 'Recognition exchanged', icon: 'gift', operators: text },
                },
            },
            {
                id: 'stewardship',
                label: 'Stewardship',
                description: 'Responsibility for land or a shared inheritance.',
                attributes: {
                    steward: { type: 'string', description: 'Person responsible for the plot', icon: 'user', operators: text },
                    gardenBed: { type: 'string', description: 'Plot or bed under stewardship', icon: 'sprout', operators: text },
                    harvestShare: { type: 'string', description: 'Share of the harvest', icon: 'percent', operators: text },
                    lineage: { type: 'string', description: 'Line of inheritance or transmission', icon: 'git-branch', operators: text },
                },
            },
        ],
    },
];
