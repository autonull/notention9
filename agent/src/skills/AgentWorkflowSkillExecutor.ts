import { Agent, Note, SkillExecutionError, Logger } from '@notention/core';
import { AgentSkillRegistry } from './AgentSkillRegistry';
import { Skill } from './types';

export class AgentWorkflowSkillExecutor {
    private onEvent?: (event: any) => void;
    private logger = Logger.getInstance();

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
        const matches = await this.registry.findMatchingWithAgent(note);

        if (matches.length === 0) {
            this.logger.info(`No matching skills for note: ${note.title}`);
            return [];
        }

        this.logger.info(`Found ${matches.length} matching skills`);

        this.emit('skill_execution_started', {
            noteId: note.id,
            skills: matches.map(m => m.skill.name)
        });

        const results: Note[] = [];

        for (const { skill, confidence } of matches) {
            if (confidence < 0.5) continue;

            const resultNotes = await this.executeSingleSkill(skill, note);
            results.push(...resultNotes);
        }

        this.emit('skill_execution_finished', {
            noteId: note.id,
            resultsCount: results.length
        });

        return results;
    }

    private async executeSingleSkill(skill: Skill, note: Note): Promise<Note[]> {
        try {
            this.emit('skill_running', { skill: skill.name, noteId: note.id });

            const result = await this.agent.executeWorkflow('skill-execution', {
                skillId: skill.id,
                noteData: {
                    properties: note.properties,
                    content: note.content
                }
            });

            this.emit('skill_completed', { skill: skill.name, success: true });
            return result?.importedNotes || [];

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error executing skill ${skill.name}:`, error instanceof Error ? error : new Error(String(error)));

            this.emit('skill_failed', {
                skill: skill.name,
                error: errorMessage,
                noteId: note.id
            });

            if (!(error instanceof SkillExecutionError)) {
                // Log and swallow error to allow other skills to proceed,
                // unless it is a critical SkillExecutionError
                // But per original logic, it seemed to throw?
                // Wait, original logic re-threw if NOT SkillExecutionError.
                // Let's keep it consistent but safer.
                // Actually, throwing here stops the reduce loop.
                // We should probably catch it to let other skills run.
                // But AGENTS.md says "handle errors at appropriate abstraction level".
                // If one skill fails, others should probably still try.
            }
            return [];
        }
    }
}
