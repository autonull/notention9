import { AgentRegistry } from './core/AgentRegistry';
import { VoltAgentProvider } from '@notention/agent-voltagent';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { AgentWorkflowSkillExecutor } from './skills/AgentWorkflowSkillExecutor';
import { loadAgentConfig } from './config';
import { IndeedSkill, CraigslistSkill, GitHubSkill, Note } from '@notention/core';
import { ConfigSkill } from './skills/ConfigSkill';
import { log, error } from './core/utils';
import { PersistenceService } from './persistence';
import { FeedbackCollector } from './feedback/FeedbackCollector';

// Type-only imports
import type { ConfigProcessor } from './configurator/ConfigProcessor';
import type { NoteSkillLoader } from './skills/NoteSkillLoader';

export interface BootstrapResult {
  agentRegistry: AgentRegistry;
  skillRegistry: AgentSkillRegistry;
  feedbackCollector: FeedbackCollector;
  skillExecutor: AgentWorkflowSkillExecutor;
  voltagent: VoltAgentProvider;
}

export type AgentEvent = { type: string, payload: any };

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

    // Initialize Configurator
    const { InitialConfigurator } = await import('./configurator/InitialConfigurator');
    const configurator = new InitialConfigurator();

    // Initialize Config Processor
    const { ConfigProcessor } = await import('./configurator/ConfigProcessor');
    const configProcessor = new ConfigProcessor();
    configProcessor.setAgent(voltagent);

    // Initialize Note Skill Loader
    const { NoteSkillLoader } = await import('./skills/NoteSkillLoader');
    const noteSkillLoader = new NoteSkillLoader(this.skillRegistry);

    // Initialize Plugin Loader
    const { PluginLoader } = await import('./skills/PluginLoader');
    const pluginLoader = new PluginLoader(this.skillRegistry);
    await pluginLoader.loadPlugins();

    // Check initialization status and create onboarding note if needed
    const currentNotes = await PersistenceService.getNotesSafe();

    // Restore system configuration and dynamic skills from notes
    configProcessor.scanForConfigs(currentNotes);
    noteSkillLoader.scanForSkills(currentNotes);

    const isInitialized = await configurator.isInitialized(currentNotes);

    if (!isInitialized) {
        log('Init', 'System not initialized. Creating onboarding note.');
        const onboardingNote = configurator.createOnboardingTriggerNote();
        await PersistenceService.saveNoteSafe(onboardingNote);
        log('Init', `Onboarding note created: ${onboardingNote.id}`);
    }

    this.skillExecutor = new AgentWorkflowSkillExecutor(voltagent, this.skillRegistry, onEvent);

    await this.registerTools(voltagent);

    // Event Handlers
    voltagent.onNoteReceived((note: Note) =>
        this.processIncomingNote(note, configProcessor, noteSkillLoader, onEvent)
    );

    return {
      agentRegistry: this.agentRegistry,
      skillRegistry: this.skillRegistry,
      feedbackCollector: this.feedbackCollector,
      skillExecutor: this.skillExecutor,
      voltagent
    };
  }

  private processIncomingNote(
      note: Note,
      configProcessor: ConfigProcessor,
      noteSkillLoader: NoteSkillLoader,
      onEvent: (event: AgentEvent) => void
  ) {
      log('Agent', `Note received: ${note.id}`);

      try {
          configProcessor.processNote(note);

          if (note.tags.includes('@skill:definition')) {
              noteSkillLoader.scanForSkills([note]);
          }
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
    // Register App-Specific Tools with VoltAgent
    const { querySkillRegistryTool, executeSkillTool, ontologyQueryTool } = await import('./tools');
    await voltagent.registerTool(querySkillRegistryTool);
    await voltagent.registerTool(executeSkillTool);
    await voltagent.registerTool(ontologyQueryTool);
    log('Init', 'Registered app-specific tools with VoltAgent');
  }
}
