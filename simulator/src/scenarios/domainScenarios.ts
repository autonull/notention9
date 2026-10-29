import { Scenario, AgentConfig, EventConfig, InputMethod, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

export const DOMAIN_SCENARIOS: Record<string, Scenario> = {
    'freelance-marketplace': {
        name: 'Freelance Marketplace',
        description: 'Freelancers offer services, clients post jobs. Tests matching on skills, budget, location.',
        agents: [
            {
                role: 'Freelancer',
                count: 8,
                properties: [
                    prop('role', 'is', 'developer'),
                    prop('skills', 'contains', 'react', 'typescript', 'node'),
                    prop('experience', '>=', '3'),
                    prop('rate', 'is', '120'),
                    prop('availability', 'is', 'full-time'),
                ],
                interests: [
                    prop('job', 'is', 'developer'),
                    prop('budget', 'greater than', '80'),
                    prop('remote', 'is', 'true'),
                ],
                traits: ['professional', 'responsive', 'template-user'],
            },
            {
                role: 'Client',
                count: 4,
                properties: [
                    prop('job', 'is', 'developer'),
                    prop('budget', 'is', '5000'),
                    prop('duration', 'is', '3-months'),
                    prop('remote', 'is', 'true'),
                    prop('tech-stack', 'contains', 'react', 'typescript'),
                ],
                interests: [
                    prop('role', 'is', 'developer'),
                    prop('skills', 'contains', 'react'),
                    prop('experience', '>=', '2'),
                ],
                traits: ['urgent', 'detail-oriented', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Client', cameraFocus: 'Client 1' },
            { at: 3, action: 'publish_job', actorRole: 'Client', cameraFocus: 'Client 2' },
            { at: 5, action: 'publish_offer', actorRole: 'Freelancer', cameraFocus: 'Freelancer 1' },
            { at: 6, action: 'publish_offer', actorRole: 'Freelancer', cameraFocus: 'Freelancer 3' },
            { at: 7, action: 'publish_offer', actorRole: 'Freelancer', cameraFocus: 'Freelancer 5' },
            { at: 9, action: 'publish_job', actorRole: 'Client', cameraFocus: 'Client 3' },
            { at: 11, action: 'publish_offer', actorRole: 'Freelancer', cameraFocus: 'Freelancer 2' },
            { at: 13, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium'
    },

    'hiring-pipeline': {
        name: 'Hiring Pipeline',
        description: 'HR posts roles, candidates apply. Tests matching on role, experience, skills, location.',
        agents: [
            {
                role: 'Recruiter',
                count: 3,
                properties: [
                    prop('role', 'is', 'recruiter'),
                    prop('company', 'is', 'TechCorp'),
                    prop('department', 'is', 'engineering'),
                    prop('job', 'is', 'developer'),
                    prop('tech-stack', 'contains', 'react', 'typescript'),
                ],
                interests: [
                    prop('candidate', 'is', 'developer'),
                    prop('skills', 'contains', 'react', 'typescript'),
                    prop('experience', '>=', '3'),
                ],
                traits: ['screening', 'fast-moving', 'template-user'],
            },
            {
                role: 'Candidate',
                count: 10,
                properties: [
                    prop('role', 'is', 'developer'),
                    prop('skills', 'contains', 'react', 'typescript', 'graphql', 'aws'),
                    prop('experience', '>=', '4'),
                    prop('location', 'is', 'Remote'),
                    prop('seniority', 'is', 'senior'),
                ],
                interests: [
                    prop('job', 'is', 'developer'),
                    prop('remote', 'is', 'true'),
                    prop('salary', 'greater than', '120000'),
                ],
                traits: ['selective', 'experienced'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Recruiter', cameraFocus: 'Recruiter 1' },
            { at: 3, action: 'publish_job', actorRole: 'Recruiter', cameraFocus: 'Recruiter 2' },
            { at: 4, action: 'publish_job', actorRole: 'Recruiter', cameraFocus: 'Recruiter 3' },
            { at: 6, action: 'publish_offer', actorRole: 'Candidate', cameraFocus: 'Candidate 1' },
            { at: 7, action: 'publish_offer', actorRole: 'Candidate', cameraFocus: 'Candidate 3' },
            { at: 8, action: 'publish_offer', actorRole: 'Candidate', cameraFocus: 'Candidate 5' },
            { at: 10, action: 'publish_offer', actorRole: 'Candidate', cameraFocus: 'Candidate 7' },
            { at: 12, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium'
    },

    'project-collaboration': {
        name: 'Project Collaboration',
        description: 'Team members post tasks, others volunteer. Tests matching on skills, availability, interest.',
        agents: [
            {
                role: 'ProjectLead',
                count: 2,
                properties: [
                    prop('role', 'is', 'project-lead'),
                    prop('project', 'is', 'Notention v2'),
                    prop('phase', 'is', 'development'),
                ],
                interests: [
                    prop('role', 'is', 'developer'),
                    prop('skills', 'contains', 'typescript', 'testing'),
                    prop('availability', 'is', 'part-time'),
                ],
                traits: ['organized', 'clear-requirements', 'template-user'],
            },
            {
                role: 'Contributor',
                count: 6,
                properties: [
                    prop('role', 'is', 'developer'),
                    prop('skills', 'contains', 'typescript', 'react', 'testing', 'ci'),
                    prop('availability', 'is', 'part-time'),
                    prop('interest', 'contains', 'open-source', 'automation'),
                ],
                interests: [
                    prop('project', 'is', 'Notention'),
                    prop('phase', 'is', 'development'),
                    prop('skills', 'contains', 'typescript'),
                ],
                traits: ['motivated', 'collaborative', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'ProjectLead', cameraFocus: 'ProjectLead 1' },
            { at: 4, action: 'publish_offer', actorRole: 'Contributor', cameraFocus: 'Contributor 1' },
            { at: 5, action: 'publish_offer', actorRole: 'Contributor', cameraFocus: 'Contributor 2' },
            { at: 7, action: 'publish_job', actorRole: 'ProjectLead', cameraFocus: 'ProjectLead 2' },
            { at: 9, action: 'publish_offer', actorRole: 'Contributor', cameraFocus: 'Contributor 4' },
            { at: 11, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy'
    },

    'mentorship-network': {
        name: 'Mentorship Network',
        description: 'Mentors offer guidance, mentees seek advice. Tests matching on domain, experience gap, availability.',
        agents: [
            {
                role: 'Mentor',
                count: 4,
                properties: [
                    prop('role', 'is', 'mentor'),
                    prop('domain', 'contains', 'software-architecture', 'career-growth', 'startups'),
                    prop('experience', '>=', '10'),
                    prop('availability', 'is', 'monthly'),
                    prop('style', 'is', 'hands-on'),
                ],
                interests: [
                    prop('mentee', 'is', 'developer'),
                    prop('goals', 'contains', 'growth', 'leadership'),
                    prop('commitment', 'is', 'serious'),
                ],
                traits: ['patient', 'experienced', 'template-user'],
            },
            {
                role: 'Mentee',
                count: 8,
                properties: [
                    prop('role', 'is', 'developer'),
                    prop('experience', '>=', '2'),
                    prop('goals', 'contains', 'architecture', 'leadership', 'entrepreneurship'),
                    prop('commitment', 'is', 'serious'),
                ],
                interests: [
                    prop('mentor', 'is', 'available'),
                    prop('domain', 'contains', 'software-architecture'),
                    prop('style', 'is', 'hands-on'),
                ],
                traits: ['eager', 'proactive', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Mentor', cameraFocus: 'Mentor 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Mentor', cameraFocus: 'Mentor 2' },
            { at: 5, action: 'publish_job', actorRole: 'Mentee', cameraFocus: 'Mentee 1' },
            { at: 6, action: 'publish_job', actorRole: 'Mentee', cameraFocus: 'Mentee 3' },
            { at: 8, action: 'publish_job', actorRole: 'Mentee', cameraFocus: 'Mentee 5' },
            { at: 10, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium'
    },

    'learning-community': {
        name: 'Learning Community',
        description: 'Study groups form around topics. Tests matching on learning goals, level, schedule.',
        agents: [
            {
                role: 'Organizer',
                count: 3,
                properties: [
                    prop('role', 'is', 'organizer'),
                    prop('topic', 'contains', 'rust', 'wasm', 'distributed-systems'),
                    prop('level', 'is', 'intermediate'),
                    prop('schedule', 'is', 'weekly'),
                    prop('format', 'is', 'hands-on'),
                    prop('group', 'is', 'study'),
                ],
                interests: [
                    prop('learner', 'is', 'motivated'),
                    prop('background', 'contains', 'programming'),
                    prop('commitment', 'is', 'consistent'),
                    prop('goals', 'contains', 'rust', 'wasm', 'systems'),
                    prop('level', 'is', 'intermediate'),
                ],
                traits: ['structured', 'inclusive', 'template-user'],
            },
            {
                role: 'Learner',
                count: 12,
                properties: [
                    prop('role', 'is', 'learner'),
                    prop('goals', 'contains', 'rust', 'wasm', 'systems'),
                    prop('level', 'is', 'intermediate'),
                    prop('availability', 'is', 'weekends'),
                    prop('style', 'is', 'hands-on'),
                    prop('topic', 'contains', 'rust'),
                    prop('format', 'is', 'interactive'),
                ],
                interests: [
                    prop('group', 'is', 'study'),
                    prop('topic', 'contains', 'rust'),
                    prop('format', 'is', 'interactive'),
                    prop('schedule', 'is', 'weekly'),
                    prop('background', 'contains', 'programming'),
                ],
                traits: ['curious', 'consistent', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Organizer', cameraFocus: 'Organizer 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Organizer', cameraFocus: 'Organizer 2' },
            { at: 5, action: 'publish_job', actorRole: 'Learner', cameraFocus: 'Learner 1' },
            { at: 6, action: 'publish_job', actorRole: 'Learner', cameraFocus: 'Learner 4' },
            { at: 7, action: 'publish_job', actorRole: 'Learner', cameraFocus: 'Learner 7' },
            { at: 9, action: 'publish_job', actorRole: 'Learner', cameraFocus: 'Learner 10' },
            { at: 11, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy'
    },

    'cofounder-matching': {
        name: 'Co-founder Matching',
        description: 'Founders seek co-founders. Tests matching on complementary skills, vision, equity expectations.',
        agents: [
            {
                role: 'TechnicalFounder',
                count: 5,
                properties: [
                    prop('role', 'is', 'technical-founder'),
                    prop('skills', 'contains', 'fullstack', 'architecture', 'scaling'),
                    prop('seeking', 'is', 'business-cofounder'),
                    prop('equity', 'is', '50-50'),
                    prop('stage', 'is', 'idea'),
                ],
                interests: [
                    prop('role', 'is', 'business-founder'),
                    prop('skills', 'contains', 'sales', 'fundraising', 'product'),
                    prop('vision', 'contains', 'saas', 'b2b'),
                ],
                traits: ['builder', 'visionary', 'template-user'],
            },
            {
                role: 'BusinessFounder',
                count: 5,
                properties: [
                    prop('role', 'is', 'business-founder'),
                    prop('skills', 'contains', 'sales', 'fundraising', 'product', 'growth'),
                    prop('seeking', 'is', 'technical-cofounder'),
                    prop('equity', 'is', '50-50'),
                    prop('stage', 'is', 'idea'),
                ],
                interests: [
                    prop('role', 'is', 'technical-founder'),
                    prop('skills', 'contains', 'fullstack', 'architecture'),
                    prop('vision', 'contains', 'saas', 'b2b'),
                ],
                traits: ['networker', 'strategic', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'TechnicalFounder', cameraFocus: 'TechnicalFounder 1' },
            { at: 3, action: 'publish_job', actorRole: 'BusinessFounder', cameraFocus: 'BusinessFounder 1' },
            { at: 4, action: 'publish_job', actorRole: 'TechnicalFounder', cameraFocus: 'TechnicalFounder 2' },
            { at: 5, action: 'publish_job', actorRole: 'BusinessFounder', cameraFocus: 'BusinessFounder 2' },
            { at: 7, action: 'publish_offer', actorRole: 'TechnicalFounder', cameraFocus: 'TechnicalFounder 3' },
            { at: 8, action: 'publish_offer', actorRole: 'BusinessFounder', cameraFocus: 'BusinessFounder 3' },
            { at: 10, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    'investor-startup': {
        name: 'Investor-Startup Matching',
        description: 'Startups pitch to investors. Tests matching on thesis, stage, sector, check size.',
        agents: [
            {
                role: 'Investor',
                count: 4,
                properties: [
                    prop('role', 'is', 'investor'),
                    prop('thesis', 'contains', 'ai', 'developer-tools', 'b2b-saas'),
                    prop('stage', 'contains', 'pre-seed', 'seed'),
                    prop('check-size', 'is', '250k-500k'),
                    prop('geo', 'is', 'global'),
                    prop('sector', 'contains', 'ai', 'developer-tools'),
                    prop('traction', 'is', 'growing'),
                ],
                interests: [
                    prop('startup', 'is', 'early-stage'),
                    prop('sector', 'contains', 'ai', 'developer-tools'),
                    prop('traction', 'is', 'growing'),
                    prop('stage', 'contains', 'pre-seed'),
                    prop('check-size', 'greater than', '100k'),
                ],
                traits: ['thesis-driven', 'founder-friendly', 'template-user'],
            },
            {
                role: 'Startup',
                count: 8,
                properties: [
                    prop('role', 'is', 'startup'),
                    prop('sector', 'contains', 'ai', 'developer-tools', 'b2b-saas'),
                    prop('stage', 'is', 'pre-seed'),
                    prop('raise', 'is', '500k'),
                    prop('traction', 'is', 'mvp-with-users'),
                    prop('investor', 'is', 'thesis-aligned'),
                    prop('check-size', 'greater than', '100k'),
                ],
                interests: [
                    prop('investor', 'is', 'thesis-aligned'),
                    prop('check-size', 'greater than', '100k'),
                    prop('value-add', 'contains', 'network', 'hiring'),
                    prop('thesis', 'contains', 'ai', 'developer-tools'),
                    prop('stage', 'contains', 'pre-seed', 'seed'),
                ],
                traits: ['ambitious', 'execution-focused', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Investor', cameraFocus: 'Investor 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Investor', cameraFocus: 'Investor 2' },
            { at: 5, action: 'publish_job', actorRole: 'Startup', cameraFocus: 'Startup 1' },
            { at: 6, action: 'publish_job', actorRole: 'Startup', cameraFocus: 'Startup 3' },
            { at: 7, action: 'publish_job', actorRole: 'Startup', cameraFocus: 'Startup 5' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    'events-networking': {
        name: 'Events & Networking',
        description: 'Attendees find relevant connections at conferences. Tests matching on interests, role, goals.',
        agents: [
            {
                role: 'Speaker',
                count: 5,
                properties: [
                    prop('role', 'is', 'speaker'),
                    prop('topic', 'contains', 'ai', 'rust', 'distributed-systems', 'dx'),
                    prop('experience', 'is', 'expert'),
                    prop('available-for', 'contains', 'chats', 'mentoring'),
                ],
                interests: [
                    prop('attendee', 'is', 'engaged'),
                    prop('interests', 'contains', 'ai', 'systems'),
                ],
                traits: ['approachable', 'knowledgeable', 'template-user'],
            },
            {
                role: 'Attendee',
                count: 20,
                properties: [
                    prop('role', 'is', 'attendee'),
                    prop('interests', 'contains', 'ai', 'rust', 'career', 'networking'),
                    prop('goals', 'contains', 'learn', 'connect', 'hire'),
                    prop('experience', 'varies', 'junior', 'senior'),
                ],
                interests: [
                    prop('speaker', 'is', 'available'),
                    prop('topic', 'contains', 'ai'),
                    prop('format', 'is', 'casual'),
                ],
                traits: ['curious', 'networking', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Speaker', cameraFocus: 'Speaker 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Speaker', cameraFocus: 'Speaker 2' },
            { at: 4, action: 'publish_job', actorRole: 'Attendee', cameraFocus: 'Attendee 1' },
            { at: 5, action: 'publish_job', actorRole: 'Attendee', cameraFocus: 'Attendee 5' },
            { at: 6, action: 'publish_job', actorRole: 'Attendee', cameraFocus: 'Attendee 10' },
            { at: 8, action: 'publish_job', actorRole: 'Attendee', cameraFocus: 'Attendee 15' },
            { at: 10, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium'
    },

    'open-source-contrib': {
        name: 'Open Source Contribution',
        description: 'Maintainers post good-first-issues, contributors pick them up. Tests matching on skills, interest, difficulty.',
        agents: [
            {
                role: 'Maintainer',
                count: 3,
                properties: [
                    prop('role', 'is', 'maintainer'),
                    prop('project', 'contains', 'notention', 'optimizer', 'simulator'),
                    prop('language', 'is', 'typescript'),
                    prop('labels', 'contains', 'good-first-issue', 'help-wanted'),
                ],
                interests: [
                    prop('contributor', 'is', 'motivated'),
                    prop('skills', 'contains', 'typescript', 'testing'),
                    prop('style', 'is', 'thorough'),
                ],
                traits: ['welcoming', 'responsive', 'template-user'],
            },
            {
                role: 'Contributor',
                count: 10,
                properties: [
                    prop('role', 'is', 'contributor'),
                    prop('skills', 'contains', 'typescript', 'react', 'testing', 'ci', 'docs'),
                    prop('motivation', 'contains', 'learning', 'portfolio', 'community'),
                    prop('availability', 'is', 'weekends'),
                ],
                interests: [
                    prop('project', 'contains', 'typescript'),
                    prop('labels', 'contains', 'good-first-issue'),
                    prop('mentorship', 'is', 'available'),
                ],
                traits: ['eager', 'detail-oriented', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Maintainer', cameraFocus: 'Maintainer 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Maintainer', cameraFocus: 'Maintainer 2' },
            { at: 5, action: 'publish_job', actorRole: 'Contributor', cameraFocus: 'Contributor 1' },
            { at: 6, action: 'publish_job', actorRole: 'Contributor', cameraFocus: 'Contributor 3' },
            { at: 7, action: 'publish_job', actorRole: 'Contributor', cameraFocus: 'Contributor 6' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy'
    },

    'research-collaboration': {
        name: 'Research Collaboration',
        description: 'Researchers find collaborators for papers/projects. Tests matching on domain, methodology, publication goals.',
        agents: [
            {
                role: 'PI',
                count: 3,
                properties: [
                    prop('role', 'is', 'pi'),
                    prop('domain', 'contains', 'ml-systems', 'hci', 'distributed-systems'),
                    prop('funding', 'is', 'available'),
                    prop('seeking', 'is', 'phd-students'),
                ],
                interests: [
                    prop('student', 'is', 'motivated'),
                    prop('background', 'contains', 'ml', 'systems'),
                    prop('publications', 'is', 'targeted'),
                ],
                traits: ['well-funded', 'mentoring', 'template-user'],
            },
            {
                role: 'PhDStudent',
                count: 8,
                properties: [
                    prop('role', 'is', 'phd-student'),
                    prop('interests', 'contains', 'ml-systems', 'hci', 'compilers'),
                    prop('skills', 'contains', 'python', 'rust', 'experimental-design'),
                    prop('year', 'is', '2nd'),
                    prop('goal', 'is', 'top-conference'),
                ],
                interests: [
                    prop('advisor', 'is', 'supportive'),
                    prop('funding', 'is', 'available'),
                    prop('domain', 'contains', 'ml-systems'),
                ],
                traits: ['driven', 'analytical', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'PI', cameraFocus: 'PI 1' },
            { at: 3, action: 'publish_offer', actorRole: 'PI', cameraFocus: 'PI 2' },
            { at: 5, action: 'publish_job', actorRole: 'PhDStudent', cameraFocus: 'PhDStudent 1' },
            { at: 6, action: 'publish_job', actorRole: 'PhDStudent', cameraFocus: 'PhDStudent 3' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 10,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },
};

export function getScenarioNames(): string[] {
    return Object.keys(DOMAIN_SCENARIOS);
}

export function getScenario(name: string): Scenario | undefined {
    return DOMAIN_SCENARIOS[name];
}

export function getAllScenarios(): Scenario[] {
    return Object.values(DOMAIN_SCENARIOS);
}

export function getScenariosByDomain(domain: string): Scenario[] {
    return Object.values(DOMAIN_SCENARIOS).filter(s => s.name.toLowerCase().includes(domain.toLowerCase()));
}