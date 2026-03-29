import { AgentRegistry } from './core/AgentRegistry';
import { VoltAgentProvider } from '@notention/agent-voltagent';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { AgentWorkflowSkillExecutor } from './skills/AgentWorkflowSkillExecutor';
import { loadAgentConfig } from './config';
import { IndeedSkill, CraigslistSkill, GitHubSkill, Note } from '@notention/core';
import { log, error } from './core/utils';
import { PersistenceService } from './persistence';
import { FeedbackCollector } from './feedback/FeedbackCollector';

export interface BootstrapResult {
  agentRegistry: AgentRegistry;
  skillRegistry: AgentSkillRegistry;
  feedbackCollector: FeedbackCollector;
  skillExecutor: AgentWorkflowSkillExecutor;
  voltagent: VoltAgentProvider;
}

export class Bootstrap {
  private agentRegistry = new AgentRegistry();
  private skillRegistry = new AgentSkillRegistry();
  private feedbackCollector = new FeedbackCollector();
  private skillExecutor!: AgentWorkflowSkillExecutor;

  public async init(onEvent: (event: any) => void): Promise<BootstrapResult> {
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

    // Initialize Config Processor (Phase 1.3)
    const { ConfigProcessor } = await import('./configurator/ConfigProcessor');
    const configProcessor = new ConfigProcessor();
    configProcessor.setAgent(voltagent); // Hook up agent for dynamic config

    // Initialize Plugin Loader (Phase 2.2)
    const { PluginLoader } = await import('./skills/PluginLoader');
    const pluginLoader = new PluginLoader(this.skillRegistry);
    await pluginLoader.loadPlugins();

    // Check initialization status and create onboarding note if needed
    const currentNotes = await PersistenceService.getNotesSafe();
    const isInitialized = await configurator.isInitialized(currentNotes);

    if (!isInitialized) {
        log('Init', 'System not initialized. Creating onboarding note.');
        const onboardingNote = configurator.createOnboardingTriggerNote();
        await PersistenceService.saveNoteSafe(onboardingNote);
        log('Init', `Onboarding note created: ${onboardingNote.id}`);
    }

    this.skillExecutor = new AgentWorkflowSkillExecutor(voltagent, this.skillRegistry, onEvent);

    // Register App-Specific Tools with VoltAgent
    const { querySkillRegistryTool, executeSkillTool, ontologyQueryTool } = await import('./tools');
    await voltagent.registerTool(querySkillRegistryTool);
    await voltagent.registerTool(executeSkillTool);
    await voltagent.registerTool(ontologyQueryTool);
    log('Init', 'Registered app-specific tools with VoltAgent');

    // Event Handlers
    voltagent.onNoteReceived((note: Note) => {
      log('Agent', `Note received: ${note.id}`);
      configProcessor.processNote(note);
      onEvent({ type: 'note_created', payload: note });
    });

    return {
      agentRegistry: this.agentRegistry,
      skillRegistry: this.skillRegistry,
      feedbackCollector: this.feedbackCollector,
      skillExecutor: this.skillExecutor,
      voltagent
    };
  }

  private initializeBuiltInSkills() {
    log('Init', 'Initializing standard skills...');
    this.skillRegistry.register(new IndeedSkill(), { tags: ['job', 'search', 'indeed'], domains: ['indeed.com'] });
    this.skillRegistry.register(new CraigslistSkill(), { tags: ['classifieds', 'search', 'craigslist'], domains: ['craigslist.org'] });
    this.skillRegistry.register(new GitHubSkill(), { tags: ['code', 'repo', 'github'], domains: ['github.com'] });
  }
}
