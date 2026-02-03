import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { AgentRegistry } from '../core/AgentRegistry';
import { SkillExecutor } from '../skills/SkillExecutor';
import { PersistenceService } from '../persistence';
import { Note } from '@notention/core/src/types';
import { log, error } from '../core/utils';

export class WebSocketManager {
    private wss: WebSocketServer;
    private uiClients: Set<WebSocket> = new Set();
    private agentRegistry?: AgentRegistry;
    private skillExecutor?: SkillExecutor;

    constructor(server: Server) {
        this.wss = new WebSocketServer({ server, path: '/ws/agent' });
        this.setupConnectionHandler();
    }

    public setDependencies(agentRegistry: AgentRegistry, skillExecutor: SkillExecutor) {
        this.agentRegistry = agentRegistry;
        this.skillExecutor = skillExecutor;
    }

    public broadcast(message: any) {
        this.uiClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    private setupConnectionHandler() {
        this.wss.on('connection', (ws) => {
            log('WS', 'UI client connected');
            this.uiClients.add(ws);

            ws.send(JSON.stringify({
                type: 'connection_established',
                message: 'Connected to Notention Agent'
            }));

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(message, ws);
                } catch (e) {
                    error('WS', 'Message handling error', e);
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
                }
            });

            ws.on('close', () => this.uiClients.delete(ws));
        });
    }

    private async handleMessage(message: any, ws: WebSocket) {
        if (!this.agentRegistry || !this.skillExecutor) {
             ws.send(JSON.stringify({ type: 'error', message: 'Agent system not fully initialized' }));
             return;
        }

        const agent = this.agentRegistry.getDefault();
        if (!agent) {
            ws.send(JSON.stringify({ type: 'error', message: 'No agent available' }));
            return;
        }

        // Simple permissive check for now
        const shouldExecuteSkills = async (note: Note) => true;

        switch (message.type) {
            case 'note_created': {
                const notes = await this.skillExecutor.executeForNote(message.payload);
                for (const result of notes) {
                    this.broadcast({ type: 'note_created', payload: result });
                }
                break;
            }

            case 'note_updated':
                if (await shouldExecuteSkills(message.payload)) {
                    const results = await this.skillExecutor.executeForNote(message.payload);
                    for (const result of results) {
                        this.broadcast({ type: 'note_created', payload: result });
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

            default:
                ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${message.type}` }));
        }
    }
}
