import type { Note, ActionSequence, BrowserAction } from '../../core/src/index';
import { SkillRegistry } from './skills/SkillRegistry';
import { IndeedSkill } from './skills/IndeedSkill';
import { CraigslistSkill } from './skills/CraigslistSkill';
import { GitHubSkill } from './skills/GitHubSkill';
import { EventbriteSkill } from './skills/EventbriteSkill';
import { ZillowSkill } from './skills/ZillowSkill';

/**
 * Browser execution handler interface for ClawdBot/MoltBot integration
 */
export interface BrowserExecutor {
    execute(actions: BrowserAction[]): Promise<unknown[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * ClawdBotCoordinator orchestrates skill execution.
 *
 * Workflow:
 * 1. User creates note with semantic properties
 * 2. Find matching skills via SkillRegistry
 * 3. Execute skill actions via browser executor
 * 4. Import results as structured notes
 * 5. User reviews/curates imported notes
 */
export class ClawdBotCoordinator {
    private registry: SkillRegistry;
    private browserExecutor?: BrowserExecutor;
    private bridge?: any; // Abstract bridge interface

    constructor(registry?: SkillRegistry, browserExecutor?: BrowserExecutor) {
        this.registry = registry || new SkillRegistry();
        this.browserExecutor = browserExecutor;
        this.initializeBuiltInSkills();
    }

    private initializeBuiltInSkills(): void {
        const skills = [
            { skill: new IndeedSkill(), meta: { tags: ['jobs', 'employment'], domains: ['indeed.com'] } },
            { skill: new CraigslistSkill(), meta: { tags: ['marketplace', 'products'], domains: ['craigslist.org'] } },
            { skill: new GitHubSkill(), meta: { tags: ['code', 'opensource'], domains: ['github.com'] } },
            { skill: new EventbriteSkill(), meta: { tags: ['events', 'concerts'], domains: ['eventbrite.com'] } },
            { skill: new ZillowSkill(), meta: { tags: ['realestate', 'housing'], domains: ['zillow.com'] } }
        ];

        skills.forEach(({ skill, meta }) =>
            this.registry.register(skill, { ...meta, requiresAuth: false, author: 'notention' })
        );

        console.log(`🤖 ClawdBot initialized with ${skills.length} skills`);
    }

    private notes: Map<string, Note> = new Map();

    setBridge(bridge: any) {
        this.bridge = bridge;
        this.bridge.on('message', (msg: any) => this.handleBridgeMessage(msg));
    }

    /**
     * Handle updates for the internal note cache (Context Provider)
     */
    onNoteCreated(note: Note) {
        this.notes.set(note.id, note);
        this.processNote(note).catch(console.error);
    }

    onNoteUpdated(note: Note) {
        this.notes.set(note.id, note);
    }

    onNoteDeleted(noteId: string) {
        this.notes.delete(noteId);
    }

    private async handleBridgeMessage(message: any) {
        console.log('📨 Bridge Message:', message.type);

        if (message.type === 'agent_response' || message.type === 'task_result') {
            const { taskId, content } = message.payload;
            console.log(`✨ Agent finished task ${taskId}. Content: ${content?.substring(0, 50)}...`);
        }
    }

    private isAgentConfiguration(note: Note): boolean {
        return note.properties.some(p => p.key === 'type' && p.values.includes('agent'));
    }

    private isTask(note: Note): boolean {
        return note.properties.some(p => p.key === 'type' && p.values.includes('task'));
    }

    private async syncAgentConfiguration(note: Note): Promise<void> {
        if (!this.bridge) {
            console.warn('⚠️ No MoltBot bridge configured. Cannot sync agent.');
            return;
        }

        console.log(`⚙️ Syncing Agent Configuration: ${note.title}`);

        const config = this.extractAgentConfig(note);
        await this.bridge.sendCommand('configure_agent', config);

        console.log('✅ Agent configuration sent to MoltBot');
    }

    private async executeTask(note: Note): Promise<void> {
        if (!this.bridge) {
            console.warn('⚠️ No MoltBot bridge configured. Cannot execute task.');
            return;
        }

        const assignee = note.properties.find(p => p.key === 'assignee')?.values[0];
        console.log(`⚡ Executing Task: ${note.title} (Assignee: ${assignee || 'Auto'})`);

        const contextNotes = await this.retrieveRelevantContext(note);
        const contextSummary = contextNotes.map(n => `- ${n.title}: ${n.content.substring(0, 100)}...`).join('\n');

        const payload = {
            taskId: note.id,
            instruction: note.content,
            assignee: assignee,
            context: {
                relatedNotes: contextSummary,
                fullNotes: contextNotes
            }
        };

        await this.bridge.sendCommand('execute_task', payload);
        console.log(`✅ Task instruction sent to MoltBot (with ${contextNotes.length} context notes)`);
    }

    private async retrieveRelevantContext(taskNote: Note): Promise<Note[]> {
        const taskTags = new Set(taskNote.tags);
        if (taskTags.size === 0) return [];

        console.log(`🔍 Searching context for tags: ${Array.from(taskTags).join(', ')}`);

        return Array.from(this.notes.values())
            .filter(n => n.id !== taskNote.id)
            .filter(n => n.tags.some(tag => taskTags.has(tag)))
            .slice(0, 5);
    }

    private extractAgentConfig(note: Note): any {
        const config: any = {
            id: note.id,
            name: note.title,
            description: note.content,
            systemPrompt: '',
            capabilities: [],
            model: 'claude-3-5-sonnet'
        };

        for (const prop of note.properties) {
            if (prop.key === 'model' && prop.values.length > 0) {
                config.model = prop.values[0];
            }
            if (prop.key === 'type') continue;

            if (prop.key === 'system_prompt') {
                config.systemPrompt = prop.values[0];
            }
            if (prop.key === 'access') {
                config.capabilities.push(...prop.values);
            }
        }

        return config;
    }

    async processNote(note: Note): Promise<ActionSequence[]> {
        if (this.isAgentConfiguration(note)) {
            await this.syncAgentConfiguration(note);
            return [];
        }

        if (this.isTask(note)) {
            await this.executeTask(note);
            return [];
        }

        const matches = await this.registry.findMatching(note, 0.5);

        if (!matches.length) {
            // console.log(`ℹ️ No matching skills for: "${note.title}"`);
            return [];
        }

        return matches
            .map(m => {
                try {
                    if (!m.skill.exportToActions) return null;
                    const sequence = m.skill.exportToActions(note);
                    return sequence;
                } catch (error) {
                    console.error(`❌ Error in ${m.skill.name}:`, error);
                    return null;
                }
            })
            .filter((s): s is ActionSequence => s !== null);
    }

    async executeActionSequence(sequence: ActionSequence): Promise<Note[]> {
        if (!this.browserExecutor) {
            throw new Error('No browser executor configured. Set via setBrowserExecutor()');
        }

        console.log(`🚀 Executing: ${sequence.name} (${sequence.actions.length} steps)`);

        const scrapedData = await this.browserExecutor.execute(sequence.actions);

        const skillMetadata = this.registry.getAll().find(
            m => sequence.id.includes(m.skill.id) ||
                sequence.id.includes(m.skill.name.toLowerCase().replace(/\s+/g, '-'))
        );

        if (!skillMetadata) {
            console.warn('⚠️ Skill not found for sequence');
            return [];
        }

        if (!skillMetadata.skill.importFromData) {
            console.warn('⚠️ Skill does not support importFromData');
            return [];
        }

        const importedNotes = skillMetadata.skill.importFromData(scrapedData, sequence.sourceNote);
        console.log(`✅ Imported ${importedNotes.length} notes from ${skillMetadata.skill.name}`);

        return importedNotes;
    }

    async processAndExecute(note: Note): Promise<Note[]> {
        const sequences = await this.processNote(note);
        if (!sequences.length) return [];

        const results = await Promise.all(
            sequences.map(seq => this.executeActionSequence(seq))
        );

        return results.flat();
    }

    getRegistry(): SkillRegistry {
        return this.registry;
    }

    setBrowserExecutor(executor: BrowserExecutor): void {
        this.browserExecutor = executor;
    }
}

export const clawdBotCoordinator = new ClawdBotCoordinator();
