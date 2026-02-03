import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'path';
import fs from 'fs';
import { AgentRegistry } from './core/AgentRegistry';
import { VoltAgentProvider } from '@notention/agent-voltagent';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { AgentWorkflowSkillExecutor } from './skills/AgentWorkflowSkillExecutor';
import { loadAgentConfig } from './config';
import { Note, IndeedSkill, CraigslistSkill, GitHubSkill, Feedback } from '@notention/core';
import { log, error } from './core/utils';
import { PersistenceService } from './persistence';
import { FeedbackCollector } from './feedback/FeedbackCollector';

// --- Initialization Helpers ---

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
const wss = new WebSocketServer({ server, path: '/ws/agent' });
const uiClients = new Set<WebSocket>();

// --- Agent System ---

const agentRegistry = new AgentRegistry();
const skillRegistry = new AgentSkillRegistry();
const feedbackCollector = new FeedbackCollector();
let skillExecutor: AgentWorkflowSkillExecutor;

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

  skillExecutor = new AgentWorkflowSkillExecutor(voltagent, skillRegistry, (event) => {
    broadcastToUI(event);
  });

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

    broadcastToUI({ type: 'note_created', payload: note });
  });
}

bootstrap().catch(err => error('Init', 'Bootstrap failed', err));

// --- WebSocket Handlers ---

wss.on('connection', (ws) => {
  log('WS', 'UI client connected');
  uiClients.add(ws);

  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Connected to Notention Agent'
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleUIMessage(message, ws);
    } catch (e) {
      error('WS', 'Message handling error', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => uiClients.delete(ws));
});

async function handleUIMessage(message: any, ws: WebSocket) {
  const agent = agentRegistry.getDefault();
  if (!agent) {
    ws.send(JSON.stringify({ type: 'error', message: 'No agent available' }));
    return;
  }

  // Simple permissive check for now
  const shouldExecuteSkills = async (note: Note) => true;

  switch (message.type) {
    case 'note_created': {
      const notes = await skillExecutor.executeForNote(message.payload);
      for (const result of notes) {
        broadcastToUI({ type: 'note_created', payload: result });
      }
      break;
    }

    case 'note_updated':
      if (await shouldExecuteSkills(message.payload)) {
        const results = await skillExecutor.executeForNote(message.payload);
        for (const result of results) {
          broadcastToUI({ type: 'note_created', payload: result });
        }
      }
      break;

    case 'execute_workflow':
      try {
        const result = await agent.executeWorkflow(message.payload.workflowId, message.payload.input);
        ws.send(JSON.stringify({ type: 'workflow_result', payload: result }));
      } catch (e: any) {
        ws.send(JSON.stringify({ type: 'error', message: e.message }));
      }
      break;

    case 'get_agent_status':
      const status = await agent.getStatus();
      ws.send(JSON.stringify({ type: 'agent_status', payload: status }));
      break;

    case 'get_notes': {
      const notes = await PersistenceService.getNotesSafe();
      ws.send(JSON.stringify({ type: 'notes_list', payload: notes, id: message.id }));
      break;
    }

    case 'save_note': {
      await PersistenceService.saveNoteSafe(message.payload);
      ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
      break;
    }

    case 'delete_note': {
      await PersistenceService.deleteNoteSafe(message.payload.id);
      ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
      break;
    }

    case 'feedback': {
        const feedback = message.payload as Feedback;
        await feedbackCollector.recordFeedback(feedback);
        ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
        break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${message.type}` }));
  }
}

function broadcastToUI(message: any) {
  uiClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// --- Shutdown ---

process.on('SIGINT', async () => {
  log('System', 'Shutting down...');
  const agent = agentRegistry.getDefault();
  if (agent) await agent.stop();
  server.close(() => process.exit(0));
});
