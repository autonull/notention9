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

        const results = (
            await Promise.all(
                matches
                    .filter((m) => m.confidence >= 0.5)
                    .map((m) => this.executeSingleSkill(m.skill, note))
            )
        ).flat();

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
                this.logger.warn(`Non-critical error in skill ${skill.name}, continuing execution`);
            }
            return [];
        }
    }
}
