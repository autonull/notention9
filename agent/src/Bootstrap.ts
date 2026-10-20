import { AgentSkillRegistry } from './skills/AgentSkillRegistry.js';
import { loadAgentConfig } from './config/index.js';
import { IndeedSkill, CraigslistSkill, GitHubSkill, Note } from '@notention/core';
import { ConfigSkill } from './skills/ConfigSkill.js';
import { log, error } from './core/utils.js';
import { PersistenceService } from './persistence.js';
import { FeedbackCollector } from './feedback/FeedbackCollector.js';
import { InitialConfigurator } from './configurator/InitialConfigurator.js';
import { ConfigProcessor } from './configurator/ConfigProcessor.js';
import { NoteSkillLoader } from './skills/NoteSkillLoader.js';
import { PluginLoader } from './skills/PluginLoader.js';

export interface BootstrapResult {
	skillRegistry: AgentSkillRegistry;
	feedbackCollector: FeedbackCollector;
}

export type AgentEvent = { type: string; payload: any };

export class Bootstrap {
	private skillRegistry = new AgentSkillRegistry();
	private feedbackCollector = new FeedbackCollector();

	public async init(onEvent: (event: AgentEvent) => void): Promise<BootstrapResult> {
		await loadAgentConfig();
		log('Init', 'MCP Server started');

		this.initializeBuiltInSkills();

		const configurator = new InitialConfigurator();
		const configProcessor = new ConfigProcessor();
		const noteSkillLoader = new NoteSkillLoader(this.skillRegistry);
		await new PluginLoader(this.skillRegistry).loadPlugins();

		const currentNotes = await PersistenceService.getNotesSafe();
		configProcessor.scanForConfigs(currentNotes);
		noteSkillLoader.scanForSkills(currentNotes);

		if (!await configurator.isInitialized(currentNotes)) {
			const onboardingNote = configurator.createOnboardingTriggerNote();
			await PersistenceService.saveNoteSafe(onboardingNote);
			log('Init', `Onboarding note created: ${onboardingNote.id}`);
		}

		return { skillRegistry: this.skillRegistry, feedbackCollector: this.feedbackCollector };
	}

	private initializeBuiltInSkills() {
		log('Init', 'Initializing standard skills...');
		this.skillRegistry.register(new IndeedSkill(), { tags: ['job', 'search', 'indeed'], domains: ['indeed.com'] });
		this.skillRegistry.register(new CraigslistSkill(), { tags: ['classifieds', 'search', 'craigslist'], domains: ['craigslist.org'] });
		this.skillRegistry.register(new GitHubSkill(), { tags: ['code', 'repo', 'github'], domains: ['github.com'] });
		this.skillRegistry.register(new ConfigSkill(), { tags: ['config', 'setting', 'system'], domains: [] });
	}
}
