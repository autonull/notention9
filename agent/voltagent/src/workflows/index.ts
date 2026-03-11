import { Workflow, WorkflowInput, WorkflowResult, Note, Property } from '@notention/core';

export const propertyExtractionWorkflow: Workflow = {
    id: 'property-extraction',
    name: 'property-extraction',
    description: 'Extract semantic properties from note content',
    inputs: [],
    outputs: [],
    steps: [
        {
            agent: 'semantic-processor',
            prompt: (input: any) => `Extract semantic properties from: "${input.content}"

        Return as JSON array of {key, operator, values} objects.
        Use ontology-aware extraction.`,
            output: 'extractedProperties'
        },
        {
            agent: 'semantic-processor',
            prompt: (input: any) => `Validate these properties against the ontology:
        ${JSON.stringify(input.extractedProperties)}

        Return validated properties with any corrections.`,
            output: 'validatedProperties'
        }
    ],
    execute: async (input: WorkflowInput): Promise<WorkflowResult> => {
        try {
            // Simulate property extraction
            const content = input.content || '';
            const extractedProperties: Property[] = [];

            // Simple pattern matching to extract properties
            const propertyRegex = /\[([^\]]+)\]/g;
            let match;
            while ((match = propertyRegex.exec(content)) !== null) {
                const propStr = match[1];
                // Parse property in format "key:operator:value" or "key=value"
                const colonSplit = propStr.split(':');
                if (colonSplit.length >= 3) {
                    const key = colonSplit[0];
                    const operator = colonSplit[1];
                    const values = [colonSplit.slice(2).join(':')]; // Join remaining parts in case value contains ':'

                    extractedProperties.push({
                        key,
                        operator,
                        values
                    });
                } else {
                    // Handle "key=value" format
                    const equalSplit = propStr.split('=');
                    if (equalSplit.length >= 2) {
                        const key = equalSplit[0];
                        const values = [equalSplit.slice(1).join('=')]; // Join remaining parts in case value contains '='

                        extractedProperties.push({
                            key,
                            operator: 'is',
                            values
                        });
                    }
                }
            }

            return {
                extractedProperties,
                validatedProperties: extractedProperties,
                items: [{
                    title: input.title || 'Processed Note',
                    content: content,
                    properties: extractedProperties
                }]
            };
        } catch (error) {
            console.error('Property extraction workflow error:', error);
            return {
                extractedProperties: [],
                validatedProperties: [],
                items: [{
                    title: input.title || 'Processed Note',
                    content: input.content || '',
                    properties: []
                }]
            };
        }
    }
};

export const skillMatchingWorkflow: Workflow = {
    id: 'skill-matching',
    name: 'skill-matching',
    description: 'Find matching skills for a note',
    inputs: [],
    outputs: [],
    steps: [
        {
            tool: 'query-skill-registry',
            input: (workflow: any) => ({
                properties: workflow.input.properties,
                minConfidence: 0.5
            }),
            output: 'matchingSkills'
        },
        {
            agent: 'skill-executor',
            prompt: (input: any) => `Rank these skills by relevance to the note:
        ${JSON.stringify(input.matchingSkills)}

        Consider: semantic overlap, user intent, past success.`,
            output: 'rankedSkills'
        }
    ],
    execute: async (input: WorkflowInput): Promise<WorkflowResult> => {
        try {
            // Simulate skill matching
            // This would normally call the query-skill-registry tool
            return {
                matchingSkills: [],
                rankedSkills: [],
                items: []
            };
        } catch (error) {
            console.error('Skill matching workflow error:', error);
            return {
                matchingSkills: [],
                rankedSkills: [],
                items: []
            };
        }
    }
};

export const skillExecutionWorkflow: Workflow = {
    id: 'skill-execution',
    name: 'skill-execution',
    description: 'Execute a skill and import results',
    inputs: [],
    outputs: [],
    steps: [
        {
            tool: 'execute-skill',
            input: (workflow: any) => ({
                skillId: workflow.input.skillId,
                noteData: workflow.input.noteData
            }),
            output: 'skillResults'
        },
        {
            agent: 'semantic-processor',
            prompt: (input: any) => `Transform these results into Notention notes:
        ${JSON.stringify(input.skillResults)}

        Extract properties, generate titles, maintain provenance.`,
            output: 'importedNotes'
        }
    ],
    execute: async (input: WorkflowInput): Promise<WorkflowResult> => {
        try {
            // Simulate skill execution
            const skillId = input.skillId || 'unknown';
            const noteData = input.noteData || {};

            // This would normally execute the actual skill via the tool system
            // For now, return a simulated result
            return {
                skillResults: [{
                    success: true,
                    data: `Simulated execution of skill ${skillId}`,
                    originalNote: noteData
                }],
                importedNotes: [{
                    title: `Result from ${skillId}`,
                    content: `Execution of skill ${skillId} completed successfully`,
                    properties: [],
                    tags: ['result']
                }],
                items: [{
                    title: `Result from ${skillId}`,
                    content: `Execution of skill ${skillId} completed successfully`,
                    properties: [],
                    tags: ['result']
                }]
            };
        } catch (error) {
            console.error('Skill execution workflow error:', error);
            return {
                skillResults: [{ success: false, error: String(error) }],
                importedNotes: [],
                items: []
            };
        }
    }
};
