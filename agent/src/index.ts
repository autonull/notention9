import fs from 'fs';
import { join } from 'path';
import express from 'express';
import { VoltAgentProvider } from '@notention/agent-voltagent';
import { Note } from '@notention/core/src/types';

import { loadAgentConfig } from './config';
import { AgentRegistry } from './core/AgentRegistry';
import { log, error } from './core/utils';
import { PersistenceService } from './persistence';
import { WebSocketManager } from './server/websocket';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { SkillExecutor } from './skills/SkillExecutor';

// --- Initialization Helpers ---

import { IndeedSkill } from './skills/standard/IndeedSkill';
import { CraigslistSkill } from './skills/standard/CraigslistSkill';
import { GitHubSkill } from './skills/standard/GitHubSkill';

function initializeBuiltInSkills(registry: AgentSkillRegistry) {
  log('Init', 'Initializing standard skills...');

  registry.register(new IndeedSkill(), { tags: ['job', 'search', 'indeed'], domains: ['indeed.com'] });
  registry.register(new CraigslistSkill(), { tags: ['classifieds', 'search', 'craigslist'], domains: ['craigslist.org'] });
  registry.register(new GitHubSkill(), { tags: ['code', 'repo', 'github'], domains: ['github.com'] });
}

// --- Server Setup ---

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// UI Static Serving
let uiDistPath = join(process.cwd(), '../ui/dist');
if (!fs.existsSync(uiDistPath)) {
  uiDistPath = join(process.cwd(), 'ui/dist');
}
if (fs.existsSync(uiDistPath)) {
  app.use(express.static(uiDistPath));
}

const server = app.listen(PORT, () => {
  log('Server', `Notention + VoltAgent running on http://localhost:${PORT}`);
});

// WebSocket Setup
const wsManager = new WebSocketManager(server);

// --- Agent System ---

const agentRegistry = new AgentRegistry();
const skillRegistry = new AgentSkillRegistry();
let skillExecutor: SkillExecutor;

async function bootstrap() {
  const config = await loadAgentConfig();

  const voltagent = new VoltAgentProvider(config.voltagent);
  await voltagent.start();
  log('Init', 'VoltAgent started');

  agentRegistry.register('voltagent', voltagent);
  agentRegistry.setDefault('voltagent');

  skillRegistry.setAgent(voltagent);
  initializeBuiltInSkills(skillRegistry);

  // Initialize Configurator
  const { InitialConfigurator } = await import('./configurator/InitialConfigurator');
  const configurator = new InitialConfigurator();

  // Initialize Config Processor (Phase 1.3)
  const { ConfigProcessor } = await import('./configurator/ConfigProcessor');
  const configProcessor = new ConfigProcessor();

  // Initialize Plugin Loader (Phase 2.2)
  const { PluginLoader } = await import('./skills/PluginLoader');
  const pluginLoader = new PluginLoader(skillRegistry);
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

  skillExecutor = new SkillExecutor(voltagent, skillRegistry, (event) => {
    wsManager.broadcast(event);
  });

  // Set dependencies for WebSocket manager
  wsManager.setDependencies(agentRegistry, skillExecutor);

  // Register App-Specific Tools with VoltAgent
  const { querySkillRegistryTool, executeSkillTool, ontologyQueryTool } = await import('./tools');
  await voltagent.registerTool(querySkillRegistryTool);
  await voltagent.registerTool(executeSkillTool);
  await voltagent.registerTool(ontologyQueryTool);
  log('Init', 'Registered app-specific tools with VoltAgent');

  // Event Handlers
  voltagent.onNoteReceived((note: Note) => {
    log('Agent', `Note received: ${note.id}`);

    // Process for Configuration
    configProcessor.processNote(note);

    wsManager.broadcast({ type: 'note_created', payload: note });
  });
}

bootstrap().catch(err => error('Init', 'Bootstrap failed', err));

// --- Shutdown ---

process.on('SIGINT', async () => {
  log('System', 'Shutting down...');
  const agent = agentRegistry.getDefault();
  if (agent) await agent.stop();
  server.close(() => process.exit(0));
});
