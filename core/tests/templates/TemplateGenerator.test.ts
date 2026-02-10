import { describe, it, expect } from 'vitest';
import { generateTemplatesFromOntology } from '../../src/templates/TemplateGenerator.js';
import { OntologyNode } from '../../src/templates/../types/index.js';

describe('TemplateGenerator', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'job-request',
            label: 'Job Post',
            actionLabel: 'Post Job',
            description: 'A job posting',
            requiredAttributes: ['role', 'rate'],
            attributes: {
                role: {
                    type: 'string',
                    description: 'Role',
                    icon: 'briefcase',
                    operators: { real: ['is'], imaginary: ['contains'] }
                },
                rate: {
                    type: 'number',
                    description: 'Rate',
                    icon: 'cash',
                    operators: { real: ['<'], imaginary: ['between'] }
                }
            }
        },
        {
            id: 'category',
            label: 'Category',
            children: [
                {
                    id: 'subcategory',
                    label: 'Sub Item',
                    actionLabel: 'Create Sub',
                    attributes: {
                        name: {
                            type: 'string',
                            description: 'Name',
                            icon: 'tag',
                            operators: { real: ['is'], imaginary: [] }
                        }
                    }
                }
            ]
        }
    ];

    it('should generate templates for nodes with actionLabel', () => {
        const templates = generateTemplatesFromOntology(mockOntology);
        expect(templates).toHaveLength(2);

        const jobTemplate = templates.find(t => t.id === 'tpl-job-request');
        expect(jobTemplate).toBeDefined();
        expect(jobTemplate?.label).toBe('Post Job');
        expect(jobTemplate?.icon).toBe('💼'); // Inferred from heuristic in generator
    });

    it('should generate content with required attributes', () => {
        const templates = generateTemplatesFromOntology(mockOntology);
        const jobTemplate = templates.find(t => t.id === 'tpl-job-request');

        expect(jobTemplate?.content).toContain('#job-request');
        expect(jobTemplate?.content).toContain('[role is text]'); // Default value for string 'text', default operator 'is'
        expect(jobTemplate?.content).toContain('[rate < 0]');     // Default value for number '0', default operator '<'
    });

    it('should traverse children', () => {
        const templates = generateTemplatesFromOntology(mockOntology);
        const subTemplate = templates.find(t => t.id === 'tpl-subcategory');
        expect(subTemplate).toBeDefined();
        expect(subTemplate?.label).toBe('Create Sub');
    });
});
