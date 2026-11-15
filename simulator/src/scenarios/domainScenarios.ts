import { Scenario, AgentConfig, EventConfig, InputMethod, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

/** Publish jobs and offers in turn, then focus the camera. */
const alternatingEvents = (roles: readonly string[]): EventConfig[] => [
    ...roles.map((role, index) => ({
        at: 2 + index * 2,
        action: index % 2 === 0 ? 'publish_job' : 'publish_offer',
        actorRole: role,
        cameraFocus: `${role} 1`,
    })),
    { at: 2 + roles.length * 2, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
];

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
                    prop('topic', 'has', 'rust', 'wasm', 'distributed-systems'),
                    prop('level', 'is', 'intermediate'),
                    prop('schedule', 'is', 'weekly'),
                    prop('format', 'is', 'hands-on'),
                    prop('group', 'is', 'study'),
                ],
                interests: [
                    prop('learner', 'is', 'motivated'),
                    prop('background', 'has', 'programming'),
                    prop('commitment', 'is', 'consistent'),
                    prop('goals', 'has', 'rust', 'wasm', 'systems'),
                    prop('level', 'is', 'intermediate'),
                ],
                traits: ['structured', 'inclusive', 'template-user'],
            },
            {
                role: 'Learner',
                count: 12,
                properties: [
                    prop('role', 'is', 'learner'),
                    prop('goals', 'has', 'rust', 'wasm', 'systems'),
                    prop('level', 'is', 'intermediate'),
                    prop('availability', 'is', 'weekends'),
                    prop('style', 'is', 'hands-on'),
                    prop('topic', 'has', 'rust'),
                    prop('format', 'is', 'interactive'),
                ],
                interests: [
                    prop('group', 'is', 'study'),
                    prop('topic', 'has', 'rust'),
                    prop('format', 'is', 'interactive'),
                    prop('schedule', 'is', 'weekly'),
                    prop('background', 'has', 'programming'),
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
                count: 1,
                properties: [
                    prop('role', 'is', 'speaker'),
                    prop('topic', 'has', 'ai', 'ml'),
                    prop('experience', 'is', 'expert'),
                    prop('available-for', 'has', 'chats'),
                ],
                interests: [
                    prop('attendee', 'is', 'engaged'),
                    prop('interests', 'has', 'ai'),
                ],
                traits: ['approachable', 'knowledgeable', 'template-user'],
            },
            {
                role: 'Speaker',
                count: 1,
                properties: [
                    prop('role', 'is', 'speaker'),
                    prop('topic', 'has', 'rust', 'wasm'),
                    prop('experience', 'is', 'expert'),
                    prop('available-for', 'has', 'mentoring'),
                ],
                interests: [
                    prop('attendee', 'is', 'engaged'),
                    prop('interests', 'has', 'rust'),
                ],
                traits: ['approachable', 'knowledgeable', 'template-user'],
            },
            {
                role: 'Speaker',
                count: 1,
                properties: [
                    prop('role', 'is', 'speaker'),
                    prop('topic', 'has', 'dx', 'tools'),
                    prop('experience', 'is', 'expert'),
                    prop('available-for', 'has', 'chats'),
                ],
                interests: [
                    prop('attendee', 'is', 'engaged'),
                    prop('interests', 'has', 'dx'),
                ],
                traits: ['approachable', 'knowledgeable', 'template-user'],
            },
            {
                role: 'Attendee',
                count: 2,
                properties: [
                    prop('role', 'is', 'attendee'),
                    prop('interests', 'has', 'ai', 'ml'),
                    prop('goals', 'has', 'learn'),
                    prop('experience', 'varies', 'junior', 'senior'),
                ],
                interests: [
                    prop('speaker', 'is', 'available'),
                    prop('topic', 'has', 'ai'),
                    prop('format', 'is', 'casual'),
                ],
                traits: ['curious', 'networking', 'template-user'],
            },
            {
                role: 'Attendee',
                count: 2,
                properties: [
                    prop('role', 'is', 'attendee'),
                    prop('interests', 'has', 'rust', 'systems'),
                    prop('goals', 'has', 'hire'),
                    prop('experience', 'varies', 'junior', 'senior'),
                ],
                interests: [
                    prop('speaker', 'is', 'available'),
                    prop('topic', 'has', 'rust'),
                    prop('format', 'is', 'casual'),
                ],
                traits: ['curious', 'networking', 'template-user'],
            },
            {
                role: 'Attendee',
                count: 1,
                properties: [
                    prop('role', 'is', 'attendee'),
                    prop('interests', 'has', 'dx', 'productivity'),
                    prop('goals', 'has', 'connect'),
                    prop('experience', 'varies', 'junior', 'senior'),
                ],
                interests: [
                    prop('speaker', 'is', 'available'),
                    prop('topic', 'has', 'dx'),
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

    // Taxonomy gap: Legal/contract scenarios — legal stakes, codified formality
    'legal-contract': {
        name: 'Legal Contract Negotiation',
        description: 'Parties negotiate terms for a binding agreement. Tests matching on legal terms, compliance, jurisdiction.',
        agents: [
            {
                role: 'LegalCounsel',
                count: 2,
                properties: [
                    prop('role', 'is', 'legal-counsel'),
                    prop('jurisdiction', 'is', 'US-CA'),
                    prop('practiceArea', 'contains', 'contract', 'commercial'),
                    prop('barNumber', 'is', 'active'),
                ],
                interests: [
                    prop('counterparty', 'is', 'represented'),
                    prop('terms', 'contains', 'indemnification', 'force-majeure'),
                    prop('governingLaw', 'is', 'California'),
                ],
                traits: ['detail-oriented', 'risk-averse', 'template-user'],
            },
            {
                role: 'BusinessPrincipal',
                count: 2,
                properties: [
                    prop('role', 'is', 'principal'),
                    prop('entityType', 'is', 'LLC'),
                    prop('industry', 'contains', 'technology', 'services'),
                    prop('dealValue', 'is', '100000'),
                ],
                interests: [
                    prop('counsel', 'is', 'experienced'),
                    prop('terms', 'contains', 'favorable', 'clear'),
                    prop('timeline', 'is', '30-days'),
                ],
                traits: ['pragmatic', 'deadline-driven', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'BusinessPrincipal', cameraFocus: 'BusinessPrincipal 1' },
            { at: 4, action: 'publish_offer', actorRole: 'LegalCounsel', cameraFocus: 'LegalCounsel 1' },
            { at: 6, action: 'publish_offer', actorRole: 'LegalCounsel', cameraFocus: 'LegalCounsel 2' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Crisis/emergency scenarios — safety stakes, ephemeral temporality
    'crisis-response': {
        name: 'Crisis Response Coordination',
        description: 'Emergency responders coordinate during a crisis. Tests matching on capability, location, urgency, ephemeral needs.',
        agents: [
            {
                role: 'IncidentCommander',
                count: 1,
                properties: [
                    prop('role', 'is', 'incident-commander'),
                    prop('incidentType', 'is', 'wildfire'),
                    prop('severity', 'is', 'level-3'),
                    prop('jurisdiction', 'is', 'county-wide'),
                ],
                interests: [
                    prop('resource', 'contains', 'engine', 'crew', 'aircraft', 'water-tender'),
                    prop('availability', 'is', 'immediate'),
                    prop('qualification', 'contains', 'firefighter', 'emt'),
                ],
                traits: ['decisive', 'authoritative', 'template-user'],
            },
            {
                role: 'ResourceProvider',
                count: 6,
                properties: [
                    prop('resourceType', 'contains', 'engine', 'hand-crew', 'helicopter', 'dozer', 'water-tender', 'emt-unit'),
                    prop('capacity', 'is', 'available'),
                    prop('location', 'contains', 'station', 'staging-area'),
                    prop('responseTime', 'is', '15-min'),
                ],
                interests: [
                    prop('incident', 'is', 'wildfire'),
                    prop('assignment', 'contains', 'initial-attack', 'structure-protection'),
                    prop('duration', 'is', '12-hour'),
                ],
                traits: ['ready', 'equipped', 'trained'],
            },
            {
                role: 'Dispatch',
                count: 2,
                properties: [
                    prop('role', 'is', 'dispatch'),
                    prop('center', 'is', 'regional'),
                    prop('systems', 'contains', 'CAD', 'radio', 'AVL'),
                ],
                interests: [
                    prop('resource', 'contains', 'available'),
                    prop('status', 'contains', 'committed', 'available'),
                ],
                traits: ['calm', 'coordinated', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'IncidentCommander', cameraFocus: 'IncidentCommander 1' },
            { at: 3, action: 'publish_offer', actorRole: 'ResourceProvider', cameraFocus: 'ResourceProvider 1' },
            { at: 4, action: 'publish_offer', actorRole: 'ResourceProvider', cameraFocus: 'ResourceProvider 2' },
            { at: 5, action: 'publish_offer', actorRole: 'ResourceProvider', cameraFocus: 'ResourceProvider 3' },
            { at: 6, action: 'publish_offer', actorRole: 'ResourceProvider', cameraFocus: 'ResourceProvider 4' },
            { at: 7, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 10,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Long-term/generational scenarios — generational temporality, existential stakes
    'generational-stewardship': {
        name: 'Generational Land Stewardship',
        description: 'Multi-generation families coordinate land stewardship. Tests matching on values, succession, conservation, generational commitments.',
        agents: [
            {
                role: 'ElderSteward',
                count: 2,
                properties: [
                    prop('role', 'is', 'elder-steward'),
                    prop('landType', 'has', 'forest', 'farm', 'watershed'),
                    prop('tenure', 'is', '50-years'),
                    prop('values', 'has', 'conservation', 'sustainability', 'family-legacy'),
                ],
                interests: [
                    prop('role', 'is', 'nextgen-steward'),
                    prop('commitment', 'is', 'lifetime'),
                    prop('values', 'has', 'conservation', 'regenerative'),
                ],
                traits: ['wise', 'patient', 'tradition-keeper'],
            },
            {
                role: 'NextGenSteward',
                count: 4,
                properties: [
                    prop('role', 'is', 'nextgen-steward'),
                    prop('education', 'has', 'environmental-science', 'agriculture', 'business'),
                    prop('commitment', 'is', 'lifetime'),
                    prop('innovation', 'has', 'agroforestry', 'carbon-sequestration', 'ecotourism'),
                ],
                interests: [
                    prop('role', 'is', 'elder-steward'),
                    prop('landType', 'has', 'forest', 'farm', 'watershed'),
                    prop('values', 'has', 'conservation', 'family-legacy'),
                ],
                traits: ['motivated', 'innovative', 'respectful'],
            },
            {
                role: 'ConservationPartner',
                count: 2,
                properties: [
                    prop('role', 'is', 'conservation-partner'),
                    prop('orgType', 'has', 'land-trust', 'agency', 'foundation'),
                    prop('tools', 'has', 'easement', 'funding', 'technical-assistance'),
                ],
                interests: [
                    prop('role', 'is', 'elder-steward'),
                    prop('landType', 'has', 'forest', 'farm', 'watershed'),
                    prop('values', 'has', 'conservation', 'perpetual'),
                ],
                traits: ['supportive', 'resourceful', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_manifest', actorRole: 'ElderSteward', cameraFocus: 'ElderSteward 1' },
            { at: 4, action: 'publish_offer', actorRole: 'NextGenSteward', cameraFocus: 'NextGenSteward 1' },
            { at: 5, action: 'publish_offer', actorRole: 'NextGenSteward', cameraFocus: 'NextGenSteward 2' },
            { at: 6, action: 'publish_offer', actorRole: 'ConservationPartner', cameraFocus: 'ConservationPartner 1' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Care/kinship scenarios — communal, care exchange, generational
    'kinship-care': {
        name: 'Kinship Care Network',
        description: 'Extended family coordinates care for elders/children. Tests matching on relationship, availability, skills, trust, communal sharing.',
        agents: [
            {
                role: 'PrimaryCaregiver',
                count: 1,
                properties: [
                    prop('role', 'is', 'primary-caregiver'),
                    prop('careRecipient', 'contains', 'elderly-parent', 'disabled-child'),
                    prop('careLevel', 'is', 'high'),
                    prop('availability', 'is', '24/7'),
                ],
                interests: [
                    prop('careNeed', 'contains', 'respite', 'transport', 'meals', 'visits'),
                    prop('coordination', 'is', 'shared-calendar'),
                    prop('appreciation', 'is', 'acknowledged'),
                ],
                traits: ['dedicated', 'exhausted', 'loving'],
            },
            {
                role: 'FamilySupporter',
                count: 6,
                properties: [
                    prop('role', 'is', 'family-supporter'),
                    prop('relationship', 'contains', 'sibling', 'cousin', 'grandchild', 'in-law'),
                    prop('availability', 'contains', 'weekends', 'evenings', 'holidays', 'on-call'),
                    prop('skills', 'contains', 'cooking', 'driving', 'medication-management', 'companionship', 'financial'),
                ],
                interests: [
                    prop('careNeed', 'contains', 'respite', 'transport', 'meals', 'visits'),
                    prop('coordination', 'is', 'shared-calendar'),
                    prop('appreciation', 'is', 'acknowledged'),
                ],
                traits: ['willing', 'available', 'family-oriented'],
            },
            {
                role: 'CommunityResource',
                count: 2,
                properties: [
                    prop('role', 'is', 'community-resource'),
                    prop('serviceType', 'contains', 'adult-day', 'home-health', 'meal-delivery', 'support-group'),
                    prop('funding', 'contains', 'medicaid', 'grants', 'donations', 'sliding-scale'),
                ],
                interests: [
                    prop('careNeed', 'contains', 'respite', 'transport', 'meals', 'visits'),
                    prop('coordination', 'is', 'shared-calendar'),
                    prop('appreciation', 'is', 'acknowledged'),
                ],
                traits: ['professional', 'compassionate', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'PrimaryCaregiver', cameraFocus: 'PrimaryCaregiver 1' },
            { at: 4, action: 'publish_offer', actorRole: 'FamilySupporter', cameraFocus: 'FamilySupporter 1' },
            { at: 5, action: 'publish_offer', actorRole: 'FamilySupporter', cameraFocus: 'FamilySupporter 2' },
            { at: 6, action: 'publish_offer', actorRole: 'FamilySupporter', cameraFocus: 'FamilySupporter 3' },
            { at: 7, action: 'publish_offer', actorRole: 'CommunityResource', cameraFocus: 'CommunityResource 1' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Commons governance — Ostrom principles, communal sharing, collective choice
    'commons-governance': {
        name: 'Commons Governance',
        description: 'Community governs shared resource (water, pasture, fishery) using Ostrom principles. Tests matching on boundaries, monitoring, graduated sanctions, conflict resolution, nested enterprises.',
        agents: [
            {
                role: 'CommonsSteward',
                count: 3,
                properties: [
                    prop('role', 'is', 'steward'),
                    prop('resource', 'has', 'water', 'pasture', 'fishery', 'forest'),
                    prop('boundaries', 'is', 'defined'),
                    prop('monitoring', 'is', 'active'),
                    prop('governance', 'has', 'collective-choice', 'graduated-sanctions', 'conflict-resolution', 'nested-enterprises'),
                ],
                interests: [
                    prop('role', 'is', 'resource-user'),
                    prop('useType', 'has', 'irrigation', 'grazing', 'fishing', 'foraging'),
                    prop('compliance', 'is', 'willing'),
                ],
                traits: ['responsible', 'transparent', 'template-user'],
            },
            {
                role: 'ResourceUser',
                count: 8,
                properties: [
                    prop('role', 'is', 'resource-user'),
                    prop('useType', 'has', 'irrigation', 'grazing', 'fishing', 'foraging'),
                    prop('quantity', 'is', 'moderate'),
                    prop('compliance', 'is', 'willing'),
                    prop('contribution', 'has', 'labor', 'monitoring', 'maintenance'),
                ],
                interests: [
                    prop('role', 'is', 'steward'),
                    prop('resource', 'has', 'water', 'pasture', 'fishery', 'forest'),
                    prop('governance', 'has', 'collective-choice', 'conflict-resolution'),
                ],
                traits: ['cooperative', 'vested', 'template-user'],
            },
            {
                role: 'ExternalAuthority',
                count: 1,
                properties: [
                    prop('role', 'is', 'external-authority'),
                    prop('recognition', 'is', 'granted'),
                    prop('support', 'has', 'legal-backing', 'technical-assistance', 'funding'),
                ],
                interests: [
                    prop('role', 'is', 'steward'),
                    prop('governance', 'has', 'nested-enterprises'),
                ],
                traits: ['supportive', 'hands-off', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_manifest', actorRole: 'CommonsSteward', cameraFocus: 'CommonsSteward 1' },
            { at: 4, action: 'publish_offer', actorRole: 'ResourceUser', cameraFocus: 'ResourceUser 1' },
            { at: 5, action: 'publish_offer', actorRole: 'ResourceUser', cameraFocus: 'ResourceUser 2' },
            { at: 6, action: 'publish_offer', actorRole: 'ResourceUser', cameraFocus: 'ResourceUser 3' },
            { at: 7, action: 'publish_offer', actorRole: 'ExternalAuthority', cameraFocus: 'ExternalAuthority 1' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Cross-cultural/multilingual heterogeneity — refugee coordination, international aid
    'cross-cultural': {
        name: 'Cross-Cultural Aid Coordination',
        description: 'International aid organizations coordinate with local communities across language and cultural barriers. Tests matching on needs, capabilities, cultural sensitivity, multilingual communication.',
        agents: [
            {
                role: 'AidCoordinator',
                count: 2,
                properties: [
                    prop('role', 'is', 'aid-coordinator'),
                    prop('organization', 'has', 'UN', 'NGO', 'red-cross', 'government'),
                    prop('languages', 'has', 'english', 'french', 'spanish', 'arabic', 'swahili'),
                    prop('mandate', 'has', 'protection', 'shelter', 'health', 'food-security', 'wash'),
                ],
                interests: [
                    prop('role', 'is', 'local-partner'),
                    prop('type', 'has', 'community-org', 'faith-based', 'womens-group'),
                    prop('languages', 'has', 'local', 'regional'),
                ],
                traits: ['culturally-sensitive', 'adaptive', 'template-user'],
            },
            {
                role: 'LocalPartner',
                count: 6,
                properties: [
                    prop('role', 'is', 'local-partner'),
                    prop('type', 'has', 'community-org', 'faith-based', 'womens-group', 'youth-org'),
                    prop('languages', 'has', 'local', 'regional', 'national'),
                    prop('coverage', 'has', 'village', 'district', 'camp', 'urban'),
                ],
                interests: [
                    prop('role', 'is', 'aid-coordinator'),
                    prop('organization', 'has', 'UN', 'NGO', 'red-cross'),
                    prop('mandate', 'has', 'protection', 'shelter', 'health'),
                ],
                traits: ['embedded', 'trusted', 'template-user'],
            },
            {
                role: 'AffectedCommunity',
                count: 10,
                properties: [
                    prop('role', 'is', 'affected-community'),
                    prop('displacement', 'has', 'refugee', 'idp', 'host-community', 'returnee'),
                    prop('languages', 'has', 'mother-tongue', 'lingua-franca'),
                    prop('vulnerability', 'has', 'elderly', 'disabled', 'female-headed', 'child-headed', 'unaccompanied-minor'),
                ],
                interests: [
                    prop('role', 'is', 'aid-coordinator'),
                    prop('role', 'is', 'local-partner'),
                    prop('mandate', 'has', 'food', 'shelter', 'healthcare', 'protection'),
                ],
                traits: ['resilient', 'diverse', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_manifest', actorRole: 'AidCoordinator', cameraFocus: 'AidCoordinator 1' },
            { at: 4, action: 'publish_offer', actorRole: 'LocalPartner', cameraFocus: 'LocalPartner 1' },
            { at: 5, action: 'publish_offer', actorRole: 'LocalPartner', cameraFocus: 'LocalPartner 2' },
            { at: 6, action: 'publish_offer', actorRole: 'LocalPartner', cameraFocus: 'LocalPartner 3' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 20,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Long-term commitment chains — supply chains, referral networks, apprenticeship
    'long-term-commitment': {
        name: 'Long-Term Commitment Network',
        description: 'Supply chain partners build enduring referral and apprenticeship relationships. Tests matching on trust, reliability, succession planning, multi-year commitments.',
        agents: [
            {
                role: 'AnchorFirm',
                count: 2,
                properties: [
                    prop('role', 'is', 'anchor-firm'),
                    prop('industry', 'has', 'manufacturing', 'construction', 'specialized-services'),
                    prop('commitmentHorizon', 'is', '5-years'),
                    prop('successionPlan', 'is', 'active'),
                ],
                interests: [
                    prop('role', 'is', 'specialist-partner'),
                    prop('trackRecord', 'is', 'proven'),
                    prop('specialty', 'has', 'machining', 'fabrication', 'design', 'testing'),
                ],
                traits: ['strategic', 'patient-capital', 'template-user'],
            },
            {
                role: 'SpecialistPartner',
                count: 8,
                properties: [
                    prop('role', 'is', 'specialist-partner'),
                    prop('specialty', 'has', 'machining', 'fabrication', 'finishing', 'assembly', 'design', 'testing'),
                    prop('trackRecord', 'is', 'proven'),
                    prop('capacity', 'has', 'flexible', 'scalable', 'certified'),
                ],
                interests: [
                    prop('role', 'is', 'anchor-firm'),
                    prop('industry', 'has', 'manufacturing', 'construction'),
                    prop('commitmentHorizon', 'is', '5-years'),
                ],
                traits: ['skilled', 'reliable', 'entrepreneurial'],
            },
            {
                role: 'ApprenticeTalent',
                count: 5,
                properties: [
                    prop('role', 'is', 'apprentice'),
                    prop('trade', 'has', 'machining', 'welding', 'electronics', 'carpentry', 'composites'),
                    prop('stage', 'has', 'entry', 'intermediate', 'journeyman-track'),
                    prop('commitment', 'is', 'multi-year'),
                ],
                interests: [
                    prop('role', 'is', 'specialist-partner'),
                    prop('specialty', 'has', 'machining', 'fabrication'),
                    prop('trackRecord', 'is', 'proven'),
                ],
                traits: ['motivated', 'learning-oriented', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_manifest', actorRole: 'AnchorFirm', cameraFocus: 'AnchorFirm 1' },
            { at: 4, action: 'publish_offer', actorRole: 'SpecialistPartner', cameraFocus: 'SpecialistPartner 1' },
            { at: 5, action: 'publish_offer', actorRole: 'SpecialistPartner', cameraFocus: 'SpecialistPartner 2' },
            { at: 6, action: 'publish_offer', actorRole: 'ApprenticeTalent', cameraFocus: 'ApprenticeTalent 1' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 20,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Authority/hierarchy topologies with legal stakes — government services, regulated professions
    'government-services': {
        name: 'Government Services Access',
        description: 'Citizens navigate government services for permits, benefits, licenses. Tests matching on jurisdiction, eligibility, legal authority, hierarchical escalation.',
        agents: [
            {
                role: 'Citizen',
                count: 6,
                properties: [
                    prop('role', 'is', 'citizen'),
                    prop('jurisdiction', 'is', 'municipal'),
                    prop('serviceNeed', 'contains', 'building-permit', 'business-license', 'benefits', 'vital-records'),
                    prop('eligibility', 'contains', 'resident', 'taxpayer', 'veteran', 'senior'),
                    prop('documentation', 'is', 'complete'),
                ],
                interests: [
                    prop('role', 'is', 'case-worker'),
                    prop('department', 'contains', 'permits', 'licensing', 'benefits', 'records'),
                    prop('authority', 'is', 'delegated'),
                ],
                traits: ['needs-assistance', 'document-prepared', 'template-user'],
            },
            {
                role: 'CaseWorker',
                count: 3,
                properties: [
                    prop('role', 'is', 'case-worker'),
                    prop('department', 'contains', 'permits', 'licensing', 'benefits', 'records'),
                    prop('authority', 'is', 'delegated'),
                    prop('jurisdiction', 'is', 'municipal'),
                    prop('caseLoad', 'is', 'standard'),
                ],
                interests: [
                    prop('role', 'is', 'case-worker'),
                    prop('department', 'contains', 'permits', 'licensing', 'benefits', 'records'),
                    prop('authority', 'is', 'delegated'),
                ],
                traits: ['procedural', 'helpful', 'template-user'],
            },
            {
                role: 'Supervisor',
                count: 1,
                properties: [
                    prop('role', 'is', 'supervisor'),
                    prop('authority', 'is', 'statutory'),
                    prop('escalationPath', 'contains', 'appeals', 'review', 'exception'),
                ],
                interests: [
                    prop('role', 'is', 'case-worker'),
                    prop('complexity', 'is', 'high'),
                ],
                traits: ['authoritative', 'discretionary', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Citizen', cameraFocus: 'Citizen 1' },
            { at: 3, action: 'publish_job', actorRole: 'Citizen', cameraFocus: 'Citizen 2' },
            { at: 4, action: 'publish_offer', actorRole: 'CaseWorker', cameraFocus: 'CaseWorker 1' },
            { at: 5, action: 'publish_offer', actorRole: 'CaseWorker', cameraFocus: 'CaseWorker 2' },
            { at: 6, action: 'publish_offer', actorRole: 'Supervisor', cameraFocus: 'Supervisor 1' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Contested heterogeneity — labor disputes, collective bargaining
    'labor-dispute': {
        name: 'Labor Dispute Resolution',
        description: 'Workers and management negotiate terms during a dispute. Tests matching on demands, concessions, mediation, contested interests, collective bargaining.',
        agents: [
            {
                role: 'UnionRep',
                count: 2,
                properties: [
                    prop('role', 'is', 'union-rep'),
                    prop('bargainingUnit', 'contains', 'production', 'clerical', 'technical', 'service'),
                    prop('demands', 'contains', 'wages', 'benefits', 'safety', 'scheduling', 'job-security'),
                    prop('strikeAuthorization', 'is', 'pending'),
                ],
                interests: [
                    prop('role', 'is', 'management'),
                    prop('authority', 'is', 'decision-maker'),
                    prop('willingness', 'contains', 'negotiate', 'mediate', 'arbitrate'),
                ],
                traits: ['collective', 'strategic', 'solidarity'],
            },
            {
                role: 'Management',
                count: 2,
                properties: [
                    prop('role', 'is', 'management'),
                    prop('authority', 'is', 'decision-maker'),
                    prop('constraints', 'contains', 'budget', 'competitiveness', 'operations'),
                    prop('position', 'contains', 'counter-offer', 'status-quo', 'concessions'),
                ],
                interests: [
                    prop('role', 'is', 'union-rep'),
                    prop('demands', 'contains', 'wages', 'benefits', 'safety'),
                    prop('continuity', 'is', 'priority'),
                ],
                traits: ['calculated', 'risk-aware', 'template-user'],
            },
            {
                role: 'Mediator',
                count: 1,
                properties: [
                    prop('role', 'is', 'mediator'),
                    prop('certification', 'is', 'federal'),
                    prop('process', 'contains', 'facilitation', 'shuttle-diplomacy', 'recommendations'),
                    prop('neutrality', 'is', 'guaranteed'),
                ],
                interests: [
                    prop('role', 'is', 'union-rep'),
                    prop('role', 'is', 'management'),
                    prop('goodFaith', 'is', 'required'),
                ],
                traits: ['impartial', 'skilled', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'UnionRep', cameraFocus: 'UnionRep 1' },
            { at: 4, action: 'publish_offer', actorRole: 'Management', cameraFocus: 'Management 1' },
            { at: 5, action: 'publish_offer', actorRole: 'Mediator', cameraFocus: 'Mediator 1' },
            { at: 7, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 20,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Market/mesh topologies with identity exchange — decentralized identity, reputation markets
    'decentralized-identity': {
        name: 'Decentralized Identity & Reputation',
        description: 'Users build portable reputation across contexts using verifiable credentials. Tests matching on credentials, attestations, trust chains, identity portability.',
        agents: [
            {
                role: 'CredentialHolder',
                count: 8,
                properties: [
                    prop('role', 'is', 'credential-holder'),
                    prop('credentials', 'contains', 'degree', 'certification', 'employment-history', 'skill-badge', 'community-standing'),
                    prop('issuers', 'contains', 'university', 'employer', 'dao', 'professional-org', 'community'),
                    prop('wallet', 'is', 'self-sovereign'),
                ],
                interests: [
                    prop('role', 'is', 'verifier'),
                    prop('accepts', 'contains', 'verifiable-credential', 'did', 'zk-proof'),
                    prop('context', 'contains', 'employment', 'lending', 'governance', 'access-control'),
                ],
                traits: ['privacy-conscious', 'portable-reputation', 'template-user'],
            },
            {
                role: 'Verifier',
                count: 4,
                properties: [
                    prop('role', 'is', 'verifier'),
                    prop('accepts', 'contains', 'verifiable-credential', 'did', 'zk-proof'),
                    prop('trustAnchors', 'contains', 'university-root', 'gov-root', 'dao-root', 'web-of-trust'),
                    prop('context', 'contains', 'employment', 'lending', 'governance', 'access-control'),
                ],
                interests: [
                    prop('role', 'is', 'credential-holder'),
                    prop('credentials', 'contains', 'degree', 'certification', 'employment-history'),
                    prop('presentation', 'is', 'selective-disclosure'),
                ],
                traits: ['trust-minimizing', 'efficient', 'template-user'],
            },
            {
                role: 'Attester',
                count: 2,
                properties: [
                    prop('role', 'is', 'attester'),
                    prop('authority', 'contains', 'academic', 'professional', 'community', 'governance'),
                    prop('schema', 'contains', 'degree', 'certification', 'membership', 'contribution'),
                    prop('revocation', 'is', 'supported'),
                ],
                interests: [
                    prop('role', 'is', 'credential-holder'),
                    prop('subject', 'is', 'eligible'),
                ],
                traits: ['authoritative', 'standards-compliant', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_offer', actorRole: 'Attester', cameraFocus: 'Attester 1' },
            { at: 3, action: 'publish_offer', actorRole: 'Attester', cameraFocus: 'Attester 2' },
            { at: 5, action: 'publish_job', actorRole: 'CredentialHolder', cameraFocus: 'CredentialHolder 1' },
            { at: 6, action: 'publish_job', actorRole: 'CredentialHolder', cameraFocus: 'CredentialHolder 3' },
            { at: 7, action: 'publish_offer', actorRole: 'Verifier', cameraFocus: 'Verifier 1' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Contested heterogeneity — contested resources, common-pool rivalry
    'contested-resources': {
        name: 'Contested Resource Allocation',
        description: 'Multiple parties compete for scarce shared resources (water, spectrum, bandwidth). Tests matching on claims, priority, allocation rules, conflict resolution.',
        agents: [
            {
                role: 'Claimant',
                count: 6,
                properties: [
                    prop('role', 'is', 'claimant'),
                    prop('resource', 'contains', 'water-rights', 'spectrum', 'bandwidth', 'fishery-quota', 'mineral-rights'),
                    prop('priority', 'contains', 'senior', 'junior', 'riparian', 'appropriative', 'tribal'),
                    prop('quantity', 'is', 'substantial'),
                ],
                interests: [
                    prop('role', 'is', 'allocator'),
                    prop('allocationRule', 'contains', 'prior-appropriation', 'riparian', 'proportional', 'market', 'administrative'),
                    prop('certainty', 'is', 'high'),
                ],
                traits: ['assertive', 'documented', 'vested-interest'],
            },
            {
                role: 'Allocator',
                count: 2,
                properties: [
                    prop('role', 'is', 'allocator'),
                    prop('authority', 'contains', 'statutory', 'regulatory', 'judicial', 'customary'),
                    prop('allocationRule', 'contains', 'prior-appropriation', 'riparian', 'proportional', 'market', 'administrative'),
                    prop('discretion', 'is', 'limited'),
                ],
                interests: [
                    prop('role', 'is', 'claimant'),
                    prop('claim', 'is', 'valid'),
                    prop('priority', 'contains', 'senior', 'junior', 'tribal'),
                ],
                traits: ['impartial', 'rule-bound', 'template-user'],
            },
            {
                role: 'Adjudicator',
                count: 1,
                properties: [
                    prop('role', 'is', 'adjudicator'),
                    prop('forum', 'contains', 'water-court', 'fcc', 'tribunal', 'customary-council'),
                    prop('precedent', 'is', 'binding'),
                    prop('remedies', 'contains', 'injunction', 'damages', 'reallocation', 'management-plan'),
                ],
                interests: [
                    prop('role', 'is', 'claimant'),
                    prop('dispute', 'is', 'ripe'),
                ],
                traits: ['authoritative', 'precedent-driven', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Claimant', cameraFocus: 'Claimant 1' },
            { at: 3, action: 'publish_job', actorRole: 'Claimant', cameraFocus: 'Claimant 2' },
            { at: 4, action: 'publish_offer', actorRole: 'Allocator', cameraFocus: 'Allocator 1' },
            { at: 5, action: 'publish_offer', actorRole: 'Adjudicator', cameraFocus: 'Adjudicator 1' },
            { at: 7, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard'
    },

    // Taxonomy gap: Equality/chain topologies with commitment exchange — referral networks, professional chains
    'referral-network': {
        name: 'Professional Referral Network',
        description: 'Professionals refer clients through trusted chains. Tests matching on trust, specialization, reciprocity, chain integrity, reputation.',
        agents: [
            {
                role: 'PrimaryProvider',
                count: 4,
                properties: [
                    prop('role', 'is', 'primary-provider'),
                    prop('specialty', 'contains', 'general-practice', 'family-law', 'tax', 'therapy', 'consulting'),
                    prop('capacity', 'is', 'limited'),
                    prop('referralCriteria', 'contains', 'specialty-match', 'trust', 'geography', 'availability'),
                ],
                interests: [
                    prop('role', 'is', 'specialist'),
                    prop('specialty', 'contains', 'cardiology', 'litigation', 'international-tax', 'trauma', 'strategy'),
                    prop('reputation', 'is', 'verified'),
                ],
                traits: ['gatekeeper', 'trust-based', 'template-user'],
            },
            {
                role: 'Specialist',
                count: 8,
                properties: [
                    prop('role', 'is', 'specialist'),
                    prop('specialty', 'contains', 'cardiology', 'litigation', 'international-tax', 'trauma', 'strategy', 'oncology'),
                    prop('acceptsReferrals', 'is', 'yes'),
                    prop('reciprocity', 'is', 'expected'),
                    prop('availability', 'contains', 'urgent', 'routine', 'virtual'),
                ],
                interests: [
                    prop('role', 'is', 'primary-provider'),
                    prop('referralQuality', 'is', 'high'),
                    prop('feedbackLoop', 'is', 'closed'),
                ],
                traits: ['expert', 'collaborative', 'template-user'],
            },
            {
                role: 'Client',
                count: 10,
                properties: [
                    prop('role', 'is', 'client'),
                    prop('need', 'contains', 'specialist-care', 'complex-litigation', 'tax-dispute', 'trauma-therapy'),
                    prop('trustSource', 'contains', 'primary-provider', 'peer', 'reputation-platform'),
                    prop('urgency', 'contains', 'immediate', 'scheduled'),
                ],
                interests: [
                    prop('role', 'is', 'primary-provider'),
                    prop('referral', 'is', 'warm'),
                    prop('specialist', 'is', 'available'),
                ],
                traits: ['trusting', 'needs-driven', 'template-user'],
            },
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Client', cameraFocus: 'Client 1' },
            { at: 4, action: 'publish_offer', actorRole: 'PrimaryProvider', cameraFocus: 'PrimaryProvider 1' },
            { at: 5, action: 'publish_offer', actorRole: 'PrimaryProvider', cameraFocus: 'PrimaryProvider 2' },
            { at: 6, action: 'publish_offer', actorRole: 'Specialist', cameraFocus: 'Specialist 1' },
            { at: 7, action: 'publish_offer', actorRole: 'Specialist', cameraFocus: 'Specialist 2' },
            { at: 9, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium'
    },
    // ------------------------------------------------------------------
    // Taxonomy breadth: one scenario per previously uncovered coarse cell
    // ------------------------------------------------------------------

    // communal/info — residents exchange local information without money
    'neighborhood-bulletin': {
        name: 'Neighborhood Bulletin',
        description: 'Residents share local information: road closures, lost pets, and community notices.',
        agents: [
            {
                role: 'Resident',
                count: 12,
                properties: [
                    prop('role', 'is', 'resident'),
                    prop('location', 'is', 'Maple Street'),
                    prop('topic', 'contains', 'road-closure', 'lost-pet', 'community-notice'),
                ],
                interests: [
                    prop('topic', 'contains', 'road-closure', 'lost-pet', 'community-notice'),
                    prop('location', 'is', 'Maple Street'),
                ],
                traits: ['local', 'informal', 'template-user'],
            },
            {
                role: 'Moderator',
                count: 2,
                properties: [
                    prop('role', 'is', 'moderator'),
                    prop('authority', 'is', 'delegated'),
                    prop('context', 'is', 'neighborhood-board'),
                ],
                interests: [prop('topic', 'contains', 'safety', 'events')],
                traits: ['helpful', 'concise', 'template-user'],
            },
        ],
        events: alternatingEvents(['Resident', 'Moderator', 'Resident']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy',
    },

    // communal/legal — customary norms adjudicated by elders
    'customary-norms': {
        name: 'Customary Norms',
        description: 'A village mediates grazing and water use under customary law rather than statute.',
        agents: [
            {
                role: 'Elder',
                count: 3,
                properties: [
                    prop('role', 'is', 'elder'),
                    prop('jurisdiction', 'is', 'customary'),
                    prop('authority', 'is', 'customary'),
                    prop('allocationRule', 'contains', 'rotation', 'shared-access'),
                ],
                interests: [prop('claim', 'is', 'grazing-rights'), prop('parties', 'contains', 'household')],
                traits: ['deliberative', 'respected', 'template-user'],
            },
            {
                role: 'Household',
                count: 8,
                properties: [
                    prop('role', 'is', 'household'),
                    prop('resource', 'contains', 'pasture', 'well'),
                    prop('claim', 'contains', 'grazing-rights', 'water-access'),
                ],
                interests: [prop('authority', 'is', 'customary'), prop('allocationRule', 'contains', 'rotation')],
                traits: ['aggrieved', 'cooperative', 'template-user'],
            },
        ],
        events: alternatingEvents(['Household', 'Elder', 'Household']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // authority/info — an agency broadcasts public guidance
    'public-health-advisory': {
        name: 'Public Health Advisory',
        description: 'A health agency publishes guidance and clinics subscribe to updates.',
        agents: [
            {
                role: 'Agency',
                count: 2,
                properties: [
                    prop('role', 'is', 'health-agency'),
                    prop('authority', 'is', 'statutory'),
                    prop('jurisdiction', 'is', 'municipal'),
                    prop('serviceNeed', 'contains', 'vaccination', 'water-safety'),
                ],
                interests: [prop('audience', 'contains', 'clinic', 'household')],
                traits: ['official', 'clear', 'template-user'],
            },
            {
                role: 'Clinic',
                count: 6,
                properties: [
                    prop('role', 'is', 'clinic'),
                    prop('accepts', 'contains', 'advisory', 'referral'),
                    prop('location', 'is', 'downtown'),
                ],
                interests: [prop('authority', 'is', 'statutory'), prop('topic', 'contains', 'vaccination')],
                traits: ['responsive', 'clinical', 'template-user'],
            },
        ],
        events: alternatingEvents(['Agency', 'Clinic', 'Agency']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy',
    },

    // authority/social — delegated casework for social services
    'welfare-casework': {
        name: 'Welfare Casework',
        description: 'Case workers match applicants to delegated social services and benefits.',
        agents: [
            {
                role: 'CaseWorker',
                count: 4,
                properties: [
                    prop('role', 'is', 'case-worker'),
                    prop('authority', 'is', 'delegated'),
                    prop('jurisdiction', 'is', 'municipal'),
                    prop('caseLoad', 'is', 'standard'),
                    prop('department', 'contains', 'housing', 'benefits'),
                ],
                interests: [prop('eligibility', 'contains', 'resident', 'low-income'), prop('documentation', 'is', 'complete')],
                traits: ['procedural', 'empathetic', 'template-user'],
            },
            {
                role: 'Applicant',
                count: 10,
                properties: [
                    prop('role', 'is', 'applicant'),
                    prop('eligibility', 'contains', 'resident', 'low-income', 'caregiver'),
                    prop('documentation', 'contains', 'complete', 'partial'),
                    prop('serviceNeed', 'contains', 'housing', 'benefits', 'childcare'),
                ],
                interests: [prop('authority', 'is', 'delegated'), prop('caseLoad', 'is', 'standard')],
                traits: ['urgent', 'cooperative', 'template-user'],
            },
        ],
        events: alternatingEvents(['Applicant', 'CaseWorker', 'Applicant']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // authority/safety — statutory alerts during a hazard
    'disaster-alert': {
        name: 'Disaster Alert',
        description: 'Emergency agencies issue evacuation orders that households must act on.',
        agents: [
            {
                role: 'EmergencyAgency',
                count: 2,
                properties: [
                    prop('role', 'is', 'emergency-agency'),
                    prop('authority', 'is', 'statutory'),
                    prop('hazardType', 'contains', 'flood', 'wildfire'),
                    prop('urgency', 'is', 'immediate'),
                ],
                interests: [prop('location', 'contains', 'low-lying', 'river-bend'), prop('hasVehicle', 'is', 'false')],
                traits: ['authoritative', 'urgent', 'template-user'],
            },
            {
                role: 'Household',
                count: 10,
                properties: [
                    prop('role', 'is', 'household'),
                    prop('location', 'contains', 'low-lying', 'river-bend', 'uphill'),
                    prop('hasVehicle', 'is', 'false'),
                    prop('careRequirements', 'contains', 'mobility', 'insulin'),
                ],
                interests: [prop('authority', 'is', 'statutory'), prop('shelterType', 'contains', 'accessible')],
                traits: ['vulnerable', 'cooperative', 'template-user'],
            },
        ],
        events: alternatingEvents(['EmergencyAgency', 'Household', 'EmergencyAgency']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // authority/existential — a status decision that changes someone's life
    'refugee-status': {
        name: 'Refugee Status',
        description: 'A status officer decides residency claims under national law.',
        agents: [
            {
                role: 'StatusOfficer',
                count: 2,
                properties: [
                    prop('role', 'is', 'status-officer'),
                    prop('authority', 'is', 'statutory'),
                    prop('jurisdiction', 'is', 'national'),
                    prop('discretion', 'is', 'limited'),
                ],
                interests: [prop('eligibility', 'contains', 'persecution', 'displacement'), prop('documentation', 'is', 'complete')],
                traits: ['impartial', 'procedural', 'template-user'],
            },
            {
                role: 'Applicant',
                count: 8,
                properties: [
                    prop('role', 'is', 'applicant'),
                    prop('eligibility', 'contains', 'persecution', 'displacement', 'family-reunification'),
                    prop('documentation', 'contains', 'complete', 'partial', 'missing'),
                    prop('urgency', 'contains', 'immediate'),
                ],
                interests: [prop('authority', 'is', 'statutory'), prop('jurisdiction', 'is', 'national')],
                traits: ['vulnerable', 'hopeful', 'template-user'],
            },
        ],
        events: alternatingEvents(['Applicant', 'StatusOfficer', 'Applicant']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // equality/info — reciprocal peer review
    'peer-review': {
        name: 'Peer Review',
        description: 'Scholars exchange manuscript reviews as equals, with no hierarchical authority.',
        agents: [
            {
                role: 'Author',
                count: 8,
                properties: [
                    prop('role', 'is', 'author'),
                    prop('topic', 'contains', 'methods', 'replication', 'ethics'),
                    prop('status', 'is', 'submitted'),
                ],
                interests: [prop('role', 'is', 'reviewer'), prop('focus', 'contains', 'methods', 'replication')],
                traits: ['rigorous', 'responsive', 'template-user'],
            },
            {
                role: 'Reviewer',
                count: 8,
                properties: [
                    prop('role', 'is', 'reviewer'),
                    prop('specialty', 'contains', 'methods', 'statistics', 'ethics'),
                    prop('reciprocity', 'is', 'expected'),
                    prop('availability', 'contains', 'scheduled'),
                ],
                interests: [prop('role', 'is', 'author'), prop('topic', 'contains', 'methods', 'statistics')],
                traits: ['constructive', 'anonymous', 'template-user'],
            },
        ],
        events: alternatingEvents(['Author', 'Reviewer', 'Author', 'Reviewer']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // equality/legal — peers arbitrate a commercial dispute
    'arbitration-panel': {
        name: 'Arbitration Panel',
        description: 'Two parties appoint peer arbitrators to settle a contract dispute.',
        agents: [
            {
                role: 'Party',
                count: 6,
                properties: [
                    prop('role', 'is', 'party'),
                    prop('contractType', 'is', 'services-agreement'),
                    prop('parties', 'contains', 'supplier', 'buyer'),
                    prop('demands', 'contains', 'refund', 'specific-performance'),
                ],
                interests: [prop('role', 'is', 'arbitrator'), prop('jurisdiction', 'is', 'commercial')],
                traits: ['adversarial', 'documented', 'template-user'],
            },
            {
                role: 'Arbitrator',
                count: 3,
                properties: [
                    prop('role', 'is', 'arbitrator'),
                    prop('jurisdiction', 'is', 'commercial'),
                    prop('discretion', 'is', 'limited'),
                    prop('governingLaw', 'is', 'arbitration-act'),
                ],
                interests: [prop('parties', 'contains', 'supplier', 'buyer'), prop('demands', 'contains', 'refund')],
                traits: ['neutral', 'precedent-driven', 'template-user'],
            },
        ],
        events: alternatingEvents(['Party', 'Arbitrator', 'Party']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // equality/safety — a mutual-aid collective coordinating safety
    'mutual-aid-collective': {
        name: 'Mutual Aid Collective',
        description: 'Neighbours coordinate rides, supplies, and check-ins as equals during a crisis.',
        agents: [
            {
                role: 'Coordinator',
                count: 3,
                properties: [
                    prop('role', 'is', 'coordinator'),
                    prop('coordination', 'is', 'shared-calendar'),
                    prop('resourceType', 'contains', 'supplies', 'transport'),
                    prop('urgency', 'is', 'immediate'),
                ],
                interests: [prop('role', 'is', 'volunteer'), prop('availability', 'contains', 'weekends')],
                traits: ['organised', 'inclusive', 'template-user'],
            },
            {
                role: 'Volunteer',
                count: 10,
                properties: [
                    prop('role', 'is', 'volunteer'),
                    prop('skills', 'contains', 'first-aid', 'driving', 'cooking'),
                    prop('availability', 'contains', 'weekends', 'evenings'),
                    prop('vehicle', 'contains', 'car', 'van'),
                ],
                interests: [prop('coordination', 'is', 'shared-calendar'), prop('resourceType', 'contains', 'supplies')],
                traits: ['reliable', 'neighbourly', 'template-user'],
            },
        ],
        events: alternatingEvents(['Volunteer', 'Coordinator', 'Volunteer']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // equality/existential — a cooperative deciding membership and survival
    'cooperative-commune': {
        name: 'Cooperative Commune',
        description: 'Members of a housing and food cooperative decide admissions and shares by consensus.',
        agents: [
            {
                role: 'Member',
                count: 8,
                properties: [
                    prop('role', 'is', 'member'),
                    prop('resource', 'contains', 'shelter', 'food'),
                    prop('allocationRule', 'is', 'consensus'),
                    prop('discretion', 'is', 'collective'),
                ],
                interests: [prop('role', 'is', 'steward'), prop('harvestShare', 'contains', '30%')],
                traits: ['egalitarian', 'deliberative', 'template-user'],
            },
            {
                role: 'Steward',
                count: 3,
                properties: [
                    prop('role', 'is', 'steward'),
                    prop('gardenBed', 'contains', 'north', 'south'),
                    prop('harvestShare', 'contains', '30%', '20%'),
                    prop('lineage', 'contains', 'grandmother', 'founding-member'),
                ],
                interests: [prop('role', 'is', 'member'), prop('allocationRule', 'is', 'consensus')],
                traits: ['custodial', 'transparent', 'template-user'],
            },
        ],
        events: alternatingEvents(['Member', 'Steward', 'Member']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // market/info — paid expertise
    'knowledge-marketplace': {
        name: 'Knowledge Marketplace',
        description: 'Experts sell advice to clients; matching depends on topic, rate, and budget.',
        agents: [
            {
                role: 'Expert',
                count: 8,
                properties: [
                    prop('role', 'is', 'consultant'),
                    prop('specialty', 'contains', 'strategy', 'finance', 'design'),
                    prop('rate', 'is', '120'),
                    prop('availability', 'contains', 'hourly', 'retainer'),
                ],
                interests: [prop('topic', 'contains', 'strategy', 'finance'), prop('budget', 'greater than', '100')],
                traits: ['expert', 'concise', 'template-user'],
            },
            {
                role: 'Client',
                count: 10,
                properties: [
                    prop('role', 'is', 'client'),
                    prop('topic', 'contains', 'strategy', 'finance', 'design'),
                    prop('budget', 'is', '500'),
                    prop('format', 'contains', 'virtual'),
                ],
                interests: [prop('role', 'is', 'consultant'), prop('rate', 'less than', '150')],
                traits: ['focused', 'buyer', 'template-user'],
            },
        ],
        events: alternatingEvents(['Client', 'Expert', 'Client', 'Expert']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'easy',
    },

    // market/safety — risk pooling
    'insurance-market': {
        name: 'Insurance Market',
        description: 'Insurers price hazard coverage; households buy protection against loss.',
        agents: [
            {
                role: 'Insurer',
                count: 4,
                properties: [
                    prop('role', 'is', 'insurer'),
                    prop('coverage', 'contains', 'flood', 'fire', 'medical'),
                    prop('price', 'is', '300'),
                    prop('contractType', 'is', 'policy'),
                ],
                interests: [prop('hazardType', 'contains', 'flood', 'fire'), prop('budget', 'greater than', '250')],
                traits: ['risk-based', 'formal', 'template-user'],
            },
            {
                role: 'Policyholder',
                count: 10,
                properties: [
                    prop('role', 'is', 'policyholder'),
                    prop('hazardType', 'contains', 'flood', 'fire', 'medical'),
                    prop('budget', 'is', '400'),
                    prop('location', 'contains', 'flood-zone', 'hillside'),
                ],
                interests: [prop('role', 'is', 'insurer'), prop('coverage', 'contains', 'flood', 'fire')],
                traits: ['cautious', 'comparison-shopper', 'template-user'],
            },
        ],
        events: alternatingEvents(['Policyholder', 'Insurer', 'Policyholder']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // market/existential — shelter as a traded necessity
    'housing-market': {
        name: 'Housing Market',
        description: 'Buyers and sellers trade homes; a failed match threatens shelter.',
        agents: [
            {
                role: 'Seller',
                count: 5,
                properties: [
                    prop('role', 'is', 'seller'),
                    prop('property', 'contains', '3-bed', '2-bed', 'studio'),
                    prop('price', 'is', '250000'),
                    prop('location', 'contains', 'downtown', 'suburbs'),
                ],
                interests: [prop('role', 'is', 'buyer'), prop('budget', 'greater than', '200000')],
                traits: ['motivated', 'formal', 'template-user'],
            },
            {
                role: 'Buyer',
                count: 10,
                properties: [
                    prop('role', 'is', 'buyer'),
                    prop('property', 'contains', '3-bed', '2-bed', 'studio'),
                    prop('budget', 'is', '300000'),
                    prop('location', 'contains', 'downtown', 'suburbs'),
                ],
                interests: [prop('role', 'is', 'seller'), prop('price', 'less than', '280000')],
                traits: ['urgent', 'pre-approved', 'template-user'],
            },
        ],
        events: alternatingEvents(['Buyer', 'Seller', 'Buyer', 'Seller']),
        duration: 15,
        tags: ['domain'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
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