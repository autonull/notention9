import { Workflow, WorkflowInput, WorkflowResult } from '@notention/core/src/types';
import { Note } from '@notention/core/src/types';

export const propertyExtractionWorkflow = {
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
    ]
};

export const skillMatchingWorkflow = {
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
    ]
};

export const skillExecutionWorkflow = {
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
    ]
};
