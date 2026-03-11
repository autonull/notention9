import { AgentRegistry } from './core/AgentRegistry.js';
import { VoltAgentProvider } from '@notention/agent-voltagent';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry.js';
import { AgentWorkflowSkillExecutor } from './skills/AgentWorkflowSkillExecutor.js';
import { loadAgentConfig } from './config/index.js';
import { IndeedSkill, CraigslistSkill, GitHubSkill, Note } from '@notention/core';
import { ConfigSkill } from './skills/ConfigSkill.js';
import { log, error } from './core/utils.js';
import { PersistenceService } from './persistence.js';
import { FeedbackCollector } from './feedback/FeedbackCollector.js';

import type { ConfigProcessor } from './configurator/ConfigProcessor.js';
import type { NoteSkillLoader } from './skills/NoteSkillLoader.js';

export interface BootstrapResult {
	agentRegistry: AgentRegistry;
	skillRegistry: AgentSkillRegistry;
	feedbackCollector: FeedbackCollector;
	skillExecutor: AgentWorkflowSkillExecutor;
	voltagent: VoltAgentProvider;
}

export type AgentEvent = { type: string; payload: any };

export class Bootstrap {
	private agentRegistry = new AgentRegistry();
	private skillRegistry = new AgentSkillRegistry();
	private feedbackCollector = new FeedbackCollector();
	private skillExecutor!: AgentWorkflowSkillExecutor;

	public async init(onEvent: (event: AgentEvent) => void): Promise<BootstrapResult> {
		const config = await loadAgentConfig();
		const voltagent = new VoltAgentProvider(config.voltagent);
		await voltagent.start();
		log('Init', 'VoltAgent started');

		this.agentRegistry.register('voltagent', voltagent);
		this.agentRegistry.setDefault('voltagent');
		this.skillRegistry.setAgent(voltagent);
		this.initializeBuiltInSkills();

		const configurator = await this.loadConfigurator();
		const configProcessor = await this.loadConfigProcessor(voltagent);
		const noteSkillLoader = await this.loadNoteSkillLoader();
		await this.loadPlugins();

		const currentNotes = await PersistenceService.getNotesSafe();
		configProcessor.scanForConfigs(currentNotes);
		noteSkillLoader.scanForSkills(currentNotes);

		if (!await configurator.isInitialized(currentNotes)) {
			const onboardingNote = configurator.createOnboardingTriggerNote();
			await PersistenceService.saveNoteSafe(onboardingNote);
			log('Init', `Onboarding note created: ${onboardingNote.id}`);
		}

		this.skillExecutor = new AgentWorkflowSkillExecutor(voltagent, this.skillRegistry, onEvent);
		await this.registerTools(voltagent);

		voltagent.onNoteReceived((note: Note) => this.processIncomingNote(note, configProcessor, noteSkillLoader, onEvent));

		return { agentRegistry: this.agentRegistry, skillRegistry: this.skillRegistry, feedbackCollector: this.feedbackCollector, skillExecutor: this.skillExecutor, voltagent };
	}

  private async loadConfigurator() {
    const { InitialConfigurator } = await import('./configurator/InitialConfigurator.js');
    return new InitialConfigurator();
  }

  private async loadConfigProcessor(voltagent: VoltAgentProvider) {
    const { ConfigProcessor } = await import('./configurator/ConfigProcessor.js');
    const processor = new ConfigProcessor();
    processor.setAgent(voltagent);
    return processor;
  }

  private async loadNoteSkillLoader() {
    const { NoteSkillLoader } = await import('./skills/NoteSkillLoader.js');
    return new NoteSkillLoader(this.skillRegistry);
  }

  private async loadPlugins() {
    const { PluginLoader } = await import('./skills/PluginLoader.js');
    await new PluginLoader(this.skillRegistry).loadPlugins();
  }

  private processIncomingNote(note: Note, configProcessor: ConfigProcessor, noteSkillLoader: NoteSkillLoader, onEvent: (event: AgentEvent) => void) {
    log('Agent', `Note received: ${note.id}`);
    try {
      configProcessor.processNote(note);
      if (note.tags.includes('@skill:definition')) noteSkillLoader.scanForSkills([note]);
      onEvent({ type: 'note_created', payload: note });
    } catch (err) {
      error('Agent', `Error processing note ${note.id}`, err);
    }
  }

  private initializeBuiltInSkills() {
		log('Init', 'Initializing standard skills...');
		this.skillRegistry.register(new IndeedSkill(), { tags: ['job', 'search', 'indeed'], domains: ['indeed.com'] });
		this.skillRegistry.register(new CraigslistSkill(), { tags: ['classifieds', 'search', 'craigslist'], domains: ['craigslist.org'] });
		this.skillRegistry.register(new GitHubSkill(), { tags: ['code', 'repo', 'github'], domains: ['github.com'] });
		this.skillRegistry.register(new ConfigSkill(), { tags: ['config', 'setting', 'system'], domains: [] });
	}

	private async registerTools(voltagent: VoltAgentProvider) {
		const { querySkillRegistryTool, executeSkillTool, ontologyQueryTool } = await import('./tools.js');
		await voltagent.registerTool(querySkillRegistryTool);
		await voltagent.registerTool(executeSkillTool);
		await voltagent.registerTool(ontologyQueryTool);
		log('Init', 'Registered app-specific tools with VoltAgent');
	}
}
