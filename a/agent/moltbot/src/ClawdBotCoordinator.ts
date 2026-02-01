import type { Note, ActionSequence, BrowserAction } from '@notention/core';
import { SkillRegistry } from '../../src/skills/SkillRegistry';
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
    private bridge?: any; // MoltBotBridge

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
        // Trigger self-processing if it's a task/agent note?
        this.processNote(note).catch(console.error);
    }

    onNoteUpdated(note: Note) {
        this.notes.set(note.id, note);
        // Re-evaluate?
    }

    onNoteDeleted(noteId: string) {
        this.notes.delete(noteId);
    }

    private async handleBridgeMessage(message: any) {
        console.log('📨 Bridge Message:', message.type);

        if (message.type === 'agent_response' || message.type === 'task_result') {
            const { taskId, content, result } = message.payload;

            // Create a Result Note
            const taskNote = this.notes.get(taskId);
            const title = taskNote ? `Result: ${taskNote.title}` : `Agent Result`;

            // Create result note (pseudo-code, in real app we'd need to push TO the system/UI)
            // But here we are the agent, we can't directly write to UI's DB strictly speaking unless via PluginManager?
            // Actually, we can just log it for now or assume a callback mechanism. 
            // Better: Emit an event that index.ts listens to and broadcasts as 'note_created' to UI.

            console.log(`✨ Agent finished task ${taskId}. Content: ${content?.substring(0, 50)}...`);

            // TODO: Emit event to create new note in the system
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

        // Retrieve relevant context (memories, related notes)
        const contextNotes = await this.retrieveRelevantContext(note);
        const contextSummary = contextNotes.map(n => `- ${n.title}: ${n.content.substring(0, 100)}...`).join('\n');

        const payload = {
            taskId: note.id,
            instruction: note.content,
            assignee: assignee,
            context: {
                relatedNotes: contextSummary,
                // Pass full notes if the agent supports it
                fullNotes: contextNotes
            }
        };

        await this.bridge.sendCommand('execute_task', payload);
        console.log(`✅ Task instruction sent to MoltBot (with ${contextNotes.length} context notes)`);
    }

    /**
     * Retrieve relevant notes to provide as context for the task.
     * Uses simple tag matching against the in-memory note cache.
     */
    private async retrieveRelevantContext(taskNote: Note): Promise<Note[]> {
        const taskTags = new Set(taskNote.tags);
        if (taskTags.size === 0) return [];

        console.log(`🔍 Searching context for tags: ${Array.from(taskTags).join(', ')}`);

        return Array.from(this.notes.values())
            .filter(n => n.id !== taskNote.id) // Exclude self
            .filter(n => n.tags.some(tag => taskTags.has(tag))) // Match any tag
            .slice(0, 5); // Limit to top 5
    }

    private extractAgentConfig(note: Note): any {
        const config: any = {
            id: note.id,
            name: note.title,
            description: note.content,
            systemPrompt: '',
            capabilities: [],
            model: 'claude-3-5-sonnet' // default
        };

        for (const prop of note.properties) {
            if (prop.key === 'model' && prop.values.length > 0) {
                config.model = prop.values[0];
            }
            if (prop.key === 'type') continue;

            // Map other properties
            if (prop.key === 'system_prompt') {
                config.systemPrompt = prop.values[0];
            }
            if (prop.key === 'access') {
                config.capabilities.push(...prop.values);
            }
        }

        return config;
    }

    /**
     * Process note through matching skills, returning action sequences
     */
    async processNote(note: Note): Promise<ActionSequence[]> {
        // 1. Check if this is an Agent Configuration Note
        if (this.isAgentConfiguration(note)) {
            await this.syncAgentConfiguration(note);
            return [];
        }

        // 2. Check if this is a Task Note
        if (this.isTask(note)) {
            await this.executeTask(note);
            return [];
        }

        const matches = await this.registry.findMatching(note, 0.5);

        if (!matches.length) {
            console.log(`ℹ️ No matching skills for: "${note.title}"`);
            return [];
        }

        console.log(
            `✨ Found ${matches.length} skill(s):`,
            matches.map(m => `${m.skill.name} (${(m.confidence * 100).toFixed(0)}%)`)
        );

        return matches
            .map(m => {
                try {
                    if (!m.skill.exportToActions) return null;
                    const sequence = m.skill.exportToActions(note);
                    console.log(`📋 ${sequence.name}${m.skill.preview ? `: ${m.skill.preview(note)}` : ''}`);
                    return sequence;
                } catch (error) {
                    console.error(`❌ Error in ${m.skill.name}:`, error);
                    return null;
                }
            })
            .filter((s): s is ActionSequence => s !== null);
    }

    /**
     * Execute action sequence via browser executor
     */
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

    /**
     * End-to-end: Note → Actions → Execution → Imported Notes
     */
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

/**
 * Global coordinator singleton
 */
export const clawdBotCoordinator = new ClawdBotCoordinator();

/**
 * Initialize ClawdBot browser integration.
 * Call this to connect to a running ClawdBot instance.
 * 
 * @example
 * ```typescript
 * import { initializeClawdBotIntegration } from './ClawdBotCoordinator';
 * 
 * // Connect to ClawdBot running on default port
 * await initializeClawdBotIntegration();
 * 
 * // Or specify custom options
 * await initializeClawdBotIntegration({
 *   host: '127.0.0.1',
 *   port: 3000,
 *   timeout: 30000
 * });
 * ```
 */
export async function initializeClawdBotIntegration(options?: {
    host?: string;
    port?: number;
    timeout?: number;
}): Promise<void> {
    const { createClawdBotExecutor } = await import('./browser/ClawdBotBrowserAdapter');

    const executor = createClawdBotExecutor(options ?? {});

    // Verify connection
    const available = await executor.isAvailable();
    if (!available) {
        throw new Error('ClawdBot is not available. Make sure ClawdBot is running.');
    }

    // Set executor
    clawdBotCoordinator.setBrowserExecutor(executor);

    console.log('✅ ClawdBot integration initialized');
}
