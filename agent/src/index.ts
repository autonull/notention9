import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'path';
import fs from 'fs';
import { log, error } from './core/utils';
import { Bootstrap } from './Bootstrap';
import { SocketController } from './server/SocketController';
import { setupMcpServer } from './server/McpServer';
import { setupSimulationMcpServer } from './server/SimulationMcpServer';
import { setAgentRegistry } from './globals';

// --- Server Setup ---

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Setup MCP Servers
setupMcpServer(app);
setupSimulationMcpServer(app);

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

// --- Agent System Initialization ---

const bootstrap = new Bootstrap();
let socketController: SocketController;

bootstrap.init((event) => {
  // Event callback from Bootstrap (e.g. from VoltAgent)
  if (socketController) {
    socketController.broadcast(event);
  }
}).then((components) => {
  log('Init', 'Agent system initialized');
  setAgentRegistry(components.agentRegistry);

  socketController = new SocketController(
    components.agentRegistry,
    components.skillExecutor,
    components.feedbackCollector
  );

}).catch(err => error('Init', 'Bootstrap failed', err));

// --- WebSocket Handlers ---

wss.on('connection', (ws) => {
  log('WS', 'UI client connected');

  if (socketController) {
    socketController.addClient(ws);
  } else {
    // If connected before init, maybe handle queueing or simple error/wait?
    // For now simple log
    log('WS', 'Client connected before full init');
  }

  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Connected to Notention Agent'
  }));

  ws.on('message', async (data) => {
    if (!socketController) {
      ws.send(JSON.stringify({ type: 'error', message: 'System initializing...' }));
      return;
    }

    try {
      const message = JSON.parse(data.toString());
      await socketController.handleMessage(message, ws);
    } catch (e) {
      error('WS', 'Message handling error', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });
});

// --- Shutdown ---

process.on('SIGINT', async () => {
  log('System', 'Shutting down...');
  // Ideally we should access the components to stop them properly
  // For now simple exit
  server.close(() => process.exit(0));
});
