import type { OntologyNode } from '../../types/index.js';

/**
 * Work domain ontology - Jobs, projects, tasks, and freelance work
 */
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
                attributes: {
                    title: {
                        type: 'string',
                        description: 'Job title',
                        icon: 'title',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    role: {
                        type: 'string',
                        description: 'The job title or role.',
                        icon: 'briefcase',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    description: {
                        type: 'string',
                        description: 'Detailed job description',
                        icon: 'info',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    company: {
                        type: 'string',
                        description: 'Company offering the job',
                        icon: 'building',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    location: {
                        type: 'string',
                        description: 'Job location',
                        icon: 'location',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    employmentType: {
                        type: 'enum',
                        options: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'volunteer'],
                        description: 'Type of employment',
                        icon: 'employment',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    experienceLevel: {
                        type: 'enum',
                        options: ['entry', 'mid', 'senior', 'executive'],
                        description: 'Required experience level',
                        icon: 'experience',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    skills: {
                        type: 'string',
                        description: 'Required skills',
                        icon: 'skills',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    budget: {
                        type: 'number',
                        description: 'Total budget amount.',
                        icon: 'cash',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    budgetRate: {
                        type: 'number',
                        description: 'Budget rate (e.g., per hour, per day).',
                        icon: 'cash-clock',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    remote: {
                        type: 'enum',
                        options: ['true', 'false', 'hybrid'],
                        description: 'Whether the job is remote',
                        icon: 'remote',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    }
                }
            },
            {
                id: 'freelance-offer',
                label: 'Freelance Offer',
                description: 'Offering services as a freelancer.',
                actionLabel: 'Post Offer',
                extends: ['freelance', 'offer'],
                requiredAttributes: ['role', 'rate'],
                attributes: {
                    title: {
                        type: 'string',
                        description: 'Service title',
                        icon: 'title',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    role: {
                        type: 'string',
                        description: 'The role offered.',
                        icon: 'briefcase',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    description: {
                        type: 'string',
                        description: 'Detailed service description',
                        icon: 'info',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    skills: {
                        type: 'string',
                        description: 'Skills offered',
                        icon: 'skills',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    rate: {
                        type: 'number',
                        description: 'Service rate (e.g., per hour, per day, per project).',
                        icon: 'cash-clock',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    availability: {
                        type: 'string',
                        description: 'When the service is available',
                        icon: 'calendar',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    deliveryTime: {
                        type: 'number',
                        description: 'Expected delivery time in days',
                        icon: 'timer',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    }
                }
            },
            {
                id: 'project',
                label: 'Project',
                description: 'A planned piece of work.',
                requiredAttributes: ['deadline'],
                attributes: {
                    title: {
                        type: 'string',
                        description: 'Project title',
                        icon: 'title',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    description: {
                        type: 'string',
                        description: 'Project description',
                        icon: 'info',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    status: {
                        type: 'enum',
                        options: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
                        description: 'Project status',
                        icon: 'status',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    priority: {
                        type: 'enum',
                        options: ['low', 'medium', 'high', 'critical'],
                        description: 'Project priority',
                        icon: 'priority',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    deadline: {
                        type: 'date',
                        description: 'Project deadline',
                        icon: 'calendar',
                        operators: { real: ['is'], imaginary: ['is after', 'is before'] },
                    },
                    budget: {
                        type: 'number',
                        description: 'Total project budget',
                        icon: 'cash',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] },
                    },
                    teamSize: {
                        type: 'number',
                        description: 'Number of team members',
                        icon: 'team',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    }
                }
            },
            {
                id: 'task',
                label: 'Task',
                description: 'A piece of work to be done.',
                attributes: {
                    title: {
                        type: 'string',
                        description: 'Task title',
                        icon: 'title',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    description: {
                        type: 'string',
                        description: 'Task description',
                        icon: 'info',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    status: {
                        type: 'enum',
                        options: ['todo', 'in-progress', 'review', 'done', 'blocked'],
                        description: 'Task status',
                        icon: 'status',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    priority: {
                        type: 'enum',
                        options: ['low', 'medium', 'high', 'urgent'],
                        description: 'Task priority',
                        icon: 'priority',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    dueDate: {
                        type: 'date',
                        description: 'Task due date',
                        icon: 'calendar',
                        operators: { real: ['is'], imaginary: ['is after', 'is before'] },
                    },
                    estimatedHours: {
                        type: 'number',
                        description: 'Estimated hours to complete',
                        icon: 'clock',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    actualHours: {
                        type: 'number',
                        description: 'Actual hours spent',
                        icon: 'timer',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    assignee: {
                        type: 'string',
                        description: 'Person assigned to the task',
                        icon: 'user',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    labels: {
                        type: 'string',
                        description: 'Task labels or tags',
                        icon: 'tag',
                        operators: { real: ['has'], imaginary: ['not has', 'contains'] },
                    }
                }
            }
        ]
    }
];
