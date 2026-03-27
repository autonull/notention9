import { Agent, WorkflowResult, Note, SkillExecutionError } from '@notention/core';
import { AgentSkillRegistry } from './AgentSkillRegistry';

export class AgentWorkflowSkillExecutor {
    private onEvent?: (event: any) => void;

    constructor(
        private agent: Agent,
        private registry: AgentSkillRegistry,
        onEvent?: (event: any) => void
    ) {
        this.onEvent = onEvent;
    }

    private emit(type: string, payload: any) {
        if (this.onEvent) {
            this.onEvent({ type, payload });
        }
    }

    async executeForNote(note: Note): Promise<Note[]> {
        // Find matching skills via agent
        const matches = await this.registry.findMatchingWithAgent(note);

        if (matches.length === 0) {
            console.log(`No matching skills for note: ${note.title}`);
            return [];
        }

        console.log(`Found ${matches.length} matching skills`);

        this.emit('skill_execution_started', {
            noteId: note.id,
            skills: matches.map(m => m.skill.name)
        });

        // Execute via VoltAgent's skill-execution workflow
        const allResults: Note[] = [];

        for (const { skill, confidence } of matches) {
            if (confidence < 0.5) continue; // Skip low-confidence matches

            try {
                this.emit('skill_running', { skill: skill.name, noteId: note.id });

                // Note: The workflow 'skill-execution' was defined to take noteData.
                const result = await this.agent.executeWorkflow('skill-execution', {
                    skillId: skill.id,
                    noteData: {
                        properties: note.properties,
                        content: note.content
                    }
                });

                if (result?.importedNotes) {
                    allResults.push(...result.importedNotes);
                }

                this.emit('skill_completed', { skill: skill.name, success: true });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error executing skill ${skill.name}:`, error);

                // Emit structured error information
                this.emit('skill_failed', {
                    skill: skill.name,
                    error: errorMessage,
                    noteId: note.id
                });

                // Optionally rethrow or handle specific error types
                if (!(error instanceof SkillExecutionError)) {
                    throw new SkillExecutionError(`Failed to execute skill ${skill.name}: ${errorMessage}`);
                }
            }
        }

        this.emit('skill_execution_finished', {
            noteId: note.id,
            resultsCount: allResults.length
        });

        return allResults;
    }
}
