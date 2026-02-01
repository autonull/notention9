import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'path';
import fs from 'fs';
import { AgentRegistry } from './core/AgentRegistry';
import { VoltAgentProvider } from '../voltagent/src/VoltAgentProvider';
import { SkillRegistry } from './skills/SkillRegistry';
import { SkillExecutor } from './skills/SkillExecutor';
import { ConfigProcessor } from './configurator/ConfigProcessor';
import { ShadowLexicon } from './ontology/ShadowLexicon';
import { CapabilityManager } from './security/CapabilityManager';
import { MatchingService } from './network/MatchingService';
import { loadAgentConfig } from './config';
import { Note } from '@notention/core/src/types';
import { log, error } from './core/utils';

// --- Initialization Helpers ---

function initializeBuiltInSkills(registry: SkillRegistry) {
  // Future: Register built-in skills here
  log('Init', 'Initializing skills...');
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
const skillRegistry = new SkillRegistry();
const configProcessor = new ConfigProcessor();
const shadowLexicon = new ShadowLexicon();
const capabilityManager = new CapabilityManager();
const matchingService = new MatchingService();
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

  skillExecutor = new SkillExecutor(voltagent, skillRegistry, (event) => {
    broadcastToUI(event);
  });

  // Register App-Specific Tools with VoltAgent
  const { querySkillRegistryTool, executeSkillTool, ontologyQueryTool } = await import('./tools');
  await voltagent.registerTool(querySkillRegistryTool);
  await voltagent.registerTool(executeSkillTool);
  await voltagent.registerTool(ontologyQueryTool);
  log('Init', 'Registered app-specific tools with VoltAgent');

  // Event Handlers
  voltagent.onNoteReceived(async (note: Note) => {
    log('Agent', `Note received: ${note.id}`);

    // Process configuration notes
    await configProcessor.processNote(note);

    // Observe ontology patterns
    await shadowLexicon.observe(note);

    // Trigger matching (defaulting to Private Resonance for now)
    await matchingService.findMatches(note, true);

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
    case 'note_created':
      // Also process config on creation via UI
      await configProcessor.processNote(message.payload);
      await shadowLexicon.observe(message.payload);

      const notes = await skillExecutor.executeForNote(message.payload);
      for (const result of notes) {
        broadcastToUI({ type: 'note_created', payload: result });
      }
      break;

    case 'note_updated':
      // Also process config on update via UI
      await configProcessor.processNote(message.payload);

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